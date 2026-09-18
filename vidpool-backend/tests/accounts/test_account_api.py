import uuid

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
        uow_factory=lambda: FakeAccountUnitOfWork(repo),
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
    res_start = client.post(
        "/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER
    )
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
    res_start = client.post(
        "/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER
    )
    account_id = res_start.json()["accountId"]

    res_complete = client.post(f"/api/accounts/{account_id}/login/complete", headers=AUTH_HEADER)
    assert res_complete.status_code == 200
    assert res_complete.json()["status"] == "active"


def test_cancel_new_login_deletes_account_and_returns_204() -> None:
    client, _, _ = _build_test_client()
    res_start = client.post(
        "/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER
    )
    account_id = res_start.json()["accountId"]

    res_cancel = client.post(f"/api/accounts/{account_id}/login/cancel", headers=AUTH_HEADER)
    assert res_cancel.status_code == 204

    # Account should be removed from database
    res_get = client.get(f"/api/accounts/{account_id}", headers=AUTH_HEADER)
    assert res_get.status_code == 404


def test_cancel_relogin_preserves_account_and_returns_200() -> None:
    client, _, _ = _build_test_client()
    res_start = client.post(
        "/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER
    )
    account_id = res_start.json()["accountId"]
    client.post(f"/api/accounts/{account_id}/login/complete", headers=AUTH_HEADER)

    # Disable and enable to put in auth_required
    client.post(f"/api/accounts/{account_id}/disable", headers=AUTH_HEADER)
    client.post(f"/api/accounts/{account_id}/enable", headers=AUTH_HEADER)

    # Start relogin
    res_rel = client.post(f"/api/accounts/{account_id}/relogin/start", headers=AUTH_HEADER)
    assert res_rel.status_code == 200

    # Cancel relogin
    res_cancel = client.post(f"/api/accounts/{account_id}/relogin/cancel", headers=AUTH_HEADER)
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "auth_required"

    # Account still exists
    res_get = client.get(f"/api/accounts/{account_id}", headers=AUTH_HEADER)
    assert res_get.status_code == 200


def test_missing_browser_profile_returns_409() -> None:
    client, _, browser = _build_test_client()
    res_start = client.post(
        "/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER
    )
    account_id = res_start.json()["accountId"]

    # Close the profile manually to simulate user closed window
    browser.close_all()

    res_complete = client.post(f"/api/accounts/{account_id}/login/complete", headers=AUTH_HEADER)
    assert res_complete.status_code == 409


def test_error_mapping() -> None:
    client, _, _ = _build_test_client()

    # Unknown provider -> 404
    r_unknown_prov = client.post(
        "/api/providers/non-existent/accounts/login/start", headers=AUTH_HEADER
    )
    assert r_unknown_prov.status_code == 404

    # Unknown account -> 404
    r_unknown_acc = client.get(f"/api/accounts/{uuid.uuid4()}", headers=AUTH_HEADER)
    assert r_unknown_acc.status_code == 404

    # Invalid UUID format -> 404
    r_bad_id = client.get("/api/accounts/not-a-uuid", headers=AUTH_HEADER)
    assert r_bad_id.status_code == 404

    # Relogin on ACTIVE account -> 409 Conflict
    res_start = client.post(
        "/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER
    )
    acc_id = res_start.json()["accountId"]
    client.post(f"/api/accounts/{acc_id}/login/complete", headers=AUTH_HEADER)

    r_relogin_active = client.post(f"/api/accounts/{acc_id}/relogin/start", headers=AUTH_HEADER)
    assert r_relogin_active.status_code == 409
    detail_active = r_relogin_active.json()["detail"]
    assert detail_active["code"] == "INVALID_ACCOUNT_STATE"
    assert "relogin" in detail_active["message"].lower()

    # Relogin on DISABLED account -> 409 Conflict
    client.post(f"/api/accounts/{acc_id}/disable", headers=AUTH_HEADER)
    r_relogin_disabled = client.post(f"/api/accounts/{acc_id}/relogin/start", headers=AUTH_HEADER)
    assert r_relogin_disabled.status_code == 409
    assert r_relogin_disabled.json()["detail"]["code"] == "INVALID_ACCOUNT_STATE"

    # Cancel new login on non-provisional account -> 409 Conflict
    r_cancel_active = client.post(f"/api/accounts/{acc_id}/login/cancel", headers=AUTH_HEADER)
    assert r_cancel_active.status_code == 409
    assert r_cancel_active.json()["detail"]["code"] == "INVALID_ACCOUNT_STATE"


def test_api_response_never_contains_forbidden_fields() -> None:
    client, _, _ = _build_test_client()

    res_start = client.post(
        "/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER
    )
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


def test_validate_account_returns_503_when_provider_unavailable() -> None:
    from app.modules.accounts.domain.errors import ProviderUnavailable

    adapter = FakeProviderAuthAdapter(
        provider_key="test-provider",
        persisted_validation_error=ProviderUnavailable("Provider session check unavailable"),
    )
    client, _, _ = _build_test_client(auth_adapter=adapter)

    res_start = client.post(
        "/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER
    )
    account_id = res_start.json()["accountId"]
    client.post(f"/api/accounts/{account_id}/login/complete", headers=AUTH_HEADER)

    res = client.post(
        f"/api/accounts/{account_id}/validate",
        headers=AUTH_HEADER,
    )
    assert res.status_code == 503
    assert res.json()["detail"]["code"] == "PROVIDER_UNAVAILABLE"
    assert res.json()["detail"]["message"] == "Provider service unavailable"
    assert "Provider session check unavailable" not in res.text


def test_complete_login_returns_409_on_duplicate_provider_identity() -> None:
    adapter = FakeProviderAuthAdapter(
        provider_key="test-provider",
        external_identity="user-shared-999",
        display_name="First User",
    )
    client, _, _ = _build_test_client(auth_adapter=adapter)

    # 1. First account registers and completes login
    res1 = client.post(
        "/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER
    )
    acc1_id = res1.json()["accountId"]
    res1_complete = client.post(
        f"/api/accounts/{acc1_id}/login/complete", headers=AUTH_HEADER
    )
    assert res1_complete.status_code == 200

    # 2. Second account starts login
    res2 = client.post(
        "/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER
    )
    acc2_id = res2.json()["accountId"]

    # 3. Second account completes login resolving to duplicate identity -> 409 Conflict
    res2_complete = client.post(
        f"/api/accounts/{acc2_id}/login/complete", headers=AUTH_HEADER
    )
    detail = res2_complete.json()["detail"]
    assert isinstance(detail, dict)
    assert detail["code"] == "ACCOUNT_ALREADY_EXISTS"

    # Cancelling the duplicate provisional account is idempotent and returns 204
    res2_cancel = client.post(f"/api/accounts/{acc2_id}/login/cancel", headers=AUTH_HEADER)
    assert res2_cancel.status_code == 204


def test_session_invalid_returns_structured_session_invalid_code() -> None:
    adapter = FakeProviderAuthAdapter(
        provider_key="test-provider",
        valid_session=False,
    )
    client, _, _ = _build_test_client(auth_adapter=adapter)

    res_start = client.post(
        "/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER
    )
    account_id = res_start.json()["accountId"]

    res_complete = client.post(
        f"/api/accounts/{account_id}/login/complete", headers=AUTH_HEADER
    )
    assert res_complete.status_code == 409
    detail = res_complete.json()["detail"]
    assert isinstance(detail, dict)
    assert detail["code"] == "SESSION_INVALID"
    assert "validation failed" in detail["message"].lower()


def test_browser_unavailable_returns_sanitized_code_and_message() -> None:
    from app.modules.accounts.domain.errors import BrowserUnavailable

    class UnavailableBrowser(FakeBrowserSessionManager):
        def open_login(self, *, provider_key: str, profile_key: str, login_url: str) -> None:
            raise BrowserUnavailable("Internal secret browser path failure at /var/secrets")

    repo = FakeAccountRepository()
    browser = UnavailableBrowser()
    adapter = FakeProviderAuthAdapter(provider_key="test-provider")
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
    app = create_app(config=config, container=container)
    client = TestClient(app)

    res = client.post(
        "/api/providers/test-provider/accounts/login/start", headers=AUTH_HEADER
    )
    assert res.status_code == 503
    detail = res.json()["detail"]
    assert detail["code"] == "BROWSER_UNAVAILABLE"
    assert detail["message"] == "Browser service unavailable"
    assert "secret" not in res.text


def test_session_shutdown_requires_session_token_and_returns_202() -> None:
    client, _, _ = _build_test_client()

    # Unauthenticated -> 401
    r_unauth = client.post("/api/session/shutdown")
    assert r_unauth.status_code == 401

    # Authenticated -> 202 Accepted
    r_auth = client.post("/api/session/shutdown", headers=AUTH_HEADER)
    assert r_auth.status_code == 202
    assert r_auth.json() == {"status": "shutting_down"}


