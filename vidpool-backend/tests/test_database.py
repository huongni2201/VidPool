from pathlib import Path

from app.infrastructure.persistence.database import build_sqlite_url
from app.infrastructure.persistence.paths import get_database_path


def test_database_path_uses_vidpool_directory(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(tmp_path))

    path = get_database_path()

    assert path == tmp_path / "vidpool.db"


def test_sqlite_url_uses_absolute_path(tmp_path: Path) -> None:
    path = (tmp_path / "vidpool.db").resolve()

    url = build_sqlite_url(path)

    assert url.startswith("sqlite+pysqlite:///")
    assert str(path).replace("\\", "/") in url.replace("\\", "/")
