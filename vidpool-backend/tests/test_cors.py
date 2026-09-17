from fastapi.testclient import TestClient

from app.core.config import AppConfig
from app.main import create_app


def test_known_origin_is_allowed() -> None:
    app = create_app(
        AppConfig(
            host="127.0.0.1",
            port=8000,
            session_token=None,
            allowed_origins=("http://localhost:5173",),
        )
    )
    client = TestClient(app)

    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_unknown_origin_is_not_allowed() -> None:
    app = create_app(
        AppConfig(
            host="127.0.0.1",
            port=8000,
            session_token=None,
            allowed_origins=("http://localhost:5173",),
        )
    )
    client = TestClient(app)

    response = client.options(
        "/api/health",
        headers={
            "Origin": "https://malicious.example",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert "access-control-allow-origin" not in response.headers
