import contextlib
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

from app.modules.accounts.domain.errors import (
    BrowserProfileInUse,
    BrowserSessionNotOpen,
    BrowserUnavailable,
)
from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)
from app.modules.accounts.infrastructure.browser.runtime import BrowserRuntime, RuntimeState


class FakePage:
    def __init__(self) -> None:
        self.url = ""
        self.navigated_url = ""

    def goto(self, url: str) -> None:
        self.url = url
        self.navigated_url = url


class FakeContext:
    def __init__(self, pages: list[FakePage] | None = None) -> None:
        self.pages: list[FakePage] = pages if pages is not None else [FakePage()]
        self.closed = False
        self.close_thread_ids: list[int] = []
        self._callbacks: dict[str, list[Callable[[], None]]] = {}

    def new_page(self) -> FakePage:
        p = FakePage()
        self.pages.append(p)
        return p

    def on(self, event: str, callback: Callable[[], None]) -> None:
        self._callbacks.setdefault(event, []).append(callback)

    def close(self) -> None:
        self.closed = True
        self.close_thread_ids.append(threading.get_ident())
        for cb in self._callbacks.get("close", []):
            with contextlib.suppress(Exception):
                cb()

    def simulate_close(self) -> None:
        self.close()


def _make_runtime(
    tmp_path: Path,
    launcher: Any = None,
) -> BrowserRuntime:
    resolver = BrowserProfilePathResolver(tmp_path)
    return BrowserRuntime(resolver=resolver, launcher=launcher)


def test_browser_runtime_runs_operations_on_owner_thread(tmp_path: Path) -> None:
    caller_thread = threading.get_ident()
    operation_threads: list[int] = []

    runtime = _make_runtime(tmp_path)
    try:
        runtime._submit(lambda: operation_threads.append(threading.get_ident()))

        assert operation_threads
        assert operation_threads[0] != caller_thread
    finally:
        runtime.close_all()


def test_open_login_and_close_profile(tmp_path: Path) -> None:
    fake_context = FakeContext()
    runtime = _make_runtime(tmp_path, launcher=lambda p, c, h: fake_context)
    profile_key = "browser-profile/test-provider/acc-1"

    try:
        assert runtime.has_open_session(profile_key) is False
        runtime.open_login(
            provider_key="test-provider",
            profile_key=profile_key,
            login_url="https://example.com/login",
        )
        assert runtime.has_open_session(profile_key) is True
        assert fake_context.pages[0].navigated_url == "https://example.com/login"

        runtime.close_profile(profile_key)
        assert runtime.has_open_session(profile_key) is False
        assert fake_context.closed is True
    finally:
        runtime.close_all()


def test_open_login_rejects_second_session_for_same_profile(tmp_path: Path) -> None:
    runtime = _make_runtime(tmp_path, launcher=lambda p, c, h: FakeContext())
    profile_key = "browser-profile/test-provider/acc-1"

    try:
        runtime.open_login(
            provider_key="test-provider",
            profile_key=profile_key,
            login_url="https://example.com/login",
        )

        with pytest.raises(BrowserProfileInUse):
            runtime.open_login(
                provider_key="test-provider",
                profile_key=profile_key,
                login_url="https://example.com/login",
            )
    finally:
        runtime.close_all()


def test_context_close_cleans_stale_session(tmp_path: Path) -> None:
    fake_context = FakeContext()
    runtime = _make_runtime(tmp_path, launcher=lambda p, c, h: fake_context)
    profile_key = "browser-profile/test-provider/acc-1"

    try:
        runtime.open_login(
            provider_key="test-provider",
            profile_key=profile_key,
            login_url="https://example.com/login",
        )
        assert runtime.has_open_session(profile_key) is True

        fake_context.simulate_close()
        assert runtime.has_open_session(profile_key) is False
    finally:
        runtime.close_all()


def test_run_active_executes_operation_on_owner_thread(tmp_path: Path) -> None:
    fake_context = FakeContext()
    runtime = _make_runtime(tmp_path, launcher=lambda p, c, h: fake_context)
    profile_key = "browser-profile/test-provider/acc-1"

    try:
        runtime.open_login(
            provider_key="test-provider",
            profile_key=profile_key,
            login_url="https://example.com/login",
        )

        op_threads: list[int] = []

        def inspect_session(ctx: Any) -> str:
            op_threads.append(threading.get_ident())
            assert ctx is fake_context
            return "ok"

        res = runtime.run_active(profile_key, inspect_session)
        assert res == "ok"
        assert op_threads
        assert op_threads[0] != threading.get_ident()
    finally:
        runtime.close_all()


def test_run_active_raises_when_not_open(tmp_path: Path) -> None:
    runtime = _make_runtime(tmp_path, launcher=lambda p, c, h: FakeContext())
    profile_key = "browser-profile/test-provider/acc-not-open"

    try:
        with pytest.raises(BrowserSessionNotOpen):
            runtime.run_active(profile_key, lambda ctx: "fail")
    finally:
        runtime.close_all()


def test_launch_and_close_run_on_same_owner_thread(tmp_path: Path) -> None:
    launch_threads: list[int] = []
    fake_context = FakeContext()

    def launcher(p: Path, c: str, h: bool) -> FakeContext:
        launch_threads.append(threading.get_ident())
        return fake_context

    runtime = _make_runtime(tmp_path, launcher=launcher)
    profile_key = "browser-profile/test-provider/acc-thread"

    try:
        runtime.open_login(
            provider_key="test-provider",
            profile_key=profile_key,
            login_url="https://example.com/login",
        )
        runtime.close_profile(profile_key)

        assert launch_threads
        assert fake_context.close_thread_ids
        assert launch_threads[0] == fake_context.close_thread_ids[0]
        assert launch_threads[0] != threading.get_ident()
    finally:
        runtime.close_all()


def test_concurrent_double_open_results_in_one_success_one_conflict(tmp_path: Path) -> None:
    created_contexts: list[FakeContext] = []
    barrier = threading.Barrier(2)

    def launcher(p: Path, c: str, h: bool) -> FakeContext:
        ctx = FakeContext()
        created_contexts.append(ctx)
        return ctx

    runtime = _make_runtime(tmp_path, launcher=launcher)
    profile_key = "browser-profile/test-provider/acc-conc"

    successes: list[str] = []
    conflicts: list[Exception] = []

    def worker() -> None:
        try:
            barrier.wait(timeout=5)
            runtime.open_login(
                provider_key="test-provider",
                profile_key=profile_key,
                login_url="https://example.com/login",
            )
            successes.append("success")
        except BrowserProfileInUse as exc:
            conflicts.append(exc)

    t1 = threading.Thread(target=worker)
    t2 = threading.Thread(target=worker)

    try:
        t1.start()
        t2.start()
        t1.join(timeout=10)
        t2.join(timeout=10)

        assert len(successes) == 1
        assert len(conflicts) == 1
        assert len(created_contexts) == 1
    finally:
        runtime.close_all()


def test_concurrent_operations_for_different_profiles(tmp_path: Path) -> None:
    runtime = _make_runtime(tmp_path, launcher=lambda p, c, h: FakeContext())
    p1 = "browser-profile/test-provider/p1"
    p2 = "browser-profile/test-provider/p2"

    barrier = threading.Barrier(2)
    successes: list[str] = []

    def worker(key: str) -> None:
        barrier.wait(timeout=5)
        runtime.open_login(
            provider_key="test-provider",
            profile_key=key,
            login_url="https://example.com/login",
        )
        successes.append(key)

    t1 = threading.Thread(target=worker, args=(p1,))
    t2 = threading.Thread(target=worker, args=(p2,))

    try:
        t1.start()
        t2.start()
        t1.join(timeout=10)
        t2.join(timeout=10)

        assert len(successes) == 2
        assert runtime.has_open_session(p1) is True
        assert runtime.has_open_session(p2) is True
    finally:
        runtime.close_all()


def test_close_all_is_idempotent_and_rejects_new_work(tmp_path: Path) -> None:
    fake_context = FakeContext()
    runtime = _make_runtime(tmp_path, launcher=lambda p, c, h: fake_context)
    profile_key = "browser-profile/test-provider/acc-close"

    runtime.open_login(
        provider_key="test-provider",
        profile_key=profile_key,
        login_url="https://example.com/login",
    )
    assert runtime.has_open_session(profile_key) is True

    runtime.close_all()
    assert fake_context.closed is True

    # Idempotent:
    runtime.close_all()

    # Reject new work:
    with pytest.raises(BrowserUnavailable):
        runtime.open_login(
            provider_key="test-provider",
            profile_key=profile_key,
            login_url="https://example.com/login",
        )


def test_persisted_profile_operation_runs_temporarily(tmp_path: Path) -> None:
    fake_context = FakeContext()
    runtime = _make_runtime(tmp_path, launcher=lambda p, c, h: fake_context)
    profile_key = "browser-profile/test-provider/acc-persisted"

    try:
        res = runtime.run_persisted_profile(profile_key, lambda ctx: "persisted_ok")
        assert res == "persisted_ok"
        assert fake_context.closed is True
        assert runtime.has_open_session(profile_key) is False
    finally:
        runtime.close_all()


def test_persisted_profile_rejects_active_interactive_session(tmp_path: Path) -> None:
    fake_context = FakeContext()
    runtime = _make_runtime(tmp_path, launcher=lambda p, c, h: fake_context)
    profile_key = "browser-profile/test-provider/acc-active"

    try:
        runtime.open_login(
            provider_key="test-provider",
            profile_key=profile_key,
            login_url="https://example.com/login",
        )

        with pytest.raises(BrowserProfileInUse):
            runtime.run_persisted_profile(profile_key, lambda ctx: "should_fail")
    finally:
        runtime.close_all()


def test_concurrent_delete_profile_and_open_login(tmp_path: Path) -> None:
    fake_context = FakeContext()
    runtime = _make_runtime(tmp_path, launcher=lambda p, c, h: fake_context)
    profile_key = "browser-profile/test-provider/acc-race"

    barrier = threading.Barrier(2)
    errors: list[Exception] = []
    events: list[str] = []

    def run_open() -> None:
        try:
            barrier.wait(timeout=5)
            runtime.open_login(
                provider_key="test-provider",
                profile_key=profile_key,
                login_url="https://example.com/login",
            )
            events.append("open_success")
        except Exception as e:
            errors.append(e)

    def run_delete() -> None:
        try:
            barrier.wait(timeout=5)
            runtime.delete_profile(profile_key)
            events.append("delete_success")
        except BrowserProfileInUse:
            events.append("delete_rejected_in_use")
        except Exception as e:
            errors.append(e)

    t1 = threading.Thread(target=run_open)
    t2 = threading.Thread(target=run_delete)

    try:
        t1.start()
        t2.start()
        t1.join(timeout=10)
        t2.join(timeout=10)

        assert errors == []
        # Either delete ran before open (delete_success then open_success)
        # or open ran before delete (open_success then delete_rejected_in_use)
        assert "open_success" in events
        assert ("delete_success" in events) or ("delete_rejected_in_use" in events)
    finally:
        runtime.close_all()


def test_runtime_lifecycle_states_and_deterministic_shutdown(tmp_path: Path) -> None:
    runtime = _make_runtime(tmp_path, launcher=lambda p, c, h: FakeContext())
    assert runtime.state == RuntimeState.RUNNING

    profile_key = "browser-profile/test-provider/acc-lifecycle"
    runtime.open_login(
        provider_key="test-provider",
        profile_key=profile_key,
        login_url="https://example.com",
    )
    assert runtime.has_open_session(profile_key) is True

    runtime.close_all()
    assert runtime.state == RuntimeState.STOPPED

    # Idempotent double close
    runtime.close_all()
    assert runtime.state == RuntimeState.STOPPED

    # Operations after shutdown are rejected deterministically
    with pytest.raises(BrowserUnavailable):
        runtime.open_login(
            provider_key="test-provider",
            profile_key=profile_key,
            login_url="https://example.com",
        )


def test_navigation_failure_keeps_browser_session_open(tmp_path: Path) -> None:
    class FailingPage(FakePage):
        def goto(self, url: str, **kwargs: Any) -> None:
            raise TimeoutError("Navigation timed out after 30000ms")

    fake_context = FakeContext(pages=[FailingPage()])
    runtime = _make_runtime(tmp_path, launcher=lambda p, c, h: fake_context)
    profile_key = "browser-profile/test-provider/acc-nav-fail"

    try:
        # Navigation failure must NOT raise and must NOT close the context
        runtime.open_login(
            provider_key="test-provider",
            profile_key=profile_key,
            login_url="https://dreamina.capcut.com/slow-page",
        )
        assert runtime.has_open_session(profile_key) is True
        assert fake_context.closed is False
        assert runtime.state == RuntimeState.RUNNING
    finally:
        runtime.close_all()


def test_launch_failure_does_not_register_session(tmp_path: Path) -> None:
    from app.modules.accounts.domain.errors import BrowserLaunchFailed

    def failing_launcher(p: Path, c: str, h: bool) -> Any:
        raise BrowserLaunchFailed(f"Channel {c} failed to start")

    runtime = _make_runtime(tmp_path, launcher=failing_launcher)
    profile_key = "browser-profile/test-provider/acc-launch-fail"

    try:
        with pytest.raises(BrowserUnavailable):
            runtime.open_login(
                provider_key="test-provider",
                profile_key=profile_key,
                login_url="https://example.com",
            )
        assert runtime.has_open_session(profile_key) is False
        assert runtime.state == RuntimeState.RUNNING
    finally:
        runtime.close_all()


def test_edge_failure_falls_back_to_chrome(tmp_path: Path) -> None:
    from app.modules.accounts.domain.errors import BrowserLaunchFailed

    attempted_channels: list[str] = []
    fake_context = FakeContext()

    def fallback_launcher(p: Path, channel: str, h: bool) -> Any:
        attempted_channels.append(channel)
        if channel == "msedge":
            raise BrowserLaunchFailed("msedge executable not found")
        return fake_context

    runtime = _make_runtime(tmp_path, launcher=fallback_launcher)
    profile_key = "browser-profile/test-provider/acc-fallback"

    try:
        runtime.open_login(
            provider_key="test-provider",
            profile_key=profile_key,
            login_url="https://example.com",
        )
        assert attempted_channels == ["msedge", "chrome"]
        assert runtime.has_open_session(profile_key) is True
    finally:
        runtime.close_all()


def test_close_callback_accepts_event_argument(tmp_path: Path) -> None:
    fake_context = FakeContext()
    runtime = _make_runtime(tmp_path, launcher=lambda p, c, h: fake_context)
    profile_key = "browser-profile/test-provider/acc-close-args"

    try:
        runtime.open_login(
            provider_key="test-provider",
            profile_key=profile_key,
            login_url="https://example.com",
        )
        assert runtime.has_open_session(profile_key) is True

        # Simulate user closing browser directly from OS window: Playwright passes (context) as argument
        for cb in fake_context._callbacks.get("close", []):
            cb(fake_context)

        assert runtime.has_open_session(profile_key) is False
    finally:
        runtime.close_all()
