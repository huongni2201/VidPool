from pathlib import Path
from fastapi.testclient import TestClient

from app.core.config import AppConfig
from app.core.container import build_container
from app.main import create_app
from app.modules.accounts.application.service import AccountService
from tests.accounts.fakes import (
    FakeAccountRepository,
    FakeBrowserSessionManager,
    FakeProviderAuthAdapter,
    FakeProviderRegistry,
)


def test_build_container_resolves_services(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(tmp_path))
    container = build_container()

    assert isinstance(container.account_service, AccountService)
    assert container.browser_runtime is not None
    container.close()


def test_custom_container_injection_and_lifespan_cleanup() -> None:
    repo = FakeAccountRepository()
    browser = FakeBrowserSessionManager()
    adapter = FakeProviderAuthAdapter(provider_key="test-p")
    registry = FakeProviderRegistry([adapter])

    container = build_container(
        account_repository=repo,
        browser_runtime=browser,
        provider_registry=registry,
    )

    # Open a dummy session to verify cleanup
    browser.open_login(provider_key="test-p", profile_key="browser-profile/test-p/1", login_url="http://test")
    assert browser.has_open_session("browser-profile/test-p/1")

    config = AppConfig(
        host="127.0.0.1",
        port=8000,
        session_token="secret",
        allowed_origins=("http://localhost:5173",),
    )

    app = create_app(config=config, container=container)
    with TestClient(app) as client:
        # Client context starts lifespan
        res = client.get("/api/health")
        assert res.status_code == 200
        assert browser.has_open_session("browser-profile/test-p/1")

    # After TestClient exits context, lifespan shutdown ran
    assert not browser.has_open_session("browser-profile/test-p/1")
