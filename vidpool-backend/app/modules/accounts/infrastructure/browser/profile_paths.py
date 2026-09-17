from pathlib import Path
import re
import shutil

from app.infrastructure.persistence.paths import get_data_dir
from app.modules.accounts.domain.errors import InvalidProfileKey

PROFILE_PREFIX = "browser-profile"
_COMPONENT_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]*$")


def validate_component(component: str, full_key: str) -> None:
    if not _COMPONENT_PATTERN.match(component):
        raise InvalidProfileKey(f"Invalid profile key component: '{component}' in '{full_key}'")


class BrowserProfilePathResolver:
    """Resolves and manages isolated persistent browser profile directories."""

    def __init__(self, data_dir: Path | None = None) -> None:
        self._data_dir = data_dir if data_dir is not None else get_data_dir()

    def resolve(self, profile_key: str) -> Path:
        if "\\" in profile_key or not profile_key:
            raise InvalidProfileKey(f"Malformed profile key: '{profile_key}'")

        parts = profile_key.split("/")
        if len(parts) != 3 or parts[0] != PROFILE_PREFIX:
            raise InvalidProfileKey(
                f"Profile key must follow '{PROFILE_PREFIX}/<provider>/<account>', got: '{profile_key}'"
            )

        provider_key, account_key = parts[1], parts[2]
        validate_component(provider_key, profile_key)
        validate_component(account_key, profile_key)

        root = (self._data_dir / "browser-profiles").resolve()
        result = (root / provider_key / account_key).resolve()

        if root not in result.parents:
            raise InvalidProfileKey(f"Profile path escapes root: '{profile_key}'")

        return result

    def delete(self, profile_key: str) -> None:
        path = self.resolve(profile_key)
        if path.exists():
            shutil.rmtree(path)
