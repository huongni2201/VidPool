from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.core.config import AppConfig
from app.core.container import build_container
from app.factory import create_app
from app.infrastructure.persistence.database import build_sqlite_url, create_engine_for_path
from app.infrastructure.persistence.migrations import get_migration_resources_path, migrate_database
from tests.accounts.fakes import FakeBrowserSessionManager, FakeProviderRegistry


def test_fresh_database_runs_migrations_and_serves_accounts(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """F1 reproduction: On a fresh install with empty data dir, the app must run migrations

    so that database tables exist before the API is ready to serve requests.
    """
    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("VIDPOOL_SESSION_TOKEN", "test-token-12345678")

    db_file = tmp_path / "vidpool.db"
    assert not db_file.exists()

    config = AppConfig(
        host="127.0.0.1",
        port=8000,
        session_token="test-token-12345678",
        allowed_origins=("http://localhost:5173",),
    )

    container = build_container(
        config=config,
        browser_runtime=FakeBrowserSessionManager(),
        provider_registry=FakeProviderRegistry([]),
    )

    app = create_app(config=config, container=container)
    with TestClient(app) as client:
        health_res = client.get("/api/health")
        assert health_res.status_code == 200

        accounts_res = client.get(
            "/api/accounts",
            headers={"Authorization": "Bearer test-token-12345678"},
        )
        assert accounts_res.status_code == 200, f"Got status {accounts_res.status_code}: {accounts_res.text}"
        assert accounts_res.json() == []


def test_database_upgrade_preserves_existing_data(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure that upgrading an older revision database preserves existing rows and upgrades schema to HEAD."""
    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("VIDPOOL_SESSION_TOKEN", "test-token-upgrade")

    db_path = tmp_path / "vidpool.db"
    db_url = build_sqlite_url(db_path)
    ini_path, mig_dir = get_migration_resources_path()

    # Migrate up to first revision: 134e65479fc3
    alembic_cfg = Config(str(ini_path))
    alembic_cfg.set_main_option("script_location", str(mig_dir))
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(alembic_cfg, "134e65479fc3")

    legacy_id = "11111111-1111-1111-1111-111111111111"
    # Insert a sample row under revision 134e65479fc3
    engine = create_engine_for_path(db_path)
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO provider_accounts (id, provider_key, display_name, external_identity, status, profile_key, consecutive_failures, created_at, updated_at) "
                f"VALUES ('{legacy_id}', 'test-provider', 'Old Account', 'user@example.com', 'active', 'browser-profile/test-provider/acc-1', 0, '2026-01-01', '2026-01-01')"
            )
        )
    engine.dispose()

    # Now bootstrap container/app which should upgrade to HEAD
    config = AppConfig(
        host="127.0.0.1",
        port=8000,
        session_token="test-token-upgrade",
        allowed_origins=("http://localhost:5173",),
    )
    container = build_container(
        config=config,
        browser_runtime=FakeBrowserSessionManager(),
        provider_registry=FakeProviderRegistry([]),
    )

    app = create_app(config=config, container=container)
    with TestClient(app) as client:
        accounts_res = client.get(
            "/api/accounts",
            headers={"Authorization": "Bearer test-token-upgrade"},
        )
        assert accounts_res.status_code == 200
        accounts = accounts_res.json()
        assert len(accounts) == 1
        assert accounts[0]["id"] == legacy_id
        assert accounts[0]["externalIdentity"] == "user@example.com"


def test_migration_failure_fails_fast(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure that migration failure raises immediately and does not leave API in half-ready state."""
    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(tmp_path))

    with pytest.raises(OperationalError):
        migrate_database("sqlite+pysqlite:///nonexistent_dir_cannot_create/nested/not_possible.db")
