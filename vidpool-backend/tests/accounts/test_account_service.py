from app.modules.accounts.application.ports import (
    AccountRepositoryPort,
    BrowserSessionHandle,
    BrowserSessionPort,
    ProviderAuthPort,
    ProviderDefinition,
    ProviderIdentity,
    ProviderRegistryPort,
    SessionValidation,
)
from tests.accounts.fakes import (
    FakeAccountRepository,
    FakeBrowserSessionManager,
    FakeProviderAuthAdapter,
    FakeProviderRegistry,
)


def test_ports_and_fakes_satisfy_protocols() -> None:
    repo = FakeAccountRepository()
    assert isinstance(repo, AccountRepositoryPort)

    browser = FakeBrowserSessionManager()
    assert isinstance(browser, BrowserSessionPort)

    auth = FakeProviderAuthAdapter(provider_key="test-provider")
    assert isinstance(auth, ProviderAuthPort)

    handle = BrowserSessionHandle(id="sess-1", profile_key="profiles/test")
    val = auth.validate_session(handle)
    assert val.valid is True

    identity = auth.resolve_identity(handle)
    assert identity.display_name == "Fake User"

    persisted_val = auth.validate_persisted_session("profiles/test")
    assert persisted_val.valid is True

    registry = FakeProviderRegistry(auth_adapters=[auth])
    assert isinstance(registry, ProviderRegistryPort)
