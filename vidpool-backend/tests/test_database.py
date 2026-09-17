from pathlib import Path
from datetime import datetime, timezone
import uuid
import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.persistence.base import Base
from app.infrastructure.persistence.database import build_sqlite_url, create_engine_for_path
from app.infrastructure.persistence.paths import get_database_path
from app.modules.accounts.infrastructure.persistence.models import AccountLeaseModel


def test_database_path_uses_vidpool_directory(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(tmp_path))

    path = get_database_path()

    assert path == tmp_path / "vidpool.db"


def test_sqlite_url_uses_absolute_path(tmp_path: Path) -> None:
    path = (tmp_path / "vidpool.db").resolve()

    url = build_sqlite_url(path)

    assert url.startswith("sqlite+pysqlite:///")
    assert str(path).replace("\\", "/") in url.replace("\\", "/")


def test_engine_enforces_foreign_keys(tmp_path: Path) -> None:
    engine = create_engine_for_path(tmp_path / "test.db")
    with engine.connect() as conn:
        fk = conn.execute(text("PRAGMA foreign_keys")).scalar()
    assert fk == 1


def test_file_backed_engine_enforces_wal_journal_mode(tmp_path: Path) -> None:
    engine = create_engine_for_path(tmp_path / "test.db")
    with engine.connect() as conn:
        mode = conn.execute(text("PRAGMA journal_mode")).scalar()
    assert str(mode).lower() == "wal"


def test_engine_foreign_key_rejects_invalid_lease_reference(tmp_path: Path) -> None:
    engine = create_engine_for_path(tmp_path / "test.db")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        now = datetime.now(timezone.utc)
        invalid_lease = AccountLeaseModel(
            id=str(uuid.uuid4()),
            account_id=str(uuid.uuid4()),  # Non-existent account
            owner_id="job:invalid",
            acquired_at=now,
            expires_at=now,
        )
        session.add(invalid_lease)
        with pytest.raises(IntegrityError):
            session.commit()

