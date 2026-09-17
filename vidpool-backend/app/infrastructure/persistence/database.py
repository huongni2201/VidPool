from pathlib import Path

from sqlalchemy import Engine, create_engine


def build_sqlite_url(path: Path) -> str:
    normalized = path.resolve().as_posix()
    return f"sqlite+pysqlite:///{normalized}"


def create_engine_for_path(path: Path) -> Engine:
    return create_engine(
        build_sqlite_url(path),
        connect_args={"check_same_thread": False},
    )
