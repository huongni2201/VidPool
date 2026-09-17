from datetime import datetime, timedelta, timezone
import logging
import uuid

from ..domain.account import ProviderAccount
from ..domain.errors import (
    AccountInUse,
    AccountNotFound,
    AccountUnavailable,
    BrowserProfileInUse,
    BrowserSessionNotOpen,
    LeaseNotFound,
    ProviderNotRegistered,
    SessionInvalid,
)
from ..domain.values import AccountId, AccountStatus
from .ports import (
    AccountRepositoryPort,
    BrowserSessionPort,
    ProviderDefinition,
    ProviderRegistryPort,
)
from .queries import AccountLeaseView, AccountView, StartLoginResult

logger = logging.getLogger(__name__)


def _to_view(account: ProviderAccount) -> AccountView:
    return AccountView(
        id=account.id,
        provider_key=account.provider_key,
        display_name=account.display_name,
        external_identity=account.external_identity,
        status=account.status,
        last_used_at=account.last_used_at,
        last_validated_at=account.last_validated_at,
        cooldown_until=account.cooldown_until,
    )


class AccountService:
    """Application service orchestrating account lifecycle, sessions, and leases."""

    def __init__(
        self,
        accounts: AccountRepositoryPort,
        browser: BrowserSessionPort,
        providers: ProviderRegistryPort,
    ) -> None:
        self._accounts = accounts
        self._browser = browser
        self._providers = providers

    def list_providers(self) -> list[ProviderDefinition]:
        return self._providers.list()

    def list_accounts(self, provider_key: str | None = None) -> list[AccountView]:
        return [_to_view(acc) for acc in self._accounts.list(provider_key)]

    def get_account(self, account_id: AccountId) -> AccountView:
        account = self._accounts.get(account_id)
        if account is None:
            raise AccountNotFound(f"Account '{account_id}' not found")
        return _to_view(account)

    def start_login(
        self,
        provider_key: str,
        now: datetime | None = None,
    ) -> StartLoginResult:
        auth_adapter = self._providers.get_auth(provider_key)
        if auth_adapter is None:
            raise ProviderNotRegistered(f"Provider '{provider_key}' is not registered")

        account_id = AccountId(uuid.uuid4())
        profile_key = f"browser-profile/{provider_key}/{account_id}"

        account = ProviderAccount.create(
            provider_key=provider_key,
            profile_key=profile_key,
            account_id=account_id,
            now=now,
        )

        try:
            self._browser.open_login(
                provider_key=provider_key,
                profile_key=profile_key,
                login_url=auth_adapter.login_url(),
            )
            self._accounts.add(account)
        except Exception:
            self._browser.close_profile(profile_key)
            try:
                self._browser.delete_profile(profile_key)
            except Exception:
                logger.exception("Failed to clean profile after login start failure")
            raise

        return StartLoginResult(
            account_id=account_id,
            status="waiting_for_user",
        )

    def complete_login(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        account = self._accounts.get(account_id)
        if account is None:
            raise AccountNotFound(f"Account '{account_id}' not found")

        auth_adapter = self._providers.get_auth(account.provider_key)
        if auth_adapter is None:
            raise ProviderNotRegistered(f"Provider '{account.provider_key}' is not registered")

        if not self._browser.has_open_session(account.profile_key):
            raise BrowserSessionNotOpen(f"No active browser session for '{account.profile_key}'")

        try:
            validation = auth_adapter.validate_active_session(account.profile_key)

            if not validation.valid:
                current_time = now or datetime.now(timezone.utc)
                account.status = AccountStatus.AUTH_REQUIRED
                account.updated_at = current_time
                self._accounts.save(account)
                raise SessionInvalid("Browser session validation failed")

            identity = auth_adapter.resolve_identity(account.profile_key)
            current_time = now or datetime.now(timezone.utc)
            account.display_name = identity.display_name
            account.external_identity = identity.external_identity
            account.last_validated_at = current_time
            account.updated_at = current_time
            account.cooldown_until = None

            if account.status is not AccountStatus.DISABLED:
                account.status = AccountStatus.ACTIVE

            self._accounts.save(account)
            return _to_view(account)
        finally:
            self._browser.close_profile(account.profile_key)

    def cancel_login(
        self,
        account_id: AccountId,
    ) -> AccountView:
        account = self._accounts.get(account_id)
        if account is None:
            raise AccountNotFound(f"Account '{account_id}' not found")

        self._browser.close_profile(account.profile_key)
        return _to_view(account)

    def start_relogin(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> StartLoginResult:
        account = self._accounts.get(account_id)
        if account is None:
            raise AccountNotFound(f"Account '{account_id}' not found")

        current_time = now or datetime.now(timezone.utc)
        if self._accounts.has_active_lease(account_id, current_time):
            raise AccountInUse(f"Account '{account_id}' is currently leased")

        if self._browser.has_open_session(account.profile_key):
            raise BrowserProfileInUse(f"Browser profile '{account.profile_key}' is already open")

        auth_adapter = self._providers.get_auth(account.provider_key)
        if auth_adapter is None:
            raise ProviderNotRegistered(f"Provider '{account.provider_key}' is not registered")

        self._browser.open_login(
            provider_key=account.provider_key,
            profile_key=account.profile_key,
            login_url=auth_adapter.login_url(),
        )

        return StartLoginResult(
            account_id=account_id,
            status="waiting_for_user",
        )

    def validate_account(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        account = self._accounts.get(account_id)
        if account is None:
            raise AccountNotFound(f"Account '{account_id}' not found")

        auth_adapter = self._providers.get_auth(account.provider_key)
        if auth_adapter is None:
            raise ProviderNotRegistered(f"Provider '{account.provider_key}' is not registered")

        current_time = now or datetime.now(timezone.utc)
        validation = auth_adapter.validate_persisted_session(account.profile_key)

        account.updated_at = current_time
        if validation.valid:
            account.last_validated_at = current_time
            if account.status is not AccountStatus.DISABLED:
                account.status = AccountStatus.ACTIVE
                account.cooldown_until = None
        else:
            if account.status is not AccountStatus.DISABLED:
                account.status = AccountStatus.AUTH_REQUIRED

        self._accounts.save(account)
        return _to_view(account)

    def enable_account(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        account = self._accounts.get(account_id)
        if account is None:
            raise AccountNotFound(f"Account '{account_id}' not found")

        account.enable(now=now)
        self._accounts.save(account)
        return _to_view(account)

    def disable_account(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        account = self._accounts.get(account_id)
        if account is None:
            raise AccountNotFound(f"Account '{account_id}' not found")

        account.disable(now=now)
        self._accounts.save(account)
        return _to_view(account)

    def delete_account(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> None:
        account = self._accounts.get(account_id)
        if account is None:
            raise AccountNotFound(f"Account '{account_id}' not found")

        current_time = now or datetime.now(timezone.utc)
        if self._accounts.has_active_lease(account_id, current_time):
            raise AccountInUse(f"Cannot delete account '{account_id}' while an active lease exists")

        if self._browser.has_open_session(account.profile_key):
            raise BrowserProfileInUse(
                f"Cannot delete account '{account_id}' while a browser session is active"
            )

        self._accounts.delete(account_id)

        try:
            self._browser.delete_profile(account.profile_key)
        except Exception:
            logger.exception("Account deleted but browser profile cleanup failed")

    # --- Leasing ---

    def acquire(
        self,
        provider_key: str,
        owner_id: str,
        ttl: timedelta,
        now: datetime | None = None,
    ) -> AccountLeaseView:
        if ttl.total_seconds() <= 0:
            raise ValueError("TTL must be greater than zero")

        current_time = now or datetime.now(timezone.utc)
        expires_at = current_time + ttl

        result = self._accounts.acquire_lru(
            provider_key=provider_key,
            owner_id=owner_id,
            now=current_time,
            expires_at=expires_at,
        )

        if result is None:
            raise AccountUnavailable(f"No available account for provider '{provider_key}'")

        account, lease = result
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
        released = self._accounts.release_lease(lease_id)
        if not released:
            raise LeaseNotFound(f"Lease '{lease_id}' not found or already released")

    # --- Health and Cooldown Reporting ---

    def report_success(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        account = self._accounts.get(account_id)
        if account is None:
            raise AccountNotFound(f"Account '{account_id}' not found")

        current_time = now or datetime.now(timezone.utc)
        account.consecutive_failures = 0
        account.last_success_at = current_time
        account.updated_at = current_time

        if account.status is not AccountStatus.DISABLED:
            if account.status is AccountStatus.COOLDOWN and (
                account.cooldown_until is None or account.cooldown_until <= current_time
            ):
                account.status = AccountStatus.ACTIVE
                account.cooldown_until = None

        self._accounts.save(account)
        return _to_view(account)

    def report_auth_failure(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        account = self._accounts.get(account_id)
        if account is None:
            raise AccountNotFound(f"Account '{account_id}' not found")

        current_time = now or datetime.now(timezone.utc)
        account.consecutive_failures += 1
        account.last_failure_at = current_time
        account.updated_at = current_time

        if account.status is not AccountStatus.DISABLED:
            account.status = AccountStatus.AUTH_REQUIRED

        self._accounts.save(account)
        return _to_view(account)

    def report_temporary_failure(
        self,
        account_id: AccountId,
        now: datetime | None = None,
        cooldown_until: datetime | None = None,
    ) -> AccountView:
        account = self._accounts.get(account_id)
        if account is None:
            raise AccountNotFound(f"Account '{account_id}' not found")

        current_time = now or datetime.now(timezone.utc)
        account.consecutive_failures += 1
        account.last_failure_at = current_time
        account.updated_at = current_time

        if cooldown_until is not None:
            account.cooldown_until = cooldown_until
            if account.status is not AccountStatus.DISABLED:
                account.status = AccountStatus.COOLDOWN
        elif account.consecutive_failures >= 3:
            account.cooldown_until = current_time + timedelta(minutes=5)
            if account.status is not AccountStatus.DISABLED:
                account.status = AccountStatus.COOLDOWN

        self._accounts.save(account)
        return _to_view(account)

    def report_rate_limited(
        self,
        account_id: AccountId,
        now: datetime | None = None,
        retry_after: datetime | None = None,
    ) -> AccountView:
        account = self._accounts.get(account_id)
        if account is None:
            raise AccountNotFound(f"Account '{account_id}' not found")

        current_time = now or datetime.now(timezone.utc)
        account.consecutive_failures += 1
        account.last_failure_at = current_time
        account.updated_at = current_time

        account.cooldown_until = retry_after or (current_time + timedelta(minutes=15))
        if account.status is not AccountStatus.DISABLED:
            account.status = AccountStatus.COOLDOWN

        self._accounts.save(account)
        return _to_view(account)
