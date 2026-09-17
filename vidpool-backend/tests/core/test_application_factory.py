import threading
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import AppConfig
from app.core.container import AppContainer, build_container
from app.factory import create_app
from tests.accounts.fakes import (
    FakeAccountRepository,
    FakeAccountUnitOfWork,
    FakeBrowserSessionManager,
    FakeProviderAuthAdapter,
    FakeProviderRegistry,
)


def test_import_factory_has_no_active_browser_thread() -> None:
    # Verify no BrowserRuntime owner threads were created by merely importing the factory module
    thread_names = [t.name for t in threading.enumerate()]
    assert not any("BrowserRuntime" in name for name in thread_names)


def test_create_app_creates_single_container(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(tmp_path))
    app = create_app()
    container = getattr(app.state, "container", None)
    assert container is not None
    assert isinstance(container, AppContainer)
    # Ensure container shutdown closes runtime and engine
    container.close()


def test_create_app_uses_injected_container() -> None:
    repo = FakeAccountRepository()
    browser = FakeBrowserSessionManager()
    adapter = FakeProviderAuthAdapter(provider_key="test-provider")
    registry = FakeProviderRegistry([adapter])

    custom_container = build_container(
        uow_factory=lambda: FakeAccountUnitOfWork(repo),
        browser_runtime=browser,
        provider_registry=registry,
    )

    config = AppConfig(
        host="127.0.0.1",
        port=8000,
        session_token="test-token",
        allowed_origins=("http://localhost:5173",),
    )

    app = create_app(config=config, container=custom_container)
    assert app.state.container is custom_container

    # Open a dummy session in browser
    browser.open_login(
        provider_key="test-provider",
        profile_key="browser-profile/test-provider/acc-1",
        login_url="http://example.com",
    )
    assert browser.has_open_session("browser-profile/test-provider/acc-1")

    with TestClient(app) as client:
        res = client.get("/api/health")
        assert res.status_code == 200
        assert browser.has_open_session("browser-profile/test-provider/acc-1")

    # Upon lifespan exit, container.close() is executed
    assert not browser.has_open_session("browser-profile/test-provider/acc-1")
