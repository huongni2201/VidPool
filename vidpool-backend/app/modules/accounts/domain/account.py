from dataclasses import dataclass
from datetime import datetime, timezone
import uuid

from .values import AccountId, AccountStatus, new_account_id


@dataclass
class ProviderAccount:
    id: AccountId
    provider_key: str
    profile_key: str
    status: AccountStatus
    created_at: datetime
    updated_at: datetime
    display_name: str | None = None
    external_identity: str | None = None
    last_used_at: datetime | None = None
    last_validated_at: datetime | None = None
    last_success_at: datetime | None = None
    last_failure_at: datetime | None = None
    consecutive_failures: int = 0
    cooldown_until: datetime | None = None

    @classmethod
    def create(
        cls,
        provider_key: str,
        profile_key: str,
        account_id: AccountId | None = None,
        now: datetime | None = None,
    ) -> "ProviderAccount":
        current_time = now or datetime.now(timezone.utc)
        return cls(
            id=account_id or new_account_id(),
            provider_key=provider_key,
            profile_key=profile_key,
            status=AccountStatus.AUTH_REQUIRED,
            created_at=current_time,
            updated_at=current_time,
        )

    def mark_authenticated(
        self,
        display_name: str | None = None,
        external_identity: str | None = None,
        now: datetime | None = None,
    ) -> None:
        current_time = now or datetime.now(timezone.utc)
        self.status = AccountStatus.ACTIVE
        if display_name is not None:
            self.display_name = display_name
        if external_identity is not None:
            self.external_identity = external_identity
        self.last_validated_at = current_time
        self.updated_at = current_time
        self.cooldown_until = None

    def mark_auth_required(self, now: datetime | None = None) -> None:
        current_time = now or datetime.now(timezone.utc)
        self.status = AccountStatus.AUTH_REQUIRED
        self.updated_at = current_time

    def mark_cooldown(self, cooldown_until: datetime, now: datetime | None = None) -> None:
        current_time = now or datetime.now(timezone.utc)
        self.status = AccountStatus.COOLDOWN
        self.cooldown_until = cooldown_until
        self.updated_at = current_time

    def clear_elapsed_cooldown(self, now: datetime | None = None) -> bool:
        """If cooldown has elapsed and account is COOLDOWN, restore ACTIVE status."""
        current_time = now or datetime.now(timezone.utc)
        if self.status is AccountStatus.COOLDOWN and self.cooldown_until is not None:
            if self.cooldown_until <= current_time:
                self.status = AccountStatus.ACTIVE
                self.cooldown_until = None
                self.updated_at = current_time
                return True
        return False

    def record_success(self, now: datetime | None = None) -> None:
        current_time = now or datetime.now(timezone.utc)
        self.consecutive_failures = 0
        self.last_success_at = current_time
        self.updated_at = current_time
        if self.status is AccountStatus.COOLDOWN and (self.cooldown_until is None or self.cooldown_until <= current_time):
            self.status = AccountStatus.ACTIVE
            self.cooldown_until = None

    def record_failure(self, now: datetime | None = None) -> None:
        current_time = now or datetime.now(timezone.utc)
        self.consecutive_failures += 1
        self.last_failure_at = current_time
        self.updated_at = current_time

    def disable(self, now: datetime | None = None) -> None:
        current_time = now or datetime.now(timezone.utc)
        self.status = AccountStatus.DISABLED
        self.updated_at = current_time

    def enable(self, now: datetime | None = None) -> None:
        """Re-enabling an account returns it to AUTH_REQUIRED so its session can be verified."""
        current_time = now or datetime.now(timezone.utc)
        self.status = AccountStatus.AUTH_REQUIRED
        self.updated_at = current_time
