from __future__ import annotations

from collections.abc import Callable
from concurrent.futures import Future
from dataclasses import dataclass
import logging
from pathlib import Path
from queue import Queue
from threading import Thread
from typing import Any, Generic, TypeVar

from app.modules.accounts.application.ports import BrowserSessionPort
from app.modules.accounts.domain.errors import (
    BrowserLaunchFailed,
    BrowserProfileInUse,
    BrowserSessionNotOpen,
    BrowserUnavailable,
)
from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)

logger = logging.getLogger(__name__)

T = TypeVar("T")
LauncherType = Callable[[Path, str, bool], Any]


@dataclass
class _BrowserCommand(Generic[T]):
    operation: Callable[[], T]
    future: Future[T]


_STOP = object()


@dataclass
class _LiveSession:
    profile_key: str
    context: Any


class BrowserRuntime(BrowserSessionPort):
    DEFAULT_CHANNELS = ("msedge", "chrome")

    def __init__(
        self,
        resolver: BrowserProfilePathResolver | None = None,
        launcher: LauncherType | None = None,
        headless: bool = False,
        channels: tuple[str, ...] = DEFAULT_CHANNELS,
    ) -> None:
        self._resolver = resolver or BrowserProfilePathResolver()
        self._launcher = launcher
        self._headless = headless
        self._channels = channels

        self._queue: Queue[object] = Queue()
        self._stopped = False
        self._pw: Any = None
        self._sessions_by_profile: dict[str, _LiveSession] = {}

        self._thread = Thread(
            target=self._run,
            name="vidpool-browser-runtime",
            daemon=True,
        )
        self._thread.start()

    def _submit(self, operation: Callable[[], T]) -> T:
        if self._stopped:
            raise BrowserUnavailable("Browser runtime is stopped")

        future: Future[T] = Future()
        self._queue.put(
            _BrowserCommand(
                operation=operation,
                future=future,
            )
        )
        return future.result()

    def _run(self) -> None:
        while True:
            item = self._queue.get()
            if item is _STOP:
                break

            command: _BrowserCommand[Any] = item  # type: ignore
            try:
                result = command.operation()
            except BaseException as exc:
                command.future.set_exception(exc)
            else:
                command.future.set_result(result)

    def _ensure_playwright(self) -> Any:
        if self._pw is None:
            from playwright.sync_api import sync_playwright

            self._pw = sync_playwright().start()
        return self._pw

    def _default_launch(self, profile_path: Path, channel: str, headless: bool) -> Any:
        from playwright.sync_api import Error as PlaywrightError

        pw = self._ensure_playwright()
        try:
            return pw.chromium.launch_persistent_context(
                user_data_dir=str(profile_path),
                channel=channel,
                headless=headless,
            )
        except (PlaywrightError, Exception) as exc:
            raise BrowserLaunchFailed(
                f"Failed to launch browser with channel '{channel}': {exc}"
            ) from exc

    def _launch_persistent_context(
        self,
        profile_path: Path,
        headless: bool | None = None,
    ) -> Any:
        is_headless = self._headless if headless is None else headless
        context = None
        last_error = None
        for channel in self._channels:
            try:
                if self._launcher is not None:
                    context = self._launcher(profile_path, channel, is_headless)
                else:
                    context = self._default_launch(profile_path, channel, is_headless)
                break
            except BrowserLaunchFailed as exc:
                last_error = exc
                logger.warning("Failed launching browser channel '%s': %s", channel, exc)
            except Exception as exc:
                last_error = exc
                logger.warning("Unexpected error launching browser channel '%s': %s", channel, exc)

        if context is None:
            raise BrowserUnavailable(
                f"No supported browser channel could be launched for profile '{profile_path}'"
            ) from last_error
        return context

    def open_login(
        self,
        *,
        provider_key: str,
        profile_key: str,
        login_url: str,
    ) -> None:
        del provider_key
        self._submit(
            lambda: self._open_login(
                profile_key=profile_key,
                login_url=login_url,
            )
        )

    def _on_context_closed(self, profile_key: str) -> None:
        self._sessions_by_profile.pop(profile_key, None)

    def _open_login(
        self,
        *,
        profile_key: str,
        login_url: str,
    ) -> None:
        if profile_key in self._sessions_by_profile:
            raise BrowserProfileInUse(
                f"Browser profile '{profile_key}' is already open"
            )

        profile_path = self._resolver.resolve(profile_key)
        profile_path.mkdir(parents=True, exist_ok=True)

        context = self._launch_persistent_context(profile_path)

        if hasattr(context, "on"):
            try:
                context.on("close", lambda: self._on_context_closed(profile_key))
            except Exception:
                pass

        try:
            pages = context.pages
            page = pages[0] if pages else context.new_page()
            page.goto(login_url)
        except Exception:
            try:
                context.close()
            except Exception:
                pass
            raise

        self._sessions_by_profile[profile_key] = _LiveSession(
            profile_key=profile_key,
            context=context,
        )

    def close_profile(self, profile_key: str) -> None:
        self._submit(lambda: self._close_profile(profile_key))

    def _close_profile(self, profile_key: str) -> None:
        session = self._sessions_by_profile.pop(profile_key, None)
        if session is None:
            return
        try:
            session.context.close()
        except Exception as exc:
            logger.warning("Error closing browser session context for '%s': %s", profile_key, exc)

    def has_open_session(self, profile_key: str) -> bool:
        return self._submit(lambda: profile_key in self._sessions_by_profile)

    def run_active(
        self,
        profile_key: str,
        operation: Callable[[Any], T],
    ) -> T:
        return self._submit(
            lambda: self._run_active(
                profile_key=profile_key,
                operation=operation,
            )
        )

    def _run_active(
        self,
        profile_key: str,
        operation: Callable[[Any], T],
    ) -> T:
        session = self._sessions_by_profile.get(profile_key)
        if session is None:
            raise BrowserSessionNotOpen(
                f"No active browser session for '{profile_key}'"
            )
        return operation(session.context)

    def run_persisted_profile(
        self,
        profile_key: str,
        operation: Callable[[Any], T],
    ) -> T:
        return self._submit(
            lambda: self._run_persisted_profile(
                profile_key=profile_key,
                operation=operation,
            )
        )

    def _run_persisted_profile(
        self,
        profile_key: str,
        operation: Callable[[Any], T],
    ) -> T:
        if profile_key in self._sessions_by_profile:
            raise BrowserProfileInUse(
                f"Browser profile '{profile_key}' is already open interactively"
            )

        path = self._resolver.resolve(profile_key)
        context = self._launch_persistent_context(path, headless=True)
        try:
            return operation(context)
        finally:
            try:
                context.close()
            except Exception:
                pass

    def delete_profile(self, profile_key: str) -> None:
        if not self._stopped and self.has_open_session(profile_key):
            raise BrowserProfileInUse(
                f"Cannot delete profile '{profile_key}' while a browser session is active"
            )
        self._resolver.delete(profile_key)

    def close_all(self) -> None:
        if self._stopped:
            return

        def shutdown() -> None:
            for session in list(self._sessions_by_profile.values()):
                try:
                    session.context.close()
                except Exception:
                    logger.exception("Failed closing browser context")
            self._sessions_by_profile.clear()

            if self._pw is not None:
                try:
                    self._pw.stop()
                except Exception:
                    logger.exception("Failed stopping playwright")
                finally:
                    self._pw = None

        try:
            self._submit(shutdown)
        except BrowserUnavailable:
            pass

        self._stopped = True
        self._queue.put(_STOP)
        self._thread.join(timeout=5)
