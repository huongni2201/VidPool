from enum import StrEnum
from typing import NewType
import uuid


class AccountStatus(StrEnum):
    AUTH_REQUIRED = "auth_required"
    ACTIVE = "active"
    COOLDOWN = "cooldown"
    DISABLED = "disabled"


AccountId = NewType("AccountId", uuid.UUID)


def new_account_id() -> AccountId:
    return AccountId(uuid.uuid4())
