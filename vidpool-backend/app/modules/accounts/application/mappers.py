from __future__ import annotations

from datetime import UTC, datetime

from app.modules.accounts.domain.account import ProviderAccount
from app.modules.accounts.domain.lease import AccountLease
from app.modules.accounts.domain.values import AccountStatus

from .queries import AccountView


def account_to_view(
    account: ProviderAccount,
    active_lease: AccountLease | None = None,
    now: datetime | None = None,
) -> AccountView:
    current_time = now or datetime.now(UTC)
    is_leased = active_lease is not None and not active_lease.is_expired(current_time)
    lease_expires_at = active_lease.expires_at if is_leased and active_lease is not None else None
    is_available = (
        account.status is AccountStatus.ACTIVE
        and not is_leased
        and (account.cooldown_until is None or account.cooldown_until <= current_time)
    )
    return AccountView(
        id=account.id,
        provider_key=account.provider_key,
        display_name=account.display_name,
        external_identity=account.external_identity,
        status=account.status,
        last_used_at=account.last_used_at,
        last_validated_at=account.last_validated_at,
        cooldown_until=account.cooldown_until,
        is_leased=is_leased,
        lease_expires_at=lease_expires_at,
        is_available=is_available,
    )
