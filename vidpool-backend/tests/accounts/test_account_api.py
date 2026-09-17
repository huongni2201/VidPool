import uuid
from fastapi.testclient import TestClient
import pytest

from app.core.config import AppConfig
from app.core.container import build_container
from app.main import create_app
from tests.accounts.fakes import (
    FakeAccountRepository,
    FakeBrowserSessionManager,
    FakeProviderAuthAdapter,
    FakeProviderRegistry,
)

AUTH_HEADER = {"Authorization": "Bearer test-session-token"}


def _build_test_client(
    auth_adapter: FakeProviderAuthAdapter | None = None,
    session_token: str | None = "test-session-token",
) -> tuple[TestClient, FakeAccountRepository, FakeBrowserSessionManager]:
    repo = FakeAccountRepository()
    browser = FakeBrowserSessionManager()
    adapter = auth_adapter or FakeProviderAuthAdapter(
        provider_key="test-provider",
        display_name="Test Provider",
        external_identity="user-ext-1",
    )
    registry = FakeProviderRegistry([adapter])
    container = build_container(
        account_repository=repo,
        browser_runtime=browser,
        provider_registry=registry,
    )

    config = AppConfig(
        host="127.0.0.1",
        port=8000,
        session_token=session_token,
        allowed_origins=("http://localhost:5173",),
    )
    app = create_app(config=config, container=container)
    return TestClient(app), repo, browser


def test_account_endpoints_require_valid_session() -> None:
    client, _, _ = _build_test_client()

    # No token -> 401
    r1 = client.get("/api/providers")
    assert r1.status_code == 401

    # Wrong token -> 401
    r2 = client.get("/api/providers", headers={"Authorization": "Bearer wrong-token"})
    assert r2.status_code == 401

    # Correct token -> 200
    r3 = client.get("/api/providers", headers=AUTH_HEADER)
    assert r3.status_code == 200


def test_list_providers() -> None:
    client, _, _ = _build_test_client()

    res = client.get("/api/providers", headers=AUTH_HEADER)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["key"] == "test-provider"
    assert data[0]["displayName"] == "Test Provider"
    assert data[0]["authKind"] == "browser_session"


def test_login_lifecycle_endpoints() -> None:
    client, repo, browser = _build_test_client()

    # 1. Start login
    res_start = client.post("/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER)
    assert res_start.status_code == 200
    start_data = res_start.json()
    account_id = start_data["accountId"]
    assert "browserSessionId" not in start_data
    assert start_data["status"] == "waiting_for_user"

    # 2. Get account
    res_get = client.get(f"/api/accounts/{account_id}", headers=AUTH_HEADER)
    assert res_get.status_code == 200
    assert res_get.json()["status"] == "auth_required"

    # 3. Complete login (no body required)
    res_complete = client.post(
        f"/api/accounts/{account_id}/login/complete",
        headers=AUTH_HEADER,
    )
    assert res_complete.status_code == 200
    complete_data = res_complete.json()
    assert complete_data["status"] == "active"
    assert complete_data["displayName"] == "Test Provider"
    assert complete_data["externalIdentity"] == "user-ext-1"

    # 4. List accounts
    res_list = client.get("/api/accounts", headers=AUTH_HEADER)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1

    # 5. Disable and Enable
    res_dis = client.post(f"/api/accounts/{account_id}/disable", headers=AUTH_HEADER)
    assert res_dis.status_code == 200
    assert res_dis.json()["status"] == "disabled"

    res_en = client.post(f"/api/accounts/{account_id}/enable", headers=AUTH_HEADER)
    assert res_en.status_code == 200
    assert res_en.json()["status"] == "auth_required"

    # 6. Delete account
    res_del = client.delete(f"/api/accounts/{account_id}", headers=AUTH_HEADER)
    assert res_del.status_code == 204

    res_after = client.get(f"/api/accounts/{account_id}", headers=AUTH_HEADER)
    assert res_after.status_code == 404


def test_complete_login_requires_no_browser_session_id() -> None:
    client, _, _ = _build_test_client()
    res_start = client.post("/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER)
    account_id = res_start.json()["accountId"]

    res_complete = client.post(f"/api/accounts/{account_id}/login/complete", headers=AUTH_HEADER)
    assert res_complete.status_code == 200
    assert res_complete.json()["status"] == "active"


def test_cancel_login_requires_no_browser_session_id() -> None:
    client, _, _ = _build_test_client()
    res_start = client.post("/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER)
    account_id = res_start.json()["accountId"]

    res_cancel = client.post(f"/api/accounts/{account_id}/login/cancel", headers=AUTH_HEADER)
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "auth_required"


def test_missing_browser_profile_returns_409() -> None:
    client, _, browser = _build_test_client()
    res_start = client.post("/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER)
    account_id = res_start.json()["accountId"]

    # Close the profile manually to simulate user closed window
    browser.close_all()

    res_complete = client.post(f"/api/accounts/{account_id}/login/complete", headers=AUTH_HEADER)
    assert res_complete.status_code == 409


def test_error_mapping() -> None:
    client, _, _ = _build_test_client()

    # Unknown provider -> 404
    r_unknown_prov = client.post("/api/providers/non-existent/accounts/login/start", headers=AUTH_HEADER)
    assert r_unknown_prov.status_code == 404

    # Unknown account -> 404
    r_unknown_acc = client.get(f"/api/accounts/{uuid.uuid4()}", headers=AUTH_HEADER)
    assert r_unknown_acc.status_code == 404

    # Invalid UUID format -> 404
    r_bad_id = client.get("/api/accounts/not-a-uuid", headers=AUTH_HEADER)
    assert r_bad_id.status_code == 404


def test_api_response_never_contains_forbidden_fields() -> None:
    client, _, _ = _build_test_client()

    res_start = client.post("/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER)
    account_id = res_start.json()["accountId"]
    start_data = res_start.json()

    assert "browserSessionId" not in start_data
    assert "browser_session_id" not in start_data

    res_get = client.get(f"/api/accounts/{account_id}", headers=AUTH_HEADER)
    data = res_get.json()

    forbidden_fields = {
        "profileKey",
        "profile_key",
        "profilePath",
        "profile_path",
        "browserSessionId",
        "browser_session_id",
        "sessionId",
        "session_id",
        "cookie",
        "cookies",
        "token",
        "password",
        "authorization",
        "ownerId",
        "leaseOwner",
    }
    for field in forbidden_fields:
        assert field not in data, f"Forbidden field '{field}' was returned in response"
