#!/usr/bin/env python3
"""Smoke harness to verify persistent browser profile behavior on Windows."""

import http.server
from pathlib import Path
import socketserver
import sys
import threading
import time

# Add vidpool-backend to sys.path
repo_root = Path(__file__).resolve().parent.parent
backend_dir = repo_root / "vidpool-backend"
sys.path.insert(0, str(backend_dir))

from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)
from app.modules.accounts.infrastructure.browser.runtime import BrowserRuntime

HTML_CONTENT = """<!DOCTYPE html>
<html>
<head><title>VidPool Smoke Test</title></head>
<body>
<h1>VidPool Browser Profile Smoke</h1>
<p id="status">Ready</p>
</body>
</html>
"""


class SmokeHTTPHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.send_header("Content-Length", str(len(HTML_CONTENT)))
        self.end_headers()
        self.wfile.write(HTML_CONTENT.encode("utf-8"))

    def log_message(self, format: str, *args) -> None:
        pass  # Quiet logging


def main() -> int:
    temp_data_dir = repo_root / ".tmp" / "smoke-data"
    temp_data_dir.mkdir(parents=True, exist_ok=True)

    # 1. Start local HTTP server
    port = 9876
    server = socketserver.TCPServer(("127.0.0.1", port), SmokeHTTPHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    test_url = f"http://127.0.0.1:{port}/"

    profile_key = "browser-profile/smoke-provider/acc-smoke-1"

    try:
        # 2. Instance A: Open profile and write localStorage
        resolver = BrowserProfilePathResolver(data_dir=temp_data_dir)
        runtime_a = BrowserRuntime(resolver=resolver, headless=True)
        runtime_a.open_login(
            provider_key="smoke-provider",
            profile_key=profile_key,
            login_url=test_url,
        )

        def write_token(ctx) -> str:
            page = ctx.pages[0]
            page.evaluate("localStorage.setItem('vidpool-smoke', 'persisted')")
            return page.evaluate("localStorage.getItem('vidpool-smoke')")

        value_a = runtime_a.run_active(profile_key, write_token)
        if value_a != "persisted":
            print(f"FAIL: localStorage write failed, got '{value_a}'")
            return 1

        runtime_a.close_all()
        del runtime_a

        # 3. Instance B: Recreate runtime using the same data directory, verify persistence
        runtime_b = BrowserRuntime(resolver=resolver, headless=True)
        runtime_b.open_login(
            provider_key="smoke-provider",
            profile_key=profile_key,
            login_url=test_url,
        )

        value_b = runtime_b.run_active(
            profile_key,
            lambda ctx: ctx.pages[0].evaluate("localStorage.getItem('vidpool-smoke')"),
        )
        if value_b != "persisted":
            print(f"FAIL: persistent profile did not retain localStorage, got '{value_b}'")
            return 1
        print("PASS: persistent profile survives manager restart")

        # 4. Profile B: Verify state from A does not exist in B (profile isolation)
        profile_key_b = "browser-profile/smoke-provider/acc-smoke-2"
        runtime_b.open_login(
            provider_key="smoke-provider",
            profile_key=profile_key_b,
            login_url=test_url,
        )
        value_b2 = runtime_b.run_active(
            profile_key_b,
            lambda ctx: ctx.pages[0].evaluate("localStorage.getItem('vidpool-smoke')"),
        )
        if value_b2 is not None:
            print(f"FAIL: expected profile isolation, but profile B saw '{value_b2}'")
            return 1
        print("PASS: account profiles remain isolated")
        runtime_b.close_profile(profile_key_b)
        runtime_b.close_profile(profile_key)

        # 5. Delete profile and assert state is absent
        runtime_b.delete_profile(profile_key)
        runtime_b.close_all()
        del runtime_b

        runtime_c = BrowserRuntime(resolver=resolver, headless=True)
        runtime_c.open_login(
            provider_key="smoke-provider",
            profile_key=profile_key,
            login_url=test_url,
        )
        value_c = runtime_c.run_active(
            profile_key,
            lambda ctx: ctx.pages[0].evaluate("localStorage.getItem('vidpool-smoke')"),
        )
        if value_c is not None:
            print(f"FAIL: expected cleared state after delete, got '{value_c}'")
            return 1
        print("PASS: profile deletion clears browser state")

        runtime_c.close_all()
        return 0
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    sys.exit(main())
