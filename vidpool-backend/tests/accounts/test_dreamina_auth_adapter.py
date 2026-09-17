from typing import Any

import pytest

from app.modules.accounts.domain.errors import SessionInvalid
from app.modules.accounts.infrastructure.providers.dreamina.auth_adapter import (
    DreaminaAuthAdapter,
)
from app.modules.accounts.infrastructure.providers.dreamina.auth_probe import (
    DreaminaAuthProbe,
    DreaminaAuthState,
    DreaminaProbeUnavailable,
)
from tests.accounts.test_provider_auth_contract import assert_provider_auth_contract


class FakePage:
    def __init__(
        self,
        url: str = "https://dreamina.capcut.com/tools/ai-video-generator",
        eval_responses: dict[str, Any] | None = None,
        default_eval: Any = None,
        goto_error: Exception | None = None,
    ) -> None:
        self.url = url
        self.goto_calls: list[str] = []
        self._eval_responses = eval_responses or {}
        self._default_eval = default_eval
        self.goto_error = goto_error

    def goto(self, url: str, **kwargs: Any) -> None:
        if self.goto_error is not None:
            raise self.goto_error
        self.goto_calls.append(url)
        self.url = url

    def evaluate(self, expression: str, arg: Any = None) -> Any:
        for key, val in self._eval_responses.items():
            if key in expression:
                return val
        if callable(self._default_eval):
            return self._default_eval(expression, arg)
        return self._default_eval


class FakeContext:
    def __init__(self, pages: list[FakePage] | None = None) -> None:
        self.pages = pages or []
        self.new_pages_created: list[FakePage] = []

    def new_page(self) -> FakePage:
        page = FakePage()
        self.pages.append(page)
        self.new_pages_created.append(page)
        return page


def test_probe_returns_logged_out_when_logged_out_signal_present() -> None:
    page = FakePage(
        eval_responses={
            "LOGGED_OUT": True,
            "LOGGED_IN": False,
        }
    )
    context = FakeContext(pages=[page])
    probe = DreaminaAuthProbe("https://dreamina.capcut.com/tools/ai-video-generator")

    result = probe.inspect(context)

    assert isinstance(result, DreaminaAuthState)
    assert result.authenticated is False
    assert result.display_name is None
    assert result.external_identity is None


def test_probe_returns_authenticated_with_identity() -> None:
    page = FakePage(
        eval_responses={
            "LOGGED_OUT": False,
            "LOGGED_IN": True,
            "IDENTITY": {
                "external_identity": "dreamina-user-98765",
                "display_name": "Dreamina Creator",
            },
        }
    )
    context = FakeContext(pages=[page])
    probe = DreaminaAuthProbe("https://dreamina.capcut.com/tools/ai-video-generator")

    result = probe.inspect(context)

    assert isinstance(result, DreaminaAuthState)
    assert result.authenticated is True
    assert result.display_name == "Dreamina Creator"
    assert result.external_identity == "dreamina-user-98765"


def test_probe_raises_when_auth_state_is_indeterminate() -> None:
    page = FakePage(
        eval_responses={
            "LOGGED_OUT": False,
            "LOGGED_IN": False,
        }
    )
    context = FakeContext(pages=[page])
    probe = DreaminaAuthProbe()

    with pytest.raises(
        DreaminaProbeUnavailable,
        match="indeterminate",
    ):
        probe.inspect(context)


def test_probe_raises_when_evaluation_fails() -> None:
    def raise_eval(expression: str, arg: Any = None) -> Any:
        raise RuntimeError("javascript evaluation failed")

    page = FakePage(default_eval=raise_eval)
    context = FakeContext(pages=[page])
    probe = DreaminaAuthProbe()

    with pytest.raises(DreaminaProbeUnavailable):
        probe.inspect(context)


def test_probe_raises_when_navigation_fails() -> None:
    page = FakePage(url="about:blank", goto_error=RuntimeError("navigation timeout"))
    context = FakeContext(pages=[page])
    probe = DreaminaAuthProbe()

    with pytest.raises(DreaminaProbeUnavailable):
        probe.inspect(context)


def test_probe_returns_authenticated_without_identity() -> None:
    page = FakePage(
        eval_responses={
            "LOGGED_OUT": False,
            "LOGGED_IN": True,
            "IDENTITY": {
                "external_identity": None,
                "display_name": None,
            },
        }
    )
    context = FakeContext(pages=[page])
    probe = DreaminaAuthProbe()

    result = probe.inspect(context)

    assert result.authenticated is True
    assert result.display_name is None
    assert result.external_identity is None


def test_probe_never_requires_cookie_values() -> None:
    page = FakePage(
        eval_responses={
            "LOGGED_OUT": False,
            "LOGGED_IN": True,
            "IDENTITY": {
                "external_identity": "user-12345",
                "display_name": "Valid User",
            },
        }
    )
    context = FakeContext(pages=[page])
    probe = DreaminaAuthProbe("https://dreamina.capcut.com/tools/ai-video-generator")

    result = probe.inspect(context)

    assert result.authenticated is True
    assert "cookie" not in (result.display_name or "").lower()
    assert "cookie" not in (result.external_identity or "").lower()


class FakeBrowserAutomationRuntime:
    def __init__(self, context: Any) -> None:
        self.context = context
        self.active_calls: list[str] = []
        self.persisted_calls: list[str] = []

    def run_active(self, profile_key: str, operation: Any) -> Any:
        self.active_calls.append(profile_key)
        return operation(self.context)

    def run_persisted_profile(self, profile_key: str, operation: Any) -> Any:
        self.persisted_calls.append(profile_key)
        return operation(self.context)


def test_dreamina_adapter_has_stable_metadata() -> None:
    fake_runtime = FakeBrowserAutomationRuntime(FakeContext())
    adapter = DreaminaAuthAdapter(fake_runtime)

    assert adapter.provider_key == "dreamina"
    assert adapter.display_name == "Dreamina (Seedance)"
    assert adapter.auth_kind == "browser_session"
    assert adapter.login_url().startswith("https://")


def test_validate_active_session_uses_active_browser_profile() -> None:
    page = FakePage(
        eval_responses={
            "LOGGED_OUT": False,
            "LOGGED_IN": True,
            "IDENTITY": {"external_identity": "123", "display_name": "User"},
        }
    )
    context = FakeContext(pages=[page])
    fake_runtime = FakeBrowserAutomationRuntime(context)
    adapter = DreaminaAuthAdapter(fake_runtime)

    res = adapter.validate_active_session("profile-key-1")

    assert res.valid is True
    assert fake_runtime.active_calls == ["profile-key-1"]


def test_validate_persisted_session_uses_persisted_profile() -> None:
    page = FakePage(
        eval_responses={
            "LOGGED_OUT": False,
            "LOGGED_IN": True,
            "IDENTITY": {"external_identity": "123", "display_name": "User"},
        }
    )
    context = FakeContext(pages=[page])
    fake_runtime = FakeBrowserAutomationRuntime(context)
    adapter = DreaminaAuthAdapter(fake_runtime)

    res = adapter.validate_persisted_session("profile-key-2")

    assert res.valid is True
    assert fake_runtime.persisted_calls == ["profile-key-2"]


def test_resolve_identity_returns_provider_identity() -> None:
    page = FakePage(
        eval_responses={
            "LOGGED_OUT": False,
            "LOGGED_IN": True,
            "IDENTITY": {"external_identity": "ext-id", "display_name": "Display Name"},
        }
    )
    context = FakeContext(pages=[page])
    fake_runtime = FakeBrowserAutomationRuntime(context)
    adapter = DreaminaAuthAdapter(fake_runtime)

    identity = adapter.resolve_identity("profile-key-3")

    assert identity.display_name == "Display Name"
    assert identity.external_identity == "ext-id"
    assert fake_runtime.active_calls == ["profile-key-3"]


def test_resolve_identity_fails_when_identity_is_missing() -> None:
    page = FakePage(
        eval_responses={
            "LOGGED_OUT": False,
            "LOGGED_IN": True,
            "IDENTITY": {"external_identity": None, "display_name": None},
        }
    )
    context = FakeContext(pages=[page])
    fake_runtime = FakeBrowserAutomationRuntime(context)
    adapter = DreaminaAuthAdapter(fake_runtime)

    with pytest.raises(SessionInvalid):
        adapter.resolve_identity("profile-key-4")


def test_dreamina_adapter_satisfies_generic_provider_contract() -> None:
    page = FakePage(
        eval_responses={
            "LOGGED_OUT": False,
            "LOGGED_IN": True,
            "IDENTITY": {"external_identity": "ext-1", "display_name": "Test User"},
        }
    )
    context = FakeContext(pages=[page])
    fake_runtime = FakeBrowserAutomationRuntime(context)
    adapter = DreaminaAuthAdapter(fake_runtime)

    assert_provider_auth_contract(adapter, "profile-test", expected_valid=True)


