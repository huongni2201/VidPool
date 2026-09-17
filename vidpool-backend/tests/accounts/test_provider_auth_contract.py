from urllib.parse import urlparse

import pytest

from app.modules.accounts.application.ports import (
    ProviderAuthPort,
    ProviderIdentity,
    SessionValidation,
)
from tests.accounts.fakes import FakeProviderAuthAdapter


def assert_provider_auth_contract(
    adapter: ProviderAuthPort,
    profile_key: str,
    *,
    expected_valid: bool = True,
) -> None:
    assert isinstance(adapter, ProviderAuthPort)
    assert adapter.provider_key.strip()

    login_url = adapter.login_url()
    parsed = urlparse(login_url)

    assert parsed.scheme == "https", f"Provider login URL must use HTTPS, got: {login_url}"
    assert parsed.netloc

    active = adapter.validate_active_session(profile_key)
    assert isinstance(active, SessionValidation)
    assert active.valid is expected_valid

    persisted = adapter.validate_persisted_session(profile_key)
    assert isinstance(persisted, SessionValidation)
    assert persisted.valid is expected_valid

    if expected_valid:
        identity = adapter.resolve_identity(profile_key)

        assert isinstance(identity, ProviderIdentity)
        assert identity.display_name.strip()
        assert identity.external_identity.strip()

        for value in (identity.display_name, identity.external_identity):
            lowered = value.lower()
            assert "cookie" not in lowered
            assert "token" not in lowered
            assert "password" not in lowered
            assert "authorization" not in lowered


def test_fake_provider_auth_adapter_satisfies_contract() -> None:
    adapter = FakeProviderAuthAdapter(
        provider_key="sample-provider",
        valid_session=True,
        display_name="Creator User",
        external_identity="usr-12345",
    )
    assert_provider_auth_contract(adapter, "browser-profile/test/1", expected_valid=True)


def test_contract_detects_non_https_url() -> None:
    class InsecureAdapter(FakeProviderAuthAdapter):
        def login_url(self) -> str:
            return "http://insecure.test/login"

    adapter = InsecureAdapter()
    with pytest.raises(AssertionError, match="must use HTTPS"):
        assert_provider_auth_contract(adapter, "browser-profile/test/1", expected_valid=True)


def test_contract_detects_invalid_session() -> None:
    adapter = FakeProviderAuthAdapter(valid_session=False)
    assert_provider_auth_contract(adapter, "browser-profile/test/1", expected_valid=False)

