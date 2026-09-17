from collections.abc import Iterable

from app.modules.accounts.application.ports import (
    ProviderAuthPort,
    ProviderDefinition,
    ProviderRegistryPort,
)


class ProviderRegistry(ProviderRegistryPort):
    """Registry of provider authentication adapters."""

    def __init__(self, auth_adapters: Iterable[ProviderAuthPort] = ()) -> None:
        self._adapters: dict[str, ProviderAuthPort] = {}
        for adapter in auth_adapters:
            key = adapter.provider_key
            if key in self._adapters:
                raise ValueError(f"Duplicate provider key: '{key}'")
            self._adapters[key] = adapter

    def list(self) -> list[ProviderDefinition]:
        definitions = [
            ProviderDefinition(
                key=adapter.provider_key,
                display_name=getattr(adapter, "display_name", adapter.provider_key.replace("-", " ").title()),
                auth_kind=getattr(adapter, "auth_kind", "browser_session"),
            )
            for adapter in self._adapters.values()
        ]
        return sorted(definitions, key=lambda d: d.display_name)

    def get_auth(self, provider_key: str) -> ProviderAuthPort | None:
        return self._adapters.get(provider_key)
