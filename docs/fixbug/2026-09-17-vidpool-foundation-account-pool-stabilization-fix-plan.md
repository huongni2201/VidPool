# VidPool Foundation + Account Pool Stabilization Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the current VidPool foundation and early Account Pool implementation before continuing browser-session/login work, so desktop CI is green, app-session security is fail-closed, SQLite behavior matches project rules, account leasing is transaction-safe, account state invariants are protected, and the browser/auth boundary is structurally sound.

**Architecture:** Keep the existing desktop-first architecture. Tauri owns local backend lifecycle and runtime session-token generation; React verifies a protected local API before rendering the application; FastAPI exposes one explicit public readiness surface and one protected application API surface. Account Pool remains a backend bounded module with domain/application separated from SQLAlchemy, Playwright, FastAPI, and provider-specific logic.

**Tech Stack:** Tauri v2, Rust, React 19, Vite, TypeScript, Zod, FastAPI, SQLAlchemy 2, SQLite, Alembic, pytest, Playwright Python, PyInstaller, GitHub Actions.

**Reviewed baseline:** `main` at commit `f94af9193fc235f71fc026f056369edb07c50aa3` (`feat: persist provider accounts and leases`) on 2026-09-17.

**Related specs/plans:**
- `AGENTS.md`
- `docs/CURRENT_STATUS.md`
- `docs/rules/05-database-persistence.md`
- `2026-09-17-vidpool-desktop-foundation-fix-plan.md`
- `2026-09-17-account-pool-browser-session-design.md`
- `2026-09-17-account-pool-browser-session-implementation-plan.md`

## Global Constraints

- Do not continue Playwright login lifecycle/provider integration until all P0/P1 tasks in this plan are green.
- `AGENTS.md` has highest priority.
- Architecture priority: `AGENTS.md` > design spec > ADR > implementation plan > current code.
- Domain/application must not import FastAPI, SQLAlchemy, Playwright, Tauri, provider SDKs, or OS APIs.
- `/api/health` remains public and contains no sensitive information.
- All business/application routes are protected by default.
- Protected routes fail closed if the backend has no configured app-session token.
- Session tokens/cookies/passwords/Authorization headers must never be logged.
- SQLite must run with `foreign_keys=ON` and `journal_mode=WAL`.
- Account lease acquisition must remain DB-backed and safe across multiple independent SQLAlchemy sessions.
- `BUSY` remains derived from active lease state; do not add it as a persisted account status.
- A user-disabled account cannot be reactivated by background/session health operations.
- Provider-specific URLs/selectors/session semantics stay outside Account Pool core.
- Do not add Redis, Celery, PostgreSQL, brokers, distributed locks, or microservices.
- Follow RED -> GREEN -> REFACTOR for bug fixes.
- Each task ends with focused verification and one logical commit.

---

# Fix order

```text
P0 Desktop CI
   ↓
Rust lock/reproducibility
   ↓
App-session security foundation
   ↓
SQLite WAL + FK
   ↓
Account repository correctness
   ↓
Lease concurrency proof
   ↓
Account state invariants
   ↓
Browser/Auth contract correction
   ↓
Documentation + final gate
```

Do not reorder these unless a real code dependency requires it.

---

# Task 1: Fix desktop CI ordering

**Priority:** P0

**Problem:** Desktop CI runs `cargo check` before generating the Tauri sidecar. Because `tauri.conf.json` declares an `externalBin`, Tauri validation requires the sidecar file to exist during Cargo build/check.

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Preserve the current red state**

Current GitHub Actions failure is sufficient:

```text
resource path `binaries\vidpool-backend-x86_64-pc-windows-msvc.exe` doesn't exist
```

- [ ] **Step 2: Reorder desktop CI**

Use:

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
      run: cargo test --manifest-path vidpool-frontend/src-tauri/Cargo.toml

    - name: Verify Rust compiles
      run: cargo check --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

- [ ] **Step 3: Run locally**

```powershell
python -m pip install -e "vidpool-backend[dev]"
python scripts/build-sidecar.py
cargo test --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

- [ ] **Step 4: Verify generated `.exe` is untracked**

```powershell
git status --short
```

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: build desktop sidecar before Rust verification"
```

**Acceptance criteria:** desktop CI no longer fails because `externalBin` is missing; sidecar remains ignored; Rust tests run in CI.

---

# Task 2: Commit Cargo.lock and enforce locked Rust builds

**Priority:** P1

**Files:**
- Create: `vidpool-frontend/src-tauri/Cargo.lock`
- Modify: `.github/workflows/ci.yml`

- [ ] Generate lockfile:

```powershell
cargo generate-lockfile --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

- [ ] Confirm it is tracked:

```powershell
git check-ignore -v vidpool-frontend/src-tauri/Cargo.lock
```

Expected: no output.

- [ ] Change CI commands to:

```yaml
- name: Run Rust tests
  run: cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml

- name: Verify Rust compiles
  run: cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

- [ ] Verify:

```powershell
python scripts/build-sidecar.py
cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
git diff --exit-code -- vidpool-frontend/src-tauri/Cargo.lock
```

- [ ] Commit:

```bash
git add vidpool-frontend/src-tauri/Cargo.lock .github/workflows/ci.yml
git commit -m "build: lock desktop Rust dependencies"
```

---

# Task 3: Verify protected app session during React bootstrap

**Priority:** P1

**Problem:** React currently becomes `ready` after loading runtime config without verifying Authorization actually works.

**Files:**
- Modify: `vidpool-frontend/src/lib/api.ts`
- Modify: `vidpool-frontend/src/app/bootstrap.tsx`
- Modify/Create: `vidpool-frontend/src/app/bootstrap.test.tsx`

- [ ] **Step 1: Write RED test** asserting children render only after `GET /api/session/probe` succeeds.

- [ ] **Step 2: Add schema**

```ts
export const sessionProbeSchema = z.object({
  status: z.literal("ok"),
})
```

- [ ] **Step 3: Probe before ready**

```ts
loadRuntimeConfig()
  .then(async (config) => {
    const client = createApiClient(config)
    await client.get("/api/session/probe", sessionProbeSchema)
    return { config, client }
  })
  .then(({ config, client }) => {
    if (active) {
      setState({ status: "ready", config, client })
    }
  })
```

- [ ] **Step 4: Add failure test**: 401/503 probe must render `Backend unavailable` and not render children.

- [ ] **Step 5: Verify**

```powershell
cd vidpool-frontend
pnpm vitest run src/app/bootstrap.test.tsx
pnpm check
```

- [ ] **Step 6: Commit**

```bash
git add vidpool-frontend/src/lib/api.ts vidpool-frontend/src/app/bootstrap.tsx vidpool-frontend/src/app/bootstrap.test.tsx
git commit -m "fix: verify protected backend session before app bootstrap"
```

---

# Task 4: Make protected FastAPI routes fail closed

**Priority:** P1

**Files:**
- Modify: `vidpool-backend/app/core/security.py`
- Modify: `vidpool-backend/tests/test_security.py`

- [ ] Add RED test: protected route with `session_token=None` returns `503`.

- [ ] Change `require_session()`:

```python
if not expected:
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="App session is not configured",
    )
```

Keep `secrets.compare_digest()` for the actual token comparison.

- [ ] Verify:

```powershell
cd vidpool-backend
pytest tests/test_security.py -q
```

- [ ] Commit:

```bash
git add vidpool-backend/app/core/security.py vidpool-backend/tests/test_security.py
git commit -m "fix: fail closed when app session is not configured"
```

---

# Task 5: Create public/protected API composition

**Priority:** P1

**Files:**
- Create: `vidpool-backend/app/api/router.py`
- Modify: `vidpool-backend/app/api/session_probe.py`
- Modify: `vidpool-backend/app/main.py`

Create:

```python
from fastapi import APIRouter, Depends

from app.api.health import router as health_router
from app.api.session_probe import router as session_probe_router
from app.core.security import require_session

public_api_router = APIRouter()
public_api_router.include_router(health_router)

protected_api_router = APIRouter(
    dependencies=[Depends(require_session)],
)
protected_api_router.include_router(session_probe_router)
```

Remove route-local `Depends(require_session)` from session probe and mount only the composed routers in `main.py`.

Verify:

```text
/api/health without token -> 200
/api/session/probe without token -> 401
/api/session/probe wrong token -> 401
/api/session/probe correct token -> 200
```

Run:

```powershell
pytest tests/test_session_probe.py tests/test_security.py -q
pytest -q
```

Commit:

```bash
git add vidpool-backend/app/api/router.py vidpool-backend/app/api/session_probe.py vidpool-backend/app/main.py vidpool-backend/tests
git commit -m "refactor: protect application API at router boundary"
```

---

# Task 6: Enable SQLite foreign keys and WAL mode

**Priority:** P1

**Problem:** Current engine violates project rule requiring `foreign_keys=ON` and WAL.

**Files:**
- Modify: `vidpool-backend/app/infrastructure/persistence/database.py`
- Modify/Create: persistence tests

- [ ] Add RED test for:

```sql
PRAGMA foreign_keys
```

Expected `1`.

- [ ] Add RED test for file-backed DB:

```sql
PRAGMA journal_mode
```

Expected `wal`.

- [ ] Configure connections, e.g.:

```python
from sqlalchemy import create_engine, event


def _configure_sqlite_connection(dbapi_connection, connection_record) -> None:
    del connection_record
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
    finally:
        cursor.close()
```

Register on engine. If WAL cannot safely be set on every pooled connect, initialize WAL once and keep `foreign_keys=ON` on every connection.

- [ ] Add behavior test that an invalid account lease foreign key is actually rejected.

- [ ] Verify:

```powershell
pytest -q
alembic current
```

- [ ] Commit:

```bash
git add vidpool-backend/app/infrastructure/persistence/database.py vidpool-backend/tests
git commit -m "fix: enforce SQLite WAL mode and foreign keys"
```

---

# Task 7: Stop swallowing unexpected DB errors in acquire_lru

**Priority:** P1

**Problem:** `except Exception` currently converts real database failures into apparent pool exhaustion.

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/infrastructure/persistence/repository.py`
- Modify: `vidpool-backend/tests/accounts/test_account_repository.py`

- [ ] Add RED test where commit raises a non-integrity SQLAlchemy exception; assert it propagates.

- [ ] Import:

```python
from sqlalchemy.exc import IntegrityError
```

Change:

```python
except Exception:
    self._session.rollback()
    continue
```

to:

```python
except IntegrityError:
    self._session.rollback()
    continue
```

- [ ] Verify:

```powershell
pytest tests/accounts/test_account_repository.py -q
```

- [ ] Commit:

```bash
git add vidpool-backend/app/modules/accounts/infrastructure/persistence/repository.py vidpool-backend/tests/accounts/test_account_repository.py
git commit -m "fix: surface unexpected account lease database errors"
```

---

# Task 8: Make repository save update-only

**Priority:** P1

**Problem:** `save()` currently calls `add()` when row is absent, so a stale object can recreate a deleted account.

**Files:**
- Modify repository
- Modify repository tests
- Reuse: `AccountNotFoundError`

RED test:

```python
repo.add(account)
repo.delete(account.id)

with pytest.raises(AccountNotFoundError):
    repo.save(account)

assert repo.get(account.id) is None
```

Implementation:

```python
if model is None:
    raise AccountNotFoundError(
        f"Account {account.id} was not found"
    )
```

Verify and commit:

```powershell
pytest tests/accounts/test_account_repository.py -q
```

```bash
git add vidpool-backend/app/modules/accounts/infrastructure/persistence/repository.py vidpool-backend/tests/accounts/test_account_repository.py
git commit -m "fix: prevent deleted accounts from being recreated on save"
```

---

# Task 9: Prove lease exclusivity with independent DB sessions

**Priority:** P1

**Problem:** Current tests are sequential and do not prove two sessions cannot lease the same account concurrently.

**Files:**
- Modify: `vidpool-backend/tests/accounts/test_account_repository.py`
- Modify repository only if test exposes a real race

Use file-backed SQLite and two independent Sessions/threads with a barrier.

Expected for a one-account pool:

```python
assert len(successful_acquires) == 1
assert persisted_lease_count == 1
```

If SQLite lock contention appears, preserve DB uniqueness as the correctness boundary. Add only a short bounded retry for the specific SQLite `database is locked` case; do not catch all `OperationalError`.

Verify repeatedly:

```powershell
pytest tests/accounts/test_account_repository.py::test_concurrent_acquire_never_leases_same_account_twice -q
pytest tests/accounts/test_account_repository.py -q
```

Commit:

```bash
git add vidpool-backend/tests/accounts/test_account_repository.py vidpool-backend/app/modules/accounts/infrastructure/persistence/repository.py
git commit -m "test: prove account lease exclusivity across sessions"
```

---

# Task 10: Protect user-disabled account state in the domain

**Priority:** P1

**Invariant:** `DISABLED` can only leave `DISABLED` through explicit `enable()`.

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/domain/account.py`
- Modify: `vidpool-backend/tests/accounts/test_account_domain.py`
- Reuse: `InvalidAccountStateError`

Add tests proving disabled accounts cannot be reactivated by:

```text
mark_authenticated
mark_cooldown
background success/failure flows
```

Recommended guard:

```python
def _require_enabled(self) -> None:
    if self.status is AccountStatus.DISABLED:
        raise InvalidAccountStateError(
            "Disabled account requires explicit enable"
        )
```

Use the guard on operational methods that could mutate state.

Verify:

```powershell
pytest tests/accounts/test_account_domain.py -q
```

Commit:

```bash
git add vidpool-backend/app/modules/accounts/domain/account.py vidpool-backend/tests/accounts/test_account_domain.py
git commit -m "fix: preserve disabled account state invariant"
```

---

# Task 11: Normalize AccountId usage in AccountLease

**Priority:** P2

Change `AccountLease.account_id` from raw `uuid.UUID` to `AccountId` and update mapper/tests accordingly.

Verify:

```powershell
pytest tests/accounts -q
```

Commit:

```bash
git add vidpool-backend/app/modules/accounts vidpool-backend/tests/accounts
git commit -m "refactor: use AccountId consistently in account leases"
```

---

# Task 12: Fix BrowserSessionPort / ProviderAuthPort ownership boundary

**Priority:** P1 before browser implementation continues

**Problem:** Current provider auth only receives `profile_key`, but the login browser context is already open. Opening the same persistent profile again can conflict with Chromium profile locking; importing concrete Playwright types would break the abstraction.

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/application/ports.py`
- Modify: `vidpool-backend/tests/accounts/fakes.py`
- Modify: `vidpool-backend/tests/accounts/test_account_service.py`
- Update design spec if required

Keep application opaque:

```python
@dataclass(frozen=True)
class BrowserSessionHandle:
    id: str
    profile_key: str
```

Change live-login validation contract to:

```python
class ProviderAuthPort(Protocol):
    provider_key: str

    def login_url(self) -> str: ...

    def validate_session(
        self,
        session: BrowserSessionHandle,
    ) -> SessionValidation: ...

    def resolve_identity(
        self,
        session: BrowserSessionHandle,
    ) -> ProviderIdentity: ...
```

Persisted-profile validation later should be a separate explicit operation, e.g.:

```python
def validate_persisted_session(
    self,
    profile_key: str,
) -> SessionValidation: ...
```

Do not make one method ambiguously handle both live browser login and later background profile validation.

Acceptance criteria:
- application never exposes Playwright `Page`/`BrowserContext`;
- provider infrastructure can inspect the already-open login session;
- no implicit second open of the same persistent profile.

Verify:

```powershell
pytest tests/accounts/test_account_service.py -q
```

Commit:

```bash
git add vidpool-backend/app/modules/accounts/application/ports.py vidpool-backend/tests/accounts docs
git commit -m "refactor: clarify provider auth browser-session contract"
```

---

# Task 13: Make Windows-first support explicit

**Priority:** P2

**Files:**
- Modify: `vidpool-frontend/src-tauri/tauri.conf.json`
- Modify: `README.md`
- Modify: `docs/CURRENT_STATUS.md`

Change current bundle target from:

```json
"targets": "all"
```

to the Windows installer actually used, default recommendation:

```json
"targets": ["nsis"]
```

Document current verified target as Windows x64; do not claim macOS/Linux support yet.

Verify:

```powershell
python scripts/build-sidecar.py
cd vidpool-frontend
pnpm tauri build
```

Commit:

```bash
git add vidpool-frontend/src-tauri/tauri.conf.json README.md docs/CURRENT_STATUS.md
git commit -m "docs: align desktop target with Windows-first support"
```

---

# Task 14: Correct CURRENT_STATUS for partial Account Pool implementation

**Priority:** P2

Under Implemented, add only what exists:

```markdown
- Account Pool domain model
- Account Pool application ports/fakes
- Account Pool SQLAlchemy persistence models/repository
- Account Pool Alembic schema for provider accounts and leases
```

Keep these under Not Implemented Yet:

```markdown
- Account Pool runtime wiring
- persistent browser session manager
- production provider auth adapters
- account login/relogin lifecycle
- account management API
- account management frontend
- durable job integration with account leases
```

Do not mark the whole Account Pool subsystem complete.

Commit:

```bash
git add docs/CURRENT_STATUS.md
git commit -m "docs: reflect partial account pool implementation"
```

---

# Task 15: Final stabilization verification gate

Do not add new features here.

## Backend

```powershell
cd vidpool-backend
python -m pip install -e ".[dev]"
pytest -q
alembic current
cd ..
```

## Frontend

```powershell
cd vidpool-frontend
corepack enable
pnpm install --frozen-lockfile
pnpm check
cd ..
```

## Sidecar + Rust

```powershell
python scripts/build-sidecar.py
cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

## Desktop package

```powershell
cd vidpool-frontend
pnpm tauri build
cd ..
```

## Security smoke

```text
[ ] /api/health works without token.
[ ] /api/session/probe rejects missing token.
[ ] /api/session/probe rejects wrong token.
[ ] /api/session/probe accepts correct token.
[ ] React waits for protected probe before rendering app.
[ ] Missing backend session config returns 503 on protected route.
```

## SQLite smoke

```text
[ ] PRAGMA foreign_keys = 1
[ ] PRAGMA journal_mode = wal
[ ] invalid account lease FK is rejected
```

## Lease smoke

```text
[ ] one account cannot have two unexpired leases
[ ] two independent sessions cannot double-lease one account
[ ] expired lease becomes reusable
[ ] unexpected DB errors propagate
```

## Domain smoke

```text
[ ] DISABLED cannot become ACTIVE via mark_authenticated
[ ] DISABLED cannot become COOLDOWN via mark_cooldown
[ ] only enable() moves DISABLED to AUTH_REQUIRED
```

## Git cleanliness

```powershell
git status --short
```

No generated sidecar, browser profiles, local DB, or `target/` should be staged.

## Push and CI

Expected:

```text
frontend  success
backend   success
desktop   success
```

Do not continue browser-session implementation while desktop CI is red.

---

# Recommended commit sequence

```text
1. ci: build desktop sidecar before Rust verification
2. build: lock desktop Rust dependencies
3. fix: verify protected backend session before app bootstrap
4. fix: fail closed when app session is not configured
5. refactor: protect application API at router boundary
6. fix: enforce SQLite WAL mode and foreign keys
7. fix: surface unexpected account lease database errors
8. fix: prevent deleted accounts from being recreated on save
9. test: prove account lease exclusivity across sessions
10. fix: preserve disabled account state invariant
11. refactor: use AccountId consistently in account leases
12. refactor: clarify provider auth browser-session contract
13. docs: align desktop target with Windows-first support
14. docs: reflect partial account pool implementation
```

---

# Definition of Done

```text
[ ] frontend CI green
[ ] backend CI green
[ ] desktop CI green
[ ] sidecar built before Cargo/Tauri verification
[ ] Cargo.lock committed
[ ] CI uses cargo test/check --locked
[ ] React verifies /api/session/probe before render
[ ] missing app-session config fails closed with 503
[ ] health remains public
[ ] protected APIs secured at parent-router level
[ ] SQLite foreign_keys ON
[ ] SQLite file DB WAL enabled
[ ] account lease FK actually enforced
[ ] acquire_lru catches only expected integrity race
[ ] unexpected DB failures propagate
[ ] save cannot recreate deleted account
[ ] concurrent sessions cannot double-lease one account
[ ] expired leases recover
[ ] disabled account cannot auto-reactivate
[ ] AccountId typing consistent
[ ] browser/provider auth contract avoids opening same profile twice
[ ] Playwright objects do not leak into application/domain
[ ] Windows x64 support documented accurately
[ ] CURRENT_STATUS reflects partial Account Pool reality
[ ] pytest passes
[ ] pnpm check passes
[ ] alembic current succeeds
[ ] cargo test --locked passes
[ ] cargo check --locked passes
[ ] pnpm tauri build succeeds
```

---

# Resume point after stabilization

Only after this plan is green, resume Account Pool implementation at:

```text
Browser profile path resolution
→ Playwright persistent browser session manager
→ Provider registry
→ Login/relogin application lifecycle
→ LRU leasing application service
→ protected account management API
→ React Account Pool UI
```

Do not redo the already completed Account domain/ports/persistence work except where this stabilization plan explicitly changes contracts or invariants.
