from datetime import datetime, timezone, timedelta
import uuid
import pytest

from app.modules.accounts.domain.values import AccountStatus, AccountId
from app.modules.accounts.domain.account import ProviderAccount
from app.modules.accounts.domain.lease import AccountLease


NOW = datetime(2026, 9, 17, 12, 0, 0, tzinfo=timezone.utc)
LATER = NOW + timedelta(hours=1)


def test_new_account_requires_authentication() -> None:
    account = ProviderAccount.create(
        provider_key="fake-provider",
        profile_key="browser-profile/fake-provider/account-1",
        now=NOW,
    )
    assert account.status is AccountStatus.AUTH_REQUIRED
    assert account.provider_key == "fake-provider"
    assert account.profile_key == "browser-profile/fake-provider/account-1"
    assert account.created_at == NOW
    assert account.updated_at == NOW
    assert account.consecutive_failures == 0


def test_successful_validation_activates_account() -> None:
    account = ProviderAccount.create(
        provider_key="fake-provider",
        profile_key="browser-profile/fake-provider/account-1",
        now=NOW,
    )
    account.mark_authenticated(
        display_name="User One",
        external_identity="user-1",
        now=LATER,
    )
    assert account.status is AccountStatus.ACTIVE
    assert account.display_name == "User One"
    assert account.external_identity == "user-1"
    assert account.last_validated_at == LATER
    assert account.updated_at == LATER


def test_invalid_session_requires_authentication_again() -> None:
    account = ProviderAccount.create(
        provider_key="fake-provider",
        profile_key="browser-profile/fake-provider/account-1",
        now=NOW,
    )
    account.mark_authenticated(
        display_name="User One",
        external_identity="user-1",
        now=NOW,
    )
    assert account.status is AccountStatus.ACTIVE

    account.mark_auth_required(now=LATER)
    assert account.status is AccountStatus.AUTH_REQUIRED
    assert account.updated_at == LATER


def test_disabled_account_stays_disabled_until_explicit_enable() -> None:
    account = ProviderAccount.create(
        provider_key="fake-provider",
        profile_key="browser-profile/fake-provider/account-1",
        now=NOW,
    )
    account.mark_authenticated(
        display_name="User One",
        external_identity="user-1",
        now=NOW,
    )
    account.disable(now=NOW)
    assert account.status is AccountStatus.DISABLED

    account.enable(now=LATER)
    assert account.status is AccountStatus.AUTH_REQUIRED


def test_disabled_account_cannot_be_mutated_without_explicit_enable() -> None:
    from app.modules.accounts.domain.errors import InvalidAccountStateError

    account = ProviderAccount.create("fake-provider", "profile/1", now=NOW)
    account.mark_authenticated("User", "u1", now=NOW)
    account.disable(now=NOW)

    with pytest.raises(InvalidAccountStateError):
        account.mark_authenticated("User", "u1", now=LATER)

    with pytest.raises(InvalidAccountStateError):
        account.mark_cooldown(cooldown_until=LATER, now=LATER)

    with pytest.raises(InvalidAccountStateError):
        account.mark_auth_required(now=LATER)

    with pytest.raises(InvalidAccountStateError):
        account.clear_elapsed_cooldown(now=LATER)

    with pytest.raises(InvalidAccountStateError):
        account.record_success(now=LATER)

    with pytest.raises(InvalidAccountStateError):
        account.record_failure(now=LATER)

    # Invariant: Status remained DISABLED throughout
    assert account.status is AccountStatus.DISABLED

    # Only enable() transitions it
    account.enable(now=LATER)
    assert account.status is AccountStatus.AUTH_REQUIRED



def test_cooldown_and_elapsed_cooldown() -> None:
    account = ProviderAccount.create(
        provider_key="fake-provider",
        profile_key="browser-profile/fake-provider/account-1",
        now=NOW,
    )
    account.mark_authenticated("User One", "user-1", now=NOW)

    cooldown_until = NOW + timedelta(minutes=5)
    account.mark_cooldown(cooldown_until=cooldown_until, now=NOW)
    assert account.status is AccountStatus.COOLDOWN
    assert account.cooldown_until == cooldown_until

    # Not elapsed yet
    assert not account.clear_elapsed_cooldown(NOW + timedelta(minutes=2))
    assert account.status is AccountStatus.COOLDOWN

    # Elapsed
    assert account.clear_elapsed_cooldown(NOW + timedelta(minutes=6))
    assert account.status is AccountStatus.ACTIVE
    assert account.cooldown_until is None


def test_record_success_and_failure() -> None:
    account = ProviderAccount.create(
        provider_key="fake-provider",
        profile_key="browser-profile/fake-provider/account-1",
        now=NOW,
    )
    account.record_failure(now=NOW)
    assert account.consecutive_failures == 1
    assert account.last_failure_at == NOW

    account.record_failure(now=NOW + timedelta(minutes=1))
    assert account.consecutive_failures == 2

    account.record_success(now=NOW + timedelta(minutes=2))
    assert account.consecutive_failures == 0
    assert account.last_success_at == NOW + timedelta(minutes=2)


def test_lease_expiration() -> None:
    account_id = AccountId(uuid.uuid4())
    lease = AccountLease(
        id=uuid.uuid4(),
        account_id=account_id,
        owner_id="request:123",
        acquired_at=NOW,
        expires_at=NOW + timedelta(minutes=5),
    )
    assert not lease.is_expired(NOW + timedelta(minutes=2))
    assert lease.is_expired(NOW + timedelta(minutes=5))
    assert lease.is_expired(NOW + timedelta(minutes=6))
