from dataclasses import dataclass
from datetime import timedelta

from app.modules.accounts.domain.values import AccountId


@dataclass(frozen=True)
class StartLoginCommand:
    provider_key: str


@dataclass(frozen=True)
class CompleteLoginCommand:
    account_id: AccountId
    browser_session_id: str


@dataclass(frozen=True)
class CancelLoginCommand:
    account_id: AccountId
    browser_session_id: str


@dataclass(frozen=True)
class AcquireLeaseCommand:
    provider_key: str
    owner_id: str
    ttl: timedelta
