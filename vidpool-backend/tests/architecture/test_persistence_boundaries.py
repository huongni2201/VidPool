import ast
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.infrastructure.persistence.base import Base
from app.modules.accounts.domain.account import ProviderAccount
from app.modules.accounts.domain.values import AccountId, AccountStatus
from app.modules.accounts.infrastructure.persistence.repository import SQLAlchemyAccountRepository
from app.modules.accounts.infrastructure.persistence.uow import SQLAlchemyAccountUnitOfWork

APP_DIR = Path(__file__).resolve().parent.parent.parent / "app"
PERSISTENCE_DIR = APP_DIR / "modules" / "accounts" / "infrastructure" / "persistence"


def test_repositories_never_call_commit_or_rollback() -> None:
    """Ensure persistence repositories do not own transactions.

    Only UnitOfWork implementations may call .commit() or .rollback().
    """
    repo_file = PERSISTENCE_DIR / "repository.py"
    assert repo_file.exists(), f"Repository file not found: {repo_file}"

    tree = ast.parse(repo_file.read_text(encoding="utf-8"), filename=str(repo_file))

    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            method_name = node.func.attr
            assert method_name not in {"commit", "rollback"}, (
                f"Forbidden transaction call '{method_name}()' at line {node.lineno} in {repo_file}. "
                "Repositories must not call commit() or rollback(); transaction boundaries belong to UnitOfWork."
            )


def test_acquire_does_not_commit_caller_transaction() -> None:
    """Acquiring a lease inside a UoW transaction rolls back completely if caller transaction fails."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    now = datetime(2026, 9, 17, 12, 0, 0, tzinfo=UTC)
    acc_id = AccountId("11111111-1111-1111-1111-111111111111")

    # Seed an active account
    with session_factory() as session:
        repo = SQLAlchemyAccountRepository(session)
        account = ProviderAccount(
            id=acc_id,
            provider_key="test-p",
            profile_key="browser-profile/test-p/acc-1",
            status=AccountStatus.ACTIVE,
            created_at=now,
            updated_at=now,
        )
        repo.add(account)
        session.commit()

    # Begin UoW, acquire lease, but fail before committing UoW
    uow = SQLAlchemyAccountUnitOfWork(session_factory)
    with uow:
        result = uow.accounts.acquire_lru(
            provider_key="test-p",
            owner_id="worker-1",
            now=now,
            expires_at=now + timedelta(minutes=5),
        )
        assert result is not None
        # Intentionally force rollback without uow.commit()
        uow.rollback()

    # Check database state: no lease should exist because transaction was rolled back!
    with session_factory() as verify_session:
        verify_repo = SQLAlchemyAccountRepository(verify_session)
        assert not verify_repo.has_active_lease(acc_id, now + timedelta(seconds=1))
