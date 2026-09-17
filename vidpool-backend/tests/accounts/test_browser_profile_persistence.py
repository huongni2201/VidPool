from pathlib import Path
from typing import Any

from app.modules.accounts.infrastructure.browser.playwright_session import (
    PlaywrightBrowserSessionManager,
)
from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)


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
            return content[len(prefix):]
        return None


class MockContext:
    def __init__(self, profile_path: Path) -> None:
        self.profile_path = profile_path
        self.storage_file = profile_path / "mock_local_storage.txt"
        self.pages: list[MockPage] = [MockPage(self.storage_file)]
        self.closed = False

    def close(self) -> None:
        self.closed = True


def test_persistent_profile_survives_manager_restart_and_preserves_isolation(
    tmp_path: Path,
) -> None:
    def mock_launcher(path: Path, channel: str, headless: bool) -> Any:
        return MockContext(path)

    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    manager_a = PlaywrightBrowserSessionManager(resolver=resolver, launcher=mock_launcher)

    profile_a = "browser-profile/test-provider/acc-1"
    handle_a = manager_a.open_login(
        provider_key="test-provider",
        profile_key=profile_a,
        login_url="http://test/login",
    )

    session_a = manager_a._sessions_by_id[handle_a.id]
    page_a: MockPage = session_a.context.pages[0]
    page_a.set_item("auth_token", "saved_token_123")
    assert page_a.get_item("auth_token") == "saved_token_123"

    manager_a.close_all()
    del manager_a

    # Manager B instance loads profile A
    manager_b = PlaywrightBrowserSessionManager(resolver=resolver, launcher=mock_launcher)
    handle_b = manager_b.open_login(
        provider_key="test-provider",
        profile_key=profile_a,
        login_url="http://test/login",
    )

    session_b = manager_b._sessions_by_id[handle_b.id]
    page_b: MockPage = session_b.context.pages[0]
    assert page_b.get_item("auth_token") == "saved_token_123"

    # Profile B is isolated from Profile A
    profile_b = "browser-profile/test-provider/acc-2"
    handle_b2 = manager_b.open_login(
        provider_key="test-provider",
        profile_key=profile_b,
        login_url="http://test/login",
    )

    session_b2 = manager_b._sessions_by_id[handle_b2.id]
    page_b2: MockPage = session_b2.context.pages[0]
    assert page_b2.get_item("auth_token") is None

    manager_b.close_all()

    # Deleting profile A clears its disk storage
    manager_b.delete_profile(profile_a)

    manager_c = PlaywrightBrowserSessionManager(resolver=resolver, launcher=mock_launcher)
    handle_c = manager_c.open_login(
        provider_key="test-provider",
        profile_key=profile_a,
        login_url="http://test/login",
    )
    session_c = manager_c._sessions_by_id[handle_c.id]
    page_c: MockPage = session_c.context.pages[0]
    assert page_c.get_item("auth_token") is None
