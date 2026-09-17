from app.core.config import load_config


def test_default_host_is_loopback(monkeypatch) -> None:
    monkeypatch.delenv("VIDPOOL_API_HOST", raising=False)
    config = load_config()
    assert config.host == "127.0.0.1"


def test_runtime_port_is_loaded(monkeypatch) -> None:
    monkeypatch.setenv("VIDPOOL_API_PORT", "8123")
    config = load_config()
    assert config.port == 8123


def test_session_token_is_loaded(monkeypatch) -> None:
    monkeypatch.setenv("VIDPOOL_SESSION_TOKEN", "test-token")
    config = load_config()
    assert config.session_token == "test-token"


def test_allowed_origins_are_parsed(monkeypatch) -> None:
    monkeypatch.setenv(
        "VIDPOOL_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    config = load_config()
    assert config.allowed_origins == (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )
