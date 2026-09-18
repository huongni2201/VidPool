import uuid
from dataclasses import dataclass
from datetime import datetime

from app.modules.accounts.domain.values import AccountId, AccountStatus


@dataclass(frozen=True)
class AccountView:
    id: AccountId
    provider_key: str
    display_name: str | None
    external_identity: str | None
    status: AccountStatus
    last_used_at: datetime | None
    last_validated_at: datetime | None
    cooldown_until: datetime | None
    is_leased: bool = False
    lease_expires_at: datetime | None = None
    is_available: bool = False


@dataclass(frozen=True)
class StartLoginResult:
    account_id: AccountId
    status: str = "waiting_for_user"


@dataclass(frozen=True)
class AccountLeaseView:
    lease_id: uuid.UUID
    account_id: AccountId
    provider_key: str
    profile_key: str
    owner_id: str
    acquired_at: datetime
    expires_at: datetime
