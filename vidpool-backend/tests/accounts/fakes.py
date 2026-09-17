from datetime import datetime
from typing import Sequence
import uuid

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
from app.modules.accounts.domain.account import ProviderAccount
from app.modules.accounts.domain.lease import AccountLease
from app.modules.accounts.domain.values import AccountId, AccountStatus


class FakeAccountRepository(AccountRepositoryPort):
    def __init__(self) -> None:
        self.accounts: dict[AccountId, ProviderAccount] = {}
        self.leases: dict[uuid.UUID, AccountLease] = {}

    def add(self, account: ProviderAccount) -> None:
        self.accounts[account.id] = account

    def get(self, account_id: AccountId) -> ProviderAccount | None:
        return self.accounts.get(account_id)

    def list(self, provider_key: str | None = None) -> list[ProviderAccount]:
        if provider_key is None:
            return list(self.accounts.values())
        return [acc for acc in self.accounts.values() if acc.provider_key == provider_key]

    def save(self, account: ProviderAccount) -> None:
        self.accounts[account.id] = account

    def delete(self, account_id: AccountId) -> None:
        self.accounts.pop(account_id, None)
        # Also clean up any lease
        for lease_id, lease in list(self.leases.items()):
            if lease.account_id == account_id:
                del self.leases[lease_id]

    def acquire_lru(
        self,
        provider_key: str,
        owner_id: str,
        now: datetime,
        expires_at: datetime,
    ) -> tuple[ProviderAccount, AccountLease] | None:
        # Clean expired leases
        for lease_id, lease in list(self.leases.items()):
            if lease.is_expired(now):
                del self.leases[lease_id]

        active_leased_account_ids = {lease.account_id for lease in self.leases.values()}

        candidates: list[ProviderAccount] = []
        for acc in self.accounts.values():
            if acc.provider_key != provider_key:
                continue
            if acc.status != AccountStatus.ACTIVE:
                continue
            if acc.cooldown_until is not None and acc.cooldown_until > now:
                continue
            if acc.id in active_leased_account_ids:
                continue
            candidates.append(acc)

        if not candidates:
            return None

        # Sort: last_used_at None first, then last_used_at ascending, then created_at ascending
        def sort_key(acc: ProviderAccount):
            has_used = 1 if acc.last_used_at is not None else 0
            used_time = acc.last_used_at or datetime.min
            return (has_used, used_time, acc.created_at)

        candidates.sort(key=sort_key)
        chosen = candidates[0]

        lease = AccountLease(
            id=uuid.uuid4(),
            account_id=chosen.id,
            owner_id=owner_id,
            acquired_at=now,
            expires_at=expires_at,
        )
        self.leases[lease.id] = lease
        chosen.last_used_at = now
        return (chosen, lease)

    def release_lease(self, lease_id: uuid.UUID) -> bool:
        if lease_id in self.leases:
            del self.leases[lease_id]
            return True
        return False

    def get_lease(self, lease_id: uuid.UUID) -> AccountLease | None:
        return self.leases.get(lease_id)

    def has_active_lease(self, account_id: AccountId, now: datetime) -> bool:
        for lease in self.leases.values():
            if lease.account_id == account_id and not lease.is_expired(now):
                return True
        return False


class FakeBrowserSessionManager(BrowserSessionPort):
    def __init__(self) -> None:
        self.open_sessions: dict[str, BrowserSessionHandle] = {}
        self.deleted_profiles: list[str] = []

    def open_login(
        self,
        *,
        provider_key: str,
        profile_key: str,
        login_url: str,
    ) -> BrowserSessionHandle:
        session_id = f"session-{uuid.uuid4()}"
        handle = BrowserSessionHandle(id=session_id, profile_key=profile_key)
        self.open_sessions[profile_key] = handle
        return handle

    def close(self, session_id: str) -> None:
        for key, handle in list(self.open_sessions.items()):
            if handle.id == session_id:
                del self.open_sessions[key]

    def has_open_session(self, profile_key: str) -> bool:
        return profile_key in self.open_sessions

    def delete_profile(self, profile_key: str) -> None:
        self.open_sessions.pop(profile_key, None)
        self.deleted_profiles.append(profile_key)

    def close_all(self) -> None:
        self.open_sessions.clear()



class FakeProviderAuthAdapter(ProviderAuthPort):
    def __init__(
        self,
        provider_key: str = "fake-provider",
        valid_session: bool = True,
        display_name: str = "Fake User",
        external_identity: str = "fake-user-id",
    ) -> None:
        self.provider_key = provider_key
        self.valid_session = valid_session
        self.display_name = display_name
        self.external_identity = external_identity

    def login_url(self) -> str:
        return f"https://auth.{self.provider_key}.example.com/login"

    def validate_session(self, session: BrowserSessionHandle) -> SessionValidation:
        return SessionValidation(valid=self.valid_session)

    def resolve_identity(self, session: BrowserSessionHandle) -> ProviderIdentity:
        return ProviderIdentity(
            display_name=self.display_name,
            external_identity=self.external_identity,
        )

    def validate_persisted_session(self, profile_key: str) -> SessionValidation:
        return SessionValidation(valid=self.valid_session)


class FakeProviderRegistry(ProviderRegistryPort):
    def __init__(self, auth_adapters: Sequence[ProviderAuthPort] = ()) -> None:
        self._adapters: dict[str, ProviderAuthPort] = {a.provider_key: a for a in auth_adapters}

    def list(self) -> list[ProviderDefinition]:
        return [
            ProviderDefinition(key=k, display_name=k.title(), auth_kind="browser_session")
            for k in self._adapters.keys()
        ]

    def get_auth(self, provider_key: str) -> ProviderAuthPort | None:
        return self._adapters.get(provider_key)
