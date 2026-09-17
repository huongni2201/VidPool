from collections.abc import Callable
from dataclasses import dataclass
import logging
from pathlib import Path
from typing import Any
import uuid

from app.modules.accounts.application.ports import BrowserSessionHandle, BrowserSessionPort
from app.modules.accounts.domain.errors import (
    BrowserLaunchFailed,
    BrowserProfileInUse,
    BrowserUnavailable,
)
from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)

logger = logging.getLogger(__name__)

LauncherType = Callable[[Path, str, bool], Any]


class _PersistentContextWrapper:
    def __init__(self, context: Any, pw: Any | None = None) -> None:
        self._context = context
        self._pw = pw

    @property
    def pages(self) -> list[Any]:
        return getattr(self._context, "pages", [])

    def new_page(self) -> Any:
        return self._context.new_page()

    def close(self) -> None:
        try:
            self._context.close()
        finally:
            if self._pw is not None:
                try:
                    self._pw.stop()
                except Exception:
                    pass


def _default_launcher(profile_path: Path, channel: str, headless: bool) -> Any:
    from playwright.sync_api import Error as PlaywrightError, sync_playwright

    pw = sync_playwright().start()
    try:
        context = pw.chromium.launch_persistent_context(
            user_data_dir=str(profile_path),
            channel=channel,
            headless=headless,
        )
        return _PersistentContextWrapper(context, pw)
    except (PlaywrightError, Exception) as exc:
        try:
            pw.stop()
        except Exception:
            pass
        raise BrowserLaunchFailed(f"Failed to launch browser with channel '{channel}': {exc}") from exc


@dataclass
class _LiveSession:
    id: str
    profile_key: str
    context: Any


class PlaywrightBrowserSessionManager(BrowserSessionPort):
    """Manages persistent browser sessions for account authentication."""

    DEFAULT_CHANNELS = ("msedge", "chrome")

    def __init__(
        self,
        resolver: BrowserProfilePathResolver | None = None,
        launcher: LauncherType | None = None,
        headless: bool = False,
        channels: tuple[str, ...] = DEFAULT_CHANNELS,
    ) -> None:
        self._resolver = resolver or BrowserProfilePathResolver()
        self._launcher = launcher or _default_launcher
        self._headless = headless
        self._channels = channels
        self._sessions_by_id: dict[str, _LiveSession] = {}
        self._session_ids_by_profile: dict[str, str] = {}

    def open_login(
        self,
        *,
        provider_key: str,
        profile_key: str,
        login_url: str,
    ) -> BrowserSessionHandle:
        del provider_key  # Validated in profile_key resolution
        if self.has_open_session(profile_key):
            raise BrowserProfileInUse(f"Browser profile '{profile_key}' is already open")

        profile_path = self._resolver.resolve(profile_key)
        profile_path.mkdir(parents=True, exist_ok=True)

        context = None
        last_error = None
        for channel in self._channels:
            try:
                context = self._launcher(profile_path, channel, self._headless)
                break
            except BrowserLaunchFailed as exc:
                last_error = exc
                logger.warning("Failed launching browser channel '%s': %s", channel, exc)
            except Exception as exc:
                last_error = exc
                logger.warning("Unexpected error launching browser channel '%s': %s", channel, exc)

        if context is None:
            raise BrowserUnavailable(
                f"No supported browser channel could be launched for '{profile_key}'"
            ) from last_error

        try:
            pages = context.pages
            page = pages[0] if pages else context.new_page()
            page.goto(login_url)
        except Exception as exc:
            try:
                context.close()
            except Exception:
                pass
            raise BrowserUnavailable(f"Failed to navigate to login URL: {exc}") from exc

        session_id = f"session-{uuid.uuid4()}"
        session = _LiveSession(id=session_id, profile_key=profile_key, context=context)
        self._sessions_by_id[session_id] = session
        self._session_ids_by_profile[profile_key] = session_id

        return BrowserSessionHandle(id=session_id, profile_key=profile_key)

    def close(self, session_id: str) -> None:
        session = self._sessions_by_id.pop(session_id, None)
        if session is not None:
            self._session_ids_by_profile.pop(session.profile_key, None)
            try:
                session.context.close()
            except Exception as exc:
                logger.warning("Error closing browser session context '%s': %s", session_id, exc)

    def has_open_session(self, profile_key: str) -> bool:
        return profile_key in self._session_ids_by_profile

    def delete_profile(self, profile_key: str) -> None:
        if self.has_open_session(profile_key):
            raise BrowserProfileInUse(
                f"Cannot delete profile '{profile_key}' while a browser session is active"
            )
        self._resolver.delete(profile_key)

    def close_all(self) -> None:
        for session in list(self._sessions_by_id.values()):
            try:
                session.context.close()
            except Exception as exc:
                logger.warning("Error closing browser session '%s' during close_all: %s", session.id, exc)
        self._sessions_by_id.clear()
        self._session_ids_by_profile.clear()
