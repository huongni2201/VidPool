# VidPool Account Pool Foundation Stabilization — Detailed Fix Plan

> **For agentic workers:** Implement task-by-task. Do not skip tests or verification gates. Prefer TDD: failing test → minimal implementation → passing test → commit.

**Date:** 2026-09-17  
**Target repository:** `huongni2201/VidPool`  
**Baseline reviewed commit:** `5032cad1feed975561e49830bf81d91c21e3b9a8`  
**Scope:** Stabilize Account Pool foundation before implementing real provider adapters such as Seedance/Gemini.

---

## 1. Goal

Fix the current Account Pool foundation so that:

- Backend CI is green.
- Playwright access is thread-safe.
- One account maps deterministically to one persistent browser profile.
- Browser session IDs are not exposed to React.
- A browser session cannot be completed/cancelled using another account's session.
- Provider auth adapters have a clean infrastructure-only way to inspect browser state.
- Login failures do not create orphan accounts/profiles.
- Browser shutdown and crash handling are deterministic.
- SQLAlchemy transaction/session lifecycle is explicit.
- Account Pool is ready to support real providers and later durable jobs without another architectural rewrite.

---

## 2. Non-goals

Do **not** implement these in this plan:

- Seedance production adapter.
- Gemini production adapter.
- Provider execution jobs.
- Durable worker.
- Video generation pipeline.
- TTS.
- Story Engine.
- Asset generation.
- FFmpeg rendering.

Real provider work starts only after the final verification gate passes.

---

## 3. Architecture decisions to preserve

Keep these existing decisions:

```text
Account metadata + lease state
        ↓
      SQLite

Browser auth/session state
        ↓
Persistent isolated browser profile

Every account
        ↓
exactly one profile_key

Playwright
        ↓
infrastructure only

React
        ↓
never sees cookies/tokens/profile paths/raw browser objects
```

Target runtime after this migration:

```text
React / Tauri
     │
     ▼
FastAPI Account API
     │
     ▼
AccountService
 ┌───┴─────────────────┐
 │                     │
 ▼                     ▼
AccountRepository   ProviderAuthPort
                       │
                       ▼
               Provider Adapter
                       │
                       ▼
                 BrowserRuntime
                       │
                       ▼
             dedicated owner thread
                       │
                       ▼
                   Playwright
                       │
              ┌────────┴────────┐
              ▼                 ▼
        Profile A           Profile B
```

Key invariant:

> All Playwright objects must be created, used, and closed on the BrowserRuntime owner thread.

---

# PHASE 0 — Restore green backend CI

## Task 0.1 — Fix pytest collection failure

### Files

Modify:

```text
vidpool-backend/tests/accounts/test_account_repository.py
```

### Problem

The concurrency test uses:

```python
tmp_path: Path
```

but `Path` is not imported.

### Change

Add:

```python
from pathlib import Path
```

near the top of the file.

### Verify

Run:

```bash
cd vidpool-backend
pytest -q
```

Expected:

```text
pytest collects the full suite successfully.
```

Then run:

```bash
alembic upgrade head
alembic current
```

Expected:

```text
No migration error.
Current revision is HEAD.
```

### Commit

```bash
git add vidpool-backend/tests/accounts/test_account_repository.py
git commit -m "fix: restore backend test collection"
```

### Gate

Do not proceed until the entire backend test suite can run.

---

# PHASE 1 — Record the new browser runtime architecture

## Task 1.1 — Add ADR for single-owner Playwright runtime

### Files

Create:

```text
docs/adr/0018-single-owner-playwright-browser-runtime.md
```

### Required ADR content

Use:

```markdown
# ADR-0018: Playwright runs on a single owner thread

Date: 2026-09-17
Status: Accepted

## Context

VidPool keeps browser-backed provider sessions alive across multiple HTTP
requests using persistent browser profiles.

FastAPI synchronous route handlers may execute on different worker threads.
Playwright synchronous objects must not be shared arbitrarily across threads.

## Decision

- One BrowserRuntime instance exists per VidPool backend process.
- BrowserRuntime owns one dedicated thread.
- Playwright is started on that thread.
- Every BrowserContext and Page is created, accessed, and closed on that thread.
- Calls from application/provider adapters are submitted as commands to the runtime.
- `profile_key` is the stable account/browser identity.
- Browser session IDs are internal runtime details and are not exposed to React.
- Raw Playwright objects never enter domain or application layers.
- Provider-specific browser logic remains in infrastructure adapters.

## Consequences

- Browser actions are serialized safely.
- Account/profile ownership is simpler.
- Session IDs no longer need to cross API boundaries.
- Provider adapters remain replaceable.
- BrowserRuntime becomes shared infrastructure for browser-backed providers.
```

### Commit

```bash
git add docs/adr/0018-single-owner-playwright-browser-runtime.md
git commit -m "docs: define single-owner Playwright runtime"
```

---

# PHASE 2 — Simplify application browser contracts

## Task 2.1 — Remove BrowserSessionHandle from application-facing flow

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/application/ports.py
vidpool-backend/app/modules/accounts/application/queries.py
vidpool-backend/tests/accounts/fakes.py
vidpool-backend/tests/accounts/test_account_service.py
vidpool-backend/tests/accounts/test_provider_auth_contract.py
```

### Current problem

Application currently models:

```python
@dataclass(frozen=True)
class BrowserSessionHandle:
    id: str
    profile_key: str
```

This forces browser session IDs into AccountService/API/frontend even though
the stable ownership relationship is already:

```text
account_id -> profile_key
```

### Target BrowserSessionPort

Replace the old contract with:

```python
@runtime_checkable
class BrowserSessionPort(Protocol):
    def open_login(
        self,
        *,
        provider_key: str,
        profile_key: str,
        login_url: str,
    ) -> None: ...

    def close_profile(self, profile_key: str) -> None: ...

    def has_open_session(self, profile_key: str) -> bool: ...

    def delete_profile(self, profile_key: str) -> None: ...

    def close_all(self) -> None: ...
```

Remove from application:

```python
BrowserSessionHandle
close(session_id)
```

### Target ProviderAuthPort

Use:

```python
@runtime_checkable
class ProviderAuthPort(Protocol):
    provider_key: str

    def login_url(self) -> str: ...

    def validate_active_session(
        self,
        profile_key: str,
    ) -> SessionValidation: ...

    def resolve_identity(
        self,
        profile_key: str,
    ) -> ProviderIdentity: ...

    def validate_persisted_session(
        self,
        profile_key: str,
    ) -> SessionValidation: ...
```

### Target StartLoginResult

Use:

```python
@dataclass(frozen=True)
class StartLoginResult:
    account_id: AccountId
    status: str
```

Remove:

```python
browser_session_id
```

### Update FakeBrowserSessionManager

Use:

```python
class FakeBrowserSessionManager(BrowserSessionPort):
    def __init__(self) -> None:
        self.open_profiles: set[str] = set()
        self.deleted_profiles: list[str] = []

    def open_login(
        self,
        *,
        provider_key: str,
        profile_key: str,
        login_url: str,
    ) -> None:
        if profile_key in self.open_profiles:
            raise BrowserProfileInUse(
                f"Browser profile '{profile_key}' is already open"
            )

        self.open_profiles.add(profile_key)

    def close_profile(self, profile_key: str) -> None:
        self.open_profiles.discard(profile_key)

    def has_open_session(self, profile_key: str) -> bool:
        return profile_key in self.open_profiles

    def delete_profile(self, profile_key: str) -> None:
        self.open_profiles.discard(profile_key)
        self.deleted_profiles.append(profile_key)

    def close_all(self) -> None:
        self.open_profiles.clear()
```

### Update FakeProviderAuthAdapter

Use:

```python
def validate_active_session(
    self,
    profile_key: str,
) -> SessionValidation:
    return SessionValidation(valid=self.valid_session)

def resolve_identity(
    self,
    profile_key: str,
) -> ProviderIdentity:
    return ProviderIdentity(
        display_name=self.display_name,
        external_identity=self.external_identity,
    )
```

### Tests

Update all tests so they refer to `profile_key`, not session IDs.

Run:

```bash
pytest tests/accounts/test_account_service.py -q
pytest tests/accounts/test_provider_auth_contract.py -q
```

### Commit

```bash
git commit -am "refactor: simplify browser session contracts"
```

---

# PHASE 3 — Introduce BrowserRuntime

## Task 3.1 — Create the runtime command loop

### Files

Create:

```text
vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py
vidpool-backend/tests/accounts/test_browser_runtime.py
```

Keep temporarily:

```text
vidpool-backend/app/modules/accounts/infrastructure/browser/playwright_session.py
```

Do not delete the old class until wiring has migrated.

### Runtime command model

Use:

```python
from __future__ import annotations

from concurrent.futures import Future
from dataclasses import dataclass
from queue import Queue
from threading import Thread
from typing import Callable, Generic, TypeVar

T = TypeVar("T")


@dataclass
class _BrowserCommand(Generic[T]):
    operation: Callable[[], T]
    future: Future[T]


_STOP = object()
```

### BrowserRuntime skeleton

```python
class BrowserRuntime:
    def __init__(self, ...):
        self._queue: Queue[object] = Queue()
        self._thread = Thread(
            target=self._run,
            name="vidpool-browser-runtime",
            daemon=True,
        )
        self._stopped = False
        self._pw = None
        self._sessions_by_profile = {}

        self._thread.start()
```

### Submit method

```python
def _submit(self, operation: Callable[[], T]) -> T:
    if self._stopped:
        raise BrowserUnavailable("Browser runtime is stopped")

    future: Future[T] = Future()

    self._queue.put(
        _BrowserCommand(
            operation=operation,
            future=future,
        )
    )

    return future.result()
```

### Owner-thread event loop

```python
def _run(self) -> None:
    while True:
        item = self._queue.get()

        if item is _STOP:
            break

        command = item

        try:
            result = command.operation()
        except BaseException as exc:
            command.future.set_exception(exc)
        else:
            command.future.set_result(result)
```

### Playwright creation

Playwright must only be started from the owner thread:

```python
def _ensure_playwright(self):
    if self._pw is None:
        from playwright.sync_api import sync_playwright
        self._pw = sync_playwright().start()

    return self._pw
```

### Test: operation executes on owner thread

```python
def test_browser_runtime_runs_operations_on_owner_thread():
    caller_thread = threading.get_ident()
    operation_threads: list[int] = []

    runtime = BrowserRuntime(...)

    result = runtime._submit(
        lambda: operation_threads.append(threading.get_ident())
    )

    assert operation_threads
    assert operation_threads[0] != caller_thread
```

Prefer exposing a testing-safe command helper if `_submit` should remain private.

### Commit

```bash
git add \
  vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py \
  vidpool-backend/tests/accounts/test_browser_runtime.py

git commit -m "feat: add single-owner browser runtime"
```

---

# PHASE 4 — One profile equals one live browser session

## Task 4.1 — Add profile-owned live session registry

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py
vidpool-backend/tests/accounts/test_browser_runtime.py
```

### Internal type

```python
@dataclass
class _LiveSession:
    profile_key: str
    context: Any
```

Runtime state:

```python
self._sessions_by_profile: dict[str, _LiveSession] = {}
```

Do not maintain a second mutable index by session ID.

### Public open_login

```python
def open_login(
    self,
    *,
    provider_key: str,
    profile_key: str,
    login_url: str,
) -> None:
    self._submit(
        lambda: self._open_login(
            provider_key=provider_key,
            profile_key=profile_key,
            login_url=login_url,
        )
    )
```

### Internal open

```python
def _open_login(
    self,
    *,
    provider_key: str,
    profile_key: str,
    login_url: str,
) -> None:
    if profile_key in self._sessions_by_profile:
        raise BrowserProfileInUse(
            f"Browser profile '{profile_key}' is already open"
        )

    profile_path = self._resolver.resolve(profile_key)
    profile_path.mkdir(parents=True, exist_ok=True)

    context = self._launch_persistent_context(profile_path)

    try:
        pages = context.pages
        page = pages[0] if pages else context.new_page()
        page.goto(login_url)
    except Exception:
        context.close()
        raise

    self._sessions_by_profile[profile_key] = _LiveSession(
        profile_key=profile_key,
        context=context,
    )
```

### Public close

```python
def close_profile(self, profile_key: str) -> None:
    self._submit(
        lambda: self._close_profile(profile_key)
    )
```

### Internal close

```python
def _close_profile(self, profile_key: str) -> None:
    session = self._sessions_by_profile.pop(profile_key, None)

    if session is None:
        return

    session.context.close()
```

### has_open_session

Do not read the dict directly from arbitrary threads.

Use:

```python
def has_open_session(self, profile_key: str) -> bool:
    return self._submit(
        lambda: profile_key in self._sessions_by_profile
    )
```

### Tests

Add:

```python
def test_open_login_rejects_second_session_for_same_profile():
    ...
```

Expected:

```text
first open succeeds
second open raises BrowserProfileInUse
```

Run:

```bash
pytest tests/accounts/test_browser_runtime.py -q
```

### Commit

```bash
git commit -am "feat: enforce one live browser per profile"
```

---

# PHASE 5 — Browser closed by user / stale session handling

## Task 5.1 — Add BrowserSessionNotOpen

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/domain/errors.py
vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py
vidpool-backend/tests/accounts/test_browser_runtime.py
```

### Add error

```python
class BrowserSessionNotOpen(AccountError):
    pass
```

### Register close callback

Immediately after context creation:

```python
context.on(
    "close",
    lambda: self._on_context_closed(profile_key),
)
```

Use an owner-thread-safe cleanup method.

If callback already runs on owner thread:

```python
def _on_context_closed(self, profile_key: str) -> None:
    self._sessions_by_profile.pop(profile_key, None)
```

If callback thread is not guaranteed, enqueue cleanup instead.

### Test

Fake context should support:

```python
context.simulate_close()
```

Then verify:

```python
assert runtime.has_open_session(profile_key) is False
```

### Commit

```bash
git commit -am "fix: clean stale browser sessions after context close"
```

---

# PHASE 6 — Give provider adapters infrastructure-only browser access

## Task 6.1 — Add run_active

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py
vidpool-backend/tests/accounts/test_browser_runtime.py
```

### Public method

```python
T = TypeVar("T")

def run_active(
    self,
    profile_key: str,
    operation: Callable[[Any], T],
) -> T:
    return self._submit(
        lambda: self._run_active(
            profile_key,
            operation,
        )
    )
```

### Internal implementation

```python
def _run_active(
    self,
    profile_key: str,
    operation: Callable[[Any], T],
) -> T:
    session = self._sessions_by_profile.get(profile_key)

    if session is None:
        raise BrowserSessionNotOpen(
            f"No active browser session for '{profile_key}'"
        )

    return operation(session.context)
```

### Boundary rule

Only infrastructure provider adapters may depend on this runtime.

Allowed:

```text
infrastructure/providers/*
    ↓
BrowserRuntime
```

Forbidden:

```text
application/*
    ↓
Playwright / BrowserContext / Page
```

### Test

```python
def test_run_active_executes_provider_operation_on_owner_thread():
    ...
```

Ensure the callback sees the fake context and runs on the same owner thread
used to launch the browser.

### Commit

```bash
git commit -am "feat: expose infrastructure browser operation boundary"
```

---

# PHASE 7 — Migrate Playwright implementation into BrowserRuntime

## Task 7.1 — Move launcher and profile logic

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py
vidpool-backend/app/modules/accounts/infrastructure/browser/profile_paths.py
```

Reference/migrate logic from:

```text
vidpool-backend/app/modules/accounts/infrastructure/browser/playwright_session.py
```

### Preserve browser priority

Keep:

```python
DEFAULT_CHANNELS = ("msedge", "chrome")
```

### Launch method

Use:

```python
def _default_launch(
    self,
    profile_path: Path,
    channel: str,
    headless: bool,
):
    pw = self._ensure_playwright()

    return pw.chromium.launch_persistent_context(
        user_data_dir=str(profile_path),
        channel=channel,
        headless=headless,
    )
```

### Fallback

Try channels sequentially:

```text
msedge
  ↓ fail
chrome
  ↓ fail
BrowserUnavailable
```

### Security behavior to preserve

- Never use the user's normal Chrome/Edge profile.
- Never expose profile path to React.
- Never log cookies/tokens/storage.
- Reject invalid profile keys.
- Profile storage remains under VidPool data directory.

### Test

Keep launcher injection so tests do not require a real browser.

Run:

```bash
pytest tests/accounts/test_browser_runtime.py -q
pytest tests/accounts/test_playwright_session_manager.py -q
```

At the end of migration, move relevant tests to `test_browser_runtime.py`.

---

# PHASE 8 — Remove old PlaywrightBrowserSessionManager

## Task 8.1 — Delete obsolete implementation

### Files

Delete:

```text
vidpool-backend/app/modules/accounts/infrastructure/browser/playwright_session.py
```

Potentially delete/rename:

```text
vidpool-backend/tests/accounts/test_playwright_session_manager.py
```

Move coverage into:

```text
vidpool-backend/tests/accounts/test_browser_runtime.py
```

### Search for stale imports

Run:

```bash
rg "PlaywrightBrowserSessionManager" .
rg "BrowserSessionHandle" .
rg "browser_session_id" vidpool-backend
```

Expected:

```text
No production references remain.
```

### Commit

```bash
git add -A
git commit -m "refactor: replace browser session manager with browser runtime"
```

---

# PHASE 9 — Fix login start compensation

## Task 9.1 — Prevent orphan account when browser launch fails

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/application/service.py
vidpool-backend/tests/accounts/test_account_service.py
```

### Desired flow

```text
build account object
     ↓
open browser
     ↓
persist account
     ↓
return accountId
```

### Implementation shape

```python
def start_login(
    self,
    provider_key: str,
    now: datetime | None = None,
) -> StartLoginResult:
    auth_adapter = self._providers.get_auth(provider_key)

    if auth_adapter is None:
        raise ProviderNotRegistered(
            f"Provider '{provider_key}' is not registered"
        )

    account_id = AccountId(uuid.uuid4())
    profile_key = (
        f"browser-profile/{provider_key}/{account_id}"
    )

    account = ProviderAccount.create(
        provider_key=provider_key,
        profile_key=profile_key,
        account_id=account_id,
        now=now,
    )

    try:
        self._browser.open_login(
            provider_key=provider_key,
            profile_key=profile_key,
            login_url=auth_adapter.login_url(),
        )

        self._accounts.add(account)

    except Exception:
        self._browser.close_profile(profile_key)

        try:
            self._browser.delete_profile(profile_key)
        except Exception:
            logger.exception(
                "Failed to clean profile after login start failure"
            )

        raise

    return StartLoginResult(
        account_id=account_id,
        status="waiting_for_user",
    )
```

### Tests first

Add:

```python
def test_start_login_does_not_persist_account_when_browser_launch_fails():
    ...
```

Expected:

```text
repo.accounts == {}
```

Add:

```python
def test_start_login_closes_and_deletes_profile_when_repository_add_fails():
    ...
```

Expected:

```text
browser has no open profile
profile cleanup called
```

### Commit

```bash
git commit -am "fix: compensate failed account login start"
```

---

# PHASE 10 — Complete login by profile, not session ID

## Task 10.1 — Refactor complete_login

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/application/service.py
vidpool-backend/tests/accounts/test_account_service.py
```

### Target signature

```python
def complete_login(
    self,
    account_id: AccountId,
    now: datetime | None = None,
) -> AccountView:
```

### Flow

```text
load account
    ↓
lookup provider adapter
    ↓
ensure browser profile is open
    ↓
validate_active_session(profile_key)
    ↓
invalid
 ┌──────────────┐
 │ mark AUTH_REQUIRED
 │ save
 │ close browser
 │ raise SessionInvalid
 └──────────────┘

valid
    ↓
resolve_identity(profile_key)
    ↓
mark account ACTIVE
    ↓
save
    ↓
close browser
```

### Implementation pattern

Use explicit cleanup:

```python
try:
    validation = auth_adapter.validate_active_session(
        account.profile_key
    )

    if not validation.valid:
        account.status = AccountStatus.AUTH_REQUIRED
        account.updated_at = current_time
        self._accounts.save(account)
        raise SessionInvalid(
            "Browser session validation failed"
        )

    identity = auth_adapter.resolve_identity(
        account.profile_key
    )

    account.display_name = identity.display_name
    account.external_identity = identity.external_identity
    account.last_validated_at = current_time
    account.updated_at = current_time
    account.cooldown_until = None

    if account.status is not AccountStatus.DISABLED:
        account.status = AccountStatus.ACTIVE

    self._accounts.save(account)

    return _to_view(account)

finally:
    self._browser.close_profile(account.profile_key)
```

### Required tests

```python
def test_complete_login_success_closes_profile():
    ...
```

```python
def test_complete_login_invalid_session_marks_auth_required_and_closes_profile():
    ...
```

```python
def test_complete_login_requires_open_browser_profile():
    ...
```

### Commit

```bash
git commit -am "refactor: complete account login by profile ownership"
```

---

# PHASE 11 — Cancel login by profile

## Task 11.1 — Remove browser session ID from cancel flow

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/application/service.py
vidpool-backend/tests/accounts/test_account_service.py
```

### Target signature

```python
def cancel_login(
    self,
    account_id: AccountId,
) -> AccountView:
```

Implementation:

```python
account = self._accounts.get(account_id)

if account is None:
    raise AccountNotFound(...)

self._browser.close_profile(account.profile_key)

return _to_view(account)
```

### Test

```python
def test_cancel_login_closes_only_accounts_own_profile():
    ...
```

The fake should have two profiles open and verify cancelling account A leaves B open.

### Commit

```bash
git commit -am "refactor: cancel login using account profile ownership"
```

---

# PHASE 12 — Relogin cleanup

## Task 12.1 — Reuse same profile safely

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/application/service.py
vidpool-backend/tests/accounts/test_account_service.py
```

### Rules

Relogin must:

```text
reuse same account_id
reuse same profile_key
reject active lease
reject already-open profile
not create new DB row
```

### Test

```python
def test_start_relogin_reuses_same_profile_and_account():
    ...
```

```python
def test_start_relogin_rejects_existing_open_browser():
    ...
```

```python
def test_start_relogin_rejects_active_lease():
    ...
```

### Commit

```bash
git commit -am "fix: harden account relogin lifecycle"
```

---

# PHASE 13 — Remove browserSessionId from FastAPI

## Task 13.1 — Update API schemas

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/api/schemas.py
vidpool-backend/app/modules/accounts/api/router.py
vidpool-backend/tests/accounts/test_account_api.py
```

### Start response

Use:

```python
class StartLoginResponse(BaseModel):
    accountId: str
    status: str
```

Remove:

```python
browserSessionId
```

### Complete endpoint

Target:

```text
POST /api/accounts/{account_id}/login/complete
```

No request body required.

Implementation:

```python
view = service.complete_login(parsed_id)
```

### Cancel endpoint

Target:

```text
POST /api/accounts/{account_id}/login/cancel
```

No request body required.

Implementation:

```python
view = service.cancel_login(parsed_id)
```

### Delete unused schemas

Remove if no longer used:

```python
CompleteLoginRequest
CancelLoginRequest
```

### Error mapping

Map:

```text
BrowserSessionNotOpen -> 409
BrowserProfileInUse -> 409
SessionInvalid -> 409
BrowserUnavailable -> 503
```

### Tests

Add API tests:

```python
def test_complete_login_requires_no_browser_session_id():
    ...
```

```python
def test_cancel_login_requires_no_browser_session_id():
    ...
```

```python
def test_missing_browser_profile_returns_409():
    ...
```

### Commit

```bash
git commit -am "refactor: remove browser session IDs from account API"
```

---

# PHASE 14 — Remove browserSessionId from frontend

## Task 14.1 — Simplify frontend account login state

### Files

Modify:

```text
vidpool-frontend/src/features/accounts/types.ts
vidpool-frontend/src/features/accounts/accounts-api.ts
vidpool-frontend/src/features/accounts/accounts-api.test.ts
vidpool-frontend/src/features/accounts/add-account-dialog.tsx
vidpool-frontend/src/features/accounts/accounts-page.test.tsx
```

### Start response type

Use:

```typescript
export interface StartLoginResponse {
  accountId: string
  status: string
}
```

Remove:

```typescript
browserSessionId
```

### Dialog state

Replace:

```typescript
const [sessionData, setSessionData] = useState<{
  accountId: string
  browserSessionId: string
} | null>(null)
```

with:

```typescript
const [accountId, setAccountId] =
  useState<string | null>(null)
```

### Start

Use:

```typescript
const res = await startLogin(
  client,
  selectedProvider,
)

setAccountId(res.accountId)
setState("waiting_for_user")
```

### Complete

Use:

```typescript
if (!accountId) return

await completeLogin(
  client,
  accountId,
)
```

### Cancel

Use:

```typescript
if (accountId) {
  try {
    await cancelLogin(
      client,
      accountId,
    )
  } catch {
    // best-effort cleanup
  }
}
```

### Verify no session IDs remain

Run:

```bash
rg "browserSessionId" vidpool-frontend
rg "browser_session_id" vidpool-frontend
```

Expected:

```text
No results.
```

### Verify frontend

```bash
cd vidpool-frontend
pnpm check
```

### Commit

```bash
git commit -am "refactor: simplify account login frontend state"
```

---

# PHASE 15 — BrowserRuntime concurrency tests

## Task 15.1 — Verify launch/close run on same owner thread

### File

```text
vidpool-backend/tests/accounts/test_browser_runtime.py
```

### Test helpers

Use:

```python
class FakeContext:
    def __init__(self):
        self.close_thread_ids: list[int] = []

    def close(self):
        self.close_thread_ids.append(
            threading.get_ident()
        )
```

Launcher:

```python
launch_thread_ids: list[int] = []

def launcher(...):
    launch_thread_ids.append(
        threading.get_ident()
    )
    return FakeContext()
```

### Test

```python
runtime.open_login(...)
runtime.close_profile(profile_key)

assert launch_thread_ids
assert context.close_thread_ids
assert (
    launch_thread_ids[0]
    == context.close_thread_ids[0]
)
```

Also assert owner thread differs from test caller.

---

## Task 15.2 — Concurrent double open

Start two Python threads:

```text
Thread A -> runtime.open_login(profile-X)
Thread B -> runtime.open_login(profile-X)
```

Expected:

```text
1 success
1 BrowserProfileInUse
1 context created
```

Test exactly:

```python
assert len(successes) == 1
assert len(conflicts) == 1
assert created_context_count == 1
```

---

## Task 15.3 — Concurrent operations for different profiles

Start:

```text
A -> profile-1
B -> profile-2
```

Expected:

```text
both succeed
all actual Playwright/fake-context operations run on owner thread
```

---

## Task 15.4 — Shutdown prevents new work

After:

```python
runtime.close_all()
```

then:

```python
with pytest.raises(BrowserUnavailable):
    runtime.open_login(...)
```

---

# PHASE 16 — Explicit BrowserRuntime shutdown

## Task 16.1 — Implement close_all correctly

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py
vidpool-backend/tests/accounts/test_browser_runtime.py
```

### close_all requirements

Must:

```text
1. reject new commands
2. close all contexts on owner thread
3. stop Playwright on owner thread
4. clear session registry
5. signal runtime thread to stop
6. join thread
7. be idempotent
```

### Public method sketch

```python
def close_all(self) -> None:
    if self._stopped:
        return

    def shutdown():
        for session in list(
            self._sessions_by_profile.values()
        ):
            try:
                session.context.close()
            except Exception:
                logger.exception(
                    "Failed closing browser context"
                )

        self._sessions_by_profile.clear()

        if self._pw is not None:
            self._pw.stop()
            self._pw = None

    self._submit(shutdown)

    self._stopped = True
    self._queue.put(_STOP)
    self._thread.join(timeout=5)
```

Be careful to set `_stopped` only after `_submit(shutdown)` has been accepted.

### Tests

```python
def test_close_all_is_idempotent():
    ...
```

```python
def test_close_all_closes_all_profiles():
    ...
```

```python
def test_close_all_stops_owner_thread():
    ...
```

### Commit

```bash
git commit -am "fix: make browser runtime shutdown deterministic"
```

---

# PHASE 17 — AppContainer owns resource lifecycle

## Task 17.1 — Replace browser_session_manager with browser_runtime

### Files

Modify:

```text
vidpool-backend/app/core/container.py
vidpool-backend/app/main.py
vidpool-backend/tests/accounts/test_account_wiring.py
vidpool-backend/tests/test_bootstrap.py
```

### Target AppContainer

```python
@dataclass
class AppContainer:
    account_service: AccountService
    browser_runtime: BrowserRuntime
    engine: Engine | None = None
    provider_registry: ProviderRegistryPort | None = None

    def close(self) -> None:
        self.browser_runtime.close_all()

        if self.engine is not None:
            self.engine.dispose()
```

### build_container

Use:

```python
browser_runtime = BrowserRuntime(
    resolver=BrowserProfilePathResolver(
        get_data_dir()
    )
)
```

Inject into AccountService as `BrowserSessionPort`.

### FastAPI lifespan

Use:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        yield
    finally:
        container = getattr(
            app.state,
            "container",
            None,
        )

        if container is not None:
            container.close()
```

### Remove destructor-based lifecycle

Do not rely on:

```python
__del__()
```

for correctness.

### Tests

Verify:

```text
FastAPI shutdown
    ↓
container.close()
    ↓
BrowserRuntime stopped
    ↓
engine disposed
```

### Commit

```bash
git commit -am "refactor: centralize backend resource lifecycle"
```

---

# PHASE 18 — Persisted session validation after app restart

## Task 18.1 — Add run_persisted_profile

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py
vidpool-backend/tests/accounts/test_browser_runtime.py
```

### Purpose

`validate_persisted_session(profile_key)` must be possible even when the user
does not currently have an interactive browser window open.

### Target method

```python
def run_persisted_profile(
    self,
    profile_key: str,
    operation: Callable[[Any], T],
) -> T:
    return self._submit(
        lambda: self._run_persisted_profile(
            profile_key,
            operation,
        )
    )
```

### Internal rules

```text
if profile is currently live:
    reject with BrowserProfileInUse

resolve persistent profile directory
launch temporary persistent context
execute provider operation
close context
return result
```

### Implementation shape

```python
def _run_persisted_profile(
    self,
    profile_key: str,
    operation: Callable[[Any], T],
) -> T:
    if profile_key in self._sessions_by_profile:
        raise BrowserProfileInUse(...)

    path = self._resolver.resolve(profile_key)

    context = self._launch_persistent_context(
        path,
        headless=True,
    )

    try:
        return operation(context)
    finally:
        context.close()
```

### Tests

```python
def test_persisted_profile_operation_opens_and_closes_temporary_context():
    ...
```

```python
def test_persisted_profile_rejects_profile_already_open_interactively():
    ...
```

---

# PHASE 19 — Provider auth infrastructure base

## Task 19.1 — Add an infrastructure adapter base/helper

### Files

Create:

```text
vidpool-backend/app/modules/accounts/infrastructure/providers/browser_auth_base.py
```

### Purpose

Avoid every provider reimplementing runtime delegation.

### Suggested base

```python
class BrowserBackedAuthAdapter:
    provider_key: str
    display_name: str
    auth_kind = "browser_session"

    def __init__(
        self,
        browser_runtime: BrowserRuntime,
    ) -> None:
        self._browser = browser_runtime
```

Do **not** put provider-specific selectors or URLs here.

Provider-specific adapter later:

```text
SeedanceAuthAdapter
GeminiAuthAdapter
...
```

### Important

Do not add fake Seedance logic in this phase.

---

# PHASE 20 — Harden account deletion consistency

## Task 20.1 — Avoid profile deletion before irreversible DB failure

### Problem

Current logical order:

```text
delete browser profile
↓
delete DB record
```

If DB deletion fails after profile removal, the account remains in DB without its
session profile.

### Preferred strategy for current MVP

Use:

```text
verify no active lease
verify no active browser
↓
delete DB account
↓
delete browser profile best-effort
```

If profile cleanup fails after DB removal, an orphan directory is recoverable by
garbage collection.

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/application/service.py
vidpool-backend/tests/accounts/test_account_service.py
```

### Target

```python
self._accounts.delete(account_id)

try:
    self._browser.delete_profile(
        account.profile_key
    )
except Exception:
    logger.exception(
        "Account deleted but browser profile cleanup failed"
    )
```

### Tests

Add:

```python
def test_delete_account_keeps_record_when_repository_delete_fails():
    ...
```

and:

```python
def test_delete_account_does_not_restore_record_when_profile_cleanup_fails():
    ...
```

The second behavior means:

```text
DB deletion succeeds
profile cleanup fails
account remains deleted
cleanup is logged/recoverable
```

### Optional follow-up

Later add startup garbage collection for profile directories whose account row
no longer exists. Do not make it part of the critical path unless needed.

---

# PHASE 21 — SQLAlchemy Unit of Work

Do this before Durable Job Worker.

## Task 21.1 — Define AccountUnitOfWorkPort

### Files

Create:

```text
vidpool-backend/app/modules/accounts/application/uow.py
```

### Contract

```python
from typing import Protocol, Self

class AccountUnitOfWorkPort(Protocol):
    accounts: AccountRepositoryPort

    def __enter__(self) -> Self: ...

    def __exit__(
        self,
        exc_type,
        exc,
        traceback,
    ) -> None: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...
```

### Goal

Repositories should stop owning transaction boundaries.

Application operation owns:

```text
begin
↓
repository operations
↓
commit
```

---

## Task 21.2 — Implement SQLAlchemyAccountUnitOfWork

### Files

Create:

```text
vidpool-backend/app/modules/accounts/infrastructure/persistence/uow.py
```

### Structure

```python
class SQLAlchemyAccountUnitOfWork(
    AccountUnitOfWorkPort
):
    def __init__(
        self,
        session_factory,
    ) -> None:
        self._session_factory = session_factory

    def __enter__(self):
        self.session = self._session_factory()
        self.accounts = SQLAlchemyAccountRepository(
            self.session
        )
        return self

    def __exit__(
        self,
        exc_type,
        exc,
        traceback,
    ):
        if exc_type is not None:
            self.rollback()

        self.session.close()

    def commit(self) -> None:
        self.session.commit()

    def rollback(self) -> None:
        self.session.rollback()
```

---

## Task 21.3 — Remove internal commit from repository methods

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/infrastructure/persistence/repository.py
vidpool-backend/tests/accounts/test_account_repository.py
```

Repository should:

```text
add
flush if required
query
update
delete
```

but not own application-level commits.

For concurrency-sensitive lease acquisition, preserve atomicity explicitly.

If SQLite requires a dedicated immediate transaction for lease acquisition, keep
that behavior encapsulated and document it.

Do not accidentally weaken the existing guarantee:

```text
at most one active lease per account
```

---

## Task 21.4 — Move AccountService to UoW

This is the larger migration.

### Files

Modify:

```text
vidpool-backend/app/modules/accounts/application/service.py
vidpool-backend/app/core/container.py
tests/accounts/*
```

Constructor becomes:

```python
class AccountService:
    def __init__(
        self,
        uow_factory: Callable[
            [],
            AccountUnitOfWorkPort,
        ],
        browser: BrowserSessionPort,
        providers: ProviderRegistryPort,
    ):
        ...
```

Example:

```python
with self._uow_factory() as uow:
    account = uow.accounts.get(account_id)

    ...

    uow.accounts.save(account)
    uow.commit()
```

### Why

This creates a clear future boundary for:

```text
Account
Lease
Job
Provider execution
```

without singleton long-lived SQLAlchemy sessions.

---

# PHASE 22 — Regression tests for lifecycle failures

## Task 22.1 — Browser launch fails

Scenario:

```text
start_login
↓
browser launch exception
```

Expected:

```text
no account row
no live browser
no leftover profile
```

---

## Task 22.2 — Repository add fails after browser opens

Expected:

```text
browser closes
profile removed
no account row
original repository exception propagated
```

---

## Task 22.3 — Invalid active login

Expected:

```text
account = AUTH_REQUIRED
browser closes
persistent profile remains
```

---

## Task 22.4 — User closes Edge before pressing complete

Expected:

```text
complete login
↓
BrowserSessionNotOpen
↓
HTTP 409
```

No 500.

---

## Task 22.5 — Relogin after invalid session

Expected:

```text
same account ID
same profile
new interactive browser context
```

---

## Task 22.6 — Two accounts are isolated

Open:

```text
account A -> profile A
account B -> profile B
```

Cancel/complete A.

Expected:

```text
B remains open and untouched
```

---

## Task 22.7 — Lease still blocks destructive operations

Verify:

```text
active lease
↓
disable/delete/relogin policy
```

matches the documented Account Pool rules.

At minimum:

```text
delete with active lease -> conflict
relogin with active lease -> conflict
```

---

# PHASE 23 — Architecture tests

## Task 23.1 — Prevent Playwright imports outside infrastructure

### File

Modify architecture test suite, e.g.:

```text
vidpool-backend/tests/architecture/test_import_boundaries.py
```

Add rule:

```text
app/modules/accounts/application
    must not import
playwright

app/modules/accounts/domain
    must not import
playwright
```

---

## Task 23.2 — Prevent concrete BrowserRuntime dependency in application

Application may depend on:

```text
BrowserSessionPort
ProviderAuthPort
```

but not:

```text
BrowserRuntime
PlaywrightBrowserSessionManager
```

Add explicit forbidden import test.

---

## Task 23.3 — Provider adapters remain infrastructure

Ensure:

```text
application
    !-> infrastructure/providers
```

Provider registry and concrete adapters are wired only in composition root.

---

# PHASE 24 — Documentation cleanup

## Task 24.1 — Update CURRENT_STATUS

### File

```text
docs/CURRENT_STATUS.md
```

After implementation, mark:

```text
- dedicated single-owner BrowserRuntime
- backend-owned account/profile browser session mapping
- browser session ID removed from public API
- persistent session validation through BrowserRuntime
- account login failure compensation
- explicit container shutdown lifecycle
- SQLAlchemy UoW
```

Only mark items that are actually complete and tested.

---

## Task 24.2 — Update browser-session design doc

### File

```text
docs/design/2026-09-17-account-pool-browser-session-design.md
```

Replace stale contract sections.

Old conceptual shape:

```text
BrowserSessionId
BrowserSessionHandle
get_profile(...)
```

Target conceptual shape:

```text
profile_key
BrowserSessionPort
BrowserRuntime infrastructure
ProviderAuthPort(profile_key)
```

Update login sequence to:

```text
POST login/start
↓
create account identity/profile key
↓
open profile in BrowserRuntime
↓
persist account
↓
return account ID
↓
user logs in
↓
POST login/complete
↓
provider validates profile
↓
resolve identity
↓
save ACTIVE
↓
close interactive context
```

---

# PHASE 25 — CI hardening

## Task 25.1 — Keep CI green before provider work

Required CI jobs:

```text
frontend
backend
desktop
```

Backend must run:

```bash
pytest -q
alembic upgrade head
alembic current
```

Frontend:

```bash
pnpm check
```

Desktop:

```bash
python scripts/build-sidecar.py
cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

---

## Task 25.2 — Add branch protection if possible

Recommended GitHub rule:

```text
main
  require status checks:
    frontend
    backend
    desktop
```

Do not require this for local development if it blocks iteration, but main should
not accept known-red commits once the foundation is stable.

---

# PHASE 26 — Final verification gate

Do not start Seedance work until all checks below pass.

## Backend

```bash
cd vidpool-backend
pytest -q
alembic upgrade head
alembic current
```

Expected:

```text
PASS
```

## Frontend

```bash
cd vidpool-frontend
pnpm check
```

Expected:

```text
PASS
```

## Desktop

```bash
python scripts/build-sidecar.py

cargo test \
  --locked \
  --manifest-path vidpool-frontend/src-tauri/Cargo.toml

cargo check \
  --locked \
  --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

Expected:

```text
PASS
```

## Search obsolete concepts

Run from repo root:

```bash
rg "BrowserSessionHandle" .
rg "browserSessionId" .
rg "browser_session_id" .
rg "PlaywrightBrowserSessionManager" .
```

Expected:

```text
No production references.
```

Design/history docs may mention old concepts only when explicitly describing
migration history.

## Architecture gate

Confirm:

```text
[ ] domain does not import infrastructure
[ ] application does not import Playwright
[ ] application does not import concrete provider adapters
[ ] React does not know profile path
[ ] React does not know browser session ID
[ ] only BrowserRuntime owns Playwright objects
[ ] only BrowserRuntime thread manipulates contexts/pages
[ ] one profile cannot be opened twice
[ ] browser close clears live-session registry
[ ] failed login start does not create orphan account
[ ] DB failure after browser open triggers cleanup
[ ] persisted profile survives backend restart
[ ] lease concurrency test still passes
[ ] disabled-account invariant still passes
[ ] all CI jobs are green
```

---

# 27. Recommended commit sequence

Keep commits small and reviewable:

```text
1. fix: restore backend test collection

2. docs: define single-owner Playwright runtime

3. refactor: simplify browser session contracts

4. feat: add single-owner browser runtime

5. feat: enforce one live browser per profile

6. fix: clean stale browser sessions after context close

7. feat: expose infrastructure browser operation boundary

8. refactor: replace browser session manager with browser runtime

9. fix: compensate failed account login start

10. refactor: complete account login by profile ownership

11. refactor: cancel login using account profile ownership

12. fix: harden account relogin lifecycle

13. refactor: remove browser session IDs from account API

14. refactor: simplify account login frontend state

15. test: add browser runtime concurrency coverage

16. fix: make browser runtime shutdown deterministic

17. refactor: centralize backend resource lifecycle

18. feat: support persisted browser profile validation

19. refactor: harden account deletion consistency

20. refactor: introduce account unit of work

21. test: enforce account architecture boundaries

22. docs: update account pool implementation status
```

---

# 28. Implementation order summary

Use this exact order:

```text
CI fix
  ↓
ADR
  ↓
Application contract cleanup
  ↓
BrowserRuntime
  ↓
Single profile ownership
  ↓
Stale session handling
  ↓
Provider infrastructure browser access
  ↓
Migrate old Playwright manager
  ↓
Login compensation
  ↓
Complete/cancel/relogin cleanup
  ↓
Backend API cleanup
  ↓
Frontend cleanup
  ↓
Concurrency tests
  ↓
Deterministic shutdown
  ↓
Container lifecycle
  ↓
Persisted session validation
  ↓
Delete consistency
  ↓
SQLAlchemy UoW
  ↓
Architecture tests
  ↓
Docs
  ↓
Full CI
  ↓
Seedance adapter
```

---

# 29. Definition of Done

Account Pool foundation is considered complete only when:

1. `main` backend tests are green.
2. BrowserRuntime owns Playwright on one dedicated thread.
3. No browser session ID crosses the FastAPI/React boundary.
4. `account_id -> profile_key` is the only browser ownership mapping needed by the application.
5. Two concurrent requests cannot open the same profile twice.
6. Provider adapters can inspect active/persisted browser state without leaking Playwright into application code.
7. Browser launch/DB failure paths clean up correctly.
8. Browser window manually closed by the user does not leave stale runtime state.
9. App shutdown closes contexts, Playwright, DB engine, and runtime thread deterministically.
10. SQLAlchemy work has an explicit transaction/session lifecycle.
11. Persistent login survives application restart.
12. Existing LRU lease concurrency guarantees remain intact.
13. Existing account state-machine tests remain green.
14. Frontend, backend, and desktop CI are all green.
15. Only after all of the above should the first production provider adapter be implemented.

---

# 30. Next phase after this plan

Once this plan is complete, create a separate plan:

```text
docs/superpowers/plans/2026-09-17-seedance-provider-adapter.md
```

That next plan should cover only:

```text
SeedanceAuthAdapter
Seedance login URL
Seedance authenticated-session detection
Seedance identity resolution
Seedance execution contract
account lease integration
rate-limit/quota classification
auth failure classification
provider-specific integration tests
```

Do not mix Seedance-specific selectors, cookies, or page structure into AccountService
or BrowserRuntime.
