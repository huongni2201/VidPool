import logging
from collections.abc import Callable
from datetime import UTC, datetime

from app.modules.accounts.domain.errors import (
    AccountInUse,
    AccountNotFound,
    ProviderNotRegistered,
)
from app.modules.accounts.domain.values import AccountId, AccountStatus

from .mappers import account_to_view
from .ports import ProviderRegistryPort
from .queries import AccountView
from .uow import AccountUnitOfWorkPort

logger = logging.getLogger(__name__)

_to_view = account_to_view


class AccountHealthService:
    def __init__(
        self,
        uow_factory: Callable[[], AccountUnitOfWorkPort],
        providers: ProviderRegistryPort,
    ) -> None:
        self._uow_factory = uow_factory
        self._providers = providers

    def validate_account(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        current_time = now or datetime.now(UTC)
        with self._uow_factory() as uow:
            account = uow.accounts.get(account_id)
            if account is None:
                raise AccountNotFound(f"Account '{account_id}' not found")
            if uow.accounts.has_active_lease(account_id, current_time):
                raise AccountInUse(
                    f"Cannot validate account '{account_id}' while an active lease exists"
                )
            provider_key = account.provider_key
            profile_key = account.profile_key

        auth_adapter = self._providers.get_auth(provider_key)
        if auth_adapter is None:
            raise ProviderNotRegistered(f"Provider '{provider_key}' is not registered")

        validation = auth_adapter.validate_persisted_session(profile_key)

        with self._uow_factory() as uow:
            acc = uow.accounts.get(account_id)
            if acc is None:
                raise AccountNotFound(f"Account '{account_id}' not found")
            acc.record_validation(valid=validation.valid, now=current_time)
            uow.accounts.save(acc)
            uow.commit()
            return _to_view(acc)

    def report_success(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        current_time = now or datetime.now(UTC)
        with self._uow_factory() as uow:
            account = uow.accounts.get(account_id)
            if account is None:
                raise AccountNotFound(f"Account '{account_id}' not found")

            if account.status is not AccountStatus.DISABLED:
                account.record_success(now=current_time)
                uow.accounts.save(account)
                uow.commit()
            return _to_view(account)

    def report_auth_failure(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        current_time = now or datetime.now(UTC)
        with self._uow_factory() as uow:
            account = uow.accounts.get(account_id)
            if account is None:
                raise AccountNotFound(f"Account '{account_id}' not found")

            if account.status is not AccountStatus.DISABLED:
                account.record_auth_failure(now=current_time)
                uow.accounts.save(account)
                uow.commit()
            return _to_view(account)

    def report_temporary_failure(
        self,
        account_id: AccountId,
        now: datetime | None = None,
        cooldown_until: datetime | None = None,
    ) -> AccountView:
        current_time = now or datetime.now(UTC)
        with self._uow_factory() as uow:
            account = uow.accounts.get(account_id)
            if account is None:
                raise AccountNotFound(f"Account '{account_id}' not found")

            if account.status is not AccountStatus.DISABLED:
                account.record_temporary_failure(cooldown_until=cooldown_until, now=current_time)
                uow.accounts.save(account)
                uow.commit()
                if account.status is AccountStatus.COOLDOWN:
                    logger.info(
                        "account_cooldown_set account_id=%s cooldown_until=%s",
                        account.id,
                        account.cooldown_until,
                    )
            return _to_view(account)

    def report_rate_limited(
        self,
        account_id: AccountId,
        now: datetime | None = None,
        retry_after: datetime | None = None,
    ) -> AccountView:
        current_time = now or datetime.now(UTC)
        with self._uow_factory() as uow:
            account = uow.accounts.get(account_id)
            if account is None:
                raise AccountNotFound(f"Account '{account_id}' not found")

            if account.status is not AccountStatus.DISABLED:
                account.record_rate_limit(retry_after=retry_after, now=current_time)
                uow.accounts.save(account)
                uow.commit()
                if account.status is AccountStatus.COOLDOWN:
                    logger.info(
                        "account_cooldown_set account_id=%s cooldown_until=%s",
                        account.id,
                        account.cooldown_until,
                    )
            return _to_view(account)
