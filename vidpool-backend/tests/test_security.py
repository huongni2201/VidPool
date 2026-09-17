from fastapi import APIRouter, Depends
from fastapi.testclient import TestClient

from app.core.config import AppConfig
from app.core.security import require_session
from app.main import create_app


def _build_test_client(session_token: str | None = "secret-token") -> TestClient:
    app = create_app(
        AppConfig(
            host="127.0.0.1",
            port=8000,
            session_token=session_token,
            allowed_origins=("http://localhost:5173",),
        )
    )
    router = APIRouter()

    @router.get("/api/protected", dependencies=[Depends(require_session)])
    def protected_route() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(router)
    return TestClient(app)


def test_protected_route_without_token_returns_401() -> None:
    client = _build_test_client()
    response = client.get("/api/protected")
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid app session"}


def test_protected_route_with_wrong_token_returns_401() -> None:
    client = _build_test_client()
    response = client.get(
        "/api/protected",
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid app session"}


def test_protected_route_with_correct_token_returns_200() -> None:
    client = _build_test_client()
    response = client.get(
        "/api/protected",
        headers={"Authorization": "Bearer secret-token"},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_route_without_token_returns_200() -> None:
    client = _build_test_client()
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_protected_route_with_unconfigured_token_returns_503() -> None:
    client = _build_test_client(session_token=None)
    response = client.get("/api/protected")
    assert response.status_code == 503
    assert response.json() == {"detail": "App session is not configured"}

