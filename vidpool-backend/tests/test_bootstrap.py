import pytest

from app.bootstrap import main, parse_args, resolve_config


def test_default_host_is_loopback() -> None:
    args = parse_args([])
    assert args.host == "127.0.0.1"
    assert args.port == 8000
    assert args.session_token is None


def test_allowed_origins_are_none_when_cli_not_supplied() -> None:
    args = parse_args([])
    assert args.allowed_origins is None


def test_supplied_port_accepted() -> None:
    args = parse_args(["--port", "9000"])
    assert args.port == 9000


def test_session_token_accepted() -> None:
    args = parse_args(["--session-token", "my-secret-token"])
    assert args.session_token == "my-secret-token"


def test_repeated_allowed_origin_accepted() -> None:
    args = parse_args(
        [
            "--allowed-origin",
            "http://localhost:5173",
            "--allowed-origin",
            "http://127.0.0.1:5173",
        ]
    )
    assert args.allowed_origins == (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )


def test_external_host_rejected() -> None:
    with pytest.raises(SystemExit):
        parse_args(["--host", "0.0.0.0"])


def test_resolve_config_uses_environment_session_token(monkeypatch) -> None:
    monkeypatch.setenv("VIDPOOL_SESSION_TOKEN", "env-token")
    args = parse_args([])

    config = resolve_config(args)

    assert config.session_token == "env-token"


def test_resolve_config_keeps_missing_session_token_as_none(monkeypatch) -> None:
    monkeypatch.delenv("VIDPOOL_SESSION_TOKEN", raising=False)
    args = parse_args([])

    config = resolve_config(args)

    assert config.session_token is None


def test_resolve_config_uses_environment_allowed_origins(monkeypatch) -> None:
    monkeypatch.setenv(
        "VIDPOOL_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    args = parse_args([])

    config = resolve_config(args)

    assert config.allowed_origins == (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )


def test_cli_session_token_overrides_environment(monkeypatch) -> None:
    monkeypatch.setenv("VIDPOOL_SESSION_TOKEN", "env-token")
    args = parse_args(["--session-token", "cli-token"])

    config = resolve_config(args)

    assert config.session_token == "cli-token"


def test_parse_args_accepts_browser_smoke_test() -> None:
    args = parse_args(["--browser-smoke-test"])
    assert args.browser_smoke_test is True


def test_browser_smoke_test_defaults_false() -> None:
    args = parse_args([])
    assert args.browser_smoke_test is False


def test_main_routes_to_browser_smoke_test(monkeypatch: pytest.MonkeyPatch) -> None:
    called = False

    def fake_smoke() -> None:
        nonlocal called
        called = True

    monkeypatch.setattr("app.bootstrap.run_browser_smoke_test", fake_smoke)
    monkeypatch.setattr(
        "app.bootstrap.uvicorn.run",
        lambda *args, **kwargs: pytest.fail("uvicorn must not start"),
    )

    main(["--browser-smoke-test"])

    assert called is True

