import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.modules.accounts.application.ports import (
    AccountRepositoryPort,
    BrowserSessionPort,
    ProviderAuthPort,
    ProviderRegistryPort,
)
from app.modules.accounts.application.service import AccountService
from app.modules.accounts.domain.account import ProviderAccount
from app.modules.accounts.domain.errors import (
    AccountInUse,
    AccountUnavailable,
    BrowserProfileInUse,
    BrowserSessionNotOpen,
    DuplicateProviderIdentity,
    InvalidAccountState,
    LeaseNotFound,
    ProviderNotRegistered,
    ProviderUnavailable,
    SessionInvalid,
)
from app.modules.accounts.domain.values import AccountId, AccountStatus
from tests.accounts.fakes import (
    FakeAccountRepository,
    FakeAccountUnitOfWork,
    FakeBrowserSessionManager,
    FakeProviderAuthAdapter,
    FakeProviderRegistry,
)

NOW = datetime(2026, 9, 17, 12, 0, 0, tzinfo=UTC)
LATER = NOW + timedelta(minutes=5)


def _build_service(
    auth_adapter: FakeProviderAuthAdapter | None = None,
) -> tuple[AccountService, FakeAccountRepository, FakeBrowserSessionManager, FakeProviderRegistry]:
    repo = FakeAccountRepository()
    browser = FakeBrowserSessionManager()
    adapter = auth_adapter or FakeProviderAuthAdapter(provider_key="provider-x")
    registry = FakeProviderRegistry([adapter])
    service = AccountService(
        uow_factory=lambda: FakeAccountUnitOfWork(repo),
        browser=browser,
        providers=registry,
    )
    return service, repo, browser, registry


def test_ports_and_fakes_satisfy_protocols() -> None:
    repo = FakeAccountRepository()
    assert isinstance(repo, AccountRepositoryPort)

    browser = FakeBrowserSessionManager()
    assert isinstance(browser, BrowserSessionPort)

    auth = FakeProviderAuthAdapter(provider_key="test-provider")
    assert isinstance(auth, ProviderAuthPort)

    val = auth.validate_active_session("profiles/test")
    assert val.valid is True

    identity = auth.resolve_identity("profiles/test")
    assert identity.display_name == "Fake User"

    persisted_val = auth.validate_persisted_session("profiles/test")
    assert persisted_val.valid is True

    registry = FakeProviderRegistry(auth_adapters=[auth])
    assert isinstance(registry, ProviderRegistryPort)


def test_start_login_creates_auth_required_account() -> None:
    service, repo, browser, _ = _build_service()

    result = service.start_login("provider-x", now=NOW)

    assert result.status == "waiting_for_user"

    account = repo.get(result.account_id)
    assert account is not None
    assert account.status is AccountStatus.AUTH_REQUIRED
    assert account.provider_key == "provider-x"
    assert account.profile_key == f"browser-profile/provider-x/{result.account_id}"
    assert browser.has_open_session(account.profile_key)


def test_start_login_with_unregistered_provider_raises() -> None:
    service, _, _, _ = _build_service()

    with pytest.raises(ProviderNotRegistered):
        service.start_login("unknown-provider")


def test_start_login_does_not_persist_account_when_browser_launch_fails() -> None:
    class FailingBrowser(FakeBrowserSessionManager):
        def open_login(self, **kwargs) -> None:
            raise RuntimeError("Browser launch crash")

    repo = FakeAccountRepository()
    browser = FailingBrowser()
    adapter = FakeProviderAuthAdapter(provider_key="provider-x")
    registry = FakeProviderRegistry([adapter])
    service = AccountService(
        uow_factory=lambda: FakeAccountUnitOfWork(repo),
        browser=browser,
        providers=registry,
    )

    with pytest.raises(RuntimeError, match="Browser launch crash"):
        service.start_login("provider-x", now=NOW)

    assert repo.accounts == {}
    assert browser.open_profiles == set()


def test_start_login_closes_and_deletes_profile_when_repository_add_fails() -> None:
    class FailingRepo(FakeAccountRepository):
        def add(self, account: ProviderAccount) -> None:
            raise RuntimeError("DB insert failed")

    repo = FailingRepo()
    browser = FakeBrowserSessionManager()
    adapter = FakeProviderAuthAdapter(provider_key="provider-x")
    registry = FakeProviderRegistry([adapter])
    service = AccountService(
        uow_factory=lambda: FakeAccountUnitOfWork(repo),
        browser=browser,
        providers=registry,
    )

    with pytest.raises(RuntimeError, match="DB insert failed"):
        service.start_login("provider-x", now=NOW)

    assert len(browser.open_profiles) == 0
    assert len(browser.deleted_profiles) == 1


def test_complete_login_success() -> None:
    auth = FakeProviderAuthAdapter(
        provider_key="provider-x",
        valid_session=True,
        display_name="Alice",
        external_identity="user-123",
    )
    service, repo, browser, _ = _build_service(auth)

    start = service.start_login("provider-x", now=NOW)
    view = service.complete_login(start.account_id, now=LATER)

    assert view.status is AccountStatus.ACTIVE
    assert view.display_name == "Alice"
    assert view.external_identity == "user-123"
    assert view.last_validated_at == LATER

    # Browser session is closed after completion
    assert not browser.has_open_session(repo.get(start.account_id).profile_key)


def test_complete_login_success_closes_profile() -> None:
    auth = FakeProviderAuthAdapter(provider_key="provider-x", valid_session=True)
    service, repo, browser, _ = _build_service(auth)

    start = service.start_login("provider-x", now=NOW)
    account = repo.get(start.account_id)
    assert browser.has_open_session(account.profile_key)

    service.complete_login(start.account_id, now=LATER)
    assert not browser.has_open_session(account.profile_key)


def test_complete_login_invalid_session_leaves_auth_required() -> None:
    auth = FakeProviderAuthAdapter(provider_key="provider-x", valid_session=False)
    service, repo, browser, _ = _build_service(auth)

    start = service.start_login("provider-x", now=NOW)

    with pytest.raises(SessionInvalid):
        service.complete_login(start.account_id, now=LATER)

    account = repo.get(start.account_id)
    assert account.status is AccountStatus.AUTH_REQUIRED
    assert not browser.has_open_session(account.profile_key)


def test_complete_login_requires_open_browser_profile() -> None:
    auth = FakeProviderAuthAdapter(provider_key="provider-x", valid_session=True)
    service, repo, browser, _ = _build_service(auth)

    start = service.start_login("provider-x", now=NOW)
    account = repo.get(start.account_id)
    browser.close_profile(account.profile_key)

    with pytest.raises(BrowserSessionNotOpen):
        service.complete_login(start.account_id, now=LATER)


def test_cancel_new_login_deletes_account_and_profile() -> None:
    service, repo, browser, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    account = repo.get(start.account_id)
    assert account is not None
    profile_key = account.profile_key
    assert browser.has_open_session(profile_key)

    service.cancel_new_login(start.account_id)

    assert repo.get(start.account_id) is None
    assert not browser.has_open_session(profile_key)
    assert profile_key in browser.deleted_profiles


def test_cancel_new_login_rejects_active_account() -> None:
    service, repo, _, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    with pytest.raises(InvalidAccountState):
        service.cancel_new_login(start.account_id)

    assert repo.get(start.account_id) is not None


def test_cancel_relogin_preserves_account_and_profile() -> None:
    service, repo, browser, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)
    service.report_auth_failure(start.account_id, now=LATER)

    service.start_relogin(start.account_id, now=LATER)
    account = repo.get(start.account_id)
    assert account is not None
    assert browser.has_open_session(account.profile_key)

    view = service.cancel_relogin(start.account_id)
    assert view.status is AccountStatus.AUTH_REQUIRED
    assert repo.get(start.account_id) is not None
    assert not browser.has_open_session(account.profile_key)
    assert account.profile_key not in browser.deleted_profiles


def test_cancel_login_closes_only_accounts_own_profile() -> None:
    service, repo, browser, _ = _build_service()

    start1 = service.start_login("provider-x", now=NOW)
    start2 = service.start_login("provider-x", now=NOW)

    acc1 = repo.get(start1.account_id)
    acc2 = repo.get(start2.account_id)

    assert browser.has_open_session(acc1.profile_key)
    assert browser.has_open_session(acc2.profile_key)

    service.cancel_new_login(start1.account_id)

    assert not browser.has_open_session(acc1.profile_key)
    assert browser.has_open_session(acc2.profile_key)
    assert acc1.profile_key in browser.deleted_profiles
    assert acc2.profile_key not in browser.deleted_profiles


def test_complete_login_closes_only_accounts_own_profile() -> None:
    auth = FakeProviderAuthAdapter(provider_key="provider-x", valid_session=True)
    service, repo, browser, _ = _build_service(auth)

    start1 = service.start_login("provider-x", now=NOW)
    start2 = service.start_login("provider-x", now=NOW)

    acc1 = repo.get(start1.account_id)
    acc2 = repo.get(start2.account_id)

    assert browser.has_open_session(acc1.profile_key)
    assert browser.has_open_session(acc2.profile_key)

    service.complete_login(start1.account_id, now=NOW)

    assert not browser.has_open_session(acc1.profile_key)
    assert browser.has_open_session(acc2.profile_key)


def test_start_relogin_reuses_existing_profile_key() -> None:
    service, repo, browser, _ = _build_service()

    start1 = service.start_login("provider-x", now=NOW)
    service.complete_login(start1.account_id, now=NOW)
    service.report_auth_failure(start1.account_id, now=LATER)
    account1 = repo.get(start1.account_id)

    start2 = service.start_relogin(start1.account_id, now=LATER)
    assert start2.account_id == start1.account_id
    assert browser.has_open_session(account1.profile_key)


def test_start_relogin_rejects_existing_open_browser() -> None:
    service, repo, browser, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)
    service.report_auth_failure(start.account_id, now=LATER)
    account = repo.get(start.account_id)
    assert account is not None

    # Open browser session manually to simulate an already-open session
    browser.open_login(
        provider_key="provider-x",
        profile_key=account.profile_key,
        login_url="https://login",
    )

    with pytest.raises(BrowserProfileInUse):
        service.start_relogin(start.account_id, now=LATER)


def test_start_relogin_rejects_active_lease() -> None:
    service, repo, _, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    # Acquire lease
    service.acquire("provider-x", "job:1", ttl=timedelta(minutes=10), now=NOW)

    with pytest.raises(AccountInUse):
        service.start_relogin(start.account_id, now=NOW)


def test_start_relogin_rejects_active_account() -> None:
    service, repo, _, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    # Account is now ACTIVE and not leased
    with pytest.raises(InvalidAccountState):
        service.start_relogin(start.account_id, now=NOW)


def test_start_relogin_rejects_disabled_account() -> None:
    service, repo, _, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    service.disable_account(start.account_id, now=NOW)

    with pytest.raises(InvalidAccountState):
        service.start_relogin(start.account_id, now=NOW)


def test_disable_account_rejects_active_lease() -> None:
    service, repo, _, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    service.acquire("provider-x", "job:1", ttl=timedelta(minutes=10), now=NOW)

    with pytest.raises(AccountInUse):
        service.disable_account(start.account_id, now=NOW)


def test_validate_account_rejects_active_lease() -> None:
    auth = FakeProviderAuthAdapter(provider_key="provider-x", valid_session=True)
    service, repo, _, _ = _build_service(auth)

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    service.acquire("provider-x", "job:1", ttl=timedelta(minutes=10), now=NOW)

    with pytest.raises(AccountInUse):
        service.validate_account(start.account_id, now=NOW)


def test_validate_account_valid_and_invalid() -> None:
    auth = FakeProviderAuthAdapter(provider_key="provider-x", valid_session=True)
    service, repo, _, _ = _build_service(auth)

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    # Valid validation
    view1 = service.validate_account(start.account_id, now=LATER)
    assert view1.status is AccountStatus.ACTIVE
    assert view1.last_validated_at == LATER

    # Now simulate invalid session
    auth.valid_session = False
    view2 = service.validate_account(start.account_id, now=LATER + timedelta(minutes=5))
    assert view2.status is AccountStatus.AUTH_REQUIRED


def test_disabled_account_preserves_disabled_state() -> None:
    auth = FakeProviderAuthAdapter(provider_key="provider-x", valid_session=True)
    service, _, _, _ = _build_service(auth)

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    disabled_view = service.disable_account(start.account_id, now=NOW)
    assert disabled_view.status is AccountStatus.DISABLED

    # Validating does not revive DISABLED
    val_view = service.validate_account(start.account_id, now=LATER)
    assert val_view.status is AccountStatus.DISABLED

    # Reporting success does not revive DISABLED
    succ_view = service.report_success(start.account_id, now=LATER)
    assert succ_view.status is AccountStatus.DISABLED

    # Explicit enable returns to AUTH_REQUIRED
    enabled_view = service.enable_account(start.account_id, now=LATER)
    assert enabled_view.status is AccountStatus.AUTH_REQUIRED


def test_delete_account_removes_profile_and_record() -> None:
    service, repo, browser, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)
    account = repo.get(start.account_id)
    assert account is not None

    service.delete_account(start.account_id, now=NOW)

    assert repo.get(start.account_id) is None
    assert account.profile_key in browser.deleted_profiles


def test_delete_account_rejects_active_lease() -> None:
    service, _, _, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    service.acquire("provider-x", "job:1", ttl=timedelta(minutes=10), now=NOW)

    with pytest.raises(AccountInUse):
        service.delete_account(start.account_id, now=NOW)


def test_delete_account_rejects_open_session() -> None:
    service, _, _, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    # Session still open

    with pytest.raises(BrowserProfileInUse):
        service.delete_account(start.account_id, now=NOW)


def test_delete_account_keeps_record_when_repository_delete_fails() -> None:
    class FailingDeleteRepo(FakeAccountRepository):
        def delete(self, account_id: AccountId) -> None:
            raise RuntimeError("Delete DB failed")

    repo = FailingDeleteRepo()
    browser = FakeBrowserSessionManager()
    adapter = FakeProviderAuthAdapter(provider_key="provider-x")
    registry = FakeProviderRegistry([adapter])
    service = AccountService(
        uow_factory=lambda: FakeAccountUnitOfWork(repo),
        browser=browser,
        providers=registry,
    )

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    with pytest.raises(RuntimeError, match="Delete DB failed"):
        service.delete_account(start.account_id, now=NOW)

    assert repo.get(start.account_id) is not None


def test_delete_account_preserves_record_when_profile_cleanup_fails() -> None:
    class FailingDeleteBrowser(FakeBrowserSessionManager):
        def delete_profile(self, profile_key: str) -> None:
            raise RuntimeError("Disk deletion failed")

    repo = FakeAccountRepository()
    browser = FailingDeleteBrowser()
    adapter = FakeProviderAuthAdapter(provider_key="provider-x")
    registry = FakeProviderRegistry([adapter])
    service = AccountService(
        uow_factory=lambda: FakeAccountUnitOfWork(repo),
        browser=browser,
        providers=registry,
    )

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    # Disk cleanup failure must prevent deleting the account from DB
    with pytest.raises(RuntimeError, match="Disk deletion failed"):
        service.delete_account(start.account_id, now=NOW)

    assert repo.get(start.account_id) is not None


def test_cancel_new_login_preserves_record_when_profile_cleanup_fails() -> None:
    class FailingDeleteBrowser(FakeBrowserSessionManager):
        def delete_profile(self, profile_key: str) -> None:
            raise RuntimeError("Disk deletion failed")

    repo = FakeAccountRepository()
    browser = FailingDeleteBrowser()
    adapter = FakeProviderAuthAdapter(provider_key="provider-x")
    registry = FakeProviderRegistry([adapter])
    service = AccountService(
        uow_factory=lambda: FakeAccountUnitOfWork(repo),
        browser=browser,
        providers=registry,
    )

    start = service.start_login("provider-x", now=NOW)
    with pytest.raises(RuntimeError, match="Disk deletion failed"):
        service.cancel_new_login(start.account_id)

    assert repo.get(start.account_id) is not None


# --- Leasing Tests (Task C3) ---


def test_acquire_and_release_lru() -> None:
    service, repo, _, registry = _build_service()
    adapter = registry.get_auth("provider-x")
    assert adapter is not None

    start1 = service.start_login("provider-x", now=NOW)
    service.complete_login(start1.account_id, now=NOW)

    adapter.external_identity = "user-distinct-2"
    start2 = service.start_login("provider-x", now=NOW)
    service.complete_login(start2.account_id, now=NOW)

    lease1 = service.acquire("provider-x", owner_id="job:1", ttl=timedelta(minutes=10), now=NOW)
    assert lease1.account_id in (start1.account_id, start2.account_id)

    # Second acquisition gets the other account
    lease2 = service.acquire("provider-x", owner_id="job:2", ttl=timedelta(minutes=10), now=NOW)
    assert lease2.account_id != lease1.account_id

    # Third acquisition fails since both accounts are leased
    with pytest.raises(AccountUnavailable):
        service.acquire("provider-x", owner_id="job:3", ttl=timedelta(minutes=10), now=NOW)

    # Release lease1 -> now eligible again
    service.release(lease1.lease_id)
    lease3 = service.acquire("provider-x", owner_id="job:3", ttl=timedelta(minutes=10), now=NOW)
    assert lease3.account_id == lease1.account_id


def test_acquire_rejects_non_positive_ttl() -> None:
    service, _, _, _ = _build_service()
    with pytest.raises(ValueError, match="greater than zero"):
        service.acquire("provider-x", owner_id="job:1", ttl=timedelta(seconds=0))


def test_release_missing_lease_raises() -> None:
    service, _, _, _ = _build_service()
    with pytest.raises(LeaseNotFound):
        service.release(uuid.uuid4())


# --- Health & Cooldown Tests (Task C4) ---


def test_health_temporary_failures_trigger_cooldown() -> None:
    service, repo, _, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    v1 = service.report_temporary_failure(start.account_id, now=NOW)
    assert v1.status is AccountStatus.ACTIVE
    assert repo.get(start.account_id).consecutive_failures == 1

    v2 = service.report_temporary_failure(start.account_id, now=NOW)
    assert v2.status is AccountStatus.ACTIVE

    v3 = service.report_temporary_failure(start.account_id, now=NOW)
    assert v3.status is AccountStatus.COOLDOWN
    assert v3.cooldown_until == NOW + timedelta(minutes=5)

    # Success resets consecutive failures and clears elapsed cooldown
    v_success = service.report_success(start.account_id, now=NOW + timedelta(minutes=6))
    assert v_success.status is AccountStatus.ACTIVE
    assert repo.get(start.account_id).consecutive_failures == 0


def test_health_rate_limited_sets_cooldown_and_does_not_auto_acquire() -> None:
    service, repo, _, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    retry_after = NOW + timedelta(minutes=30)
    v = service.report_rate_limited(start.account_id, now=NOW, retry_after=retry_after)

    assert v.status is AccountStatus.COOLDOWN
    assert v.cooldown_until == retry_after
    # Leases dict is completely empty (no auto-acquire triggered)
    assert len(repo.leases) == 0


def test_health_auth_failure_sets_auth_required() -> None:
    service, _, _, _ = _build_service()

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    v = service.report_auth_failure(start.account_id, now=NOW)
    assert v.status is AccountStatus.AUTH_REQUIRED


def test_validate_account_preserves_state_on_provider_unavailable() -> None:
    adapter = FakeProviderAuthAdapter(provider_key="provider-x")
    service, repo, _, _ = _build_service(adapter)

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    account = repo.get(start.account_id)
    assert account is not None
    assert account.status is AccountStatus.ACTIVE
    previous_last_validated_at = account.last_validated_at

    adapter.persisted_validation_error = ProviderUnavailable(
        "Provider session check unavailable"
    )

    with pytest.raises(ProviderUnavailable):
        service.validate_account(start.account_id, now=LATER)

    account = repo.get(start.account_id)
    assert account is not None
    assert account.status is AccountStatus.ACTIVE
    assert account.last_validated_at == previous_last_validated_at


def test_validate_account_transitions_to_auth_required_when_invalid() -> None:
    adapter = FakeProviderAuthAdapter(provider_key="provider-x")
    service, repo, _, _ = _build_service(adapter)

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    adapter.valid_session = False
    view = service.validate_account(start.account_id, now=LATER)

    assert view.status is AccountStatus.AUTH_REQUIRED
    account = repo.get(start.account_id)
    assert account is not None
    assert account.status is AccountStatus.AUTH_REQUIRED


def test_complete_login_rejects_duplicate_provider_identity_and_cleans_up_provisional() -> None:
    adapter = FakeProviderAuthAdapter(
        provider_key="provider-x",
        external_identity="user-common-123",
        display_name="User Alpha",
    )
    service, repo, browser, _ = _build_service(adapter)

    # 1. First account registers and completes login successfully
    start1 = service.start_login("provider-x", now=NOW)
    view1 = service.complete_login(start1.account_id, now=NOW)
    assert view1.status is AccountStatus.ACTIVE
    assert view1.external_identity == "user-common-123"

    # 2. Second account begins login with a different profile
    start2 = service.start_login("provider-x", now=LATER)
    profile2_key = f"browser-profile/provider-x/{start2.account_id}"
    assert repo.get(start2.account_id) is not None
    assert browser.has_open_session(profile2_key) is True

    # 3. Completing login resolves to the SAME external identity -> should raise DuplicateProviderIdentity
    with pytest.raises(DuplicateProviderIdentity):
        service.complete_login(start2.account_id, now=LATER)

    # 4. Provisional account must be cleaned up from DB and browser profile deleted
    assert repo.get(start2.account_id) is None
    assert browser.has_open_session(profile2_key) is False
    assert profile2_key in browser.deleted_profiles

    # 5. The first account must be intact and ACTIVE
    account1 = repo.get(start1.account_id)
    assert account1 is not None
    assert account1.status is AccountStatus.ACTIVE
    assert account1.external_identity == "user-common-123"


def test_relogin_with_duplicate_identity_rejects_without_deleting_existing_account() -> None:
    adapter = FakeProviderAuthAdapter(
        provider_key="provider-x",
        external_identity="user-A",
        display_name="User A",
    )
    service, repo, browser, _ = _build_service(adapter)

    # Account 1 registered with user-A
    start1 = service.start_login("provider-x", now=NOW)
    service.complete_login(start1.account_id, now=NOW)

    # Account 2 registered with user-B
    adapter.external_identity = "user-B"
    adapter.display_name = "User B"
    start2 = service.start_login("provider-x", now=NOW)
    service.complete_login(start2.account_id, now=NOW)

    # Account 2 goes to AUTH_REQUIRED
    service.report_auth_failure(start2.account_id, now=LATER)

    # User starts relogin on Account 2
    service.start_relogin(start2.account_id, now=LATER)

    # But during relogin, user logs in as user-A instead of user-B
    adapter.external_identity = "user-A"
    adapter.display_name = "User A"

    with pytest.raises(DuplicateProviderIdentity):
        service.complete_login(start2.account_id, now=LATER)

    # Account 2 was NOT provisional (had prior validation), so it should NOT be deleted
    acc2 = repo.get(start2.account_id)
    assert acc2 is not None
    assert acc2.status is AccountStatus.AUTH_REQUIRED


def test_complete_login_duplicate_identity_profile_delete_failure_preserves_db_record() -> None:
    adapter = FakeProviderAuthAdapter(
        provider_key="provider-x",
        external_identity="user-common-123",
        display_name="First User",
    )
    service, repo, browser, _ = _build_service(adapter)

    # 1. Register Account 1
    start1 = service.start_login("provider-x", now=NOW)
    service.complete_login(start1.account_id, now=NOW)

    # 2. Start provisional Account 2
    adapter.display_name = "Second User"
    start2 = service.start_login("provider-x", now=LATER)
    profile2_key = f"browser-profile/provider-x/{start2.account_id}"

    # Inject failure into browser.delete_profile
    browser.delete_profile_error = RuntimeError("Disk locked or profile in use")

    # 3. Complete login detects duplicate, attempts profile delete first and fails
    with pytest.raises(RuntimeError, match="Disk locked or profile in use"):
        service.complete_login(start2.account_id, now=LATER)

    # Invariant: DB record must NOT be deleted if profile delete failed!
    account2 = repo.get(start2.account_id)
    assert account2 is not None
    assert account2.status is AccountStatus.AUTH_REQUIRED
    assert profile2_key not in browser.deleted_profiles

    # 4. Clear error and retry cleanup via cancel_new_login
    browser.delete_profile_error = None
    service.cancel_new_login(start2.account_id)
    assert repo.get(start2.account_id) is None
    assert profile2_key in browser.deleted_profiles


def test_successful_login_closes_profile_and_preserves_persisted_profile_and_active_account() -> None:
    adapter = FakeProviderAuthAdapter(
        provider_key="provider-x",
        external_identity="user-success-123",
        display_name="Success User",
    )
    service, repo, browser, _ = _build_service(adapter)

    start = service.start_login("provider-x", now=NOW)
    account = repo.get(start.account_id)
    assert account is not None
    profile_key = account.profile_key
    assert browser.has_open_session(profile_key)

    view = service.complete_login(start.account_id, now=LATER)

    assert view.status is AccountStatus.ACTIVE
    assert not browser.has_open_session(profile_key)
    # Persisted profile must NOT be deleted
    assert profile_key not in browser.deleted_profiles
    db_account = repo.get(start.account_id)
    assert db_account is not None
    assert db_account.status is AccountStatus.ACTIVE


def test_start_login_preserves_original_browser_error_when_cleanup_fails() -> None:
    from app.modules.accounts.domain.errors import BrowserCommandTimeout, BrowserUnavailable

    class TimeoutFailingBrowser(FakeBrowserSessionManager):
        def open_login(self, *, provider_key: str, profile_key: str, login_url: str) -> None:
            raise BrowserCommandTimeout("Browser operation timed out after 30.0s")

        def close_profile(self, profile_key: str) -> None:
            raise BrowserUnavailable("Browser runtime is failed")

        def delete_profile(self, profile_key: str) -> None:
            raise BrowserUnavailable("Browser runtime is failed")

    repo = FakeAccountRepository()
    browser = TimeoutFailingBrowser()
    adapter = FakeProviderAuthAdapter(provider_key="provider-x")
    registry = FakeProviderRegistry([adapter])
    service = AccountService(
        uow_factory=lambda: FakeAccountUnitOfWork(repo),
        browser=browser,
        providers=registry,
    )

    with pytest.raises(BrowserCommandTimeout, match="timed out after 30.0s"):
        service.start_login("provider-x")


def test_start_login_db_failure_closes_open_profile_and_cleans_up() -> None:
    class FailingUOW(FakeAccountUnitOfWork):
        def commit(self) -> None:
            raise RuntimeError("Database connection lost")

    repo = FakeAccountRepository()
    browser = FakeBrowserSessionManager()
    adapter = FakeProviderAuthAdapter(provider_key="provider-x")
    registry = FakeProviderRegistry([adapter])
    service = AccountService(
        uow_factory=lambda: FailingUOW(repo),
        browser=browser,
        providers=registry,
    )

    with pytest.raises(RuntimeError, match="Database connection lost"):
        service.start_login("provider-x")

    # Profile must be closed and deleted after failed start_login
    assert len(browser.open_profiles) == 0
    assert len(browser.deleted_profiles) == 1


def test_relogin_with_mismatched_identity_purges_profile_and_sets_auth_required() -> None:
    adapter = FakeProviderAuthAdapter(
        provider_key="provider-x",
        external_identity="user-account-1",
        display_name="User One",
    )
    service, repo, browser, _ = _build_service(adapter)

    # 1. Create and authenticate account 1
    start = service.start_login("provider-x", now=NOW)
    acc = service.complete_login(start.account_id, now=NOW)
    assert acc.status is AccountStatus.ACTIVE
    assert acc.external_identity == "user-account-1"

    # 2. Mark account as requiring auth
    service.report_auth_failure(start.account_id, now=NOW)
    acc_auth_req = service.get_account(start.account_id)
    assert acc_auth_req.status is AccountStatus.AUTH_REQUIRED

    # 3. Start relogin
    relogin_res = service.start_relogin(start.account_id, now=LATER)
    profile_key = f"browser-profile/provider-x/{relogin_res.account_id}"
    assert browser.has_open_session(profile_key)

    # 4. User logs into a DIFFERENT identity in the browser
    adapter.external_identity = "user-wrong-account"
    adapter.display_name = "Wrong User"

    # 5. complete_login should reject, delete profile from disk, keep DB record in AUTH_REQUIRED
    with pytest.raises(DuplicateProviderIdentity, match="Relogin identity mismatch"):
        service.complete_login(start.account_id, now=LATER)

    # Corrupted profile session must be closed and purged
    assert profile_key in browser.deleted_profiles
    assert not browser.has_open_session(profile_key)

    # DB record preserved with status AUTH_REQUIRED
    db_acc = repo.get(start.account_id)
    assert db_acc is not None
    assert db_acc.status is AccountStatus.AUTH_REQUIRED
    assert db_acc.external_identity == "user-account-1"


def test_relogin_with_duplicate_registered_identity_purges_profile_and_preserves_account() -> None:
    adapter = FakeProviderAuthAdapter(
        provider_key="provider-x",
        external_identity="user-alpha",
        display_name="User Alpha",
    )
    service, repo, browser, _ = _build_service(adapter)

    # 1. Register Account A
    start_a = service.start_login("provider-x", now=NOW)
    service.complete_login(start_a.account_id, now=NOW)

    # 2. Register Account B
    adapter.external_identity = "user-beta"
    adapter.display_name = "User Beta"
    start_b = service.start_login("provider-x", now=NOW)
    service.complete_login(start_b.account_id, now=NOW)

    # 3. Account B needs auth
    service.report_auth_failure(start_b.account_id, now=NOW)

    # 4. Relogin Account B
    service.start_relogin(start_b.account_id, now=LATER)
    profile_b_key = f"browser-profile/provider-x/{start_b.account_id}"

    # 5. User accidentally logs into Account A's credentials during Account B relogin
    adapter.external_identity = "user-alpha"
    adapter.display_name = "User Alpha"

    with pytest.raises(DuplicateProviderIdentity):
        service.complete_login(start_b.account_id, now=LATER)

    # Profile B must be purged from disk
    assert profile_b_key in browser.deleted_profiles

    # Account B must remain in DB with status AUTH_REQUIRED
    acc_b = repo.get(start_b.account_id)
    assert acc_b is not None
    assert acc_b.status is AccountStatus.AUTH_REQUIRED
    assert acc_b.external_identity == "user-beta"


def test_validate_account_detects_persisted_identity_mismatch() -> None:
    adapter = FakeProviderAuthAdapter(
        provider_key="provider-x",
        external_identity="user-original",
        display_name="Original User",
    )
    service, repo, browser, _ = _build_service(adapter)

    start = service.start_login("provider-x", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    # Persisted validation sees valid session BUT with different external identity
    adapter.external_identity = "user-hijacked-identity"

    view = service.validate_account(start.account_id, now=LATER)
    # Session must be marked AUTH_REQUIRED because identities do not match
    assert view.status is AccountStatus.AUTH_REQUIRED
    db_acc = repo.get(start.account_id)
    assert db_acc is not None
    assert db_acc.status is AccountStatus.AUTH_REQUIRED



