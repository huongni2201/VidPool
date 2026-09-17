from pathlib import Path

import pytest

from app.modules.accounts.domain.errors import InvalidProfileKey
from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)


def test_resolve_valid_profile_key(tmp_path: Path) -> None:
    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    profile_key = "browser-profile/test-provider/acc-123.456"

    resolved = resolver.resolve(profile_key)

    expected = (tmp_path / "browser-profiles" / "test-provider" / "acc-123.456").resolve()
    assert resolved == expected


@pytest.mark.parametrize(
    "invalid_key",
    [
        "",
        "../x",
        "provider/../../x",
        "browser-profile/../x",
        "browser-profile/provider/../../x",
        "C:/temp/x",
        r"C:\temp\x",
        "/provider/account",
        r"provider\account",
        r"browser-profile\provider\account",
        "browser-profile/provider",
        "browser-profile/provider/acc/extra",
        "other-prefix/provider/acc",
        "browser-profile/.hidden/acc",
        "browser-profile/provider/.hidden",
        "browser-profile/Provider/acc",  # uppercase rejected by pattern
        "browser-profile/provider/ACC",
        "browser-profile/provider$name/acc",
        "browser-profile/provider/acc space",
    ],
)
def test_resolve_rejects_invalid_or_traversal_keys(tmp_path: Path, invalid_key: str) -> None:
    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    with pytest.raises(InvalidProfileKey):
        resolver.resolve(invalid_key)


def test_delete_existing_profile_directory(tmp_path: Path) -> None:
    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    profile_key = "browser-profile/test-provider/acc-1"
    resolved = resolver.resolve(profile_key)
    resolved.mkdir(parents=True, exist_ok=True)
    test_file = resolved / "test.txt"
    test_file.write_text("dummy")

    assert resolved.exists()
    resolver.delete(profile_key)
    assert not resolved.exists()


def test_delete_nonexistent_profile_is_noop(tmp_path: Path) -> None:
    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    profile_key = "browser-profile/test-provider/acc-2"
    # Should not raise
    resolver.delete(profile_key)
