from pathlib import Path
from typing import Any
import pytest

from app.modules.accounts.application.ports import BrowserSessionHandle, BrowserSessionPort
from app.modules.accounts.domain.errors import (
    BrowserLaunchFailed,
    BrowserProfileInUse,
    BrowserUnavailable,
)
from app.modules.accounts.infrastructure.browser.playwright_session import (
    PlaywrightBrowserSessionManager,
)
from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)


class MockPage:
    def __init__(self) -> None:
        self.navigated_url: str | None = None

    def goto(self, url: str) -> None:
        self.navigated_url = url


class MockContext:
    def __init__(self, channel: str) -> None:
        self.channel = channel
        self.pages: list[MockPage] = [MockPage()]
        self.closed = False

    def new_page(self) -> MockPage:
        page = MockPage()
        self.pages.append(page)
        return page

    def close(self) -> None:
        self.closed = True


def test_satisfies_browser_session_port(tmp_path: Path) -> None:
    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    manager = PlaywrightBrowserSessionManager(resolver=resolver)
    assert isinstance(manager, BrowserSessionPort)


def test_open_login_success_with_first_channel(tmp_path: Path) -> None:
    launched_channels: list[str] = []

    def mock_launcher(path: Path, channel: str, headless: bool) -> Any:
        launched_channels.append(channel)
        return MockContext(channel)

    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    manager = PlaywrightBrowserSessionManager(resolver=resolver, launcher=mock_launcher)

    profile_key = "browser-profile/test-provider/acc-1"
    handle = manager.open_login(
        provider_key="test-provider",
        profile_key=profile_key,
        login_url="https://provider.test/login",
    )

    assert isinstance(handle, BrowserSessionHandle)
    assert handle.profile_key == profile_key
    assert manager.has_open_session(profile_key)
    assert launched_channels == ["msedge"]


def test_open_login_falls_back_from_edge_to_chrome(tmp_path: Path) -> None:
    launched_channels: list[str] = []

    def mock_launcher(path: Path, channel: str, headless: bool) -> Any:
        launched_channels.append(channel)
        if channel == "msedge":
            raise BrowserLaunchFailed("Edge not installed")
        return MockContext(channel)

    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    manager = PlaywrightBrowserSessionManager(resolver=resolver, launcher=mock_launcher)

    profile_key = "browser-profile/test-provider/acc-1"
    handle = manager.open_login(
        provider_key="test-provider",
        profile_key=profile_key,
        login_url="https://provider.test/login",
    )

    assert handle.profile_key == profile_key
    assert launched_channels == ["msedge", "chrome"]


def test_open_login_raises_browser_unavailable_when_all_channels_fail(tmp_path: Path) -> None:
    def mock_launcher(path: Path, channel: str, headless: bool) -> Any:
        raise BrowserLaunchFailed(f"{channel} not found")

    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    manager = PlaywrightBrowserSessionManager(resolver=resolver, launcher=mock_launcher)

    profile_key = "browser-profile/test-provider/acc-1"
    with pytest.raises(BrowserUnavailable):
        manager.open_login(
            provider_key="test-provider",
            profile_key=profile_key,
            login_url="https://provider.test/login",
        )

    assert not manager.has_open_session(profile_key)


def test_open_login_rejects_opening_same_profile_twice(tmp_path: Path) -> None:
    def mock_launcher(path: Path, channel: str, headless: bool) -> Any:
        return MockContext(channel)

    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    manager = PlaywrightBrowserSessionManager(resolver=resolver, launcher=mock_launcher)

    profile_key = "browser-profile/test-provider/acc-1"
    manager.open_login(
        provider_key="test-provider",
        profile_key=profile_key,
        login_url="https://provider.test/login",
    )

    with pytest.raises(BrowserProfileInUse):
        manager.open_login(
            provider_key="test-provider",
            profile_key=profile_key,
            login_url="https://provider.test/login",
        )


def test_close_session_closes_context_and_cleans_indexes(tmp_path: Path) -> None:
    contexts: list[MockContext] = []

    def mock_launcher(path: Path, channel: str, headless: bool) -> Any:
        ctx = MockContext(channel)
        contexts.append(ctx)
        return ctx

    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    manager = PlaywrightBrowserSessionManager(resolver=resolver, launcher=mock_launcher)

    profile_key = "browser-profile/test-provider/acc-1"
    handle = manager.open_login(
        provider_key="test-provider",
        profile_key=profile_key,
        login_url="https://provider.test/login",
    )

    assert manager.has_open_session(profile_key)
    assert not contexts[0].closed

    manager.close(handle.id)

    assert not manager.has_open_session(profile_key)
    assert contexts[0].closed


def test_delete_profile_rejects_active_session(tmp_path: Path) -> None:
    def mock_launcher(path: Path, channel: str, headless: bool) -> Any:
        return MockContext(channel)

    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    manager = PlaywrightBrowserSessionManager(resolver=resolver, launcher=mock_launcher)

    profile_key = "browser-profile/test-provider/acc-1"
    manager.open_login(
        provider_key="test-provider",
        profile_key=profile_key,
        login_url="https://provider.test/login",
    )

    with pytest.raises(BrowserProfileInUse):
        manager.delete_profile(profile_key)


def test_delete_profile_delegates_to_resolver_when_closed(tmp_path: Path) -> None:
    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    manager = PlaywrightBrowserSessionManager(resolver=resolver)

    profile_key = "browser-profile/test-provider/acc-1"
    resolved = resolver.resolve(profile_key)
    resolved.mkdir(parents=True, exist_ok=True)
    (resolved / "data.txt").write_text("dummy")

    assert resolved.exists()
    manager.delete_profile(profile_key)
    assert not resolved.exists()


def test_close_all_closes_all_sessions_without_deleting_profiles(tmp_path: Path) -> None:
    contexts: list[MockContext] = []

    def mock_launcher(path: Path, channel: str, headless: bool) -> Any:
        ctx = MockContext(channel)
        contexts.append(ctx)
        return ctx

    resolver = BrowserProfilePathResolver(data_dir=tmp_path)
    manager = PlaywrightBrowserSessionManager(resolver=resolver, launcher=mock_launcher)

    manager.open_login(
        provider_key="test-provider",
        profile_key="browser-profile/test-provider/acc-1",
        login_url="https://provider.test/login",
    )
    manager.open_login(
        provider_key="test-provider",
        profile_key="browser-profile/test-provider/acc-2",
        login_url="https://provider.test/login",
    )

    assert len(contexts) == 2
    assert not contexts[0].closed
    assert not contexts[1].closed

    manager.close_all()

    assert contexts[0].closed
    assert contexts[1].closed
    assert not manager.has_open_session("browser-profile/test-provider/acc-1")
    assert not manager.has_open_session("browser-profile/test-provider/acc-2")

    # Profiles still exist on disk
    assert resolver.resolve("browser-profile/test-provider/acc-1").exists()
    assert resolver.resolve("browser-profile/test-provider/acc-2").exists()
