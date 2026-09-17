from datetime import datetime, timezone
from typing import Sequence
import uuid

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.accounts.application.ports import AccountRepositoryPort
from app.modules.accounts.domain.account import ProviderAccount
from app.modules.accounts.domain.lease import AccountLease
from app.modules.accounts.domain.values import AccountId, AccountStatus
from .mapper import account_from_model, account_to_model, lease_from_model, lease_to_model
from .models import AccountLeaseModel, ProviderAccountModel


class SQLAlchemyAccountRepository(AccountRepositoryPort):
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, account: ProviderAccount) -> None:
        model = account_to_model(account)
        self._session.add(model)
        self._session.commit()

    def get(self, account_id: AccountId) -> ProviderAccount | None:
        model = self._session.get(ProviderAccountModel, str(account_id))
        if model is None:
            return None
        return account_from_model(model)

    def list(self, provider_key: str | None = None) -> list[ProviderAccount]:
        stmt = select(ProviderAccountModel)
        if provider_key is not None:
            stmt = stmt.where(ProviderAccountModel.provider_key == provider_key)
        stmt = stmt.order_by(ProviderAccountModel.created_at.asc())
        models = self._session.scalars(stmt).all()
        return [account_from_model(m) for m in models]

    def save(self, account: ProviderAccount) -> None:
        model = self._session.get(ProviderAccountModel, str(account.id))
        if model is None:
            self.add(account)
            return

        model.provider_key = account.provider_key
        model.display_name = account.display_name
        model.external_identity = account.external_identity
        model.status = str(account.status)
        model.profile_key = account.profile_key
        model.last_used_at = account.last_used_at
        model.last_validated_at = account.last_validated_at
        model.last_success_at = account.last_success_at
        model.last_failure_at = account.last_failure_at
        model.consecutive_failures = account.consecutive_failures
        model.cooldown_until = account.cooldown_until
        model.updated_at = account.updated_at
        self._session.commit()

    def delete(self, account_id: AccountId) -> None:
        model = self._session.get(ProviderAccountModel, str(account_id))
        if model is not None:
            self._session.delete(model)
            self._session.commit()

    def acquire_lru(
        self,
        provider_key: str,
        owner_id: str,
        now: datetime,
        expires_at: datetime,
    ) -> tuple[ProviderAccount, AccountLease] | None:
        # 1. Clean expired leases
        self._session.execute(
            delete(AccountLeaseModel).where(AccountLeaseModel.expires_at <= now)
        )
        self._session.commit()

        # 2. Query candidates:
        active_lease_subq = select(AccountLeaseModel.account_id).where(
            AccountLeaseModel.expires_at > now
        )

        stmt = (
            select(ProviderAccountModel)
            .where(
                ProviderAccountModel.provider_key == provider_key,
                ProviderAccountModel.status == str(AccountStatus.ACTIVE),
                (ProviderAccountModel.cooldown_until.is_(None)) | (ProviderAccountModel.cooldown_until <= now),
                ProviderAccountModel.id.not_in(active_lease_subq),
            )
            .order_by(
                ProviderAccountModel.last_used_at.is_not(None),  # NULL first
                ProviderAccountModel.last_used_at.asc(),
                ProviderAccountModel.created_at.asc(),
            )
        )

        candidates: Sequence[ProviderAccountModel] = self._session.scalars(stmt).all()
        if not candidates:
            return None

        for candidate in candidates:
            lease_id = uuid.uuid4()
            lease_model = AccountLeaseModel(
                id=str(lease_id),
                account_id=candidate.id,
                owner_id=owner_id,
                acquired_at=now,
                expires_at=expires_at,
            )
            try:
                self._session.add(lease_model)
                candidate.last_used_at = now
                self._session.commit()
                return (account_from_model(candidate), lease_from_model(lease_model))
            except IntegrityError:
                self._session.rollback()
                continue

        return None

    def release_lease(self, lease_id: uuid.UUID) -> bool:
        lease = self._session.get(AccountLeaseModel, str(lease_id))
        if lease is not None:
            self._session.delete(lease)
            self._session.commit()
            return True
        return False

    def get_lease(self, lease_id: uuid.UUID) -> AccountLease | None:
        lease = self._session.get(AccountLeaseModel, str(lease_id))
        if lease is None:
            return None
        return lease_from_model(lease)

    def has_active_lease(self, account_id: AccountId, now: datetime) -> bool:
        stmt = select(AccountLeaseModel).where(
            AccountLeaseModel.account_id == str(account_id),
            AccountLeaseModel.expires_at > now,
        )
        lease = self._session.scalars(stmt).first()
        return lease is not None
