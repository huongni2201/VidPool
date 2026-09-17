import argparse
import os
import sys
from dataclasses import dataclass

import uvicorn

from app.core.config import AppConfig
from app.factory import create_app


@dataclass(frozen=True, slots=True)
class BootstrapArgs:
    host: str
    port: int
    session_token: str | None
    allowed_origins: tuple[str, ...] | None
    browser_smoke_test: bool = False


def parse_args(argv: list[str] | None = None) -> BootstrapArgs:
    parser = argparse.ArgumentParser(description="VidPool backend sidecar entrypoint")
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
    parser.add_argument(
        "--browser-smoke-test",
        action="store_true",
        help="Launch and close an isolated browser profile, then exit",
    )

    args = parser.parse_args(argv if argv is not None else sys.argv[1:])

    if args.host not in {"127.0.0.1", "localhost"}:
        parser.error("VidPool backend must bind to loopback")

    origins = tuple(args.allowed_origins) if args.allowed_origins else None

    return BootstrapArgs(
        host=args.host,
        port=args.port,
        session_token=args.session_token,
        allowed_origins=origins,
        browser_smoke_test=args.browser_smoke_test,
    )


def resolve_config(args: BootstrapArgs) -> AppConfig:
    session_token = args.session_token or os.getenv("VIDPOOL_SESSION_TOKEN")

    if args.allowed_origins is not None:
        allowed_origins = args.allowed_origins
    else:
        from app.core.config import _parse_origins

        allowed_origins = _parse_origins(os.getenv("VIDPOOL_ALLOWED_ORIGINS"))

    return AppConfig(
        host=args.host,
        port=args.port,
        session_token=session_token,
        allowed_origins=allowed_origins,
    )


def run_browser_smoke_test() -> None:
    from pathlib import Path
    from tempfile import TemporaryDirectory

    from app.modules.accounts.infrastructure.browser.profile_paths import (
        BrowserProfilePathResolver,
    )
    from app.modules.accounts.infrastructure.browser.runtime import BrowserRuntime

    with TemporaryDirectory(prefix="vidpool-browser-smoke-") as tmp:
        resolver = BrowserProfilePathResolver(Path(tmp))
        runtime = BrowserRuntime(resolver=resolver)
        profile_key = "browser-profile/smoke/smoke-account"

        try:
            runtime.open_login(
                provider_key="smoke",
                profile_key=profile_key,
                login_url="about:blank",
            )
            if not runtime.has_open_session(profile_key):
                raise RuntimeError("Browser smoke profile did not open")
            runtime.close_profile(profile_key)
        finally:
            runtime.close_all()


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)

    if args.browser_smoke_test:
        run_browser_smoke_test()
        return

    config = resolve_config(args)
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

