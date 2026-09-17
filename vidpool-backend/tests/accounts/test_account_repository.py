from datetime import datetime, timezone, timedelta
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.infrastructure.persistence.base import Base
from app.modules.accounts.domain.account import ProviderAccount
from app.modules.accounts.domain.values import AccountStatus, new_account_id
from app.modules.accounts.infrastructure.persistence.repository import SQLAlchemyAccountRepository


@pytest.fixture
def db_session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    yield session
    session.close()


def test_repository_crud_round_trip(db_session: Session) -> None:
    repo = SQLAlchemyAccountRepository(session=db_session)
    now = datetime(2026, 9, 17, 12, 0, 0, tzinfo=timezone.utc)

    account = ProviderAccount.create(
        provider_key="seedance",
        profile_key="browser-profile/seedance/account-1",
        account_id=new_account_id(),
        now=now,
    )
    account.mark_authenticated(
        display_name="Creator One",
        external_identity="creator-1@seedance.ai",
        now=now,
    )
    account.record_failure(now=now + timedelta(minutes=1))
    account.mark_cooldown(cooldown_until=now + timedelta(minutes=10), now=now + timedelta(minutes=1))

    repo.add(account)

    fetched = repo.get(account.id)
    assert fetched is not None
    assert fetched.id == account.id
    assert fetched.provider_key == "seedance"
    assert fetched.display_name == "Creator One"
    assert fetched.external_identity == "creator-1@seedance.ai"
    assert fetched.status == AccountStatus.COOLDOWN
    assert fetched.profile_key == "browser-profile/seedance/account-1"
    assert fetched.consecutive_failures == 1
    assert fetched.cooldown_until == now + timedelta(minutes=10)

    # Save updates
    fetched.record_success(now=now + timedelta(minutes=15))
    repo.save(fetched)

    updated = repo.get(account.id)
    assert updated is not None
    assert updated.status == AccountStatus.ACTIVE
    assert updated.consecutive_failures == 0

    # List
    listed = repo.list(provider_key="seedance")
    assert len(listed) == 1
    assert listed[0].id == account.id

    assert len(repo.list(provider_key="other")) == 0

    # Delete
    repo.delete(account.id)
    assert repo.get(account.id) is None


def test_repository_atomic_lru_acquire_and_release(db_session: Session) -> None:
    repo = SQLAlchemyAccountRepository(session=db_session)
    now = datetime(2026, 9, 17, 12, 0, 0, tzinfo=timezone.utc)

    # Create account A (used at 10:00)
    acc_a = ProviderAccount.create("test-provider", "profile/a", now=now - timedelta(hours=3))
    acc_a.mark_authenticated("User A", "user-a", now=now - timedelta(hours=3))
    acc_a.last_used_at = now - timedelta(hours=2)
    repo.add(acc_a)

    # Create account B (used at 09:00 - less recently used than A)
    acc_b = ProviderAccount.create("test-provider", "profile/b", now=now - timedelta(hours=4))
    acc_b.mark_authenticated("User B", "user-b", now=now - timedelta(hours=4))
    acc_b.last_used_at = now - timedelta(hours=3)
    repo.add(acc_b)

    # Create account C (disabled)
    acc_c = ProviderAccount.create("test-provider", "profile/c", now=now)
    acc_c.disable(now=now)
    repo.add(acc_c)

    # Acquire LRU: B should be chosen first because last_used_at 09:00 < 10:00
    res = repo.acquire_lru(
        provider_key="test-provider",
        owner_id="job:job-1",
        now=now,
        expires_at=now + timedelta(minutes=5),
    )
    assert res is not None
    leased_acc, lease = res
    assert leased_acc.id == acc_b.id
    assert lease.owner_id == "job:job-1"
    assert repo.has_active_lease(acc_b.id, now)

    # While B is actively leased, next acquire should choose A
    res2 = repo.acquire_lru(
        provider_key="test-provider",
        owner_id="job:job-2",
        now=now,
        expires_at=now + timedelta(minutes=5),
    )
    assert res2 is not None
    leased_acc2, lease2 = res2
    assert leased_acc2.id == acc_a.id

    # No more available accounts
    assert repo.acquire_lru("test-provider", "job:job-3", now=now, expires_at=now + timedelta(minutes=5)) is None

    # Release B
    assert repo.release_lease(lease.id)
    assert not repo.has_active_lease(acc_b.id, now)

    # B is eligible again
    res3 = repo.acquire_lru("test-provider", "job:job-4", now=now, expires_at=now + timedelta(minutes=5))
    assert res3 is not None
    assert res3[0].id == acc_b.id


def test_repository_lru_chooses_never_used_first(db_session: Session) -> None:
    repo = SQLAlchemyAccountRepository(session=db_session)
    now = datetime(2026, 9, 17, 12, 0, 0, tzinfo=timezone.utc)

    # Account used before
    acc_used = ProviderAccount.create("test-provider", "profile/used", now=now - timedelta(days=1))
    acc_used.mark_authenticated("Used User", "used", now=now - timedelta(days=1))
    acc_used.last_used_at = now - timedelta(hours=1)
    repo.add(acc_used)

    # Account never used (last_used_at is None)
    acc_never = ProviderAccount.create("test-provider", "profile/never", now=now)
    acc_never.mark_authenticated("New User", "new", now=now)
    assert acc_never.last_used_at is None
    repo.add(acc_never)

    # Acquire should pick never used first
    res = repo.acquire_lru("test-provider", "job:first", now=now, expires_at=now + timedelta(minutes=5))
    assert res is not None
    assert res[0].id == acc_never.id


def test_repository_expired_lease_is_cleaned_and_recovered(db_session: Session) -> None:
    repo = SQLAlchemyAccountRepository(session=db_session)
    now = datetime(2026, 9, 17, 12, 0, 0, tzinfo=timezone.utc)

    acc = ProviderAccount.create("test-provider", "profile/exp", now=now)
    acc.mark_authenticated("Exp User", "exp", now=now)
    repo.add(acc)

    # Acquire with short lease that expires in 1 minute
    res1 = repo.acquire_lru("test-provider", "job:short", now=now, expires_at=now + timedelta(minutes=1))
    assert res1 is not None
    lease1 = res1[1]

    # At now + 30s, lease is still active
    assert repo.has_active_lease(acc.id, now + timedelta(seconds=30))
    assert repo.acquire_lru("test-provider", "job:attempt", now=now + timedelta(seconds=30), expires_at=now + timedelta(minutes=5)) is None

    # At now + 2m, lease has expired
    assert not repo.has_active_lease(acc.id, now + timedelta(minutes=2))
    res2 = repo.acquire_lru("test-provider", "job:recovered", now=now + timedelta(minutes=2), expires_at=now + timedelta(minutes=7))
    assert res2 is not None
    assert res2[0].id == acc.id


def test_repository_acquire_lru_propagates_unexpected_db_error(db_session: Session) -> None:
    repo = SQLAlchemyAccountRepository(session=db_session)
    now = datetime(2026, 9, 17, 12, 0, 0, tzinfo=timezone.utc)

    acc = ProviderAccount.create("test-provider", "profile/io-fail", now=now)
    acc.mark_authenticated("IO User", "io", now=now)
    repo.add(acc)

    from sqlalchemy.exc import OperationalError
    real_commit = db_session.commit
    commit_count = 0

    def mock_commit():
        nonlocal commit_count
        commit_count += 1
        # First commit is for cleaning expired leases (step 1 in acquire_lru)
        if commit_count == 1:
            return real_commit()
        # Second commit is when persisting candidate lease (step 2)
        raise OperationalError("INSERT ...", {}, Exception("disk I/O error"))

    db_session.commit = mock_commit

    with pytest.raises(OperationalError):
        repo.acquire_lru("test-provider", "job:error", now=now, expires_at=now + timedelta(minutes=5))


def test_repository_save_raises_not_found_for_deleted_account(db_session: Session) -> None:
    from app.modules.accounts.domain.errors import AccountNotFoundError

    repo = SQLAlchemyAccountRepository(session=db_session)
    now = datetime(2026, 9, 17, 12, 0, 0, tzinfo=timezone.utc)
    account = ProviderAccount.create("test-provider", "profile/del", now=now)
    account.mark_authenticated("User Del", "del", now=now)

    repo.add(account)
    repo.delete(account.id)

    with pytest.raises(AccountNotFoundError):
        repo.save(account)

    assert repo.get(account.id) is None


