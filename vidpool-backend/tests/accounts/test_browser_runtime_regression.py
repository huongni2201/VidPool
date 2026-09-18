import contextlib
import threading
import time
from pathlib import Path

import pytest

from app.modules.accounts.domain.errors import (
    BrowserCommandTimeout,
    BrowserShutdownTimeout,
    BrowserUnavailable,
)
from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)
from app.modules.accounts.infrastructure.browser.runtime import (
    BrowserRuntime,
    RuntimeState,
)


def _make_runtime(tmp_path: Path, shutdown_timeout_s: float = 0.2) -> BrowserRuntime:
    resolver = BrowserProfilePathResolver(tmp_path)
    return BrowserRuntime(resolver=resolver, shutdown_timeout_s=shutdown_timeout_s)


def test_command_timeout_does_not_block_caller_forever(tmp_path: Path) -> None:
    runtime = _make_runtime(tmp_path)
    hang_event = threading.Event()

    try:
        start = time.perf_counter()
        with pytest.raises(BrowserCommandTimeout):
            runtime._submit(lambda: hang_event.wait(), timeout=0.2, operation_name="hang_test")
        elapsed = time.perf_counter() - start

        assert elapsed < 1.0
        assert runtime.state == RuntimeState.FAILED

        # Subsequent submissions must be rejected immediately
        with pytest.raises(BrowserUnavailable):
            runtime._submit(lambda: "should_fail")
    finally:
        hang_event.set()
        with contextlib.suppress(Exception):
            runtime.close_all()


def test_queued_commands_fail_when_runtime_fails(tmp_path: Path) -> None:
    runtime = _make_runtime(tmp_path)
    hang_event = threading.Event()
    b_ran = False

    def op_b() -> str:
        nonlocal b_ran
        b_ran = True
        return "b_done"

    try:
        t_hang = threading.Thread(
            target=lambda: runtime._submit(
                lambda: hang_event.wait(), timeout=0.2, operation_name="hang_a"
            )
        )
        t_hang.start()

        time.sleep(0.05)

        t_b_error: list[Exception] = []

        def run_b() -> None:
            try:
                runtime._submit(op_b, timeout=1.0, operation_name="op_b")
            except Exception as exc:
                t_b_error.append(exc)

        t_b = threading.Thread(target=run_b)
        t_b.start()

        t_hang.join(timeout=2.0)
        t_b.join(timeout=2.0)

        assert runtime.state == RuntimeState.FAILED
        assert b_ran is False
        assert len(t_b_error) == 1
        assert isinstance(t_b_error[0], BrowserUnavailable)
    finally:
        hang_event.set()
        with contextlib.suppress(Exception):
            runtime.close_all()


def test_shutdown_does_not_mark_stopped_if_thread_alive(tmp_path: Path) -> None:
    runtime = _make_runtime(tmp_path, shutdown_timeout_s=0.1)
    hang_event = threading.Event()

    t = threading.Thread(target=lambda: runtime._submit(lambda: hang_event.wait()))
    t.start()
    time.sleep(0.05)

    try:
        with pytest.raises(BrowserShutdownTimeout):
            runtime.close_all()

        assert runtime._thread.is_alive() is True
        assert runtime.state != RuntimeState.STOPPED
        assert runtime.state == RuntimeState.FAILED
    finally:
        hang_event.set()
        t.join(timeout=1.0)
        with contextlib.suppress(Exception):
            runtime.close_all()


def test_delete_profile_guard_rejects_when_owner_alive_and_unhealthy(tmp_path: Path) -> None:
    runtime = _make_runtime(tmp_path, shutdown_timeout_s=0.1)
    hang_event = threading.Event()

    t = threading.Thread(target=lambda: runtime._submit(lambda: hang_event.wait()))
    t.start()
    time.sleep(0.05)

    try:
        with contextlib.suppress(Exception):
            runtime.close_all()

        assert runtime._thread.is_alive() is True
        with pytest.raises(BrowserUnavailable):
            runtime.delete_profile("browser-profile/test-provider/acc-1")
    finally:
        hang_event.set()
        t.join(timeout=1.0)
        with contextlib.suppress(Exception):
            runtime.close_all()
