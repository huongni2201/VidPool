import pytest

from app.bootstrap import parse_args


def test_default_host_is_loopback() -> None:
    args = parse_args([])
    assert args.host == "127.0.0.1"
    assert args.port == 8000
    assert args.session_token is None


def test_supplied_port_accepted() -> None:
    args = parse_args(["--port", "9000"])
    assert args.port == 9000


def test_session_token_accepted() -> None:
    args = parse_args(["--session-token", "my-secret-token"])
    assert args.session_token == "my-secret-token"


def test_repeated_allowed_origin_accepted() -> None:
    args = parse_args([
        "--allowed-origin", "http://localhost:5173",
        "--allowed-origin", "http://127.0.0.1:5173",
    ])
    assert args.allowed_origins == (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )


def test_external_host_rejected() -> None:
    with pytest.raises(SystemExit):
        parse_args(["--host", "0.0.0.0"])
