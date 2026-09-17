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

    registry = FakeProviderRegistry(auth_adapters=[auth])
    assert isinstance(registry, ProviderRegistryPort)
