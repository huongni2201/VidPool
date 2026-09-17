from fastapi.testclient import TestClient

from app.core.config import AppConfig
from app.main import create_app


def _build_client(session_token: str | None = "probe-secret") -> TestClient:
    app = create_app(
        AppConfig(
            host="127.0.0.1",
            port=8000,
            session_token=session_token,
            allowed_origins=("http://localhost:5173",),
        )
    )
    return TestClient(app)


def test_probe_missing_token_returns_401() -> None:
    client = _build_client()
    response = client.get("/api/session/probe")
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid app session"}


def test_probe_wrong_token_returns_401() -> None:
    client = _build_client()
    response = client.get(
        "/api/session/probe",
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid app session"}


def test_probe_valid_token_returns_200() -> None:
    client = _build_client()
    response = client.get(
        "/api/session/probe",
        headers={"Authorization": "Bearer probe-secret"},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
