from __future__ import annotations

import contextlib
import logging
import threading
import time
import uuid
from collections.abc import Callable
from concurrent.futures import Future
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from queue import Empty, Queue
from threading import Thread
from typing import Any, TypeVar

from app.modules.accounts.application.ports import BrowserSessionPort
from app.modules.accounts.domain.errors import (
    BrowserCommandTimeout,
    BrowserLaunchFailed,
    BrowserProfileInUse,
    BrowserSessionNotOpen,
    BrowserShutdownTimeout,
    BrowserUnavailable,
)
from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)

logger = logging.getLogger(__name__)

T = TypeVar("T")
LauncherType = Callable[[Path, str, bool], Any]


class RuntimeState(Enum):
    NEW = "NEW"
    STARTING = "STARTING"
    RUNNING = "RUNNING"
    STOPPING = "STOPPING"
    STOPPED = "STOPPED"
    FAILED = "FAILED"


@dataclass
class _BrowserCommand[T]:
    command_id: str
    operation: Callable[[], T]
    future: Future[T]
    operation_name: str = ""
    submitted_at: float = 0.0
    deadline: float | None = None


_STOP = object()


@dataclass
class _LiveSession:
    profile_key: str
    context: Any


class BrowserRuntime(BrowserSessionPort):
    DEFAULT_CHANNELS = ("msedge", "chrome")
    DEFAULT_LAUNCH_TIMEOUT_MS = 30_000
    DEFAULT_NAVIGATION_TIMEOUT_MS = 30_000
    DEFAULT_COMMAND_TIMEOUT_SECONDS = 30.0
    DEFAULT_SHUTDOWN_TIMEOUT_SECONDS = 10.0

    def __init__(
        self,
        resolver: BrowserProfilePathResolver | None = None,
        launcher: LauncherType | None = None,
        headless: bool = False,
        channels: tuple[str, ...] = DEFAULT_CHANNELS,
        launch_timeout_ms: int = DEFAULT_LAUNCH_TIMEOUT_MS,
        navigation_timeout_ms: int = DEFAULT_NAVIGATION_TIMEOUT_MS,
        command_timeout_s: float = DEFAULT_COMMAND_TIMEOUT_SECONDS,
        shutdown_timeout_s: float = DEFAULT_SHUTDOWN_TIMEOUT_SECONDS,
    ) -> None:
        self._resolver = resolver or BrowserProfilePathResolver()
        self._launcher = launcher
        self._headless = headless
        self._channels = channels
        self._launch_timeout_ms = launch_timeout_ms
        self._navigation_timeout_ms = navigation_timeout_ms
        self._command_timeout_s = command_timeout_s
        self._shutdown_timeout_s = shutdown_timeout_s

        self._queue: Queue[object] = Queue()
        self._state_lock = threading.Lock()
        self._state = RuntimeState.STARTING
        self._pw: Any = None
        self._sessions_by_profile: dict[str, _LiveSession] = {}

        self._thread = Thread(
            target=self._run,
            name="vidpool-browser-runtime",
            daemon=True,
        )
        self._thread.start()
        with self._state_lock:
            self._state = RuntimeState.RUNNING

    @property
    def state(self) -> RuntimeState:
        with self._state_lock:
            return self._state

    @property
    def _stopped(self) -> bool:
        with self._state_lock:
            return self._state in (RuntimeState.STOPPING, RuntimeState.STOPPED, RuntimeState.FAILED)

    def _poison_queue(self, reason: str) -> None:
        """Drain queued commands and fail them deterministically."""
        while True:
            try:
                item = self._queue.get_nowait()
            except Empty:
                break
            if item is _STOP:
                self._queue.put(_STOP)
                break
            if isinstance(item, _BrowserCommand) and not item.future.done():
                item.future.set_exception(
                    BrowserUnavailable(f"Browser runtime failed: {reason}")
                )

    def _submit(
        self,
        operation: Callable[[], T],
        *,
        timeout: float | None = None,
        operation_name: str = "",
    ) -> T:
        timeout_s = timeout if timeout is not None else self._command_timeout_s
        command_id = str(uuid.uuid4())
        submitted_at = time.perf_counter()
        deadline = (submitted_at + timeout_s) if timeout_s > 0 else None

        with self._state_lock:
            if self._state != RuntimeState.RUNNING:
                raise BrowserUnavailable(f"Browser runtime is {self._state.value.lower()}")

            future: Future[T] = Future()
            command = _BrowserCommand(
                command_id=command_id,
                operation=operation,
                future=future,
                operation_name=operation_name,
                submitted_at=submitted_at,
                deadline=deadline,
            )
            self._queue.put(command)

        try:
            return future.result(timeout=timeout_s if timeout_s > 0 else None)
        except TimeoutError as exc:
            elapsed = time.perf_counter() - submitted_at
            logger.error(
                "browser_command_timeout command_id=%s operation=%s elapsed=%.2fs",
                command_id,
                operation_name,
                elapsed,
            )
            with self._state_lock:
                self._state = RuntimeState.FAILED
            self._poison_queue(f"Command '{operation_name}' timed out after {timeout_s}s")
            raise BrowserCommandTimeout(
                f"Browser operation '{operation_name}' timed out after {timeout_s}s"
            ) from exc

    def _run(self) -> None:
        logger.info("browser_runtime_start thread_id=%s", threading.get_ident())
        while True:
            try:
                item = self._queue.get()
            except Exception:
                break

            if item is _STOP:
                break

            command: _BrowserCommand[Any] = item  # type: ignore
            if command.future.done():
                continue

            try:
                result = command.operation()
            except BaseException as exc:
                if not command.future.done():
                    command.future.set_exception(exc)
            else:
                if not command.future.done():
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
            logger.info("browser_launch_attempt channel=%s", channel)
            try:
                if self._launcher is not None:
                    context = self._launcher(profile_path, channel, is_headless)
                else:
                    context = self._default_launch(profile_path, channel, is_headless)
                logger.info("browser_launch_success channel=%s", channel)
                break
            except BrowserLaunchFailed as exc:
                last_error = exc
                logger.warning(
                    "browser_launch_failed channel=%s error_type=%s error=%s",
                    channel,
                    exc.__class__.__name__,
                    exc,
                )
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "browser_launch_failed channel=%s error_type=%s error=%s",
                    channel,
                    exc.__class__.__name__,
                    exc,
                )

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
        nav_timeout_s = (self._navigation_timeout_ms + self._launch_timeout_ms) / 1000.0 + 10.0
        self._submit(
            lambda: self._open_login(
                profile_key=profile_key,
                login_url=login_url,
            ),
            timeout=nav_timeout_s,
            operation_name=f"open_login:{profile_key}",
        )

    def _on_context_closed(self, profile_key: str) -> None:
        popped = self._sessions_by_profile.pop(profile_key, None)
        if popped is not None:
            logger.info("browser_session_closed profile_key=%s", profile_key)

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

        try:
            context = self._launch_persistent_context(profile_path)
        except Exception as exc:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.warning(
                "browser_open_failed profile_key=%s elapsed_ms=%d error_type=%s",
                profile_key,
                elapsed_ms,
                exc.__class__.__name__,
            )
            raise

        if hasattr(context, "on"):
            with contextlib.suppress(Exception):
                context.on("close", lambda *_: self._on_context_closed(profile_key))

        self._sessions_by_profile[profile_key] = _LiveSession(
            profile_key=profile_key,
            context=context,
        )
        logger.info("browser_session_registered profile_key=%s", profile_key)

        # Provider navigation: isolated from browser launch lifecycle
        logger.info("browser_navigation_start profile_key=%s", profile_key)
        nav_start_time = time.perf_counter()
        try:
            pages = context.pages
            page = pages[0] if pages else context.new_page()
            try:
                page.goto(
                    login_url,
                    wait_until="commit",
                    timeout=self._navigation_timeout_ms,
                )
            except TypeError:
                page.goto(login_url)
            nav_elapsed_ms = int((time.perf_counter() - nav_start_time) * 1000)
            logger.info(
                "browser_navigation_success profile_key=%s elapsed_ms=%d",
                profile_key,
                nav_elapsed_ms,
            )
        except Exception as exc:
            nav_elapsed_ms = int((time.perf_counter() - nav_start_time) * 1000)
            logger.warning(
                "browser_navigation_failed profile_key=%s elapsed_ms=%d error_type=%s error=%s",
                profile_key,
                nav_elapsed_ms,
                exc.__class__.__name__,
                exc,
            )
            # Invariant: navigation failure MUST NOT close the browser context
            # or poison the runtime if the context was successfully launched.

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        logger.info(
            "browser_open_success profile_key=%s elapsed_ms=%d",
            profile_key,
            elapsed_ms,
        )

    def close_profile(self, profile_key: str) -> None:
        self._submit(
            lambda: self._close_profile(profile_key),
            timeout=self._command_timeout_s,
            operation_name=f"close_profile:{profile_key}",
        )

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
        return self._submit(
            lambda: profile_key in self._sessions_by_profile,
            timeout=self._command_timeout_s,
            operation_name=f"has_open_session:{profile_key}",
        )

    def run_active(
        self,
        profile_key: str,
        operation: Callable[[Any], T],
    ) -> T:
        return self._submit(
            lambda: self._run_active(
                profile_key=profile_key,
                operation=operation,
            ),
            timeout=self._command_timeout_s,
            operation_name=f"run_active:{profile_key}",
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
        timeout_s = (self._launch_timeout_ms / 1000.0) + self._command_timeout_s
        return self._submit(
            lambda: self._run_persisted_profile(
                profile_key=profile_key,
                operation=operation,
            ),
            timeout=timeout_s,
            operation_name=f"run_persisted_profile:{profile_key}",
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
            if not self._thread.is_alive():
                self._resolver.delete(profile_key)
                return
            if self._state != RuntimeState.RUNNING:
                raise BrowserUnavailable(
                    f"Cannot delete profile: browser runtime is {self._state.value.lower()} and owner thread is still active"
                )
        self._submit(
            lambda: self._delete_profile(profile_key),
            timeout=self._command_timeout_s,
            operation_name=f"delete_profile:{profile_key}",
        )

    def _delete_profile(self, profile_key: str) -> None:
        if profile_key in self._sessions_by_profile:
            raise BrowserProfileInUse(
                f"Cannot delete profile '{profile_key}' while a browser session is active"
            )
        logger.info("browser_profile_delete profile_key=%s", profile_key)
        self._resolver.delete(profile_key)

    def close_all(self) -> None:
        with self._state_lock:
            if self._state == RuntimeState.STOPPED and not self._thread.is_alive():
                return
            if self._state not in (RuntimeState.RUNNING, RuntimeState.FAILED):
                # If already stopping, do not re-initiate stopping logic
                pass
            else:
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

        shutdown_cmd_timeout = max(0.05, min(self._shutdown_timeout_s, 5.0))
        shutdown_future: Future[None] = Future()
        command = _BrowserCommand(
            command_id=str(uuid.uuid4()),
            operation=shutdown,
            future=shutdown_future,
            operation_name="shutdown",
            submitted_at=time.perf_counter(),
            deadline=time.perf_counter() + shutdown_cmd_timeout,
        )
        self._queue.put(command)
        try:
            shutdown_future.result(timeout=shutdown_cmd_timeout)
        except Exception:
            logger.exception("Failed executing browser shutdown command")

        self._queue.put(_STOP)
        self._thread.join(timeout=self._shutdown_timeout_s)

        with self._state_lock:
            if self._thread.is_alive():
                self._state = RuntimeState.FAILED
                raise BrowserShutdownTimeout(
                    f"Browser runtime owner thread failed to stop within {self._shutdown_timeout_s}s"
                )
            self._state = RuntimeState.STOPPED
        logger.info("browser_runtime_stopped")
