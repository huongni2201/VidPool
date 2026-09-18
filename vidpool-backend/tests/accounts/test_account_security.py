import logging

from fastapi.testclient import TestClient

from app.core.config import AppConfig
from app.core.container import build_container
from app.main import create_app
from tests.accounts.fakes import (
    FakeAccountRepository,
    FakeAccountUnitOfWork,
    FakeBrowserSessionManager,
    FakeProviderAuthAdapter,
    FakeProviderRegistry,
)

AUTH_HEADER = {"Authorization": "Bearer test-session-token"}

FORBIDDEN_TERMS = [
    "cookie",
    "cookies",
    "password",
    "profile_key",
    "profile_path",
    "user_data_dir",
    "storage_state",
    "refresh_token",
    "access_token",
    "SECRET_TEST_VALUE",
]


def test_api_responses_never_contain_sensitive_keys() -> None:
    repo = FakeAccountRepository()
    browser = FakeBrowserSessionManager()
    adapter = FakeProviderAuthAdapter(
        provider_key="test-provider",
        display_name="Test User",
        external_identity="user-ext-1",
    )
    registry = FakeProviderRegistry([adapter])
    container = build_container(
        uow_factory=lambda: FakeAccountUnitOfWork(repo),
        browser_runtime=browser,
        provider_registry=registry,
    )

    config = AppConfig(
        host="127.0.0.1",
        port=8000,
        session_token="test-session-token",
        allowed_origins=("http://localhost:5173",),
    )
    client = TestClient(create_app(config=config, container=container))

    # 1. Start login
    res_start = client.post(
        "/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER
    )
    assert res_start.status_code == 200
    account_id = res_start.json()["accountId"]

    # 2. Complete login
    res_complete = client.post(
        f"/api/accounts/{account_id}/login/complete",
        headers=AUTH_HEADER,
    )
    assert res_complete.status_code == 200

    # 3. Get account
    res_get = client.get(f"/api/accounts/{account_id}", headers=AUTH_HEADER)
    assert res_get.status_code == 200

    # 4. List accounts
    res_list = client.get("/api/accounts", headers=AUTH_HEADER)
    assert res_list.status_code == 200

    # 5. List providers
    res_prov = client.get("/api/providers", headers=AUTH_HEADER)
    assert res_prov.status_code == 200

    all_payloads = [
        res_start.text,
        res_complete.text,
        res_get.text,
        res_list.text,
        res_prov.text,
    ]

    for payload in all_payloads:
        lower_payload = payload.lower()
        for term in FORBIDDEN_TERMS:
            assert term.lower() not in lower_payload, (
                f"Forbidden term '{term}' leaked in response: {payload}"
            )


def test_internal_browser_exception_with_secret_does_not_leak(caplog) -> None:
    caplog.set_level(logging.WARNING)

    class LeakyLauncherManager(FakeBrowserSessionManager):
        def open_login(self, *, provider_key: str, profile_key: str, login_url: str):
            from app.modules.accounts.domain.errors import BrowserUnavailable

            raise BrowserUnavailable("Failed to connect: SECRET_TEST_VALUE_IN_PLAYWRIGHT")

    repo = FakeAccountRepository()
    browser = LeakyLauncherManager()
    adapter = FakeProviderAuthAdapter(provider_key="test-p")
    registry = FakeProviderRegistry([adapter])
    container = build_container(
        uow_factory=lambda: FakeAccountUnitOfWork(repo),
        browser_runtime=browser,
        provider_registry=registry,
    )

    config = AppConfig(
        host="127.0.0.1",
        port=8000,
        session_token="test-session-token",
        allowed_origins=("http://localhost:5173",),
    )
    client = TestClient(create_app(config=config, container=container))

    res = client.post("/api/providers/test-p/accounts/login/start", headers=AUTH_HEADER)
    assert res.status_code == 503
    assert "SECRET_TEST_VALUE" not in res.text
    assert "SECRET_TEST_VALUE" not in caplog.text
    assert res.json()["detail"] == "Browser service unavailable"


def test_infrastructure_paths_do_not_leak_in_error_responses() -> None:
    class LeakyPathBrowser(FakeBrowserSessionManager):
        def open_login(self, *, provider_key: str, profile_key: str, login_url: str):
            from app.modules.accounts.domain.errors import BrowserUnavailable

            raise BrowserUnavailable(
                "No supported browser channel could be launched for profile 'C:/Users/SecretUser/.vidpool/browser-profiles/acc-1'"
            )

    repo = FakeAccountRepository()
    browser = LeakyPathBrowser()
    adapter = FakeProviderAuthAdapter(provider_key="test-p")
    registry = FakeProviderRegistry([adapter])
    container = build_container(
        uow_factory=lambda: FakeAccountUnitOfWork(repo),
        browser_runtime=browser,
        provider_registry=registry,
    )

    config = AppConfig(
        host="127.0.0.1",
        port=8000,
        session_token="test-session-token",
        allowed_origins=("http://localhost:5173",),
    )
    client = TestClient(create_app(config=config, container=container))

    res = client.post("/api/providers/test-p/accounts/login/start", headers=AUTH_HEADER)
    assert res.status_code == 503
    assert "C:/Users" not in res.text
    assert "SecretUser" not in res.text
    assert "browser-profiles" not in res.text
    assert res.json()["detail"] == "Browser service unavailable"


def test_session_token_never_logged_or_exposed_in_error() -> None:
    config = AppConfig(
        host="127.0.0.1",
        port=8000,
        session_token="SUPER_SECRET_APP_SESSION_TOKEN",
        allowed_origins=("http://localhost:5173",),
    )
    client = TestClient(create_app(config=config))

    # Invalid session request
    res = client.get("/api/accounts", headers={"Authorization": "Bearer wrong-token"})
    assert res.status_code == 401
    assert "SUPER_SECRET_APP_SESSION_TOKEN" not in res.text
    assert "SUPER_SECRET_APP_SESSION_TOKEN" not in str(res.headers)
