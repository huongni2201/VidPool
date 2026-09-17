import uuid
from datetime import UTC, datetime

from app.modules.accounts.domain.account import ProviderAccount
from app.modules.accounts.domain.lease import AccountLease
from app.modules.accounts.domain.values import AccountId, AccountStatus

from .models import AccountLeaseModel, ProviderAccountModel


def _ensure_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


def account_to_model(account: ProviderAccount) -> ProviderAccountModel:
    return ProviderAccountModel(
        id=str(account.id),
        provider_key=account.provider_key,
        display_name=account.display_name,
        external_identity=account.external_identity,
        status=str(account.status),
        profile_key=account.profile_key,
        last_used_at=_ensure_utc(account.last_used_at),
        last_validated_at=_ensure_utc(account.last_validated_at),
        last_success_at=_ensure_utc(account.last_success_at),
        last_failure_at=_ensure_utc(account.last_failure_at),
        consecutive_failures=account.consecutive_failures,
        cooldown_until=_ensure_utc(account.cooldown_until),
        created_at=_ensure_utc(account.created_at) or datetime.now(UTC),
        updated_at=_ensure_utc(account.updated_at) or datetime.now(UTC),
    )


def account_from_model(model: ProviderAccountModel) -> ProviderAccount:
    return ProviderAccount(
        id=AccountId(uuid.UUID(model.id)),
        provider_key=model.provider_key,
        profile_key=model.profile_key,
        status=AccountStatus(model.status),
        created_at=_ensure_utc(model.created_at) or datetime.now(UTC),
        updated_at=_ensure_utc(model.updated_at) or datetime.now(UTC),
        display_name=model.display_name,
        external_identity=model.external_identity,
        last_used_at=_ensure_utc(model.last_used_at),
        last_validated_at=_ensure_utc(model.last_validated_at),
        last_success_at=_ensure_utc(model.last_success_at),
        last_failure_at=_ensure_utc(model.last_failure_at),
        consecutive_failures=model.consecutive_failures,
        cooldown_until=_ensure_utc(model.cooldown_until),
    )


def lease_to_model(lease: AccountLease) -> AccountLeaseModel:
    return AccountLeaseModel(
        id=str(lease.id),
        account_id=str(lease.account_id),
        owner_id=lease.owner_id,
        acquired_at=_ensure_utc(lease.acquired_at) or datetime.now(UTC),
        expires_at=_ensure_utc(lease.expires_at) or datetime.now(UTC),
    )


def lease_from_model(model: AccountLeaseModel) -> AccountLease:
    return AccountLease(
        id=uuid.UUID(model.id),
        account_id=AccountId(uuid.UUID(model.account_id)),
        owner_id=model.owner_id,
        acquired_at=_ensure_utc(model.acquired_at) or datetime.now(UTC),
        expires_at=_ensure_utc(model.expires_at) or datetime.now(UTC),
    )
