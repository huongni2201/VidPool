# VidPool — Detailed Fix Plan After Latest Code Review

**Status:** SUPERSEDED / COMPLETED  
**Superseded by:** `2026-09-17-vidpool-latest-code-review-fix-plan.md`  
**Date:** 2026-09-17  
**Reviewed commit:** `ba90e70ee0214d39737d6812db48a62cd55241a5`  
**Scope:** Account Pool foundation, BrowserRuntime, Unit of Work, frontend account flows, CI/clean-code gates  
**Goal:** Make the current foundation clean, deterministic, easy to debug, and safe to extend before implementing the first production provider adapter.

---

# 1. Executive Summary

The current architecture is moving in the right direction:

- Browser session IDs have been removed from the public API.
- Browser ownership has moved into a single-owner `BrowserRuntime`.
- SQLAlchemy Unit of Work has been introduced.
- Architecture import-boundary tests exist.
- Backend, frontend, and desktop CI are currently green.
- Account Pool is sufficiently modular to keep as the foundation.

However, the current implementation still has several issues that should be fixed **before implementing Seedance or another real provider adapter**.

Priority order:

```text
P0  Fix duplicate BrowserRuntime / container creation at process startup
P0  Fix frontend "Login again" flow
P0  Fix invalid "retry complete login" flow
P0  Finish Unit of Work transaction ownership
P1  Enforce lease/state invariants
P1  Remove BrowserRuntime profile-delete race
P1  Harden BrowserRuntime shutdown lifecycle
P1  Move account state transitions back into domain methods
P2  Split AccountService before it becomes a God Service
P2  Remove migration/compatibility residue
P2  Add backend static-analysis gates
P2  Improve observability/debug logging
P3  Re-evaluate BrowserRuntime concurrency model before provider execution jobs
```

Do **not** start production provider automation until P0 and P1 items are completed.

---

# 2. Definition of Done

This stabilization phase is complete only when all of the following are true:

- only one application container is created per backend process;
- only one `BrowserRuntime` exists per backend process;
- no module import creates threads, database engines, or external runtime resources;
- relogin uses the existing account and existing persistent browser profile;
- login failure UX does not retry `complete_login` against a closed browser session;
- repositories never call `commit()` or `rollback()` directly;
- the Unit of Work is the sole database transaction owner;
- disabling, deleting, or relogging an account cannot violate active-lease invariants;
- browser profile deletion is serialized with browser open/close operations;
- runtime shutdown rejects new work deterministically;
- domain state transitions are implemented in the domain entity, not duplicated in application services;
- architecture tests cover all important dependency boundaries;
- backend CI includes lint/static checks, not only runtime tests;
- all frontend/backend/desktop CI checks pass.

---

# 3. Phase 1 — Eliminate Duplicate App/BrowserRuntime Initialization

## Priority

**P0 — Critical foundation issue**

## Problem

`app.main` currently creates:

```python
app = create_app()
```

at module import time.

The sidecar bootstrap imports:

```python
from app.main import create_app
```

Importing `app.main` therefore creates:

```text
App
  -> AppContainer
     -> Engine
     -> BrowserRuntime
        -> dedicated thread
```

Then `bootstrap.main()` calls:

```python
app = create_app(config)
```

again.

This can create two containers and two browser runtime threads in one backend process.

Only the second app is passed to Uvicorn.

The first container/runtime may stay alive until process exit and is outside the active FastAPI lifespan.

## Root Cause

Application factory and ASGI application object are defined in the same importable module.

Module import has a resource-creating side effect.

## Target Structure

Refactor to:

```text
app/
  factory.py
  asgi.py
  bootstrap.py
```

Recommended:

```python
# app/factory.py

def create_app(...):
    ...
```

```python
# app/asgi.py

from app.factory import create_app

app = create_app()
```

```python
# app/bootstrap.py

from app.factory import create_app
```

The executable sidecar imports the factory only.

## Files

Primary:

```text
vidpool-backend/app/main.py
vidpool-backend/app/bootstrap.py
```

Recommended new file:

```text
vidpool-backend/app/factory.py
```

Optional:

```text
vidpool-backend/app/asgi.py
```

Check references in:

```text
scripts/
PyInstaller spec/build script
tests/
```

## Implementation Steps

### Step 1.1

Move `create_app()` and FastAPI lifespan code to:

```text
app/factory.py
```

### Step 1.2

Remove global:

```python
app = create_app()
```

from the module imported by `bootstrap.py`.

### Step 1.3

If an ASGI-compatible module-level app is still required, create:

```text
app/asgi.py
```

containing only:

```python
from app.factory import create_app

app = create_app()
```

### Step 1.4

Update bootstrap:

```python
from app.factory import create_app
```

### Step 1.5

Update any build/entrypoint references.

## Tests

Add:

```text
tests/core/test_application_factory.py
```

Tests should verify:

1. importing the application factory does not start a BrowserRuntime;
2. `create_app()` creates exactly one container;
3. injected container is not replaced;
4. shutdown closes exactly the container attached to the running app.

A fake `BrowserSessionPort` can count:

```text
created
close_all calls
```

## Acceptance Criteria

```text
PASS: importing bootstrap/factory creates zero browser threads
PASS: create_app() creates one container
PASS: backend lifecycle closes that exact container
PASS: existing backend tests pass
PASS: sidecar starts normally
```

## Suggested Commit

```text
refactor: make backend application factory side-effect free
```

---

# 4. Phase 2 — Fix Frontend Relogin Flow

## Priority

**P0 — User-facing functional bug**

## Problem

`AccountRow` correctly calls:

```text
onRelogin(account.id)
```

but `AccountsPage` currently wires it to:

```text
setIsAddOpen(true)
```

and drops the account ID.

The dialog therefore behaves as "Add Account".

This can create a new account instead of reopening the existing persistent browser profile.

## Existing API

Already available:

```typescript
startRelogin(client, accountId)
```

Endpoint:

```http
POST /api/accounts/{accountId}/relogin/start
```

## Target UX

```text
Account row
  -> Login again
  -> backend start_relogin(existing account)
  -> BrowserRuntime opens existing profile
  -> user logs in
  -> user clicks "Đã đăng nhập"
  -> complete_login(existing account)
  -> same account becomes ACTIVE
```

No new account record.

## Recommended UI Model

Refactor `AddAccountDialog` into a generic auth dialog:

```text
AccountLoginDialog
```

Modes:

```typescript
type LoginMode =
  | { kind: "add" }
  | { kind: "relogin"; accountId: string }
```

Or create two thin wrappers:

```text
AddAccountDialog
ReloginAccountDialog
```

sharing a common login-state component.

Prefer one state machine with explicit mode.

## Files

```text
vidpool-frontend/src/features/accounts/accounts-page.tsx
vidpool-frontend/src/features/accounts/add-account-dialog.tsx
vidpool-frontend/src/features/accounts/accounts-api.ts
vidpool-frontend/src/features/accounts/accounts-page.test.tsx
```

Potential rename:

```text
add-account-dialog.tsx
    ->
account-login-dialog.tsx
```

## Implementation Steps

### Step 2.1

Add state in `AccountsPage`:

```typescript
const [loginTarget, setLoginTarget] = useState<
  | { kind: "add" }
  | { kind: "relogin"; accountId: string }
  | null
>(null)
```

### Step 2.2

`+ Add account`:

```typescript
setLoginTarget({ kind: "add" })
```

### Step 2.3

`Login again`:

```typescript
setLoginTarget({
  kind: "relogin",
  accountId: id,
})
```

### Step 2.4

In login dialog:

For add:

```typescript
startLogin(client, selectedProvider)
```

For relogin:

```typescript
startRelogin(client, accountId)
```

### Step 2.5

For relogin, skip provider selection.

The provider is already known by the backend/account.

### Step 2.6

Complete login always uses:

```typescript
completeLogin(client, activeAccountId)
```

## Tests

Add tests:

### Frontend test 1

```text
Login again calls:
POST /api/accounts/{id}/relogin/start
```

### Frontend test 2

Assert it does **not** call:

```text
POST /api/providers/{provider}/accounts/login/start
```

### Frontend test 3

After successful relogin:

```text
same account ID remains
accounts query invalidated
dialog closes
```

## Acceptance Criteria

```text
PASS: relogin does not create new account
PASS: relogin reuses account ID
PASS: relogin reuses browser profile
PASS: frontend tests prove correct endpoint usage
```

## Suggested Commit

```text
fix: wire account relogin to existing browser profile
```

---

# 5. Phase 3 — Fix Login Validation Retry UX

## Priority

**P0 — User-facing deterministic failure**

## Problem

Backend:

```python
complete_login(...)
```

always closes the interactive browser profile in:

```python
finally:
    self._browser.close_profile(profile_key)
```

This is also done when session validation fails.

Frontend error state currently shows:

```text
Thử xác minh lại
```

and calls:

```typescript
completeLogin(client, accountId)
```

again.

The browser session is already closed.

Second attempt therefore cannot succeed and should return:

```text
BrowserSessionNotOpen
```

## Correct State Machine

Current broken flow:

```text
WAITING
 -> COMPLETE
 -> INVALID
 -> browser closes
 -> ERROR
 -> COMPLETE AGAIN      X
```

Correct flow:

```text
WAITING
 -> COMPLETE
 -> INVALID
 -> browser closes
 -> ERROR
 -> REOPEN LOGIN
 -> WAITING
 -> COMPLETE
```

## Target UX

When validation fails:

```text
Đăng nhập chưa thành công

[Đóng]
[Mở lại trình duyệt]
```

`Mở lại trình duyệt` calls:

```text
start_relogin(accountId)
```

Then returns to:

```text
waiting_for_user
```

## Files

```text
vidpool-frontend/src/features/accounts/add-account-dialog.tsx
vidpool-frontend/src/features/accounts/accounts-page.test.tsx
```

Potential backend tests already cover browser close after invalid session.

## Implementation Steps

### Step 3.1

Change error action from:

```typescript
handleComplete
```

to:

```typescript
handleRestartLogin
```

### Step 3.2

If `accountId` exists:

```typescript
await startRelogin(client, accountId)
setState("waiting_for_user")
```

### Step 3.3

Do not reuse stale "complete" state.

### Step 3.4

Differentiate:

```text
start error
validation error
browser unavailable
```

if useful.

## Tests

Test:

```text
complete_login -> rejects
frontend enters error state
click "Mở lại trình duyệt"
calls relogin/start
returns to waiting state
```

Also assert it does **not** issue a second immediate `/login/complete`.

## Acceptance Criteria

```text
PASS: retry after failed validation reopens browser
PASS: no stale browser session retry
PASS: user can recover without creating a new account
```

## Suggested Commit

```text
fix: reopen browser before retrying failed account login
```

---

# 6. Phase 4 — Finish the Unit of Work Transaction Boundary

## Priority

**P0 — Architectural correctness**

## Problem

The project now has:

```text
AccountUnitOfWorkPort
SQLAlchemyAccountUnitOfWork
```

but:

```python
SQLAlchemyAccountRepository.acquire_lru()
```

still performs internal:

```python
self._session.commit()
self._session.rollback()
```

This means transaction ownership is split.

## Rule

After this phase:

```text
Repository:
  select
  add
  update
  delete
  flush
  savepoint if needed

UnitOfWork:
  commit
  rollback
  close
```

No repository method may call:

```python
Session.commit()
Session.rollback()
```

## Why This Matters

Future flow:

```text
lease account
create provider execution job
record job/account relationship
commit
```

must be atomic.

With repository-level commits:

```text
lease committed
job creation fails
```

cannot be rolled back.

## Files

```text
vidpool-backend/app/modules/accounts/infrastructure/persistence/repository.py
vidpool-backend/app/modules/accounts/infrastructure/persistence/uow.py
vidpool-backend/app/modules/accounts/application/service.py
vidpool-backend/tests/accounts/test_account_repository.py
vidpool-backend/tests/accounts/test_account_service.py
```

## `acquire_lru()` Refactor

### Current pattern

```text
delete expired leases
commit

query candidates

for candidate:
    insert lease
    commit
    on IntegrityError:
        rollback
```

### Target pattern

Recommended SQLite-safe approach:

```text
delete expired leases
flush

query candidates

for candidate:
    begin nested/savepoint
      try insert lease
      flush
      update last_used_at
      flush
      release savepoint
      return
      except IntegrityError
        rollback savepoint only
        continue

UoW commit outside repository
```

Do not rollback the whole transaction for each candidate if a savepoint can isolate the unique constraint conflict.

Pseudo:

```python
for candidate in candidates:
    try:
        with self._session.begin_nested():
            ...
            self._session.flush()
        return ...
    except IntegrityError:
        continue
```

Validate exact SQLAlchemy behavior with tests.

## Additional Architecture Test

Add:

```text
tests/architecture/test_persistence_boundaries.py
```

Use AST or source inspection to forbid:

```text
.commit(
.rollback(
```

inside repository classes.

Allow them only in UoW implementation.

## Tests

Must preserve:

```text
concurrent acquire never leases same account twice
expired lease recovery
LRU ordering
release behavior
```

Add:

```text
repository acquire does not commit caller transaction
```

Suggested technique:

```text
open UoW
acquire
force exception before uow.commit
rollback
verify lease does not exist
```

## Acceptance Criteria

```text
PASS: repository contains no commit()
PASS: repository contains no full rollback()
PASS: UoW owns commit/rollback
PASS: concurrency test remains green
PASS: rollback restores pre-acquire state
```

## Suggested Commit

```text
refactor: make account unit of work sole transaction owner
```

---

# 7. Phase 5 — Enforce Lease and Account State Invariants

## Priority

**P1 — Business consistency**

## Problem A — Disable While Leased

Design requires:

```text
an account with an active lease cannot be disabled
```

Current `disable_account()` does not check this.

## Target

Before disabling:

```python
if uow.accounts.has_active_lease(account_id, current_time):
    raise AccountInUse(...)
```

## Problem B — Relogin State

`start_relogin()` should not be a generic browser opener.

Recommended allowed state:

```text
AUTH_REQUIRED
```

Possibly also:

```text
COOLDOWN
```

only if product behavior explicitly requires it.

Do not allow:

```text
ACTIVE
DISABLED
```

by default.

## Problem C — Validate While Leased

Decide policy explicitly.

Recommended:

```text
validate_account while leased => conflict
```

unless provider validation is guaranteed read-only and execution-safe.

For simplicity and predictability:

```text
reject validation/relogin/disable/delete
when active lease exists
```

## Files

```text
vidpool-backend/app/modules/accounts/application/service.py
vidpool-backend/app/modules/accounts/domain/account.py
vidpool-backend/app/modules/accounts/domain/errors.py
vidpool-backend/tests/accounts/test_account_service.py
```

## Domain Error

Prefer a clear reusable exception:

```text
AccountInUse
InvalidAccountState
```

Do not add highly specific error types unless needed by API behavior.

## Tests

Add:

```text
disable_account rejects active lease
relogin rejects ACTIVE account
relogin rejects DISABLED account
relogin accepts AUTH_REQUIRED
delete rejects active lease
validate policy test
```

## Acceptance Criteria

```text
PASS: no user action can invalidate a leased account unexpectedly
PASS: state-machine rules are explicit and tested
```

## Suggested Commit

```text
fix: enforce account lease and relogin invariants
```

---

# 8. Phase 6 — Serialize Browser Profile Deletion

## Priority

**P1 — Race condition**

## Problem

Current shape:

```python
if not stopped and has_open_session(profile_key):
    raise ...

self._resolver.delete(profile_key)
```

`has_open_session()` is serialized through the runtime queue.

`delete()` is not.

Race:

```text
Thread A: has_open_session -> false
Thread B: enqueue open_login
Runtime: opens profile
Thread A: shutil.rmtree(profile)
```

## Target

Deletion must be an owner-thread operation:

```python
def delete_profile(self, profile_key):
    return self._submit(lambda: self._delete_profile(profile_key))
```

And:

```python
def _delete_profile(...):
    if profile in sessions:
        raise BrowserProfileInUse
    resolver.delete(profile)
```

This makes:

```text
check + delete
```

atomic relative to browser runtime operations.

## Files

```text
vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py
vidpool-backend/tests/accounts/test_browser_runtime.py
```

## Tests

Add a concurrency test:

```text
delete vs open_login
```

Expected result must be deterministic:

Either:

```text
delete wins
then open creates a fresh profile
```

or:

```text
open wins
delete raises BrowserProfileInUse
```

but never:

```text
profile is deleted while open
```

## Acceptance Criteria

```text
PASS: resolver.delete only runs on owner thread
PASS: open/delete race is serialized
```

## Suggested Commit

```text
fix: serialize browser profile deletion through runtime
```

---

# 9. Phase 7 — Harden BrowserRuntime Shutdown

## Priority

**P1 — Lifecycle correctness**

## Problem

Current runtime uses:

```python
self._stopped: bool
```

Shutdown transitions are not explicit.

Potential race:

```text
shutdown executed
Playwright stopped
_stopped still false
another caller submits
```

## Target State Machine

Use:

```python
class RuntimeState(Enum):
    RUNNING = ...
    STOPPING = ...
    STOPPED = ...
```

Or minimal:

```text
_accepting_work
_stopped
```

Preferred explicit enum.

## Shutdown Flow

```text
lock/state:
RUNNING -> STOPPING

reject future _submit calls

enqueue shutdown command
close contexts
stop Playwright
enqueue stop sentinel
join owner thread

STOPPING -> STOPPED
```

Important:

- set `STOPPING` before shutdown starts;
- `close_all()` remains idempotent;
- no command accepted after stop begins;
- pending commands behavior must be defined.

Recommended MVP behavior:

```text
commands submitted before STOPPING are processed
new commands after STOPPING are rejected
shutdown command is placed after already-queued work
```

## Files

```text
vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py
vidpool-backend/tests/accounts/test_browser_runtime.py
```

## Tests

Add:

```text
concurrent submit during close_all
double close_all
submit after STOPPING
submit after STOPPED
all contexts closed on owner thread
```

## Acceptance Criteria

```text
PASS: deterministic runtime lifecycle
PASS: no operation executes after Playwright stop
```

## Suggested Commit

```text
fix: make browser runtime shutdown deterministic
```

---

# 10. Phase 8 — Move Account State Transitions Into Domain

## Priority

**P1/P2 — Clean domain model**

## Problem

`ProviderAccount` already contains methods such as:

```text
mark_authenticated
mark_auth_required
mark_cooldown
record_success
record_failure
disable
enable
```

But `AccountService` still directly modifies:

```text
status
updated_at
cooldown_until
consecutive_failures
last_failure_at
last_success_at
last_validated_at
```

This duplicates business rules.

## Goal

Application layer should orchestrate:

```text
load entity
ask entity to transition
save entity
commit
```

Not implement state rules itself.

## Refactor Mapping

### `complete_login`

Replace direct assignments with:

```python
account.mark_authenticated(
    display_name=...,
    external_identity=...,
    now=current_time,
)
```

Need special handling for disabled invariant.

### invalid validation

Use:

```python
account.mark_auth_required(...)
```

only if enabled.

May need domain method:

```python
record_validation(valid: bool, ...)
```

if repeated.

### `report_success`

Use:

```python
account.record_success(...)
```

### `report_auth_failure`

Potential domain method:

```python
account.record_auth_failure(...)
```

### `report_temporary_failure`

Potential:

```python
account.record_temporary_failure(...)
```

### `report_rate_limited`

Potential:

```python
account.record_rate_limit(...)
```

Avoid putting provider-specific details into domain.

Generic domain concepts:

```text
authentication failure
temporary failure
cooldown
```

are fine.

## Files

```text
vidpool-backend/app/modules/accounts/domain/account.py
vidpool-backend/app/modules/accounts/application/service.py
vidpool-backend/tests/accounts/test_account_domain.py
vidpool-backend/tests/accounts/test_account_service.py
```

## Rule

No application service should assign:

```python
account.status = ...
```

except mapper/persistence reconstruction.

Add architecture/static test if useful.

## Acceptance Criteria

```text
PASS: state-machine logic has one owner
PASS: AccountService reads as orchestration
PASS: domain tests cover transitions
```

## Suggested Commit

```text
refactor: centralize account state transitions in domain
```

---

# 11. Phase 9 — Split `AccountService`

## Priority

**P2 — Maintainability before provider execution**

## Current Responsibilities

`AccountService` currently handles:

```text
provider listing
account queries
login
relogin
validation
enable
disable
delete
leasing
release
success reporting
failure reporting
cooldowns
rate limits
```

This will become difficult to debug when provider execution is added.

## Recommended Split

Keep a facade only if API convenience is useful.

Suggested internal services:

```text
AccountQueryService
AccountLoginService
AccountLeaseService
AccountHealthService
AccountLifecycleService
```

Minimal version:

```text
AccountLoginService
AccountLeaseService
AccountService
```

Where `AccountService` handles account CRUD/status.

Alternative use-case handlers:

```text
StartAccountLogin
CompleteAccountLogin
AcquireAccountLease
ReleaseAccountLease
...
```

For current project size, small cohesive services are enough.

## Do Not

Do not introduce:

```text
CQRS framework
mediator framework
event bus
microservices
repository per use case
```

Keep it a modular monolith.

## Files

```text
vidpool-backend/app/modules/accounts/application/
```

Possible layout:

```text
application/
  login_service.py
  lease_service.py
  health_service.py
  account_service.py
  ports.py
  uow.py
```

## Acceptance Criteria

Each service should have one clear reason to change.

Target rough size:

```text
< ~200 lines/service where practical
```

No strict line-count requirement.

## Suggested Commit

```text
refactor: split account application responsibilities
```

---

# 12. Phase 10 — Remove Migration and Compatibility Residue

## Priority

**P2**

## Residue A — `_SimpleUoW`

`AccountService` still supports:

```text
uow_factory
or
accounts repository
```

and has `_SimpleUoW` with no-op commit/rollback.

This is useful during migration but should not remain as production architecture.

## Target

`AccountService` accepts only:

```python
uow_factory: Callable[[], AccountUnitOfWorkPort]
```

Tests should use:

```text
FakeAccountUnitOfWork
```

not inject repositories directly.

## Residue B — `browser_session_manager`

`build_container()` currently supports both:

```text
browser_runtime
browser_session_manager
```

Remove the obsolete name.

Use only:

```text
browser_runtime
```

or better:

```text
browser_session_port
```

for dependency injection.

## Residue C — Error Aliases

Examples:

```python
AccountNotFound = AccountNotFoundError
AccountInUse = AccountInUseError
```

Pick one naming convention.

Recommended:

```text
AccountNotFound
AccountInUse
InvalidAccountState
```

without `Error` suffix, since this codebase already treats them as domain exceptions.

Or use `*Error` everywhere.

Do not keep both indefinitely.

## Residue D — Unused command DTOs

Inspect:

```text
application/commands.py
```

If command objects are unused by production code, either:

```text
actually adopt command handlers
```

or:

```text
delete them
```

Do not keep speculative abstractions.

## Residue E — Dead Imports / unused types

Clean:

```text
BrowserBackedAuthAdapter
other imports
legacy names
```

using Ruff.

## Acceptance Criteria

```text
PASS: one dependency-injection style
PASS: one naming convention
PASS: no unused compatibility aliases
PASS: no dead speculative DTOs
```

## Suggested Commit

```text
refactor: remove account pool migration compatibility paths
```

---

# 13. Phase 11 — Add Backend Static Analysis

## Priority

**P2**

## Current Gap

Frontend CI already performs:

```text
lint
tests
TypeScript build
```

Backend mainly performs:

```text
pytest
alembic
```

Runtime tests alone do not catch:

```text
unused imports
dead code
typing inconsistencies
bad exception patterns
complexity drift
```

## Recommended Tools

Minimum:

```text
Ruff
```

Recommended:

```text
Ruff
Pyright
```

Mypy is also valid, but Pyright usually integrates well for modern typed Python.

## `pyproject.toml`

Add:

```toml
[project.optional-dependencies]
dev = [
  ...
  "ruff>=...",
  "pyright>=...",
]
```

Example scripts can be documented as:

```bash
ruff check app tests
ruff format --check app tests
pyright app
pytest -q
```

## CI

Backend job:

```text
install
ruff check
ruff format --check
pyright
pytest
alembic upgrade/current
```

## Initial Rollout

Do not enable hundreds of strict rules immediately.

Start with:

```text
E
F
I
UP
B
SIM
```

Then progressively tighten.

For Pyright start around:

```text
basic
```

or standard mode, then increase strictness module-by-module.

## Acceptance Criteria

```text
PASS: unused imports fail CI
PASS: obvious type errors fail CI
PASS: lint does not create huge noisy exceptions
```

## Suggested Commit

```text
chore: add backend lint and type-check gates
```

---

# 14. Phase 12 — Improve Debuggability and Observability

## Priority

**P2**

## Goal

When a browser/provider flow fails, logs should answer:

```text
which account?
which provider?
which operation?
which profile identity?
which lifecycle state?
what normalized error?
how long did the operation take?
```

without exposing credentials.

## Never Log

```text
cookies
Authorization headers
localStorage values
tokens
browser storage state
passwords
full provider HTML
```

## Recommended Structured Context

For account operations:

```text
operation
account_id
provider_key
profile_key
lease_id
owner_id
```

`profile_key` is acceptable if treated as internal identifier.

Do not log absolute profile filesystem path unless debug-level and necessary.

## BrowserRuntime Logs

Log:

```text
browser_runtime_start
browser_open_start
browser_open_success
browser_open_failed
browser_close
browser_profile_delete
browser_runtime_stopping
browser_runtime_stopped
```

Add:

```text
channel
profile_key
elapsed_ms
```

## AccountService Logs

Do not log every successful getter.

Useful events:

```text
account_login_started
account_login_completed
account_login_invalid
account_relogin_started
account_disabled
account_deleted
lease_acquired
lease_released
account_cooldown_set
```

## Correlation

Before durable jobs:

```text
request ID
```

can be lightweight.

Later:

```text
job_id
run_id
```

should become primary correlation IDs.

## Error Normalization

Avoid returning:

```text
raw Playwright exception string
raw SQLAlchemy exception string
filesystem paths
```

to frontend.

Store details in logs, return normalized errors to UI.

## Acceptance Criteria

A developer should be able to debug:

```text
"Why did account login fail?"
```

from logs without reproducing the error interactively.

## Suggested Commit

```text
chore: add structured account and browser lifecycle logging
```

---

# 15. Phase 13 — Strengthen Architecture Tests

## Priority

**P2**

## Existing Good Tests

Keep the current tests preventing:

```text
domain -> application
domain -> infrastructure
application -> infrastructure
application/domain -> Playwright
```

## Add More Boundary Tests

### Rule 1

Domain must not import:

```text
fastapi
sqlalchemy
playwright
tauri
```

### Rule 2

Application must not import:

```text
fastapi
sqlalchemy
playwright
```

### Rule 3

Infrastructure may depend on:

```text
domain
application ports
```

but not frontend/Tauri.

### Rule 4

Persistence repositories must not call:

```text
commit
rollback
```

### Rule 5

Provider implementation details must remain under:

```text
infrastructure/providers/
```

### Rule 6

Frontend should not know:

```text
profile_key
browser session IDs
cookie/session internals
```

Use Zod/API tests for this.

## Suggested Commit

```text
test: strengthen architecture regression boundaries
```

---

# 16. Phase 14 — Improve Frontend Account Feature Structure

## Priority

**P2**

Current structure is reasonable:

```text
features/accounts/
```

but login state is becoming complex.

## Recommended Structure

```text
features/accounts/
  api/
    accounts-api.ts
    schemas.ts

  components/
    account-row.tsx
    account-login-dialog.tsx

  hooks/
    use-accounts.ts
    use-account-actions.ts

  accounts-page.tsx
  types.ts
```

Do not over-refactor immediately.

A minimal cleanup is enough:

```text
useAccounts
useAccountMutations
AccountLoginDialog
```

## Why

Currently `AccountsPage` owns many mutations:

```text
validate
enable
disable
delete
```

As relogin grows, this page will become orchestration-heavy.

## Suggested Hook

```typescript
function useAccountActions() {
  ...
}
```

Return:

```text
validateAccount
enableAccount
disableAccount
deleteAccount
startRelogin
isPending
```

## Acceptance Criteria

`AccountsPage` should mostly render UI and choose the active dialog mode.

## Suggested Commit

```text
refactor: isolate account frontend mutations and login state
```

---

# 17. Phase 15 — Decide BrowserRuntime Concurrency Model Before Provider Jobs

## Priority

**P3 — Before production execution jobs**

## Current Design

Current `BrowserRuntime` executes every submitted command on one dedicated thread.

This is correct for Playwright thread ownership.

However, long provider automation passed into:

```python
run_active(...)
run_persisted_profile(...)
```

can serialize the entire runtime.

Example:

```text
Account A generation automation: 120 sec
Account B wants browser automation
Account B waits behind A
```

This is acceptable for account login/validation.

It may not be acceptable for production provider execution.

## Do Not Change Yet

Do not prematurely redesign BrowserRuntime before implementing a real provider adapter prototype.

First measure actual operation patterns.

## Possible Future Models

### Option A — Single owner async Playwright loop

```text
one event loop
Playwright async API
multiple contexts
concurrent coroutines
```

Likely strongest long-term direction.

### Option B — Browser worker per profile/account

```text
one owner thread per active profile
```

Simpler thread affinity but potentially heavier.

### Option C — Keep single-thread runtime only for auth/profile lifecycle

Provider execution uses a separate worker abstraction.

## Recommended Direction

Before Durable Job integration:

```text
prototype one Seedance auth adapter
measure browser operation duration
decide whether runtime command callbacks are short or long
```

Do not let provider adapter execute minutes-long blocking browser automation inside the current single command queue without revisiting this decision.

## ADR

Create a new ADR only after measuring/implementing the first real adapter.

---

# 18. Recommended Final Application Structure

Target, without overengineering:

```text
vidpool-backend/
  app/
    api/
    core/
      container.py
      config.py

    factory.py
    bootstrap.py
    asgi.py

    infrastructure/
      persistence/

    modules/
      accounts/
        domain/
          account.py
          lease.py
          values.py
          errors.py

        application/
          ports.py
          uow.py
          login_service.py
          lease_service.py
          health_service.py
          account_service.py
          queries.py

        infrastructure/
          browser/
            runtime.py
            profile_paths.py

          persistence/
            models.py
            mapper.py
            repository.py
            uow.py

          providers/
            registry.py
            browser_auth_base.py
            seedance/
              auth.py

        api/
          router.py
          schemas.py
```

This remains a modular monolith.

No microservices required.

---

# 19. Required Test Matrix

Before Seedance implementation, all of these should exist.

## Application lifecycle

```text
[ ] factory import has no side effects
[ ] exactly one container/runtime per process
[ ] shutdown closes runtime once
```

## Browser runtime

```text
[ ] all Playwright access on owner thread
[ ] second open same profile rejected
[ ] different profiles supported
[ ] unexpected context close clears registry
[ ] delete serialized against open
[ ] persisted validation cannot collide with interactive session
[ ] shutdown idempotent
[ ] work rejected after shutdown begins
```

## Login flow

```text
[ ] add account creates AUTH_REQUIRED
[ ] browser launch failure leaves no DB account
[ ] DB failure cleans browser profile
[ ] valid login -> ACTIVE
[ ] invalid login -> AUTH_REQUIRED
[ ] invalid login closes browser
[ ] retry invalid login reopens browser
[ ] cancel closes own browser only
[ ] relogin reuses account/profile
[ ] relogin does not create another account
```

## Lease flow

```text
[ ] LRU selection
[ ] unique account lease
[ ] concurrent acquire safe
[ ] expired lease reusable
[ ] release works
[ ] rollback removes uncommitted lease
[ ] repository does not commit itself
```

## State invariants

```text
[ ] disable rejects active lease
[ ] delete rejects active lease
[ ] relogin rejects active lease
[ ] relogin only allowed from correct state
[ ] disabled account not revived by validate/success
[ ] enable returns expected state
```

## Frontend

```text
[ ] add-account happy path
[ ] login cancel
[ ] login invalid -> reopen browser
[ ] login again -> relogin endpoint
[ ] relogin uses same account
[ ] query cache invalidated after mutation
[ ] no browserSessionId exposed
```

## Architecture

```text
[ ] domain imports inward only
[ ] application imports inward only
[ ] Playwright infrastructure only
[ ] SQLAlchemy infrastructure only
[ ] repository cannot commit
[ ] frontend cannot consume profile/session secrets
```

---

# 20. Suggested Implementation Sequence

Implement as small commits.

Recommended order:

```text
1. refactor: make backend application factory side-effect free
2. fix: wire account relogin to existing browser profile
3. fix: reopen browser before retrying failed account login
4. refactor: make account unit of work sole transaction owner
5. fix: enforce account lease and relogin invariants
6. fix: serialize browser profile deletion through runtime
7. fix: make browser runtime shutdown deterministic
8. refactor: centralize account state transitions in domain
9. refactor: split account application responsibilities
10. refactor: remove account pool migration compatibility paths
11. chore: add backend lint and type-check gates
12. chore: add structured account and browser lifecycle logging
13. test: strengthen architecture regression boundaries
14. refactor: isolate account frontend mutations and login state
```

Run after every commit:

Backend:

```bash
cd vidpool-backend
pytest -q
alembic upgrade head
alembic current
```

After static checks are added:

```bash
ruff check app tests
ruff format --check app tests
pyright app
pytest -q
```

Frontend:

```bash
cd vidpool-frontend
pnpm check
```

Desktop:

```bash
cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

---

# 21. What Not to Do During This Refactor

Do not:

```text
- rewrite the whole architecture
- introduce microservices
- add Redis/Celery
- create a generic provider framework before one real provider exists
- expose Playwright Page/BrowserContext to application/domain
- expose profile paths to React
- add browserSessionId back to public APIs
- let repositories own transaction commit
- add automatic account switching to bypass provider limits
- mix provider execution implementation into this stabilization PR
```

Keep the scope focused.

---

# 22. Gate Before Implementing Seedance

Seedance auth implementation may begin only after:

```text
[ ] duplicate runtime initialization fixed
[ ] relogin frontend fixed
[ ] failed-login retry fixed
[ ] UoW transaction ownership fixed
[ ] active lease invariants fixed
[ ] BrowserRuntime delete race fixed
[ ] BrowserRuntime shutdown hardened
[ ] CI all green
```

Then implement only:

```text
SeedanceProviderAuthAdapter
```

first.

Verify:

```text
login URL
login state validation
identity resolution
persisted profile validation
```

Do not add generation/execution automation in the same step.

After Seedance auth works reliably, proceed to:

```text
Account Lease
  -> Provider Execution
  -> Durable Job
```

---

# 23. Final Architecture Principle

The codebase should preserve this dependency direction:

```text
React
  |
FastAPI API
  |
Application Services
  |
Domain + Ports
  ^
  |
Infrastructure
  |- SQLAlchemy
  |- BrowserRuntime
  |- Playwright
  |- Provider adapters
```

And this ownership model:

```text
Domain
  owns business state transitions

Application
  owns orchestration/use cases

Unit of Work
  owns database transaction boundaries

BrowserRuntime
  owns Playwright thread/lifecycle

Provider Adapter
  owns provider-specific browser behavior

Frontend
  owns only user interaction state
```

If these ownership boundaries remain strict, VidPool can add new providers, durable jobs, GPU/local AI modules, and the generation pipeline without turning the codebase into tightly coupled orchestration code.
