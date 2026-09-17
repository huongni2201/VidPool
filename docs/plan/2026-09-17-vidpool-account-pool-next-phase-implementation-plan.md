# VidPool Account Pool — Next Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Baseline commit:** `f94af9193fc235f71fc026f056369edb07c50aa3` (`feat: persist provider accounts and leases`)

**Goal:** Harden the current Account Pool foundation, then complete persistent browser sessions, account login lifecycle, protected management API, frontend account UI, session persistence verification, security regression tests, and final CI gates before starting any real provider adapter.

**Architecture:** Keep VidPool desktop-first, local-first, single-user. Account Pool remains a backend bounded module using Clean Architecture/Hexagonal boundaries: domain and application own account state and orchestration; SQLAlchemy, Playwright, browser profiles, provider-specific auth detection, FastAPI, and React remain outer-layer adapters. Browser state is persisted in isolated browser profiles; SQLite stores only account/lease metadata.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2, Alembic, SQLite, Playwright Python, pytest, React 19, TypeScript, Zod, TanStack Query, Vitest, Tauri v2, Rust, PyInstaller.

**Existing design/specs:**
- `docs/design/2026-09-17-account-pool-browser-session-design.md`
- `docs/superpowers/specs/2026-09-17-account-pool-browser-session-design.md`
- `docs/plan/2026-09-17-account-pool-browser-session-implementation-plan.md`
- `docs/adr/0017-account-pool-browser-sessions.md`

## Current implementation reality

Already implemented at the baseline commit:

- Account Pool domain:
  - `AccountId`
  - `AccountStatus`
  - `ProviderAccount`
  - `AccountLease`
- Application ports:
  - `AccountRepositoryPort`
  - `BrowserSessionPort`
  - `ProviderAuthPort`
  - `ProviderRegistryPort`
- SQLite persistence:
  - `ProviderAccountModel`
  - `AccountLeaseModel`
  - mapper
  - `SQLAlchemyAccountRepository`
  - Alembic revision `134e65479fc3`
- Playwright dependency and PyInstaller packaging smoke test
- Desktop sidecar lifecycle
- Runtime session token injection
- `/api/session/probe`

Not implemented yet:

- Browser profile path resolver
- Playwright persistent browser session manager
- Provider registry implementation
- `AccountService`
- Protected Account API
- Account frontend feature
- Real provider auth adapters
- Persistent-session restart smoke test
- Account Pool final security/CI gate

## Global constraints

- Read and follow `AGENTS.md` before modifying code.
- Run all behavior changes RED → GREEN → REFACTOR.
- Keep FastAPI routes transport-only.
- Domain and application must not import FastAPI, SQLAlchemy, Playwright, Tauri, provider SDKs, or OS APIs.
- React must never call provider websites directly.
- React must never receive cookies, tokens, `profile_key`, absolute browser-profile paths, provider secrets, or lease owner internals.
- Browser profiles are isolated per VidPool account.
- Never reuse the user's normal Edge/Chrome profile.
- Browser login is user-driven; do not store provider passwords.
- `BUSY` remains derived from active lease state; never persist it as an account status.
- A provider quota/rate-limit result must not trigger automatic reacquisition of another account for the same operation.
- SQLite stores metadata/leases only; browser session data stays inside the browser profile directory.
- Do not add Redis, Celery, PostgreSQL, message brokers, Kubernetes, or microservices.
- Do not start Seedance/Gemini/etc. provider integration until the generic Account Pool final gate passes.
- Every task ends with focused tests and a logical commit.
- Update `docs/CURRENT_STATUS.md` when implementation reality materially changes.

---

# Phase A — Foundation Hardening

The current code is structurally sound enough to continue, but four low-level issues should be fixed before browser/session work is layered on top:

1. desktop CI ordering/lock-file determinism;
2. protected API fail-closed behavior and frontend session probe;
3. SQLite foreign-key/locking behavior;
4. lease concurrency and domain-state invariants.

---

## Task A1: Make the desktop build gate deterministic

**Files:**
- Create/track: `vidpool-frontend/src-tauri/Cargo.lock`
- Modify: `.github/workflows/ci.yml`
- Verify: `vidpool-frontend/src-tauri/Cargo.toml`

**Interfaces:**
- Produces a deterministic Rust/Tauri dependency graph.
- Produces a CI order where the sidecar exists before any Tauri step that may require it.

### Steps

- [x] **Step 1: Generate the Rust lock file**

Run:

```powershell
cd vidpool-frontend/src-tauri
cargo generate-lockfile
```

Expected:

```text
vidpool-frontend/src-tauri/Cargo.lock
```

exists.

- [x] **Step 2: Verify Cargo.lock is not ignored**

Run:

```powershell
git check-ignore Cargo.lock
```

Expected: no output.

If ignored by a nested `.gitignore`, remove only the rule that ignores this application lock file.

- [x] **Step 3: Update desktop CI ordering**

Change the desktop job from:

```text
cargo check
build sidecar
verify sidecar
```

to:

```text
install backend
build sidecar
verify sidecar
cargo test --locked
cargo check --locked
```

Target fragment:

```yaml
desktop:
  runs-on: windows-latest
  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
    - uses: actions/setup-python@v5
      with:
        python-version: "3.12"
        cache: pip

    - run: python -m pip install -e "vidpool-backend[dev]"

    - name: Build sidecar binary
      run: python scripts/build-sidecar.py

    - name: Verify sidecar binary exists
      shell: pwsh
      run: |
        $bin = "vidpool-frontend/src-tauri/binaries/vidpool-backend-x86_64-pc-windows-msvc.exe"
        if (-not (Test-Path $bin)) {
          throw "Expected sidecar binary not found at $bin"
        }
        if ((Get-Item $bin).Length -le 0) {
          throw "Sidecar binary is empty"
        }

    - name: Run Rust tests
      run: cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml

    - name: Verify Rust compiles
      run: cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

- [x] **Step 4: Verify locally**

Run:

```powershell
python scripts/build-sidecar.py
cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

Expected: all PASS.

- [x] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml vidpool-frontend/src-tauri/Cargo.lock
git commit -m "ci: make desktop build gate deterministic"
```

**Acceptance criteria:**
- `Cargo.lock` is tracked.
- CI uses `--locked`.
- sidecar is built before final Tauri verification.
- Rust tests execute in CI.

---

## Task A2: Make protected API authentication fail closed

**Files:**
- Modify: `vidpool-backend/app/core/security.py`
- Modify: `vidpool-backend/app/core/config.py`
- Modify: `vidpool-backend/app/bootstrap.py`
- Modify: `vidpool-backend/tests/test_security.py`
- Modify: `vidpool-backend/tests/test_bootstrap.py`

**Interfaces:**
- Protected routes require a configured session token.
- Development without a token may still use public `/api/health`, but protected routes must not silently become public.

### Steps

- [x] **Step 1: Write the failing regression test**

Add:

```python
def test_protected_route_without_configured_session_token_returns_503() -> None:
    client = _build_test_client(session_token=None)

    response = client.get("/api/protected")

    assert response.status_code == 503
    assert response.json() == {"detail": "App session is not configured"}
```

- [x] **Step 2: Verify RED**

Run:

```powershell
cd vidpool-backend
pytest tests/test_security.py::test_protected_route_without_configured_session_token_returns_503 -q
```

Expected: FAIL because current code returns success.

- [x] **Step 3: Change `require_session()` to fail closed**

Use:

```python
from fastapi import HTTPException, Request, status

def require_session(request: Request) -> None:
    expected = request.app.state.config.session_token

    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="App session is not configured",
        )

    authorization = request.headers.get("Authorization", "")
    prefix = "Bearer "

    if not authorization.startswith(prefix):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid app session",
        )

    supplied = authorization[len(prefix):]

    if not secrets.compare_digest(supplied, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid app session",
        )
```

- [x] **Step 4: Keep `/api/health` public**

Existing health test must continue to PASS with `session_token=None`.

- [x] **Step 5: Add bootstrap/config test**

Verify `BootstrapArgs.session_token` may still be `None`, but this no longer makes protected routes public.

- [x] **Step 6: Run focused tests**

```powershell
pytest tests/test_security.py tests/test_bootstrap.py -q
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add vidpool-backend/app/core/security.py vidpool-backend/app/core/config.py vidpool-backend/app/bootstrap.py vidpool-backend/tests/test_security.py vidpool-backend/tests/test_bootstrap.py
git commit -m "fix: fail closed when app session token is missing"
```

**Acceptance criteria:**
- no protected endpoint becomes public because `session_token=None`;
- `/api/health` remains public;
- no token value appears in error messages or logs.

---

## Task A3: Verify the frontend runtime token before rendering the app

**Files:**
- Modify: `vidpool-frontend/src/app/bootstrap.tsx`
- Modify: `vidpool-frontend/src/app/bootstrap.test.tsx`
- Reuse: `vidpool-frontend/src/lib/api-client.ts`

**Interfaces:**
- `Bootstrap` only enters `ready` after `/api/session/probe` succeeds.
- Invalid/missing runtime session tokens produce the existing backend-unavailable state.

### Steps

- [x] **Step 1: Write RED success test**

Mock runtime config and client so that:

```text
load runtime config
-> call GET /api/session/probe
-> only then render children
```

- [x] **Step 2: Write RED invalid-token test**

Expected:

```text
probe 401
-> Bootstrap status error
-> "Backend unavailable"
-> children are not rendered
```

- [x] **Step 3: Add a small probe function**

If `ApiClient` already exposes a generic `get`, use it directly.

Otherwise add only the minimum helper:

```ts
async function probeSession(client: ApiClient): Promise<void> {
  await client.get("/api/session/probe")
}
```

Do not create a second HTTP client.

- [x] **Step 4: Change bootstrap flow**

Target flow:

```ts
loadRuntimeConfig()
  .then(async (config) => {
    const client = createApiClient(config)
    await client.get("/api/session/probe")
    return { config, client }
  })
  .then(({ config, client }) => {
    if (active) {
      setState({ status: "ready", config, client })
    }
  })
  .catch(...)
```

- [x] **Step 5: Run focused tests**

```powershell
cd vidpool-frontend
pnpm vitest run src/app/bootstrap.test.tsx
```

Expected: PASS.

- [x] **Step 6: Run frontend gate**

```powershell
pnpm check
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add vidpool-frontend/src/app/bootstrap.tsx vidpool-frontend/src/app/bootstrap.test.tsx
git commit -m "fix: verify backend app session during frontend bootstrap"
```

**Acceptance criteria:**
- frontend does not treat runtime config alone as proof that backend auth works;
- only the existing runtime-scoped `ApiClient` is used;
- no session token is rendered or logged.

---

## Task A4: Harden SQLite runtime behavior

**Files:**
- Modify: `vidpool-backend/app/infrastructure/persistence/database.py`
- Modify: `vidpool-backend/tests/test_database.py`
- Add focused persistence test if needed:
  - `vidpool-backend/tests/test_sqlite_pragmas.py`

**Interfaces:**
- Every SQLAlchemy SQLite connection enables:
  - foreign keys;
  - WAL mode for file-backed databases;
  - busy timeout.

### Steps

- [x] **Step 1: Write RED foreign-key test**

Create a temporary file-backed SQLite DB and verify:

```sql
PRAGMA foreign_keys
```

returns `1`.

- [x] **Step 2: Write RED busy-timeout test**

Verify:

```sql
PRAGMA busy_timeout
```

is at least `5000`.

- [x] **Step 3: Implement SQLAlchemy connect listener**

Use:

```python
from sqlalchemy import Engine, create_engine, event

def _configure_sqlite_connection(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA journal_mode=WAL")
    finally:
        cursor.close()
```

Register on the specific engine, not globally:

```python
engine = create_engine(...)
event.listen(engine, "connect", _configure_sqlite_connection)
return engine
```

If in-memory SQLite rejects or does not retain WAL, make the test assert WAL only for file-backed DBs.

- [x] **Step 4: Add cascade-delete regression test**

Create:

```text
ProviderAccountModel
AccountLeaseModel referencing it
delete account
verify lease row is gone
```

Do not depend only on ORM cascade; verify SQLite FK behavior.

- [x] **Step 5: Run focused tests**

```powershell
pytest tests/test_database.py tests/test_sqlite_pragmas.py -q
```

Use the actual filenames created.

- [x] **Step 6: Run account repository tests**

```powershell
pytest tests/accounts/test_account_repository.py -q
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add vidpool-backend/app/infrastructure/persistence/database.py vidpool-backend/tests
git commit -m "fix: harden sqlite connection settings"
```

**Acceptance criteria:**
- foreign keys are enforced;
- file-backed SQLite uses WAL;
- lock wait timeout is configured;
- current migrations and repository tests still pass.

---

## Task A5: Prove lease acquisition is safe across independent DB sessions

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/infrastructure/persistence/repository.py`
- Modify: `vidpool-backend/tests/accounts/test_account_repository.py`

**Interfaces:**
- `acquire_lru(...)` remains the atomic persistence boundary.
- Only expected unique-lease contention is retried.
- Unexpected SQLAlchemy/database errors propagate.

### Steps

- [x] **Step 1: Replace broad exception handling test-first**

Write a test that causes a non-unique persistence error and verifies the repository does not silently swallow it.

Expected before fix: current broad `except Exception` may hide it.

- [x] **Step 2: Catch only expected SQLAlchemy contention**

Import:

```python
from sqlalchemy.exc import IntegrityError
```

Change:

```python
except Exception:
```

to:

```python
except IntegrityError:
    self._session.rollback()
    continue
```

Do not catch `OperationalError`, programmer errors, or arbitrary exceptions here.

- [x] **Step 3: Add a real two-session concurrency fixture**

Use a temporary file-backed SQLite database:

```python
engine = create_engine_for_path(tmp_path / "accounts.db")
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
```

Create:

```text
session_a / repo_a
session_b / repo_b
```

Do not use the same SQLAlchemy `Session`.

- [x] **Step 4: Add a concurrent acquisition test**

Seed one ACTIVE account.

Synchronize two threads with `threading.Barrier`.

Both call:

```python
acquire_lru(
    provider_key="test-provider",
    owner_id=...,
    now=NOW,
    expires_at=NOW + timedelta(minutes=5),
)
```

Expected:

```text
exactly one result is not None
exactly one unexpired lease row exists
```

- [x] **Step 5: Run the test repeatedly**

Run:

```powershell
pytest tests/accounts/test_account_repository.py::test_two_independent_sessions_cannot_lease_same_account -q
```

Then:

```powershell
1..20 | % { pytest tests/accounts/test_account_repository.py::test_two_independent_sessions_cannot_lease_same_account -q }
```

Expected: 20/20 PASS.

- [x] **Step 6: Run full repository tests**

```powershell
pytest tests/accounts/test_account_repository.py -q
```

- [x] **Step 7: Commit**

```bash
git add vidpool-backend/app/modules/accounts/infrastructure/persistence/repository.py vidpool-backend/tests/accounts/test_account_repository.py
git commit -m "fix: make account lease contention explicit"
```

**Acceptance criteria:**
- two independent sessions cannot successfully lease the same account;
- unexpected errors are not converted into "no account available";
- stale leases remain recoverable.

---

## Task A6: Protect disabled-account domain invariants

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/domain/account.py`
- Modify: `vidpool-backend/app/modules/accounts/domain/errors.py`
- Modify: `vidpool-backend/tests/accounts/test_account_domain.py`

**Interfaces:**
- `DISABLED` means a user decision.
- Validation/auth helper methods must not silently override it.

### Steps

- [x] **Step 1: Write RED regression test**

```python
def test_mark_authenticated_does_not_reactivate_disabled_account() -> None:
    account = active_account()
    account.disable(now=NOW)

    account.mark_authenticated(
        display_name="User",
        external_identity="user-1",
        now=LATER,
    )

    assert account.status is AccountStatus.DISABLED
    assert account.last_validated_at == LATER
```

- [x] **Step 2: Update `mark_authenticated()`**

Identity and validation timestamp may update, but status changes to ACTIVE only when current status is not `DISABLED`.

Example:

```python
if self.status is not AccountStatus.DISABLED:
    self.status = AccountStatus.ACTIVE
```

- [x] **Step 3: Add equivalent validation-domain test if `clear_elapsed_cooldown()` or `record_success()` could revive DISABLED**

Required invariant:

```text
DISABLED can only leave DISABLED through explicit enable()
```

- [x] **Step 4: Run domain tests**

```powershell
pytest tests/accounts/test_account_domain.py -q
```

- [x] **Step 5: Commit**

```bash
git add vidpool-backend/app/modules/accounts/domain vidpool-backend/tests/accounts/test_account_domain.py
git commit -m "fix: preserve explicit disabled account state"
```

**Acceptance criteria:**
- only `enable()` leaves `DISABLED`;
- passive validation/success reporting cannot override the user's disable action.

---

## Task A7: Align CURRENT_STATUS with implementation reality

**Files:**
- Modify: `docs/CURRENT_STATUS.md`

### Steps

- [x] Replace the single "Account Pool / Browser Session subsystem" not-implemented entry with partial implementation detail.

Suggested wording:

```markdown
## Implemented

- Account Pool domain model
- Account Pool application ports
- Account Pool SQLite account/lease persistence
- Account Pool Alembic schema
- LRU lease repository primitive
- Playwright runtime packaged with backend sidecar

## Not Implemented Yet

- Account Pool application service
- isolated browser-profile resolver
- persistent Playwright browser-session manager
- provider auth registry implementation
- Account Pool management API
- Account Pool frontend UI
- production provider auth adapters
- persistent browser-session restart verification
```

- [x] Commit:

```bash
git add docs/CURRENT_STATUS.md
git commit -m "docs: align account pool implementation status"
```

**Acceptance criteria:**
- docs describe actual code, not only target architecture.

---

# Phase B — Persistent Browser Foundation

---

## Task B1: Implement shared data-dir resolution and isolated browser profile paths

**Files:**
- Modify: `vidpool-backend/app/infrastructure/persistence/paths.py`
- Create: `vidpool-backend/app/modules/accounts/infrastructure/browser/__init__.py`
- Create: `vidpool-backend/app/modules/accounts/infrastructure/browser/profile_paths.py`
- Create: `vidpool-backend/tests/accounts/test_browser_profile_paths.py`
- Modify if required: `vidpool-backend/tests/test_database.py`

**Interfaces:**

```python
def get_data_dir() -> Path: ...

class BrowserProfilePathResolver:
    def __init__(self, data_dir: Path | None = None) -> None: ...
    def resolve(self, profile_key: str) -> Path: ...
    def delete(self, profile_key: str) -> None: ...
```

### Steps

- [x] **Step 1: Refactor `get_database_path()` around `get_data_dir()`**

Target:

```python
def get_data_dir() -> Path:
    configured = os.getenv("VIDPOOL_DATA_DIR")
    if configured:
        path = Path(configured).expanduser()
    else:
        path = default_vidpool_data_dir()

    path.mkdir(parents=True, exist_ok=True)
    return path

def get_database_path() -> Path:
    return get_data_dir() / "vidpool.db"
```

Preserve current OS behavior exactly.

- [x] **Step 2: Write traversal rejection tests**

Reject:

```text
../x
provider/../../x
C:/temp/x
C:\temp\x
/provider/account
provider\account
```

- [x] **Step 3: Define accepted profile-key format**

Application-generated key:

```text
browser-profile/<provider-key>/<account-uuid>
```

Validate each dynamic component with:

```text
[a-z0-9][a-z0-9._-]*
```

Do not resolve arbitrary user-provided filesystem paths.

- [x] **Step 4: Implement resolver**

Example:

```python
PROFILE_PREFIX = "browser-profile"

class BrowserProfilePathResolver:
    def resolve(self, profile_key: str) -> Path:
        parts = profile_key.split("/")
        if len(parts) != 3 or parts[0] != PROFILE_PREFIX:
            raise InvalidProfileKey(profile_key)

        provider_key, account_key = parts[1], parts[2]
        validate_component(provider_key)
        validate_component(account_key)

        root = self._data_dir / "browser-profiles"
        result = (root / provider_key / account_key).resolve()
        root_resolved = root.resolve()

        if root_resolved not in result.parents:
            raise InvalidProfileKey(profile_key)

        return result
```

- [x] **Step 5: Implement delete**

Rules:

```text
profile must be inside browser-profiles root
missing path -> no-op
delete recursively only after validation
```

Use `shutil.rmtree`.

- [x] **Step 6: Run tests**

```powershell
pytest tests/accounts/test_browser_profile_paths.py tests/test_database.py -q
```

- [x] **Step 7: Commit**

```bash
git add vidpool-backend/app/infrastructure/persistence/paths.py vidpool-backend/app/modules/accounts/infrastructure/browser vidpool-backend/tests
git commit -m "feat: isolate persistent browser profiles per account"
```

**Acceptance criteria:**
- profile path cannot escape VidPool data directory;
- one account deterministically maps to one persistent directory;
- `VIDPOOL_DATA_DIR` behavior remains stable.

---

## Task B2: Implement Playwright persistent browser session manager

**Files:**
- Create: `vidpool-backend/app/modules/accounts/infrastructure/browser/playwright_session.py`
- Modify: `vidpool-backend/app/modules/accounts/domain/errors.py` only for normalized account/browser errors if architecture rules place them there
- Create: `vidpool-backend/tests/accounts/test_playwright_session_manager.py`

**Interfaces:**

Consumes:

```python
BrowserSessionPort
BrowserProfilePathResolver
BrowserSessionHandle
```

Produces:

```python
class PlaywrightBrowserSessionManager(BrowserSessionPort):
    def open_login(...) -> BrowserSessionHandle: ...
    def close(session_id: str) -> None: ...
    def has_open_session(profile_key: str) -> bool: ...
    def delete_profile(profile_key: str) -> None: ...
    def close_all() -> None: ...
```

### Steps

- [x] **Step 1: Define injected launcher boundary for unit tests**

Do not mock deep Playwright internals from every test.

Create an internal launcher abstraction/function that accepts:

```python
profile_path: Path
channel: str
headless: bool
```

and returns an opaque context object supporting:

```python
new_page()
close()
```

- [x] **Step 2: RED: same profile cannot open twice**

Expected normalized error:

```text
BrowserProfileInUse
```

- [x] **Step 3: RED: Edge fallback to Chrome**

Fake launcher:

```text
msedge -> BrowserLaunchFailed
chrome -> success
```

Expected: session opens through Chrome.

- [x] **Step 4: RED: both channels unavailable**

Expected:

```text
BrowserUnavailable
```

No raw Playwright exception crosses the adapter boundary.

- [x] **Step 5: Implement `open_login()`**

Runtime behavior:

```python
context = chromium.launch_persistent_context(
    user_data_dir=str(profile_path),
    channel=channel,
    headless=False,
)
page = context.pages[0] if context.pages else context.new_page()
page.goto(login_url)
```

Try channels in exact order:

```text
msedge
chrome
```

- [x] **Step 6: Hold live sessions by opaque ID**

Internal structure:

```python
@dataclass
class _LiveSession:
    id: str
    profile_key: str
    context: object
```

Maintain:

```text
session_id -> live session
profile_key -> session_id
```

- [x] **Step 7: Implement `close()` and `close_all()`**

`close()`:
- close context;
- remove both indexes;
- idempotent or normalized unknown-session behavior according to service contract.

`close_all()`:
- attempt to close every context;
- always clear in-memory maps;
- never delete profile directories.

- [x] **Step 8: Implement `delete_profile()`**

Reject if:

```python
has_open_session(profile_key)
```

Otherwise delegate to resolver deletion.

- [x] **Step 9: Run tests**

```powershell
pytest tests/accounts/test_playwright_session_manager.py -q
```

- [x] **Step 10: Commit**

```bash
git add vidpool-backend/app/modules/accounts/infrastructure/browser vidpool-backend/tests/accounts/test_playwright_session_manager.py
git commit -m "feat: manage persistent browser sessions with playwright"
```

**Acceptance criteria:**
- no real browser required in unit tests;
- branded browser priority is Edge then Chrome;
- browser contexts are persistent and account-isolated;
- low-level Playwright exceptions do not escape the adapter.

---

## Task B3: Add a harmless Windows browser smoke harness

**Files:**
- Create: `scripts/smoke-browser-profile.py`

**Purpose:** Prove that the packaged/local Playwright integration can launch a branded browser with a VidPool-managed persistent profile.

### Steps

- [x] Start a tiny local HTTP server from the script.
- [x] Open a temporary VidPool profile in Edge.
- [x] Navigate to the local test page.
- [x] Write localStorage:
  - key: `vidpool-smoke`
  - value: `persisted`
- [x] Close manager.
- [x] Recreate manager using the same data directory.
- [x] Reopen profile.
- [x] Assert localStorage remains `persisted`.
- [x] Delete profile.
- [x] Reopen profile and assert state is absent.

Run:

```powershell
python scripts/smoke-browser-profile.py
```

Expected:

```text
PASS: persistent profile survives manager restart
PASS: profile deletion clears browser state
```

Commit:

```bash
git add scripts/smoke-browser-profile.py
git commit -m "test: add persistent browser profile smoke harness"
```

---

# Phase C — Generic Account Pool Application Layer

---

## Task C1: Implement provider auth registry

**Files:**
- Create: `vidpool-backend/app/modules/accounts/infrastructure/providers/__init__.py`
- Create: `vidpool-backend/app/modules/accounts/infrastructure/providers/registry.py`
- Create: `vidpool-backend/tests/accounts/test_provider_registry.py`

**Interfaces:**

```python
class ProviderRegistry(ProviderRegistryPort):
    def __init__(self, auth_adapters: Iterable[ProviderAuthPort]) -> None: ...
    def list(self) -> list[ProviderDefinition]: ...
    def get_auth(self, provider_key: str) -> ProviderAuthPort | None: ...
```

### Steps

- [x] Write RED empty registry test.
- [x] Write RED registered-provider lookup test.
- [x] Write RED duplicate-key startup rejection test.
- [x] Implement immutable key map.
- [x] Sort `list()` by display name or registration order and freeze this behavior in tests.
- [x] Do not add provider selectors or provider-specific login rules here.
- [x] Run:

```powershell
pytest tests/accounts/test_provider_registry.py -q
```

- [x] Commit:

```bash
git add vidpool-backend/app/modules/accounts/infrastructure/providers vidpool-backend/tests/accounts/test_provider_registry.py
git commit -m "feat: add provider auth registry"
```

---

## Task C2: Implement account commands, views, and AccountService login lifecycle

**Files:**
- Create: `vidpool-backend/app/modules/accounts/application/commands.py`
- Create: `vidpool-backend/app/modules/accounts/application/queries.py`
- Create: `vidpool-backend/app/modules/accounts/application/service.py`
- Modify: `vidpool-backend/tests/accounts/test_account_service.py`
- Reuse: `vidpool-backend/tests/accounts/fakes.py`

**Interfaces:**

Required methods:

```python
class AccountService:
    def list_providers(self) -> list[ProviderDefinition]: ...
    def list_accounts(self, provider_key: str | None = None) -> list[AccountView]: ...
    def get_account(self, account_id: AccountId) -> AccountView: ...

    def start_login(self, provider_key: str) -> StartLoginResult: ...
    def complete_login(
        self,
        account_id: AccountId,
        browser_session_id: str,
    ) -> AccountView: ...
    def cancel_login(
        self,
        account_id: AccountId,
        browser_session_id: str,
    ) -> AccountView: ...
    def start_relogin(self, account_id: AccountId) -> StartLoginResult: ...

    def validate_account(self, account_id: AccountId) -> AccountView: ...
    def enable_account(self, account_id: AccountId) -> AccountView: ...
    def disable_account(self, account_id: AccountId) -> AccountView: ...
    def delete_account(self, account_id: AccountId) -> None: ...
```

Application view:

```python
@dataclass(frozen=True)
class AccountView:
    id: AccountId
    provider_key: str
    display_name: str | None
    external_identity: str | None
    status: AccountStatus
    last_used_at: datetime | None
    last_validated_at: datetime | None
    cooldown_until: datetime | None
```

Do not include `profile_key`.

### `start_login()` behavior

```text
provider must exist
generate account UUID
profile_key = browser-profile/<provider-key>/<uuid>
persist AUTH_REQUIRED account
open browser to adapter.login_url()
return accountId + browserSessionId
```

If browser launch fails after account persistence:
- keep the AUTH_REQUIRED row;
- surface normalized browser error;
- user can retry/relogin.

### `complete_login()` behavior

Order:

```text
load account
verify provider exists
validate profile session
if invalid:
    keep AUTH_REQUIRED
    close browser
    raise SessionInvalid

resolve provider identity
mark account authenticated
save
close browser
return AccountView
```

### `cancel_login()` behavior

```text
close browser
keep AUTH_REQUIRED
keep persistent profile
return AccountView
```

### `start_relogin()` behavior

```text
same account ID
same profile key
reject if active lease
open same persistent profile
```

### `validate_account()` behavior

Valid session:
- update validation timestamp/identity;
- ACTIVE if not user-disabled.

Invalid session:
- AUTH_REQUIRED if not user-disabled;
- DISABLED stays DISABLED.

### Delete behavior

Order:

```text
reject active lease
close profile if open or reject clearly
delete browser profile
delete DB account
```

### Tests required

- [x] unknown provider → `ProviderNotRegistered`
- [x] start login creates AUTH_REQUIRED account
- [x] complete login valid → ACTIVE
- [x] complete login invalid → AUTH_REQUIRED
- [x] cancel preserves profile/account
- [x] relogin reuses profile key
- [x] relogin rejects active lease
- [x] disabled account stays disabled during validation
- [x] delete rejects active lease
- [x] delete removes profile and DB metadata

Run:

```powershell
pytest tests/accounts/test_account_service.py -q
```

Commit:

```bash
git add vidpool-backend/app/modules/accounts/application vidpool-backend/tests/accounts
git commit -m "feat: add account login lifecycle"
```

---

## Task C3: Expose leasing through AccountService

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/application/service.py`
- Modify: `vidpool-backend/app/modules/accounts/application/queries.py`
- Modify: `vidpool-backend/tests/accounts/test_account_service.py`

**Interfaces:**

```python
@dataclass(frozen=True)
class AccountLeaseView:
    lease_id: UUID
    account_id: AccountId
    provider_key: str
    profile_key: str
    owner_id: str
    acquired_at: datetime
    expires_at: datetime

def acquire(
    self,
    provider_key: str,
    owner_id: str,
    ttl: timedelta,
) -> AccountLeaseView: ...

def release(self, lease_id: UUID) -> None: ...
```

`profile_key` is application-internal execution metadata. Do not expose this DTO through React API.

### Required tests

- [x] LRU account is selected.
- [x] active lease excludes account.
- [x] expired lease becomes recoverable.
- [x] no eligible account raises normalized `AccountUnavailable`.
- [x] unknown release lease raises `LeaseNotFound`.
- [x] `ttl <= 0` is rejected.
- [x] acquisition does not validate provider quota or automatically switch on errors.

Run:

```powershell
pytest tests/accounts/test_account_service.py tests/accounts/test_account_repository.py -q
```

Commit:

```bash
git add vidpool-backend/app/modules/accounts/application vidpool-backend/tests/accounts
git commit -m "feat: expose durable account leasing through application service"
```

---

## Task C4: Add account health and cooldown reporting

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/application/service.py`
- Modify: `vidpool-backend/tests/accounts/test_account_service.py`

**Interfaces:**

```python
def report_success(self, account_id: AccountId, now: datetime) -> AccountView: ...
def report_auth_failure(self, account_id: AccountId, now: datetime) -> AccountView: ...
def report_temporary_failure(
    self,
    account_id: AccountId,
    now: datetime,
    cooldown_until: datetime | None = None,
) -> AccountView: ...
def report_rate_limited(
    self,
    account_id: AccountId,
    now: datetime,
    retry_after: datetime | None = None,
) -> AccountView: ...
```

### Policy

Temporary failure:
- increment `consecutive_failures`;
- at threshold 3 enter internal 5-minute cooldown if no explicit cooldown supplied.

Auth failure:
- increment failure information;
- mark AUTH_REQUIRED unless DISABLED.

Rate limit:
- record cooldown/retry-after;
- never call `acquire()` automatically.

Success:
- reset consecutive failures;
- record last success;
- restore ACTIVE only if not disabled and no active cooldown remains.

### Required tests

- [x] success resets failure count
- [x] third temporary failure enters cooldown
- [x] auth failure marks auth required
- [x] disabled state is preserved
- [x] rate limit never calls repository acquisition for another account

Run:

```powershell
pytest tests/accounts/test_account_service.py -q
```

Commit:

```bash
git add vidpool-backend/app/modules/accounts/application/service.py vidpool-backend/tests/accounts/test_account_service.py
git commit -m "feat: track account health and cooldown"
```

---

# Phase D — Backend Runtime Wiring and API

---

## Task D1: Add Account Pool composition root

**Files:**
- Create: `vidpool-backend/app/core/container.py`
- Modify: `vidpool-backend/app/main.py`
- Modify if required: `vidpool-backend/app/core/config.py`
- Create: `vidpool-backend/tests/accounts/test_account_wiring.py`

**Interfaces:**

```python
@dataclass
class AppContainer:
    account_service: AccountService
    browser_session_manager: PlaywrightBrowserSessionManager
```

Factory:

```python
def build_container(config: AppConfig) -> AppContainer: ...
```

### Rules

- concrete infrastructure wiring only in composition root;
- application modules do not instantiate SQLAlchemy/Playwright;
- registry may initially be empty;
- create SQLAlchemy sessions per request/use-case according to the repository pattern selected;
- browser manager is application-scoped so live contexts survive across API calls.

### Lifespan cleanup

On shutdown:

```python
container.browser_session_manager.close_all()
```

Do not delete profile directories.

### Tests

- [x] container resolves AccountService
- [x] fake registry/browser can be injected in test app
- [x] shutdown calls `close_all()`
- [x] existing health/security tests still pass

Run:

```powershell
pytest tests/accounts/test_account_wiring.py -q
pytest -q
```

Commit:

```bash
git add vidpool-backend/app/core/container.py vidpool-backend/app/main.py vidpool-backend/tests/accounts/test_account_wiring.py
git commit -m "feat: wire account pool into backend runtime"
```

---

## Task D2: Add protected account management API

**Files:**
- Create: `vidpool-backend/app/modules/accounts/api/__init__.py`
- Create: `vidpool-backend/app/modules/accounts/api/schemas.py`
- Create: `vidpool-backend/app/modules/accounts/api/router.py`
- Modify: `vidpool-backend/app/main.py`
- Create: `vidpool-backend/tests/accounts/test_account_api.py`

**All account endpoints require:**

```python
dependencies=[Depends(require_session)]
```

or router-level equivalent.

### Response schema

```json
{
  "id": "...",
  "providerKey": "provider-x",
  "displayName": "User One",
  "externalIdentity": "user-1",
  "status": "active",
  "lastUsedAt": null,
  "lastValidatedAt": "...",
  "cooldownUntil": null
}
```

Forbidden fields:

```text
profileKey
profile_key
profilePath
profile_path
cookie
cookies
token
password
authorization
ownerId
leaseOwner
```

### Endpoints

```http
GET    /api/providers
GET    /api/accounts
GET    /api/accounts/{account_id}

POST   /api/providers/{provider_key}/accounts/login/start
POST   /api/accounts/{account_id}/login/complete
POST   /api/accounts/{account_id}/login/cancel
POST   /api/accounts/{account_id}/relogin/start

POST   /api/accounts/{account_id}/validate
POST   /api/accounts/{account_id}/enable
POST   /api/accounts/{account_id}/disable
DELETE /api/accounts/{account_id}
```

### Start-login response

```json
{
  "accountId": "...",
  "browserSessionId": "...",
  "status": "waiting_for_user"
}
```

### Error mapping

```text
ProviderNotRegistered -> 404
AccountNotFound -> 404
AccountInUse -> 409
SessionInvalid -> 409
BrowserProfileInUse -> 409
BrowserUnavailable -> 503
InvalidProfileKey -> 500 normalized internal error
```

Never send raw Playwright/SQLAlchemy stack traces to the client.

### Required tests

- [x] no token → 401
- [x] wrong token → 401
- [x] correct token → success
- [x] provider list
- [x] account list
- [x] start/complete/cancel login
- [x] validate/enable/disable/delete
- [x] response never contains forbidden fields

Run:

```powershell
pytest tests/accounts/test_account_api.py -q
pytest -q
alembic current
```

Commit:

```bash
git add vidpool-backend/app/modules/accounts/api vidpool-backend/app/main.py vidpool-backend/tests/accounts/test_account_api.py
git commit -m "feat: expose protected account management api"
```

---

# Phase E — Frontend Account Management

---

## Task E1: Add typed Account API client

**Files:**
- Create: `vidpool-frontend/src/features/accounts/types.ts`
- Create: `vidpool-frontend/src/features/accounts/accounts-api.ts`
- Create: `vidpool-frontend/src/features/accounts/accounts-api.test.ts`

**Interfaces:**

```ts
export type AccountStatus =
  | "auth_required"
  | "active"
  | "cooldown"
  | "disabled"
```

Strict Zod schemas:

```ts
const accountSummarySchema = z.object({
  id: z.string().uuid(),
  providerKey: z.string(),
  displayName: z.string().nullable(),
  externalIdentity: z.string().nullable(),
  status: z.enum(["auth_required", "active", "cooldown", "disabled"]),
  lastUsedAt: z.string().datetime().nullable(),
  lastValidatedAt: z.string().datetime().nullable(),
  cooldownUntil: z.string().datetime().nullable(),
}).strict()
```

### Functions

```ts
listProviders(client)
listAccounts(client)
getAccount(client, accountId)

startLogin(client, providerKey)
completeLogin(client, accountId, browserSessionId)
cancelLogin(client, accountId, browserSessionId)
startRelogin(client, accountId)

validateAccount(client, accountId)
enableAccount(client, accountId)
disableAccount(client, accountId)
deleteAccount(client, accountId)
```

### Required tests

- [x] strict schema rejects unexpected `profileKey`
- [x] strict schema rejects token/cookie fields
- [x] every function calls the expected protected local API path
- [x] error response is propagated in normalized form

Run:

```powershell
cd vidpool-frontend
pnpm vitest run src/features/accounts/accounts-api.test.ts
```

Commit:

```bash
git add vidpool-frontend/src/features/accounts
git commit -m "feat: add typed account management client"
```

---

## Task E2: Build Account list UI

**Files:**
- Create: `vidpool-frontend/src/features/accounts/accounts-page.tsx`
- Create: `vidpool-frontend/src/features/accounts/account-row.tsx`
- Create: `vidpool-frontend/src/features/accounts/accounts-page.test.tsx`
- Modify: `vidpool-frontend/src/App.tsx`

### UI states

Empty:

```text
Accounts
No accounts yet
+ Add account
```

Account row displays only:

```text
display name
provider
status
external identity if useful
last validation
cooldown-until when relevant
```

Never display:
- profile paths
- browser session internals
- cookies/tokens
- lease owner metadata

### Row actions

```text
AUTH_REQUIRED -> Login again, Delete
ACTIVE        -> Validate, Disable, Delete
COOLDOWN      -> Disable, Delete
DISABLED      -> Enable, Delete
```

Delete requires confirmation:

```text
Deleting this account also deletes its stored browser session.
```

### Tests

- [x] empty state
- [x] active row
- [x] auth-required row
- [x] cooldown row
- [x] disabled row
- [x] delete confirmation

Run:

```powershell
pnpm vitest run src/features/accounts/accounts-page.test.tsx
```

---

## Task E3: Build Add Account login state machine

**Files:**
- Create: `vidpool-frontend/src/features/accounts/add-account-dialog.tsx`
- Modify: `vidpool-frontend/src/features/accounts/accounts-page.tsx`
- Modify: `vidpool-frontend/src/features/accounts/accounts-page.test.tsx`

### State machine

```text
choose_provider
starting
waiting_for_user
validating
completed
error
```

### Interaction

```text
click + Add account
-> choose provider
-> click Login
-> backend opens external browser
-> UI shows "Hoàn tất đăng nhập trong cửa sổ trình duyệt"
-> user clicks "Đã đăng nhập"
-> completeLogin()
-> account becomes ACTIVE
-> invalidate account query
-> close dialog
```

Cancel while waiting:

```text
cancelLogin()
-> preserve partial profile/account
-> close dialog
```

### Tests

- [x] provider list loads
- [x] start login stores browserSessionId only in component state
- [x] complete login sends the correct ephemeral session ID
- [x] success refreshes account list
- [x] cancel calls cancel endpoint
- [x] backend validation error leaves actionable retry state

Run:

```powershell
pnpm vitest run src/features/accounts
pnpm check
```

Commit:

```bash
git add vidpool-frontend/src/features/accounts vidpool-frontend/src/App.tsx
git commit -m "feat: add browser-login account pool ui"
```

---

# Phase F — Persistence, Security, and Extension Contracts

---

## Task F1: Verify browser session persistence across process restart

**Files:**
- Extend: `scripts/smoke-browser-profile.py`
- Create if useful: `vidpool-backend/tests/accounts/test_browser_profile_persistence.py`

### Required flow

```text
manager instance A
-> open profile A
-> write cookie/localStorage
-> close all
-> destroy manager

manager instance B
-> open same profile A
-> state exists

profile B
-> state from A does not exist

delete profile A
-> reopen
-> old state absent
```

Run manually on Windows with installed Edge/Chrome.

Acceptance:
- login/session persistence does not depend on exporting cookies;
- account profiles remain isolated.

Commit:

```bash
git add scripts vidpool-backend/tests/accounts
git commit -m "test: verify persistent isolated browser sessions"
```

---

## Task F2: Define provider auth adapter contract before any real provider

**Files:**
- Create: `vidpool-backend/tests/accounts/test_provider_auth_contract.py`
- Modify: account/provider documentation if necessary

**Contract:**

Any `ProviderAuthPort` implementation must:

```text
have a stable provider_key
return an HTTPS login URL
validate a persistent profile
resolve identity only after a valid session
return invalid for login-required/expired session
never expose raw cookies/tokens
never mutate ProviderAccount directly
never acquire another account
never bypass quota/rate-limit restrictions
```

Run the contract against `FakeProviderAuthAdapter`.

Future real adapter path:

```text
vidpool-backend/app/infrastructure/providers/<provider_key>/auth_adapter.py
```

or the established provider-infrastructure location selected by repository architecture rules.

No change to `AccountService` should be required when adding a real provider.

Commit:

```bash
git add vidpool-backend/tests/accounts/test_provider_auth_contract.py docs
git commit -m "test: define provider auth adapter contract"
```

---

## Task F3: Add account/session security regression tests

**Files:**
- Create: `vidpool-backend/tests/accounts/test_account_security.py`

### Forbidden response/log terms

Scan serialized account responses and captured logs for:

```text
cookie
cookies
password
authorization
profile_path
user_data_dir
storage_state
refresh_token
access_token
SECRET_TEST_VALUE
```

`browserSessionId` is allowed because it is an ephemeral local flow handle.

### Tests

- [x] API never returns `profile_key`
- [x] API never returns absolute profile path
- [x] low-level browser exception containing `SECRET_TEST_VALUE` becomes a normalized public error
- [x] logs do not contain `SECRET_TEST_VALUE`
- [x] SQLAlchemy errors do not serialize DB internals to client
- [x] session token does not appear in logs

Run:

```powershell
pytest tests/accounts/test_account_security.py -q
```

Commit:

```bash
git add vidpool-backend/tests/accounts/test_account_security.py
git commit -m "test: prevent account session data leaks"
```

---

# Phase G — CI and Final Gate

---

## Task G1: Update CI for completed Account Pool foundation

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/CURRENT_STATUS.md`

### Backend CI

Must run:

```text
python -m pip install -e ".[dev]"
pytest -q
alembic upgrade head
alembic current
```

Use a temporary `VIDPOOL_DATA_DIR`.

Do not launch a real browser in CI.

### Desktop CI

Must run:

```text
install backend deps
build Playwright-enabled sidecar
verify binary
cargo test --locked
cargo check --locked
```

Do not download Playwright Chromium in CI; runtime uses installed branded Edge/Chrome.

### CURRENT_STATUS after completion

Move these to implemented only after tests pass:

```text
Account Pool application service
durable LRU account leases
persistent isolated browser profiles
Playwright browser-session manager
provider auth registry
account management API
account management UI
browser-session restart persistence verification
```

Keep:

```text
production provider auth adapters
Seedance integration
Gemini integration
provider execution jobs
```

under not implemented.

Commit:

```bash
git add .github/workflows/ci.yml docs/CURRENT_STATUS.md
git commit -m "ci: verify complete account pool foundation"
```

---

## Task G2: Final verification gate

No feature work in this task.

### Backend

```powershell
cd vidpool-backend
python -m pip install -e ".[dev]"
pytest -q

$env:VIDPOOL_DATA_DIR = "$PWD/.tmp/final-gate"
alembic upgrade head
alembic current
Remove-Item Env:VIDPOOL_DATA_DIR

cd ..
```

Expected:
- all tests PASS;
- Alembic reports head `134e65479fc3` or the latest later revision if new migrations were legitimately added.

### Frontend

```powershell
cd vidpool-frontend
pnpm install --frozen-lockfile
pnpm check
cd ..
```

Expected: PASS.

### Sidecar

```powershell
python scripts/build-sidecar.py
```

Verify:

```text
vidpool-frontend/src-tauri/binaries/vidpool-backend-x86_64-pc-windows-msvc.exe
```

exists and is non-empty.

### Rust/Tauri

```powershell
cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

Expected: PASS.

### Manual Windows browser smoke

```powershell
python scripts/smoke-browser-profile.py
```

Expected:
- Edge or Chrome opens;
- persistent state survives manager restart;
- account profile isolation passes;
- deleting the profile clears prior state.

### Architecture audit

Verify:

```text
Domain -> no FastAPI/SQLAlchemy/Playwright imports
Application -> no concrete infrastructure imports
Infrastructure -> implements ports
React -> local backend only
FastAPI routes -> transport only
no provider-specific selectors inside AccountService
no persisted BUSY state
no sensitive session data in SQLite
no provider secret/session data returned to React
no automatic quota-bypass account rotation
```

### Suggested final commit

Only if documentation/gate metadata changed:

```bash
git add .
git commit -m "chore: complete account pool foundation verification"
```

---

# Definition of Done for this phase

This phase is complete only when all statements below are true:

- [x] VidPool starts its FastAPI sidecar securely with a runtime token.
- [x] Frontend proves the protected session works before rendering the main app.
- [x] SQLite foreign keys are enabled and account lease contention is tested with independent sessions.
- [x] Explicitly disabled accounts cannot be reactivated by passive validation.
- [x] Each account maps to a validated, isolated, persistent browser profile.
- [x] Playwright can use Edge first and Chrome second without exposing Playwright objects to application code.
- [x] Browser contexts close on backend shutdown without deleting persistent profiles.
- [x] `AccountService` owns generic login/relogin/validate/enable/disable/delete orchestration.
- [x] Leasing is durable, LRU-based, and concurrency-safe.
- [x] Rate limits do not trigger automatic rotation to another account.
- [x] Protected FastAPI account endpoints expose no browser/session internals.
- [x] React Account UI can add an account through user-driven browser login.
- [x] Browser session state survives backend/app restart.
- [x] Deleting an account deletes the persistent browser profile.
- [x] Generic provider-auth contract exists before any production provider adapter.
- [x] Security regression tests prove cookies/tokens/profile paths do not leak.
- [x] Backend, frontend, sidecar, Rust/Tauri, migration, and manual browser smoke gates pass.
- [x] `docs/CURRENT_STATUS.md` matches implementation reality.

---

# What comes after this plan

Do **not** jump directly from persistence to a Seedance-specific adapter before this plan passes.

The next architectural sequence should be:

```text
Account Pool foundation complete
        ↓
First production ProviderAuthPort adapter
        ↓
Provider execution port/adapter
        ↓
Durable Job integration
        ↓
Video-generation workflow
        ↓
Asset download/persistence
        ↓
Timeline / editing / render pipeline
```

The first real provider adapter should be a separate implementation plan. It must plug into `ProviderRegistry` without adding provider-specific branches to `AccountService`.
