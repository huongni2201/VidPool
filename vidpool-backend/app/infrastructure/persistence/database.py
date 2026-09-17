from pathlib import Path

from sqlalchemy import Engine, create_engine, event


def build_sqlite_url(path: Path) -> str:
    normalized = path.resolve().as_posix()
    return f"sqlite+pysqlite:///{normalized}"


def create_engine_for_path(path: Path) -> Engine:
    engine = create_engine(
        build_sqlite_url(path),
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _configure_sqlite_connection(dbapi_connection, connection_record) -> None:
        del connection_record
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA busy_timeout=5000")
            cursor.execute("PRAGMA journal_mode=WAL")
        finally:
            cursor.close()

    return engine
