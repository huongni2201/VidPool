from dataclasses import dataclass
from datetime import datetime
from typing import Protocol, runtime_checkable
import uuid

from ..domain.account import ProviderAccount
from ..domain.lease import AccountLease
from ..domain.values import AccountId


@runtime_checkable
class BrowserSessionPort(Protocol):
    def open_login(
        self,
        *,
        provider_key: str,
        profile_key: str,
        login_url: str,
    ) -> None: ...

    def close_profile(self, profile_key: str) -> None: ...

    def has_open_session(self, profile_key: str) -> bool: ...

    def delete_profile(self, profile_key: str) -> None: ...

    def close_all(self) -> None: ...


@dataclass(frozen=True)
class SessionValidation:
    valid: bool


@dataclass(frozen=True)
class ProviderIdentity:
    display_name: str
    external_identity: str


@runtime_checkable
class ProviderAuthPort(Protocol):
    provider_key: str

    def login_url(self) -> str: ...

    def validate_active_session(
        self,
        profile_key: str,
    ) -> SessionValidation: ...

    def resolve_identity(
        self,
        profile_key: str,
    ) -> ProviderIdentity: ...

    def validate_persisted_session(
        self,
        profile_key: str,
    ) -> SessionValidation: ...


@dataclass(frozen=True)
class ProviderDefinition:
    key: str
    display_name: str
    auth_kind: str


@runtime_checkable
class ProviderRegistryPort(Protocol):
    def list(self) -> list[ProviderDefinition]: ...
    def get_auth(self, provider_key: str) -> ProviderAuthPort | None: ...


@runtime_checkable
class AccountRepositoryPort(Protocol):
    def add(self, account: ProviderAccount) -> None: ...
    def get(self, account_id: AccountId) -> ProviderAccount | None: ...
    def list(self, provider_key: str | None = None) -> list[ProviderAccount]: ...
    def save(self, account: ProviderAccount) -> None: ...
    def delete(self, account_id: AccountId) -> None: ...

    def acquire_lru(
        self,
        provider_key: str,
        owner_id: str,
        now: datetime,
        expires_at: datetime,
    ) -> tuple[ProviderAccount, AccountLease] | None: ...

    def release_lease(self, lease_id: uuid.UUID) -> bool: ...
    def get_lease(self, lease_id: uuid.UUID) -> AccountLease | None: ...
    def has_active_lease(self, account_id: AccountId, now: datetime) -> bool: ...
