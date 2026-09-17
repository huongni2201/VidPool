from typing import Any

from app.modules.accounts.infrastructure.providers.dreamina.auth_probe import (
    DreaminaAuthProbe,
    DreaminaAuthState,
)


class FakePage:
    def __init__(
        self,
        url: str = "https://dreamina.capcut.com/tools/ai-video-generator",
        eval_responses: dict[str, Any] | None = None,
        default_eval: Any = None,
    ) -> None:
        self.url = url
        self.goto_calls: list[str] = []
        self._eval_responses = eval_responses or {}
        self._default_eval = default_eval

    def goto(self, url: str, **kwargs: Any) -> None:
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


def test_probe_returns_false_when_no_trusted_authenticated_signal_exists() -> None:
    page = FakePage(
        eval_responses={
            "LOGGED_OUT": False,
            "LOGGED_IN": False,
        }
    )
    context = FakeContext(pages=[page])
    probe = DreaminaAuthProbe("https://dreamina.capcut.com/tools/ai-video-generator")

    result = probe.inspect(context)

    assert result.authenticated is False


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
