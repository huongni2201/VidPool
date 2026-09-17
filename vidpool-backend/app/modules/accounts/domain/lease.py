import uuid
from dataclasses import dataclass
from datetime import datetime

from .values import AccountId


@dataclass
class AccountLease:
    id: uuid.UUID
    account_id: AccountId
    owner_id: str
    acquired_at: datetime
    expires_at: datetime

    def is_expired(self, now: datetime) -> bool:
        return self.expires_at <= now
