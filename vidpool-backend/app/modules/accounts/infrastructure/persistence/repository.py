from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.accounts.application.ports import AccountRepositoryPort
from app.modules.accounts.domain.account import ProviderAccount
from app.modules.accounts.domain.errors import (
    AccountNotFoundError,
    DuplicateProviderIdentity,
)
from app.modules.accounts.domain.lease import AccountLease
from app.modules.accounts.domain.values import AccountId, AccountStatus

from .mapper import account_from_model, account_to_model, lease_from_model
from .models import AccountLeaseModel, ProviderAccountModel


class SQLAlchemyAccountRepository(AccountRepositoryPort):
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, account: ProviderAccount) -> None:
        model = account_to_model(account)
        self._session.add(model)
        try:
            self._session.flush()
        except IntegrityError as exc:
            raise DuplicateProviderIdentity(
                f"Provider account '{account.external_identity}' is already registered"
            ) from exc

    def get(self, account_id: AccountId) -> ProviderAccount | None:
        model = self._session.get(ProviderAccountModel, str(account_id))
        if model is None:
            return None
        return account_from_model(model)

    def get_by_provider_identity(
        self, provider_key: str, external_identity: str
    ) -> ProviderAccount | None:
        stmt = select(ProviderAccountModel).where(
            ProviderAccountModel.provider_key == provider_key,
            ProviderAccountModel.external_identity == external_identity,
        )
        model = self._session.scalars(stmt).first()
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

    def list_elapsed_cooldowns(
        self, now: datetime, provider_key: str | None = None
    ) -> list[ProviderAccount]:
        conditions = [
            ProviderAccountModel.status == str(AccountStatus.COOLDOWN),
            (ProviderAccountModel.cooldown_until.is_(None))
            | (ProviderAccountModel.cooldown_until <= now),
        ]
        if provider_key is not None:
            conditions.append(ProviderAccountModel.provider_key == provider_key)

        stmt = (
            select(ProviderAccountModel)
            .where(*conditions)
            .order_by(ProviderAccountModel.created_at.asc())
        )
        models = self._session.scalars(stmt).all()
        return [account_from_model(m) for m in models]

    def save(self, account: ProviderAccount) -> None:
        model = self._session.get(ProviderAccountModel, str(account.id))
        if model is None:
            raise AccountNotFoundError(f"Account {account.id} was not found")

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
        try:
            self._session.flush()
        except IntegrityError as exc:
            raise DuplicateProviderIdentity(
                f"Provider account '{account.external_identity}' is already registered"
            ) from exc

    def delete(self, account_id: AccountId) -> None:
        model = self._session.get(ProviderAccountModel, str(account_id))
        if model is not None:
            self._session.delete(model)
            self._session.flush()

    def acquire_lru(
        self,
        provider_key: str,
        owner_id: str,
        now: datetime,
        expires_at: datetime,
    ) -> tuple[ProviderAccount, AccountLease] | None:
        # 1. Clean expired leases
        self._session.execute(delete(AccountLeaseModel).where(AccountLeaseModel.expires_at <= now))
        self._session.flush()

        # 2. Query candidates:
        active_lease_subq = select(AccountLeaseModel.account_id).where(
            AccountLeaseModel.expires_at > now
        )

        stmt = (
            select(ProviderAccountModel)
            .where(
                ProviderAccountModel.provider_key == provider_key,
                ProviderAccountModel.status == str(AccountStatus.ACTIVE),
                (ProviderAccountModel.cooldown_until.is_(None))
                | (ProviderAccountModel.cooldown_until <= now),
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
                with self._session.begin_nested():
                    self._session.add(lease_model)
                    candidate.last_used_at = now
                    self._session.flush()
                return (account_from_model(candidate), lease_from_model(lease_model))
            except IntegrityError:
                continue

        return None

    def release_lease(self, lease_id: uuid.UUID) -> bool:
        lease = self._session.get(AccountLeaseModel, str(lease_id))
        if lease is not None:
            self._session.delete(lease)
            self._session.flush()
            return True
        return False

    def get_lease(self, lease_id: uuid.UUID) -> AccountLease | None:
        lease = self._session.get(AccountLeaseModel, str(lease_id))
        if lease is None:
            return None
        return lease_from_model(lease)

    def get_active_lease_for_account(
        self, account_id: AccountId, now: datetime
    ) -> AccountLease | None:
        stmt = select(AccountLeaseModel).where(
            AccountLeaseModel.account_id == str(account_id),
            AccountLeaseModel.expires_at > now,
        )
        model = self._session.scalars(stmt).first()
        if model is None:
            return None
        return lease_from_model(model)

    def get_active_leases(
        self, now: datetime
    ) -> dict[AccountId, AccountLease]:
        stmt = select(AccountLeaseModel).where(
            AccountLeaseModel.expires_at > now,
        )
        models = self._session.scalars(stmt).all()
        return {
            AccountId(uuid.UUID(m.account_id)): lease_from_model(m)
            for m in models
        }

    def has_active_lease(self, account_id: AccountId, now: datetime) -> bool:
        return self.get_active_lease_for_account(account_id, now) is not None
