from __future__ import annotations

from app.modules.accounts.application.ports import (
    ProviderIdentity,
    SessionValidation,
)
from app.modules.accounts.domain.errors import (
    ProviderUnavailable,
    SessionInvalid,
)
from app.modules.accounts.infrastructure.providers.browser_auth_base import (
    BrowserAutomationRuntime,
    BrowserBackedAuthAdapter,
)
from app.modules.accounts.infrastructure.providers.dreamina.auth_probe import (
    DreaminaAuthProbe,
    DreaminaProbeUnavailable,
)


class DreaminaAuthAdapter(BrowserBackedAuthAdapter):
    provider_key = "dreamina"
    display_name = "Dreamina (Seedance)"
    auth_kind = "browser_session"

    LOGIN_URL = "https://dreamina.capcut.com/tools/ai-video-generator"

    def __init__(
        self,
        browser_runtime: BrowserAutomationRuntime,
        probe: DreaminaAuthProbe | None = None,
    ) -> None:
        super().__init__(browser_runtime)
        self._probe = probe or DreaminaAuthProbe(self.LOGIN_URL)

    def login_url(self) -> str:
        return self.LOGIN_URL

    def validate_active_session(
        self,
        profile_key: str,
    ) -> SessionValidation:
        try:
            state = self._browser.run_active(
                profile_key,
                self._probe.inspect,
            )
        except DreaminaProbeUnavailable as exc:
            raise ProviderUnavailable(
                "Dreamina session validation is temporarily unavailable"
            ) from exc

        return SessionValidation(valid=state.authenticated)

    def resolve_identity(
        self,
        profile_key: str,
    ) -> ProviderIdentity:
        try:
            state = self._browser.run_active(
                profile_key,
                self._probe.inspect,
            )
        except DreaminaProbeUnavailable as exc:
            raise ProviderUnavailable(
                "Dreamina account identity is temporarily unavailable"
            ) from exc

        if not state.authenticated:
            raise SessionInvalid("Dreamina browser session is not authenticated")

        if not state.display_name or not state.external_identity:
            raise ProviderUnavailable(
                "Dreamina account identity is temporarily unavailable"
            )

        return ProviderIdentity(
            display_name=state.display_name,
            external_identity=state.external_identity,
        )

    def validate_persisted_session(
        self,
        profile_key: str,
    ) -> SessionValidation:
        try:
            state = self._browser.run_persisted_profile(
                profile_key,
                self._probe.inspect,
            )
        except DreaminaProbeUnavailable as exc:
            raise ProviderUnavailable(
                "Dreamina session validation is temporarily unavailable"
            ) from exc

        return SessionValidation(valid=state.authenticated)

