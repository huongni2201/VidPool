import logging
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from app.modules.accounts.domain.errors import AccountUnavailable, LeaseNotFound

from .queries import AccountLeaseView
from .uow import AccountUnitOfWorkPort

logger = logging.getLogger(__name__)


class AccountLeaseService:
    def __init__(
        self,
        uow_factory: Callable[[], AccountUnitOfWorkPort],
    ) -> None:
        self._uow_factory = uow_factory

    def acquire(
        self,
        provider_key: str,
        owner_id: str,
        ttl: timedelta,
        now: datetime | None = None,
    ) -> AccountLeaseView:
        if ttl.total_seconds() <= 0:
            raise ValueError("TTL must be greater than zero")

        current_time = now or datetime.now(UTC)
        expires_at = current_time + ttl

        with self._uow_factory() as uow:
            elapsed_accounts = uow.accounts.list_elapsed_cooldowns(
                now=current_time,
                provider_key=provider_key,
            )
            for acc in elapsed_accounts:
                if acc.clear_elapsed_cooldown(now=current_time):
                    uow.accounts.save(acc)

            result = uow.accounts.acquire_lru(
                provider_key=provider_key,
                owner_id=owner_id,
                now=current_time,
                expires_at=expires_at,
            )

            if result is None:
                raise AccountUnavailable(f"No available account for provider '{provider_key}'")

            account, lease = result
            uow.commit()
            logger.info(
                "lease_acquired lease_id=%s account_id=%s provider_key=%s owner_id=%s",
                lease.id,
                account.id,
                account.provider_key,
                owner_id,
            )
            return AccountLeaseView(
                lease_id=lease.id,
                account_id=account.id,
                provider_key=account.provider_key,
                profile_key=account.profile_key,
                owner_id=lease.owner_id,
                acquired_at=lease.acquired_at,
                expires_at=lease.expires_at,
            )

    def release(self, lease_id: uuid.UUID) -> None:
        with self._uow_factory() as uow:
            released = uow.accounts.release_lease(lease_id)
            if not released:
                raise LeaseNotFound(f"Lease '{lease_id}' not found or already released")
            uow.commit()
            logger.info("lease_released lease_id=%s", lease_id)
