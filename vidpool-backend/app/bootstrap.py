import argparse
from dataclasses import dataclass
import sys

import uvicorn

from app.core.config import AppConfig
from app.main import create_app


@dataclass(frozen=True, slots=True)
class BootstrapArgs:
    host: str
    port: int
    session_token: str | None
    allowed_origins: tuple[str, ...]


def parse_args(argv: list[str] | None = None) -> BootstrapArgs:
    parser = argparse.ArgumentParser(
        description="VidPool backend sidecar entrypoint"
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Loopback interface to bind to (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind to (default: 8000)",
    )
    parser.add_argument(
        "--session-token",
        type=str,
        default=None,
        help="App session token for protected routes",
    )
    parser.add_argument(
        "--allowed-origin",
        dest="allowed_origins",
        action="append",
        default=None,
        help="Allowed CORS origin (can be specified multiple times)",
    )

    args = parser.parse_args(argv if argv is not None else sys.argv[1:])

    if args.host not in {"127.0.0.1", "localhost"}:
        parser.error("VidPool backend must bind to loopback")

    origins = tuple(args.allowed_origins) if args.allowed_origins else (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )

    return BootstrapArgs(
        host=args.host,
        port=args.port,
        session_token=args.session_token,
        allowed_origins=origins,
    )


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    config = AppConfig(
        host=args.host,
        port=args.port,
        session_token=args.session_token,
        allowed_origins=args.allowed_origins,
    )
    app = create_app(config)
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        reload=False,
        access_log=False,
    )


if __name__ == "__main__":
    main()
