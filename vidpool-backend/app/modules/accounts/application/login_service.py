import logging
import uuid
from collections.abc import Callable
from datetime import UTC, datetime

from app.modules.accounts.domain.account import ProviderAccount
from app.modules.accounts.domain.errors import (
    AccountInUse,
    AccountNotFound,
    BrowserProfileInUse,
    BrowserSessionNotOpen,
    InvalidAccountState,
    ProviderNotRegistered,
    SessionInvalid,
)
from app.modules.accounts.domain.values import AccountId, AccountStatus

from .mappers import account_to_view
from .ports import BrowserSessionPort, ProviderRegistryPort
from .queries import AccountView, StartLoginResult
from .uow import AccountUnitOfWorkPort

logger = logging.getLogger(__name__)

_to_view = account_to_view


class AccountLoginService:
    def __init__(
        self,
        uow_factory: Callable[[], AccountUnitOfWorkPort],
        browser: BrowserSessionPort,
        providers: ProviderRegistryPort,
    ) -> None:
        self._uow_factory = uow_factory
        self._browser = browser
        self._providers = providers

    def start_login(
        self,
        provider_key: str,
        account_id: AccountId | None = None,
        now: datetime | None = None,
    ) -> StartLoginResult:
        auth_adapter = self._providers.get_auth(provider_key)
        if auth_adapter is None:
            raise ProviderNotRegistered(f"Provider '{provider_key}' is not registered")

        login_url = auth_adapter.login_url()
        current_time = now or datetime.now(UTC)
        resolved_account_id = account_id or AccountId(uuid.uuid4())
        profile_key = f"browser-profile/{provider_key}/{resolved_account_id}"

        candidate = ProviderAccount.create(
            provider_key=provider_key,
            profile_key=profile_key,
            account_id=resolved_account_id,
            now=current_time,
        )

        if self._browser.has_open_session(profile_key):
            raise BrowserProfileInUse(f"Browser profile '{profile_key}' is already open")

        try:
            self._browser.open_login(
                provider_key=provider_key,
                profile_key=profile_key,
                login_url=login_url,
            )
            with self._uow_factory() as uow:
                uow.accounts.add(candidate)
                uow.commit()
        except Exception:
            self._browser.close_profile(profile_key)
            try:
                self._browser.delete_profile(profile_key)
            except Exception:
                logger.exception("Failed to clean profile after login start failure")
            raise

        logger.info(
            "account_login_started account_id=%s provider_key=%s",
            candidate.id,
            provider_key,
        )
        return StartLoginResult(
            account_id=candidate.id,
            status="waiting_for_user",
        )

    def complete_login(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> AccountView:
        with self._uow_factory() as uow:
            account = uow.accounts.get(account_id)
            if account is None:
                raise AccountNotFound(f"Account '{account_id}' not found")
            provider_key = account.provider_key
            profile_key = account.profile_key

        auth_adapter = self._providers.get_auth(provider_key)
        if auth_adapter is None:
            raise ProviderNotRegistered(f"Provider '{provider_key}' is not registered")

        if not self._browser.has_open_session(profile_key):
            raise BrowserSessionNotOpen(f"No active browser session for '{profile_key}'")

        try:
            validation = auth_adapter.validate_active_session(profile_key)

            if not validation.valid:
                current_time = now or datetime.now(UTC)
                with self._uow_factory() as uow:
                    acc = uow.accounts.get(account_id)
                    if acc is not None:
                        acc.mark_auth_required(now=current_time)
                        uow.accounts.save(acc)
                        uow.commit()
                logger.warning(
                    "account_login_invalid account_id=%s provider_key=%s",
                    account_id,
                    provider_key,
                )
                raise SessionInvalid("Browser session validation failed")

            identity = auth_adapter.resolve_identity(profile_key)
            current_time = now or datetime.now(UTC)
            with self._uow_factory() as uow:
                acc = uow.accounts.get(account_id)
                if acc is None:
                    raise AccountNotFound(f"Account '{account_id}' not found")
                acc.mark_authenticated(
                    display_name=identity.display_name,
                    external_identity=identity.external_identity,
                    now=current_time,
                )
                uow.accounts.save(acc)
                uow.commit()
                logger.info(
                    "account_login_completed account_id=%s provider_key=%s",
                    account_id,
                    provider_key,
                )
                return _to_view(acc)
        finally:
            self._browser.close_profile(profile_key)

    def cancel_new_login(
        self,
        account_id: AccountId,
    ) -> None:
        with self._uow_factory() as uow:
            account = uow.accounts.get(account_id)
            if account is None:
                raise AccountNotFound(f"Account '{account_id}' not found")
            if (
                account.status is not AccountStatus.AUTH_REQUIRED
                or account.last_validated_at is not None
            ):
                raise InvalidAccountState(
                    f"Cannot cancel new login for account '{account_id}' because it is not a provisional account."
                )
            profile_key = account.profile_key

        self._browser.close_profile(profile_key)

        with self._uow_factory() as uow:
            uow.accounts.delete(account_id)
            uow.commit()

        try:
            self._browser.delete_profile(profile_key)
        except Exception:
            logger.exception(
                "Provisional account %s deleted from DB but profile cleanup failed",
                account_id,
            )

    def cancel_relogin(
        self,
        account_id: AccountId,
    ) -> AccountView:
        with self._uow_factory() as uow:
            account = uow.accounts.get(account_id)
            if account is None:
                raise AccountNotFound(f"Account '{account_id}' not found")
            profile_key = account.profile_key
            view = _to_view(account)

        self._browser.close_profile(profile_key)
        return view

    def cancel_login(
        self,
        account_id: AccountId,
    ) -> AccountView:
        return self.cancel_relogin(account_id)

    def start_relogin(
        self,
        account_id: AccountId,
        now: datetime | None = None,
    ) -> StartLoginResult:
        current_time = now or datetime.now(UTC)
        with self._uow_factory() as uow:
            account = uow.accounts.get(account_id)
            if account is None:
                raise AccountNotFound(f"Account '{account_id}' not found")
            if uow.accounts.has_active_lease(account_id, current_time):
                raise AccountInUse(f"Account '{account_id}' is currently leased")
            if account.status != AccountStatus.AUTH_REQUIRED:
                raise InvalidAccountState(
                    f"Cannot relogin account '{account_id}' in state '{account.status}'. "
                    "Relogin is only permitted for accounts requiring authentication (AUTH_REQUIRED)."
                )
            provider_key = account.provider_key
            profile_key = account.profile_key

        if self._browser.has_open_session(profile_key):
            raise BrowserProfileInUse(f"Browser profile '{profile_key}' is already open")

        auth_adapter = self._providers.get_auth(provider_key)
        if auth_adapter is None:
            raise ProviderNotRegistered(f"Provider '{provider_key}' is not registered")

        self._browser.open_login(
            provider_key=provider_key,
            profile_key=profile_key,
            login_url=auth_adapter.login_url(),
        )

        logger.info(
            "account_relogin_started account_id=%s provider_key=%s",
            account_id,
            provider_key,
        )
        return StartLoginResult(
            account_id=account_id,
            status="waiting_for_user",
        )
