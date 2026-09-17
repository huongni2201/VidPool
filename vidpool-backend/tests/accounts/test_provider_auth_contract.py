from urllib.parse import urlparse
import pytest

from app.modules.accounts.application.ports import (
    BrowserSessionHandle,
    ProviderAuthPort,
    ProviderIdentity,
    SessionValidation,
)
from tests.accounts.fakes import FakeProviderAuthAdapter


def _verify_provider_auth_contract(adapter: ProviderAuthPort) -> None:
    # 1. Stable provider_key
    assert isinstance(adapter.provider_key, str)
    assert len(adapter.provider_key) > 0

    # 2. Return an HTTPS login URL
    url = adapter.login_url()
    assert isinstance(url, str)
    parsed = urlparse(url)
    assert parsed.scheme == "https", f"Provider login URL must use HTTPS, got: {url}"

    # 3. Validate persistent profile
    persisted_validation = adapter.validate_persisted_session("browser-profile/test/1")
    assert isinstance(persisted_validation, SessionValidation)
    assert isinstance(persisted_validation.valid, bool)

    # 4. In active session validation
    handle = BrowserSessionHandle(id="sess-1", profile_key="browser-profile/test/1")
    session_validation = adapter.validate_session(handle)
    assert isinstance(session_validation, SessionValidation)
    assert isinstance(session_validation.valid, bool)

    # 5. Resolve identity
    if session_validation.valid:
        identity = adapter.resolve_identity(handle)
        assert isinstance(identity, ProviderIdentity)
        assert isinstance(identity.display_name, str)
        assert isinstance(identity.external_identity, str)
        # Never expose cookies or tokens in display_name or external_identity
        assert "cookie" not in identity.display_name.lower()
        assert "token" not in identity.display_name.lower()
        assert "password" not in identity.display_name.lower()


def test_fake_provider_auth_adapter_satisfies_contract() -> None:
    adapter = FakeProviderAuthAdapter(
        provider_key="sample-provider",
        valid_session=True,
        display_name="Creator User",
        external_identity="usr-12345",
    )
    _verify_provider_auth_contract(adapter)


def test_contract_detects_non_https_url() -> None:
    class InsecureAdapter(FakeProviderAuthAdapter):
        def login_url(self) -> str:
            return "http://insecure.test/login"

    adapter = InsecureAdapter()
    with pytest.raises(AssertionError, match="must use HTTPS"):
        _verify_provider_auth_contract(adapter)


def test_contract_detects_invalid_session() -> None:
    adapter = FakeProviderAuthAdapter(valid_session=False)
    handle = BrowserSessionHandle(id="sess-1", profile_key="browser-profile/test/1")
    assert adapter.validate_session(handle).valid is False
    assert adapter.validate_persisted_session("browser-profile/test/1").valid is False
