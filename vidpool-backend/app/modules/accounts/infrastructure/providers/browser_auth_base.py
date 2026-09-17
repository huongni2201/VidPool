from __future__ import annotations

from typing import Any
from collections.abc import Callable

from app.modules.accounts.application.ports import (
    ProviderAuthPort,
    ProviderIdentity,
    SessionValidation,
)
from app.modules.accounts.infrastructure.browser.runtime import BrowserRuntime


class BrowserBackedAuthAdapter(ProviderAuthPort):
    """Base infrastructure adapter for providers authenticated via browser profiles."""

    provider_key: str = ""
    display_name: str = ""
    auth_kind: str = "browser_session"

    def __init__(
        self,
        browser_runtime: BrowserRuntime,
    ) -> None:
        self._browser = browser_runtime

    def login_url(self) -> str:
        raise NotImplementedError

    def validate_active_session(
        self,
        profile_key: str,
    ) -> SessionValidation:
        raise NotImplementedError

    def resolve_identity(
        self,
        profile_key: str,
    ) -> ProviderIdentity:
        raise NotImplementedError

    def validate_persisted_session(
        self,
        profile_key: str,
    ) -> SessionValidation:
        raise NotImplementedError
