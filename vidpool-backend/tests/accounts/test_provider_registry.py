import pytest

from app.modules.accounts.application.ports import ProviderRegistryPort
from app.modules.accounts.infrastructure.providers.registry import ProviderRegistry
from tests.accounts.fakes import FakeProviderAuthAdapter


def test_satisfies_provider_registry_port() -> None:
    registry = ProviderRegistry()
    assert isinstance(registry, ProviderRegistryPort)


def test_empty_registry() -> None:
    registry = ProviderRegistry()
    assert registry.list() == []
    assert registry.get_auth("any") is None


def test_register_and_lookup() -> None:
    adapter_a = FakeProviderAuthAdapter(provider_key="provider-a", display_name="Provider Alpha")
    adapter_b = FakeProviderAuthAdapter(provider_key="provider-b", display_name="Provider Beta")

    registry = ProviderRegistry([adapter_b, adapter_a])

    assert registry.get_auth("provider-a") is adapter_a
    assert registry.get_auth("provider-b") is adapter_b
    assert registry.get_auth("provider-c") is None

    definitions = registry.list()
    assert len(definitions) == 2
    assert [d.key for d in definitions] == ["provider-a", "provider-b"]
    assert definitions[0].display_name == "Provider Alpha"
    assert definitions[1].display_name == "Provider Beta"


def test_duplicate_provider_key_rejected() -> None:
    adapter_1 = FakeProviderAuthAdapter(provider_key="same-key")
    adapter_2 = FakeProviderAuthAdapter(provider_key="same-key")

    with pytest.raises(ValueError, match="Duplicate provider key"):
        ProviderRegistry([adapter_1, adapter_2])
