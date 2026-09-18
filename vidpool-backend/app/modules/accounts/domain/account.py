from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from .errors import InvalidAccountStateError
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
        current_time = now or datetime.now(UTC)
        return cls(
            id=account_id or new_account_id(),
            provider_key=provider_key,
            profile_key=profile_key,
            status=AccountStatus.AUTH_REQUIRED,
            created_at=current_time,
            updated_at=current_time,
        )

    def _require_enabled(self) -> None:
        if self.status is AccountStatus.DISABLED:
            raise InvalidAccountStateError("Disabled account requires explicit enable")

    def mark_authenticated(
        self,
        display_name: str | None = None,
        external_identity: str | None = None,
        now: datetime | None = None,
    ) -> None:
        self._require_enabled()
        current_time = now or datetime.now(UTC)
        self.status = AccountStatus.ACTIVE
        if display_name is not None:
            self.display_name = display_name
        if external_identity is not None:
            self.external_identity = external_identity
        self.last_validated_at = current_time
        self.updated_at = current_time
        self.cooldown_until = None

    def mark_auth_required(self, now: datetime | None = None) -> None:
        self._require_enabled()
        current_time = now or datetime.now(UTC)
        self.status = AccountStatus.AUTH_REQUIRED
        self.updated_at = current_time

    def mark_cooldown(self, cooldown_until: datetime, now: datetime | None = None) -> None:
        self._require_enabled()
        current_time = now or datetime.now(UTC)
        self.status = AccountStatus.COOLDOWN
        self.cooldown_until = cooldown_until
        self.updated_at = current_time

    def clear_elapsed_cooldown(self, now: datetime | None = None) -> bool:
        """If cooldown has elapsed and account is COOLDOWN, restore ACTIVE status."""
        self._require_enabled()
        current_time = now or datetime.now(UTC)
        if (
            self.status is AccountStatus.COOLDOWN
            and (self.cooldown_until is None or self.cooldown_until <= current_time)
        ):
            self.status = AccountStatus.ACTIVE
            self.cooldown_until = None
            self.updated_at = current_time
            return True
        return False

    def record_success(self, now: datetime | None = None) -> None:
        self._require_enabled()
        current_time = now or datetime.now(UTC)
        self.consecutive_failures = 0
        self.last_success_at = current_time
        self.updated_at = current_time
        if self.status is AccountStatus.COOLDOWN and (
            self.cooldown_until is None or self.cooldown_until <= current_time
        ):
            self.status = AccountStatus.ACTIVE
            self.cooldown_until = None

    def record_failure(self, now: datetime | None = None) -> None:
        self._require_enabled()
        current_time = now or datetime.now(UTC)
        self.consecutive_failures += 1
        self.last_failure_at = current_time
        self.updated_at = current_time

    def record_validation(self, valid: bool, now: datetime | None = None) -> None:
        current_time = now or datetime.now(UTC)
        self.updated_at = current_time
        if valid:
            self.last_validated_at = current_time
            if self.status is not AccountStatus.DISABLED:
                if self.cooldown_until is not None and self.cooldown_until > current_time:
                    self.status = AccountStatus.COOLDOWN
                else:
                    self.status = AccountStatus.ACTIVE
                    self.cooldown_until = None
        else:
            if self.status is not AccountStatus.DISABLED:
                self.status = AccountStatus.AUTH_REQUIRED

    def record_auth_failure(self, now: datetime | None = None) -> None:
        current_time = now or datetime.now(UTC)
        self.consecutive_failures += 1
        self.last_failure_at = current_time
        self.updated_at = current_time
        if self.status is not AccountStatus.DISABLED:
            self.status = AccountStatus.AUTH_REQUIRED

    def record_temporary_failure(
        self,
        cooldown_until: datetime | None = None,
        now: datetime | None = None,
    ) -> None:
        current_time = now or datetime.now(UTC)
        self.consecutive_failures += 1
        self.last_failure_at = current_time
        self.updated_at = current_time

        if cooldown_until is not None:
            self.cooldown_until = cooldown_until
            if self.status is not AccountStatus.DISABLED:
                self.status = AccountStatus.COOLDOWN
        elif self.consecutive_failures >= 3:
            self.cooldown_until = current_time + timedelta(minutes=5)
            if self.status is not AccountStatus.DISABLED:
                self.status = AccountStatus.COOLDOWN

    def record_rate_limit(
        self,
        retry_after: datetime | None = None,
        now: datetime | None = None,
    ) -> None:
        current_time = now or datetime.now(UTC)
        self.consecutive_failures += 1
        self.last_failure_at = current_time
        self.updated_at = current_time
        self.cooldown_until = retry_after or (current_time + timedelta(minutes=15))
        if self.status is not AccountStatus.DISABLED:
            self.status = AccountStatus.COOLDOWN

    def disable(self, now: datetime | None = None) -> None:
        current_time = now or datetime.now(UTC)
        self.status = AccountStatus.DISABLED
        self.updated_at = current_time

    def enable(self, now: datetime | None = None) -> None:
        """Re-enabling an account returns it to AUTH_REQUIRED so its session can be verified."""
        current_time = now or datetime.now(UTC)
        self.status = AccountStatus.AUTH_REQUIRED
        self.updated_at = current_time
