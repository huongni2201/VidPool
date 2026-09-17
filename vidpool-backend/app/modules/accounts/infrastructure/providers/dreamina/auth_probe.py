from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)

class DreaminaProbeUnavailable(RuntimeError):
    """Raised when Dreamina authentication state cannot be determined reliably."""


LOGGED_OUT_SCRIPT = """/* LOGGED_OUT */ () => {
    const gtwEl = document.getElementById('__GTW_USER_ID__');
    if (gtwEl && gtwEl.textContent) {
        try {
            const data = JSON.parse(gtwEl.textContent);
            if (data.GATEWAY_INJECTED_USER_ID === "0") {
                return true;
            }
        } catch (e) {}
    }
    const buttons = Array.from(document.querySelectorAll('button, a'));
    return buttons.some(b => {
        const text = (b.textContent || '').trim().toLowerCase();
        return text === 'sign in' || text === 'log in' || text === 'login';
    });
}"""

LOGGED_IN_SCRIPT = """/* LOGGED_IN */ () => {
    const gtwEl = document.getElementById('__GTW_USER_ID__');
    if (gtwEl && gtwEl.textContent) {
        try {
            const data = JSON.parse(gtwEl.textContent);
            if (data.GATEWAY_INJECTED_USER_ID && data.GATEWAY_INJECTED_USER_ID !== "0") {
                return true;
            }
        } catch (e) {}
    }
    const avatar = document.querySelector('[data-testid="user-avatar"], [aria-label*="account" i]');
    return Boolean(avatar);
}"""

IDENTITY_SCRIPT = """/* IDENTITY */ () => {
    let externalId = null;
    let displayName = null;

    const gtwEl = document.getElementById('__GTW_USER_ID__');
    if (gtwEl && gtwEl.textContent) {
        try {
            const data = JSON.parse(gtwEl.textContent);
            if (data.GATEWAY_INJECTED_USER_ID && data.GATEWAY_INJECTED_USER_ID !== "0") {
                externalId = String(data.GATEWAY_INJECTED_USER_ID);
            }
        } catch (e) {}
    }

    const nameEl = document.querySelector('[data-testid="user-name"]');
    if (nameEl && nameEl.textContent) {
        displayName = nameEl.textContent.trim();
    }

    if (!displayName && externalId) {
        displayName = `Dreamina User ${externalId}`;
    }

    return {
        external_identity: externalId,
        display_name: displayName,
    };
}"""


@dataclass(frozen=True, slots=True)
class DreaminaAuthState:
    authenticated: bool
    display_name: str | None = None
    external_identity: str | None = None


def _get_or_create_page(context: Any) -> Any:
    pages = getattr(context, "pages", None)
    if pages:
        return pages[0]
    return context.new_page()


class DreaminaAuthProbe:
    def __init__(
        self,
        workspace_url: str = "https://dreamina.capcut.com/tools/ai-video-generator",
        timeout_ms: int = 15_000,
    ) -> None:
        self._workspace_url = workspace_url
        self._timeout_ms = timeout_ms

    def inspect(self, context: Any) -> DreaminaAuthState:
        start_time = time.perf_counter()
        try:
            page = _get_or_create_page(context)
            self._ensure_workspace(page)

            if self._is_logged_out(page):
                state = DreaminaAuthState(authenticated=False)
            elif self._is_logged_in(page):
                display_name, external_identity = self._read_identity(page)
                state = DreaminaAuthState(
                    authenticated=True,
                    display_name=display_name,
                    external_identity=external_identity,
                )
            else:
                raise DreaminaProbeUnavailable(
                    "Dreamina authentication state is indeterminate"
                )

            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.info(
                "dreamina_probe_complete provider_key=dreamina authenticated=%s elapsed_ms=%d",
                state.authenticated,
                elapsed_ms,
            )
            return state
        except DreaminaProbeUnavailable:
            raise
        except Exception as exc:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.warning(
                "dreamina_probe_failed provider_key=dreamina error_type=%s elapsed_ms=%d",
                exc.__class__.__name__,
                elapsed_ms,
            )
            raise DreaminaProbeUnavailable(
                "Dreamina authentication probe could not complete"
            ) from exc

    def _ensure_workspace(self, page: Any) -> None:
        current_url = getattr(page, "url", "")
        if (
            not current_url
            or current_url == "about:blank"
            or not current_url.startswith("https://dreamina.capcut.com")
        ):
            page.goto(
                self._workspace_url,
                wait_until="domcontentloaded",
                timeout=self._timeout_ms,
            )

    def _is_logged_out(self, page: Any) -> bool:
        url = getattr(page, "url", "")
        if "need_login=true" in url or "/login" in url or "/signin" in url:
            return True
        return bool(page.evaluate(LOGGED_OUT_SCRIPT))

    def _is_logged_in(self, page: Any) -> bool:
        return bool(page.evaluate(LOGGED_IN_SCRIPT))

    def _read_identity(self, page: Any) -> tuple[str | None, str | None]:
        result = page.evaluate(IDENTITY_SCRIPT)
        if not isinstance(result, dict):
            raise DreaminaProbeUnavailable(
                "Dreamina identity result has an unexpected shape"
            )
        return result.get("display_name"), result.get("external_identity")

