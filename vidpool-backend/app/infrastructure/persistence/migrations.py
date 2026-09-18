import logging
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config

logger = logging.getLogger(__name__)


def get_migration_resources_path() -> tuple[Path, Path]:
    """Locate alembic.ini and migrations directory both in dev and frozen bundles."""
    meipass = getattr(sys, "_MEIPASS", None)
    if getattr(sys, "frozen", False) and meipass is not None:
        bundle_dir = Path(meipass)
        ini_path = bundle_dir / "alembic.ini"
        mig_dir = bundle_dir / "migrations"
        if ini_path.is_file() and mig_dir.is_dir():
            return ini_path, mig_dir

    current = Path(__file__).resolve()
    search_dirs = [
        current.parents[3],  # vidpool-backend
        current.parents[2],
        Path.cwd(),
    ]
    for d in search_dirs:
        ini_path = d / "alembic.ini"
        mig_dir = d / "migrations"
        if ini_path.is_file() and mig_dir.is_dir():
            return ini_path, mig_dir

    raise FileNotFoundError("Could not locate alembic.ini and migrations directory")


def migrate_database(database_url: str) -> None:
    """Run Alembic migrations up to head synchronously."""
    ini_path, mig_dir = get_migration_resources_path()
    logger.info("Running database migrations from %s", mig_dir)

    alembic_cfg = Config(str(ini_path))
    alembic_cfg.set_main_option("script_location", str(mig_dir))
    alembic_cfg.set_main_option("sqlalchemy.url", database_url)

    try:
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations completed successfully")
    except Exception as exc:
        logger.error("Database migration failed: %s", exc)
        raise
