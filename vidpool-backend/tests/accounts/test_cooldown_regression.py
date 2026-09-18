from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.infrastructure.persistence.base import Base
from app.modules.accounts.application.health_service import AccountHealthService
from app.modules.accounts.application.lease_service import AccountLeaseService
from app.modules.accounts.application.login_service import AccountLoginService
from app.modules.accounts.application.service import AccountService
from app.modules.accounts.domain.errors import AccountUnavailable
from app.modules.accounts.domain.values import AccountStatus
from app.modules.accounts.infrastructure.persistence.uow import (
    SQLAlchemyAccountUnitOfWork,
)
from tests.accounts.fakes import (
    FakeBrowserSessionManager,
    FakeProviderAuthAdapter,
    FakeProviderRegistry,
)

NOW = datetime(2026, 9, 18, 10, 0, 0, tzinfo=UTC)


def _build_sqlite_service(
    session_factory: sessionmaker[Session],
    auth_adapter: FakeProviderAuthAdapter | None = None,
) -> tuple[AccountService, FakeBrowserSessionManager, FakeProviderRegistry]:
    browser = FakeBrowserSessionManager()
    adapter = auth_adapter or FakeProviderAuthAdapter(
        provider_key="seedance",
        valid_session=True,
        display_name="Creator One",
        external_identity="creator-1@seedance.ai",
    )
    registry = FakeProviderRegistry([adapter])

    def uow_factory() -> SQLAlchemyAccountUnitOfWork:
        return SQLAlchemyAccountUnitOfWork(session_factory)

    service = AccountService(
        uow_factory=uow_factory,
        browser=browser,
        providers=registry,
        login_service=AccountLoginService(uow_factory, browser, registry),
        lease_service=AccountLeaseService(uow_factory),
        health_service=AccountHealthService(uow_factory, registry),
    )
    return service, browser, registry


@pytest.fixture
def sqlite_session_factory() -> sessionmaker[Session]:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


def test_s3_validate_account_must_preserve_active_cooldown(
    sqlite_session_factory: sessionmaker[Session],
) -> None:
    """S3 finding: Validating a session must NOT wipe an unexpired cooldown.
    Valid session authentication does not prove provider rate limit has cleared.
    """
    adapter = FakeProviderAuthAdapter(
        provider_key="seedance",
        valid_session=True,
        display_name="Creator One",
        external_identity="creator-1@seedance.ai",
    )
    service, _, _ = _build_sqlite_service(sqlite_session_factory, adapter)

    # 1. Start and complete login
    start = service.start_login("seedance", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    # 2. Put account into 15-minute rate limit cooldown
    cooldown_until = NOW + timedelta(minutes=15)
    v_cooldown = service.report_rate_limited(
        start.account_id, now=NOW, retry_after=cooldown_until
    )
    assert v_cooldown.status is AccountStatus.COOLDOWN
    assert v_cooldown.cooldown_until == cooldown_until

    # 3. Validate account at t = NOW + 1m (cooldown still active for 14m)
    t_validate = NOW + timedelta(minutes=1)
    v_validated = service.validate_account(start.account_id, now=t_validate)

    # S3 Invariant: Cooldown MUST be preserved!
    assert v_validated.status is AccountStatus.COOLDOWN, (
        f"Expected status to remain COOLDOWN, got {v_validated.status}"
    )
    assert v_validated.cooldown_until == cooldown_until
    assert v_validated.last_validated_at == t_validate

    # And attempting to acquire at t_validate MUST fail
    with pytest.raises(AccountUnavailable):
        service.acquire("seedance", owner_id="job:1", ttl=timedelta(minutes=5), now=t_validate)


def test_s4_acquire_recovers_account_when_cooldown_elapsed(
    sqlite_session_factory: sessionmaker[Session],
) -> None:
    """S4 finding: When cooldown has elapsed, acquire must recover the account to ACTIVE
    and successfully lease it instead of raising AccountUnavailable.
    """
    service, _, _ = _build_sqlite_service(sqlite_session_factory)

    # 1. Start and complete login
    start = service.start_login("seedance", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    # 2. Put account into cooldown until NOW + 15m
    cooldown_until = NOW + timedelta(minutes=15)
    service.report_rate_limited(
        start.account_id, now=NOW, retry_after=cooldown_until
    )

    # 3. At t = NOW + 16m (cooldown has elapsed), acquire must succeed
    t_after_cooldown = NOW + timedelta(minutes=16)
    lease_view = service.acquire(
        "seedance",
        owner_id="job:1",
        ttl=timedelta(minutes=5),
        now=t_after_cooldown,
    )

    assert lease_view.account_id == start.account_id
    assert lease_view.owner_id == "job:1"

    # Verify account in DB is now ACTIVE with cooldown_until=None
    acc_view = service.get_account(start.account_id)
    assert acc_view.status is AccountStatus.ACTIVE
    assert acc_view.cooldown_until is None


def test_p1_02_relogin_must_preserve_active_cooldown(
    sqlite_session_factory: sessionmaker[Session],
) -> None:
    """P1-02: Relogging into an account must NOT wipe an active rate-limit cooldown.
    Valid session authentication does not imply rate limits have expired.
    """
    adapter = FakeProviderAuthAdapter(
        provider_key="seedance",
        valid_session=True,
        display_name="Creator One",
        external_identity="creator-1@seedance.ai",
    )
    service, _, _ = _build_sqlite_service(sqlite_session_factory, adapter)

    # 1. Start and complete login
    start = service.start_login("seedance", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    # 2. Put account into 30-minute cooldown
    cooldown_until = NOW + timedelta(minutes=30)
    service.report_rate_limited(
        start.account_id, now=NOW, retry_after=cooldown_until
    )

    # 3. Session requires relogin at t+10
    t_relogin_need = NOW + timedelta(minutes=10)
    service.report_auth_failure(start.account_id, now=t_relogin_need)
    acc_pre = service.get_account(start.account_id)
    assert acc_pre.status is AccountStatus.AUTH_REQUIRED
    assert acc_pre.cooldown_until == cooldown_until

    # 4. User starts and completes relogin at t+15 (cooldown still active for 15m)
    t_relogin_done = NOW + timedelta(minutes=15)
    service.start_relogin(start.account_id, now=t_relogin_done)
    view = service.complete_login(start.account_id, now=t_relogin_done)

    # Invariant: Status must be COOLDOWN, cooldown_until must be preserved!
    assert view.status is AccountStatus.COOLDOWN
    assert view.cooldown_until == cooldown_until
    assert view.last_validated_at == t_relogin_done

    # And attempting to acquire at t_relogin_done MUST fail
    with pytest.raises(AccountUnavailable):
        service.acquire("seedance", owner_id="job:1", ttl=timedelta(minutes=5), now=t_relogin_done)


def test_p1_02_relogin_clears_elapsed_cooldown(
    sqlite_session_factory: sessionmaker[Session],
) -> None:
    """P1-02: Relogging into an account when cooldown has already elapsed restores ACTIVE status."""
    adapter = FakeProviderAuthAdapter(
        provider_key="seedance",
        valid_session=True,
        display_name="Creator One",
        external_identity="creator-1@seedance.ai",
    )
    service, _, _ = _build_sqlite_service(sqlite_session_factory, adapter)

    # 1. Start and complete login
    start = service.start_login("seedance", now=NOW)
    service.complete_login(start.account_id, now=NOW)

    # 2. Put account into 30-minute cooldown
    cooldown_until = NOW + timedelta(minutes=30)
    service.report_rate_limited(
        start.account_id, now=NOW, retry_after=cooldown_until
    )

    # 3. Session requires relogin at t+10
    t_relogin_need = NOW + timedelta(minutes=10)
    service.report_auth_failure(start.account_id, now=t_relogin_need)

    # 4. User completes relogin at t+35 (cooldown has elapsed)
    t_relogin_done = NOW + timedelta(minutes=35)
    service.start_relogin(start.account_id, now=t_relogin_done)
    view = service.complete_login(start.account_id, now=t_relogin_done)

    assert view.status is AccountStatus.ACTIVE
    assert view.cooldown_until is None
    assert view.last_validated_at == t_relogin_done
