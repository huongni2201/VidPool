import logging
import threading
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from app.modules.accounts.domain.errors import (
    AccountInUse,
    AccountNotFound,
    BrowserProfileInUse,
)
from app.modules.accounts.domain.values import AccountId

from .health_service import AccountHealthService
from .lease_service import AccountLeaseService
from .login_service import AccountLoginService
from .mappers import account_to_view
from .ports import (
    BrowserSessionPort,
    ProviderDefinition,
    ProviderRegistryPort,
)
from .queries import AccountLeaseView, AccountView, StartLoginResult
from .uow import AccountUnitOfWorkPort

logger = logging.getLogger(__name__)


class AccountService:
    """Unified application facade and CRUD coordinator for Account Pool."""

    def __init__(
        self,
        uow_factory: Callable[[], AccountUnitOfWorkPort],
        browser: BrowserSessionPort,
        providers: ProviderRegistryPort,
        login_service: AccountLoginService | None = None,
        lease_service: AccountLeaseService | None = None,
        health_service: AccountHealthService | None = None,
    ) -> None:
        self._uow_factory = uow_factory
        self._browser = browser
        self._providers = providers
        self._mutation_lock = threading.RLock()
        self._login_service = login_service or AccountLoginService(
            uow_factory=uow_factory,
            browser=browser,
            providers=providers,
        )
        self._lease_service = lease_service or AccountLeaseService(
            uow_factory=uow_factory,
        )
        self._health_service = health_service or AccountHealthService(
            uow_factory=uow_factory,
            providers=providers,
        )

    # --- Providers & Queries ---

    def list_providers(self) -> list[ProviderDefinition]:
        return self._providers.list()

    def list_accounts(self, provider_key: str | None = None) -> list[AccountView]:
        with self._uow_factory() as uow:
            accounts = uow.accounts.list(provider_key)
            return [account_to_view(acc) for acc in accounts]

    def get_account(self, account_id: AccountId) -> AccountView:
        with self._uow_factory() as uow:
            account = uow.accounts.get(account_id)
            if account is None:
                raise AccountNotFound(f"Account '{account_id}' not found")
            return account_to_view(account)

    # --- Lifecycle Actions ---

    def enable_account(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        with self._mutation_lock, self._uow_factory() as uow:
            account = uow.accounts.get(account_id)
            if account is None:
                raise AccountNotFound(f"Account '{account_id}' not found")

            account.enable(now=now)
            uow.accounts.save(account)
            uow.commit()
            return account_to_view(account)

    def disable_account(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        with self._mutation_lock:
            current_time = now or datetime.now(UTC)
            with self._uow_factory() as uow:
                account = uow.accounts.get(account_id)
                if account is None:
                    raise AccountNotFound(f"Account '{account_id}' not found")

                if uow.accounts.has_active_lease(account_id, current_time):
                    raise AccountInUse(
                        f"Cannot disable account '{account_id}' while an active lease exists"
                    )

                account.disable(now=current_time)
                uow.accounts.save(account)
                uow.commit()
                logger.info("account_disabled account_id=%s", account_id)
                return account_to_view(account)

    def delete_account(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> None:
        with self._mutation_lock:
            current_time = now or datetime.now(UTC)
            with self._uow_factory() as uow:
                account = uow.accounts.get(account_id)
                if account is None:
                    raise AccountNotFound(f"Account '{account_id}' not found")

                if uow.accounts.has_active_lease(account_id, current_time):
                    raise AccountInUse(
                        f"Cannot delete account '{account_id}' while an active lease exists"
                    )

                profile_key = account.profile_key

                if self._browser.has_open_session(profile_key):
                    raise BrowserProfileInUse(
                        f"Cannot delete account '{account_id}' while a browser session is active"
                    )

                uow.accounts.delete(account_id)
                uow.commit()
                logger.info("account_deleted account_id=%s", account_id)

            try:
                self._browser.delete_profile(profile_key)
            except Exception:
                logger.exception("Account deleted but browser profile cleanup failed")

    # --- Delegations to Login Service ---

    def start_login(
        self,
        provider_key: str,
        account_id: AccountId | None = None,
        now: datetime | None = None,
    ) -> StartLoginResult:
        return self._login_service.start_login(provider_key, account_id=account_id, now=now)

    def complete_login(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        with self._mutation_lock:
            return self._login_service.complete_login(account_id, now=now)

    def cancel_new_login(
        self,
        account_id: AccountId,
    ) -> None:
        with self._mutation_lock:
            return self._login_service.cancel_new_login(account_id)

    def cancel_relogin(
        self,
        account_id: AccountId,
    ) -> AccountView:
        with self._mutation_lock:
            return self._login_service.cancel_relogin(account_id)

    def cancel_login(
        self,
        account_id: AccountId,
    ) -> AccountView:
        with self._mutation_lock:
            return self._login_service.cancel_login(account_id)

    def start_relogin(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> StartLoginResult:
        with self._mutation_lock:
            return self._login_service.start_relogin(account_id, now=now)

    # --- Delegations to Lease Service ---

    def acquire(
        self,
        provider_key: str,
        owner_id: str,
        ttl: timedelta,
        now: datetime | None = None,
    ) -> AccountLeaseView:
        with self._mutation_lock:
            return self._lease_service.acquire(provider_key, owner_id, ttl, now=now)

    def release(self, lease_id: uuid.UUID) -> None:
        with self._mutation_lock:
            return self._lease_service.release(lease_id)

    # --- Delegations to Health Service ---

    def validate_account(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        with self._mutation_lock:
            return self._health_service.validate_account(account_id, now=now)

    def report_success(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        with self._mutation_lock:
            return self._health_service.report_success(account_id, now=now)

    def report_auth_failure(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        with self._mutation_lock:
            return self._health_service.report_auth_failure(account_id, now=now)

    def report_temporary_failure(
        self,
        account_id: AccountId,
        now: datetime | None = None,
        cooldown_until: datetime | None = None,
    ) -> AccountView:
        with self._mutation_lock:
            return self._health_service.report_temporary_failure(
                account_id, now=now, cooldown_until=cooldown_until
            )

    def report_rate_limited(
        self,
        account_id: AccountId,
        now: datetime | None = None,
        retry_after: datetime | None = None,
    ) -> AccountView:
        with self._mutation_lock:
            return self._health_service.report_rate_limited(
                account_id, now=now, retry_after=retry_after
            )
