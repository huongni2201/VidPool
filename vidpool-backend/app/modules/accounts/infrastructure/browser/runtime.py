from __future__ import annotations

import contextlib
import logging
import threading
import time
from collections.abc import Callable
from concurrent.futures import Future
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from queue import Queue
from threading import Thread
from typing import Any, TypeVar

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


class RuntimeState(Enum):
    RUNNING = "RUNNING"
    STOPPING = "STOPPING"
    STOPPED = "STOPPED"


@dataclass
class _BrowserCommand[T]:
    operation: Callable[[], T]
    future: Future[T]


_STOP = object()


@dataclass
class _LiveSession:
    profile_key: str
    context: Any


class BrowserRuntime(BrowserSessionPort):
    DEFAULT_CHANNELS = ("msedge", "chrome")
    DEFAULT_LAUNCH_TIMEOUT_MS = 30_000
    DEFAULT_NAVIGATION_TIMEOUT_MS = 30_000
    DEFAULT_SHUTDOWN_TIMEOUT_SECONDS = 10.0

    def __init__(
        self,
        resolver: BrowserProfilePathResolver | None = None,
        launcher: LauncherType | None = None,
        headless: bool = False,
        channels: tuple[str, ...] = DEFAULT_CHANNELS,
        launch_timeout_ms: int = DEFAULT_LAUNCH_TIMEOUT_MS,
        navigation_timeout_ms: int = DEFAULT_NAVIGATION_TIMEOUT_MS,
        shutdown_timeout_s: float = DEFAULT_SHUTDOWN_TIMEOUT_SECONDS,
    ) -> None:
        self._resolver = resolver or BrowserProfilePathResolver()
        self._launcher = launcher
        self._headless = headless
        self._channels = channels
        self._launch_timeout_ms = launch_timeout_ms
        self._navigation_timeout_ms = navigation_timeout_ms
        self._shutdown_timeout_s = shutdown_timeout_s

        self._queue: Queue[object] = Queue()
        self._state_lock = threading.Lock()
        self._state = RuntimeState.RUNNING
        self._pw: Any = None
        self._sessions_by_profile: dict[str, _LiveSession] = {}

        self._thread = Thread(
            target=self._run,
            name="vidpool-browser-runtime",
            daemon=True,
        )
        self._thread.start()

    @property
    def state(self) -> RuntimeState:
        with self._state_lock:
            return self._state

    @property
    def _stopped(self) -> bool:
        with self._state_lock:
            return self._state != RuntimeState.RUNNING

    def _submit(self, operation: Callable[[], T]) -> T:
        with self._state_lock:
            if self._state != RuntimeState.RUNNING:
                raise BrowserUnavailable(f"Browser runtime is {self._state.value.lower()}")

            future: Future[T] = Future()
            self._queue.put(
                _BrowserCommand(
                    operation=operation,
                    future=future,
                )
            )
        return future.result()

    def _run(self) -> None:
        logger.info("browser_runtime_start thread_id=%s", threading.get_ident())
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
                timeout=self._launch_timeout_ms,
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
            raise BrowserProfileInUse(f"Browser profile '{profile_key}' is already open")

        start_time = time.perf_counter()
        logger.info("browser_open_start profile_key=%s", profile_key)

        profile_path = self._resolver.resolve(profile_key)
        profile_path.mkdir(parents=True, exist_ok=True)

        context = None
        try:
            context = self._launch_persistent_context(profile_path)

            if hasattr(context, "on"):
                with contextlib.suppress(Exception):
                    context.on("close", lambda: self._on_context_closed(profile_key))

            pages = context.pages
            page = pages[0] if pages else context.new_page()
            try:
                page.goto(login_url, timeout=self._navigation_timeout_ms)
            except TypeError:
                page.goto(login_url)
        except Exception as exc:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.warning(
                "browser_open_failed profile_key=%s elapsed_ms=%d error_type=%s",
                profile_key,
                elapsed_ms,
                exc.__class__.__name__,
            )
            if context is not None:
                with contextlib.suppress(Exception):
                    context.close()
            raise

        self._sessions_by_profile[profile_key] = _LiveSession(
            profile_key=profile_key,
            context=context,
        )
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        logger.info(
            "browser_open_success profile_key=%s elapsed_ms=%d",
            profile_key,
            elapsed_ms,
        )

    def close_profile(self, profile_key: str) -> None:
        self._submit(lambda: self._close_profile(profile_key))

    def _close_profile(self, profile_key: str) -> None:
        session = self._sessions_by_profile.pop(profile_key, None)
        if session is None:
            return
        logger.info("browser_close profile_key=%s", profile_key)
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
            raise BrowserSessionNotOpen(f"No active browser session for '{profile_key}'")
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
            with contextlib.suppress(Exception):
                context.close()

    def delete_profile(self, profile_key: str) -> None:
        with self._state_lock:
            if self._state == RuntimeState.STOPPED:
                self._resolver.delete(profile_key)
                return
        self._submit(lambda: self._delete_profile(profile_key))

    def _delete_profile(self, profile_key: str) -> None:
        if profile_key in self._sessions_by_profile:
            raise BrowserProfileInUse(
                f"Cannot delete profile '{profile_key}' while a browser session is active"
            )
        logger.info("browser_profile_delete profile_key=%s", profile_key)
        self._resolver.delete(profile_key)

    def close_all(self) -> None:
        with self._state_lock:
            if self._state != RuntimeState.RUNNING:
                return
            self._state = RuntimeState.STOPPING
        logger.info("browser_runtime_stopping")

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

        shutdown_future: Future[None] = Future()
        self._queue.put(
            _BrowserCommand(
                operation=shutdown,
                future=shutdown_future,
            )
        )
        try:
            shutdown_future.result(timeout=10)
        except Exception:
            logger.exception("Failed executing browser shutdown command")

        self._queue.put(_STOP)
        self._thread.join(timeout=self._shutdown_timeout_s)

        with self._state_lock:
            self._state = RuntimeState.STOPPED
        logger.info("browser_runtime_stopped")
