import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from app.infrastructure.persistence.base import Base
from app.infrastructure.persistence.database import create_engine_for_path
from app.modules.accounts.application.service import AccountService
from app.modules.accounts.domain.errors import (
    InvalidAccountState,
)
from app.modules.accounts.domain.values import AccountStatus
from app.modules.accounts.infrastructure.persistence.models import (
    AccountLeaseModel,
    ProviderAccountModel,
)
from app.modules.accounts.infrastructure.persistence.uow import (
    SQLAlchemyAccountUnitOfWork,
)
from tests.accounts.fakes import (
    FakeBrowserSessionManager,
    FakeProviderAuthAdapter,
    FakeProviderRegistry,
)


def _setup_service(db_path: Path, adapter: FakeProviderAuthAdapter | None = None):
    engine = create_engine_for_path(db_path)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    def uow_factory():
        return SQLAlchemyAccountUnitOfWork(session_factory)

    browser = FakeBrowserSessionManager()
    if adapter is None:
        adapter = FakeProviderAuthAdapter(provider_key="test-provider")
    registry = FakeProviderRegistry([adapter])
    service = AccountService(
        uow_factory=uow_factory,
        browser=browser,
        providers=registry,
    )
    return engine, service, browser


def test_concurrent_acquire_vs_disable(tmp_path: Path) -> None:
    db_path = tmp_path / "acquire_vs_disable.db"
    engine, service, _ = _setup_service(db_path)
    now = datetime(2026, 9, 17, 12, 0, 0, tzinfo=UTC)

    for i in range(5):
        start = service.start_login("test-provider", now=now)
        service.complete_login(start.account_id, now=now)
        account_id = start.account_id

        barrier = threading.Barrier(2)
        acquire_result = []
        disable_result = []

        def worker_acquire(b: threading.Barrier, idx: int, out_list: list) -> None:
            try:
                b.wait(timeout=5)
                lease = service.acquire(
                    provider_key="test-provider",
                    owner_id=f"worker:{idx}",
                    ttl=timedelta(minutes=5),
                    now=now,
                )
                out_list.append(lease)
            except Exception:
                pass

        def worker_disable(b: threading.Barrier, acc_id, out_list: list) -> None:
            try:
                b.wait(timeout=5)
                view = service.disable_account(acc_id, now=now)
                out_list.append(view)
            except Exception:
                pass

        t1 = threading.Thread(target=worker_acquire, args=(barrier, i, acquire_result))
        t2 = threading.Thread(target=worker_disable, args=(barrier, account_id, disable_result))
        t1.start()
        t2.start()
        t1.join(timeout=10)
        t2.join(timeout=10)

        # Invariant: An account must NEVER end up simultaneously disabled AND leased
        with Session(engine) as session:
            acc_model = session.get(ProviderAccountModel, str(account_id))
            assert acc_model is not None
            lease_count = session.scalar(
                select(func.count())
                .select_from(AccountLeaseModel)
                .where(
                    AccountLeaseModel.account_id == str(account_id),
                    AccountLeaseModel.expires_at > now,
                )
            )

            if lease_count and lease_count > 0:
                assert acc_model.status == str(AccountStatus.ACTIVE), (
                    f"Invalid state: account {account_id} is leased but status is {acc_model.status}"
                )
            if acc_model.status == str(AccountStatus.DISABLED):
                assert lease_count == 0, (
                    f"Invalid state: account {account_id} is disabled but has {lease_count} active leases"
                )


def test_concurrent_acquire_vs_delete(tmp_path: Path) -> None:
    db_path = tmp_path / "acquire_vs_delete.db"
    engine, service, _ = _setup_service(db_path)
    now = datetime(2026, 9, 17, 12, 0, 0, tzinfo=UTC)

    for i in range(5):
        start = service.start_login("test-provider", now=now)
        service.complete_login(start.account_id, now=now)
        account_id = start.account_id

        barrier = threading.Barrier(2)

        def worker_acquire(b: threading.Barrier, idx: int) -> None:
            try:
                b.wait(timeout=5)
                service.acquire(
                    provider_key="test-provider",
                    owner_id=f"worker:{idx}",
                    ttl=timedelta(minutes=5),
                    now=now,
                )
            except Exception:
                pass

        def worker_delete(b: threading.Barrier, acc_id) -> None:
            try:
                b.wait(timeout=5)
                service.delete_account(acc_id, now=now)
            except Exception:
                pass

        t1 = threading.Thread(target=worker_acquire, args=(barrier, i))
        t2 = threading.Thread(target=worker_delete, args=(barrier, account_id))
        t1.start()
        t2.start()
        t1.join(timeout=10)
        t2.join(timeout=10)

        # Invariant: A lease must NEVER exist for a non-existent/deleted account
        with Session(engine) as session:
            acc_model = session.get(ProviderAccountModel, str(account_id))
            lease_count = session.scalar(
                select(func.count())
                .select_from(AccountLeaseModel)
                .where(
                    AccountLeaseModel.account_id == str(account_id),
                    AccountLeaseModel.expires_at > now,
                )
            )
            if acc_model is None:
                assert lease_count == 0, f"Account {account_id} deleted but lease exists"
            else:
                assert acc_model is not None


def test_concurrent_acquire_vs_relogin(tmp_path: Path) -> None:
    db_path = tmp_path / "acquire_vs_relogin.db"
    engine, service, _ = _setup_service(db_path)
    now = datetime(2026, 9, 17, 12, 0, 0, tzinfo=UTC)

    # Create & authenticate an active account
    start = service.start_login("test-provider", now=now)
    service.complete_login(start.account_id, now=now)
    account_id = start.account_id

    # If account is ACTIVE, relogin must fail with InvalidAccountState
    with pytest.raises(InvalidAccountState):
        service.start_relogin(account_id, now=now)

    # Now transition to AUTH_REQUIRED
    service.report_auth_failure(account_id, now=now)

    barrier = threading.Barrier(2)
    acquire_result = []
    relogin_result = []
    acquire_errors = []
    relogin_errors = []

    def worker_acquire():
        try:
            barrier.wait(timeout=5)
            # acquire_lru should NOT return an auth_required account
            lease = service.acquire(
                provider_key="test-provider",
                owner_id="worker:1",
                ttl=timedelta(minutes=5),
                now=now,
            )
            acquire_result.append(lease)
        except Exception as e:
            acquire_errors.append(e)

    def worker_relogin():
        try:
            barrier.wait(timeout=5)
            res = service.start_relogin(account_id, now=now)
            relogin_result.append(res)
        except Exception as e:
            relogin_errors.append(e)

    t1 = threading.Thread(target=worker_acquire)
    t2 = threading.Thread(target=worker_relogin)
    t1.start()
    t2.start()
    t1.join(timeout=10)
    t2.join(timeout=10)

    # acquire cannot lease an account that is AUTH_REQUIRED
    assert acquire_result == []
    # relogin should succeed
    assert len(relogin_result) == 1


def test_validate_is_serialized_against_acquire(tmp_path: Path) -> None:
    import time
    db_path = tmp_path / "validate_vs_acquire.db"
    validation_started = threading.Event()
    allow_validation_to_finish = threading.Event()

    class BlockingAuthAdapter(FakeProviderAuthAdapter):
        def validate_persisted_session(self, profile_key: str):
            validation_started.set()
            assert allow_validation_to_finish.wait(timeout=5)
            return super().validate_persisted_session(profile_key)

    adapter = BlockingAuthAdapter(provider_key="test-provider")
    engine, service, _ = _setup_service(db_path, adapter=adapter)
    now = datetime(2026, 9, 17, 12, 0, 0, tzinfo=UTC)

    start = service.start_login("test-provider", now=now)
    service.complete_login(start.account_id, now=now)
    account_id = start.account_id

    validate_result = []
    acquire_result = []
    acquire_errors = []

    def worker_validate():
        try:
            view = service.validate_account(account_id, now=now)
            validate_result.append(view)
        except Exception as e:
            validate_result.append(e)

    def worker_acquire():
        try:
            lease = service.acquire(
                provider_key="test-provider",
                owner_id="worker:blocking",
                ttl=timedelta(minutes=5),
                now=now,
            )
            acquire_result.append(lease)
        except Exception as e:
            acquire_errors.append(e)

    validate_thread = threading.Thread(target=worker_validate)
    acquire_thread = threading.Thread(target=worker_acquire)

    validate_thread.start()
    assert validation_started.wait(timeout=5), "Validation did not start in time"

    # Acquire starts while validate is in progress
    acquire_thread.start()
    time.sleep(0.2)

    # Acquire must NOT complete while validation holds lock
    assert acquire_result == [], "Acquire should not have completed while validation is ongoing"
    assert acquire_errors == []

    # Let validation complete
    allow_validation_to_finish.set()
    validate_thread.join(timeout=5)
    acquire_thread.join(timeout=5)

    assert len(validate_result) == 1
    assert len(acquire_result) == 1
    assert acquire_errors == []

