from __future__ import annotations

from collections.abc import Callable
from typing import Any, Protocol, TypeVar

from app.modules.accounts.application.ports import (
    ProviderAuthPort,
    ProviderIdentity,
    SessionValidation,
)

T = TypeVar("T")


class BrowserAutomationRuntime(Protocol):
    def run_active(
        self,
        profile_key: str,
        operation: Callable[[Any], T],
    ) -> T: ...

    def run_persisted_profile(
        self,
        profile_key: str,
        operation: Callable[[Any], T],
    ) -> T: ...


class BrowserBackedAuthAdapter(ProviderAuthPort):
    """Base infrastructure adapter for providers authenticated via browser profiles."""

    provider_key: str = ""
    display_name: str = ""
    auth_kind: str = "browser_session"

    def __init__(
        self,
        browser_runtime: BrowserAutomationRuntime,
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
