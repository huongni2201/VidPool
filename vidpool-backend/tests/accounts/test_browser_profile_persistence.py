from pathlib import Path
from typing import Any

from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)
from app.modules.accounts.infrastructure.browser.runtime import BrowserRuntime


class MockPage:
    def __init__(self, storage_file: Path) -> None:
        self.storage_file = storage_file

    def goto(self, url: str) -> None:
        pass

    def set_item(self, key: str, value: str) -> None:
        self.storage_file.write_text(f"{key}={value}")

    def get_item(self, key: str) -> str | None:
        if not self.storage_file.exists():
            return None
        content = self.storage_file.read_text()
        prefix = f"{key}="
        if content.startswith(prefix):
            return content[len(prefix) :]
        return None


class MockContext:
    def __init__(self, profile_path: Path) -> None:
        self.profile_path = profile_path
        self.storage_file = profile_path / "mock_local_storage.txt"
        self.pages: list[MockPage] = [MockPage(self.storage_file)]
        self.closed = False

    def close(self) -> None:
        self.closed = True


def test_persistent_profile_survives_runtime_restart_and_preserves_isolation(
    tmp_path: Path,
) -> None:
    def mock_launcher(path: Path, channel: str, headless: bool) -> Any:
        return MockContext(path)

    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    runtime_a = BrowserRuntime(resolver=resolver, launcher=mock_launcher)

    profile_a = "browser-profile/test-provider/acc-1"
    runtime_a.open_login(
        provider_key="test-provider",
        profile_key=profile_a,
        login_url="http://test/login",
    )

    runtime_a.run_active(
        profile_a,
        lambda ctx: ctx.pages[0].set_item("auth_token", "saved_token_123"),
    )
    val_a = runtime_a.run_active(profile_a, lambda ctx: ctx.pages[0].get_item("auth_token"))
    assert val_a == "saved_token_123"

    runtime_a.close_all()

    # Runtime B instance loads profile A
    runtime_b = BrowserRuntime(resolver=resolver, launcher=mock_launcher)
    runtime_b.open_login(
        provider_key="test-provider",
        profile_key=profile_a,
        login_url="http://test/login",
    )

    val_b = runtime_b.run_active(profile_a, lambda ctx: ctx.pages[0].get_item("auth_token"))
    assert val_b == "saved_token_123"

    # Profile B is isolated from Profile A
    profile_b = "browser-profile/test-provider/acc-2"
    runtime_b.open_login(
        provider_key="test-provider",
        profile_key=profile_b,
        login_url="http://test/login",
    )

    val_b2 = runtime_b.run_active(profile_b, lambda ctx: ctx.pages[0].get_item("auth_token"))
    assert val_b2 is None

    runtime_b.close_all()

    # Deleting profile A clears its disk storage
    runtime_b.delete_profile(profile_a)

    runtime_c = BrowserRuntime(resolver=resolver, launcher=mock_launcher)
    runtime_c.open_login(
        provider_key="test-provider",
        profile_key=profile_a,
        login_url="http://test/login",
    )
    val_c = runtime_c.run_active(profile_a, lambda ctx: ctx.pages[0].get_item("auth_token"))
    assert val_c is None
    runtime_c.close_all()
