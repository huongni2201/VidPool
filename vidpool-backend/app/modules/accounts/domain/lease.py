from dataclasses import dataclass
from datetime import datetime
import uuid


@dataclass
class AccountLease:
    id: uuid.UUID
    account_id: uuid.UUID
    owner_id: str
    acquired_at: datetime
    expires_at: datetime

    def is_expired(self, now: datetime) -> bool:
        return self.expires_at <= now
