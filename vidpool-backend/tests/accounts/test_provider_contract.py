from urllib.parse import urlparse

from app.modules.accounts.application.ports import (
    ProviderAuthPort,
    ProviderIdentity,
    SessionValidation,
)
from tests.accounts.fakes import FakeProviderAuthAdapter


def assert_provider_auth_contract(
    adapter: ProviderAuthPort,
    profile_key: str,
    expected_valid: bool = True,
) -> None:
    # 1. Provider key is a non-empty string
    assert isinstance(adapter.provider_key, str)
    assert len(adapter.provider_key.strip()) > 0

    # 2. Login URL is a non-empty, parseable HTTP/HTTPS URL
    login_url = adapter.login_url()
    assert isinstance(login_url, str)
    assert len(login_url.strip()) > 0
    parsed = urlparse(login_url)
    assert parsed.scheme in ("http", "https")
    assert parsed.netloc != ""

    # 3. Active session validation returns typed SessionValidation
    active_res = adapter.validate_active_session(profile_key)
    assert isinstance(active_res, SessionValidation)
    assert isinstance(active_res.valid, bool)
    assert active_res.valid is expected_valid

    # 4. Identity resolution returns typed ProviderIdentity
    if expected_valid:
        identity = adapter.resolve_identity(profile_key)
        assert isinstance(identity, ProviderIdentity)
        assert isinstance(identity.display_name, str)
        assert len(identity.display_name.strip()) > 0
        assert isinstance(identity.external_identity, str)
        assert len(identity.external_identity.strip()) > 0

    # 5. Persisted session validation works and returns SessionValidation
    persisted_res = adapter.validate_persisted_session(profile_key)
    assert isinstance(persisted_res, SessionValidation)
    assert persisted_res.valid is expected_valid


class TestFakeProviderAuthContract:
    def test_satisfies_protocol(self) -> None:
        adapter = FakeProviderAuthAdapter(provider_key="test-provider")
        assert isinstance(adapter, ProviderAuthPort)

    def test_valid_session_contract(self) -> None:
        adapter = FakeProviderAuthAdapter(provider_key="test-provider", valid_session=True)
        assert_provider_auth_contract(
            adapter=adapter,
            profile_key="profiles/valid",
            expected_valid=True,
        )

    def test_invalid_session_contract(self) -> None:
        adapter = FakeProviderAuthAdapter(provider_key="test-provider", valid_session=False)
        assert_provider_auth_contract(
            adapter=adapter,
            profile_key="profiles/invalid",
            expected_valid=False,
        )
