import os
from pathlib import Path


def get_database_path() -> Path:
    override = os.getenv("VIDPOOL_DATA_DIR")
    if override:
        data_dir = Path(override).expanduser().resolve()
    else:
        data_dir = (Path.home() / ".vidpool").resolve()

    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "vidpool.db"
