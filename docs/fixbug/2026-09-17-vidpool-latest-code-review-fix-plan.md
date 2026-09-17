# VidPool — Detailed Fix Plan After Latest Code Review

**Date:** 2026-09-17  
**Reviewed commit:** `6d9ad94f62af4fa1a1a19f3f4408a91bea65657d`  
**Scope:** Account Pool foundation, API error handling, login lifecycle, lease invariants, CI gates, desktop sidecar startup  
**Goal:** Stabilize the Account Pool foundation completely before implementing the first production provider adapter such as Seedance.

---

# 1. Executive Summary

The latest implementation is significantly better than the previous revision.

The following major architectural issues are already resolved:

- application factory is now side-effect free;
- only one application container is created for the running backend;
- `BrowserRuntime` owns browser work through one dedicated owner thread;
- browser profile deletion is serialized through `BrowserRuntime`;
- runtime shutdown rejects new work;
- repositories no longer own `commit()` / `rollback()`;
- SQLAlchemy Unit of Work owns transaction boundaries;
- SQLite enables:
  - foreign keys;
  - busy timeout;
  - WAL mode;
- relogin frontend flow now reuses the existing account;
- failed login validation now reopens the browser instead of retrying `complete_login`;
- account domain transitions were moved into domain methods;
- concurrent account acquisition is protected by the unique lease constraint;
- protected API now fails closed when the session token is absent;
- CI for frontend/backend/desktop currently passes.

The architecture is now good enough to keep.

However, there are still several issues that should be fixed before declaring the Account Pool phase complete.

Priority order:

```text
P1  Map InvalidAccountState to a controlled HTTP error
P1  Fix "Cancel Add Account" lifecycle and provisional account cleanup
P1  Verify acquire-vs-disable/delete/relogin concurrency invariants
P2  Make Ruff and Pyright real CI gates
P2  Align CURRENT_STATUS.md with implemented reality
P2  Improve mutation error UX in the frontend
P2  Clean duplicated application mapping helpers
P3  Reduce Tauri sidecar port TOCTOU risk
P3  Add end-to-end provider-contract test harness
```

After P1 and P2 items are complete, stop refactoring the Account Pool architecture and implement the first production provider adapter.

---

# 2. Target Architecture to Preserve

Do **not** redesign the Account Pool again unless a real provider exposes a concrete architectural limitation.

Keep this dependency flow:

```text
FastAPI API
    |
    v
AccountService
    |
    +--> AccountLoginService
    |
    +--> AccountLeaseService
    |
    +--> AccountHealthService
    |
    v
AccountUnitOfWorkPort
    |
    v
SQLAlchemyAccountUnitOfWork
    |
    v
SQLAlchemyAccountRepository
```

Browser flow:

```text
Application Service
      |
      v
BrowserSessionPort
      |
      v
BrowserRuntime
      |
      v
single owner thread
      |
      v
Playwright persistent browser context
```

Provider flow:

```text
AccountLoginService
      |
      v
ProviderRegistryPort
      |
      v
ProviderRegistry
      |
      v
ProviderAuthPort implementation
      |
      +--> SeedanceAuthAdapter
      +--> future providers
```

The first real provider should plug into these existing ports rather than creating a parallel architecture.

---

# 3. Definition of Done

This stabilization phase is done only when all conditions below are true.

## Backend correctness

```text
[ ] InvalidAccountState never escapes as HTTP 500
[ ] cancelling a brand-new login does not leave accidental ghost accounts
[ ] cancelling relogin does not delete an existing account
[ ] acquire cannot produce an invalid state against disable/delete/relogin
[ ] all account mutations have deterministic domain/API errors
[ ] BrowserRuntime remains single-owner
[ ] Unit of Work remains sole transaction owner
```

## Frontend correctness

```text
[ ] Add account cancel behaves differently from relogin cancel
[ ] failed mutations surface useful errors
[ ] account list refreshes after every state-changing flow
[ ] no stale account state remains after login/relogin/cancel
```

## CI / quality

```text
[ ] pytest passes
[ ] ruff check passes
[ ] pyright passes
[ ] pnpm check passes
[ ] cargo test passes
[ ] cargo check passes
[ ] alembic upgrade head passes
[ ] CURRENT_STATUS.md accurately describes reality
```

## Before production provider implementation

```text
[ ] account pool foundation is stable
[ ] provider registration mechanism is ready
[ ] browser persistence is verified across application restart
[ ] one fake/integration provider test proves end-to-end lifecycle
```

---

# 4. Phase 1 — Map InvalidAccountState to a Controlled API Error

## Priority

**P1 — Required**

## Problem

`AccountLoginService.start_relogin()` correctly rejects invalid state transitions.

For example:

```python
if account.status != AccountStatus.AUTH_REQUIRED:
    raise InvalidAccountState(...)
```

But the FastAPI error mapper currently handles:

```text
ProviderNotRegistered
AccountNotFound
AccountInUse
SessionInvalid
BrowserProfileInUse
BrowserSessionNotOpen
BrowserUnavailable
InvalidProfileKey
```

and does not explicitly handle:

```text
InvalidAccountState
```

As a result, a direct client call such as:

```http
POST /api/accounts/{active_account}/relogin/start
```

can bubble the domain exception out of `_handle_error()`.

That may become an HTTP 500 instead of a controlled conflict response.

## Target behavior

Use:

```http
409 Conflict
```

for state conflicts.

Examples:

```text
ACTIVE -> relogin/start      => 409
DISABLED -> relogin/start    => 409
invalid domain transition    => 409
```

Do not use 500 for a valid domain rejection.

## Files

```text
vidpool-backend/app/modules/accounts/api/router.py
vidpool-backend/tests/accounts/test_account_api.py
```

## Implementation

Import:

```python
InvalidAccountState
```

Then update `_handle_error()`.

Recommended:

```python
if isinstance(
    exc,
    (
        AccountInUse,
        SessionInvalid,
        BrowserProfileInUse,
        BrowserSessionNotOpen,
        InvalidAccountState,
    ),
):
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=str(exc),
    )
```

## Tests

Add API-level regression tests.

### Test 1 — relogin active account

Prepare an account in:

```text
ACTIVE
```

Call:

```http
POST /api/accounts/{id}/relogin/start
```

Expected:

```text
status = 409
```

Not:

```text
500
```

### Test 2 — relogin disabled account

Expected:

```text
409
```

### Test 3 — response detail

Ensure API exposes a useful domain message without traceback/internal implementation details.

## Acceptance criteria

```text
PASS: invalid relogin transitions return 409
PASS: no InvalidAccountState becomes 500
PASS: existing API tests still pass
```

## Suggested commit

```text
fix: map invalid account transitions to conflict responses
```

---

# 5. Phase 2 — Fix Cancel Add Account Lifecycle

## Priority

**P1 — Required**

## Problem

The current new-account login flow is:

```text
start_login()
   |
   +--> create ProviderAccount
   +--> open browser
   +--> persist account as AUTH_REQUIRED
```

If the user presses:

```text
Hủy bỏ
```

the frontend calls:

```text
cancelLogin(accountId)
```

and the backend currently:

```text
loads account
closes browser profile
returns account
```

The account record remains in the database.

This creates a semantic problem.

The user thinks:

```text
"I cancelled adding this account"
```

but the backend state becomes:

```text
AUTH_REQUIRED account still exists
persistent profile may still exist
```

This can produce ghost/incomplete accounts.

---

# 6. Required Lifecycle Distinction

There are two different cancel operations.

## Case A — Add new account

```text
user clicked + Add account
browser opened
account has never completed authentication
user presses Cancel
```

Expected:

```text
close browser
delete provisional DB record
delete provisional browser profile
```

## Case B — Relogin existing account

```text
existing account already exists
session expired
user starts relogin
user presses Cancel
```

Expected:

```text
close browser
KEEP account record
KEEP persistent profile
status remains AUTH_REQUIRED
```

These cases must not share identical cancellation semantics.

---

# 7. Recommended Design for Login Attempts

Do not infer "new vs relogin" from UI state only.

The backend should know what lifecycle it is handling.

There are two reasonable designs.

## Option A — Separate endpoints

Recommended for current project because it is simple.

```text
POST /providers/{provider}/accounts/login/start
POST /accounts/{id}/login/cancel

POST /accounts/{id}/relogin/start
POST /accounts/{id}/relogin/cancel
```

But this adds API surface.

## Option B — Store provisional state

More domain-explicit but introduces another state.

Example:

```text
PENDING_AUTH
AUTH_REQUIRED
ACTIVE
COOLDOWN
DISABLED
```

This may be overkill right now.

## Recommended choice

Keep current statuses and add explicit service methods:

```python
cancel_new_login(account_id)
cancel_relogin(account_id)
```

The API can expose separate routes or one route with known operation context.

For minimal change, use separate routes.

---

# 8. Proposed Backend Changes

## AccountLoginService

Add:

```python
def cancel_new_login(
    self,
    account_id: AccountId,
) -> None:
    ...
```

Algorithm:

```text
1. load account
2. verify account exists
3. verify it is safe to treat as provisional
4. get profile_key
5. close profile
6. delete DB account in UoW
7. commit
8. delete profile
```

Be careful with compensation order.

Recommended DB-first or browser-first strategy:

```text
close interactive browser
delete database record
commit
delete persistent profile
```

If profile deletion fails:

```text
log exception
do not recreate DB account
```

This matches the current delete-account compensation philosophy.

## Relogin cancel

Add:

```python
def cancel_relogin(
    self,
    account_id: AccountId,
) -> AccountView:
    ...
```

Algorithm:

```text
load account
close browser
keep DB record
return current account view
```

---

# 9. New Account Cancellation Safety Rule

Do not allow `cancel_new_login()` to delete an account that has already become active.

Before deleting:

```python
if account.status is not AccountStatus.AUTH_REQUIRED:
    raise InvalidAccountState(...)
```

Optionally also ensure:

```text
last_validated_at is None
external_identity is None
```

This reduces the risk that a stale UI request deletes a valid account.

Recommended condition:

```python
is_provisional = (
    account.status is AccountStatus.AUTH_REQUIRED
    and account.last_validated_at is None
)
```

If not provisional:

```text
409 Conflict
```

---

# 10. Frontend Changes for Cancel

## File

```text
vidpool-frontend/src/features/accounts/add-account-dialog.tsx
```

The frontend already knows:

```typescript
target.kind === "add"
target.kind === "relogin"
```

Use that knowledge when cancelling.

Pseudo-code:

```typescript
const handleCancelWaiting = async () => {
  if (!accountId) {
    handleClose()
    return
  }

  try {
    if (target?.kind === "relogin") {
      await cancelRelogin(client, accountId)
    } else {
      await cancelNewLogin(client, accountId)
    }

    onSuccess()
  } finally {
    handleClose()
  }
}
```

Important:

```text
onSuccess()
```

must invalidate the account list.

Otherwise UI state can remain stale.

---

# 11. Tests for Cancel Lifecycle

## Backend test — cancel new account

```text
start_login
cancel_new_login
```

Verify:

```text
DB account removed
browser closed
profile deleted
```

## Backend test — cancel relogin

Prepare:

```text
AUTH_REQUIRED existing account
```

Run:

```text
start_relogin
cancel_relogin
```

Verify:

```text
account remains
profile remains
browser closes
```

## Backend test — stale cancel against active account

Expected:

```text
409 / InvalidAccountState
account preserved
```

## Frontend test

For Add flow:

```text
Cancel -> new-login cancel endpoint
query invalidated
dialog closes
```

For Relogin flow:

```text
Cancel -> relogin cancel endpoint
account not deleted
query invalidated
dialog closes
```

## Acceptance criteria

```text
PASS: cancelling Add Account leaves no ghost account
PASS: cancelling Relogin preserves account
PASS: frontend refreshes after cancel
```

## Suggested commits

```text
fix: separate new login and relogin cancellation
fix: refresh accounts after login cancellation
```

---

# 12. Phase 3 — Verify Lease vs Account Mutation Concurrency

## Priority

**P1 — Required before provider jobs**

## Current protection

The database correctly enforces:

```text
one active lease row per account
```

through:

```text
UNIQUE(account_id)
```

This protects:

```text
acquire vs acquire
```

The repository also has a real concurrency test proving that two workers cannot lease the same account.

Good.

But there are other races.

---

# 13. Race A — Acquire vs Disable

Possible interleaving:

```text
T1 disable:
    has_active_lease(account) -> false

T2 acquire:
    selects account ACTIVE
    inserts lease

T1 disable:
    sets DISABLED
    commits
```

Possible resulting invalid state:

```text
account = DISABLED
lease = ACTIVE
```

Application-level check alone may not make the invariant atomic.

---

# 14. Race B — Acquire vs Delete

Possible interleaving:

```text
T1 delete:
    has_active_lease -> false

T2 acquire:
    creates lease

T1 delete:
    deletes account
```

Foreign key cascade may delete the lease, but a worker may believe it successfully acquired an account that has just disappeared.

This is especially dangerous once provider execution jobs exist.

---

# 15. Race C — Acquire vs Relogin

Possible interleaving:

```text
T1 start_relogin:
    has_active_lease -> false

T2 acquire:
    leases ACTIVE account

T1:
    opens interactive persistent browser profile
```

Now a worker and interactive login can try to own the same browser profile lifecycle.

---

# 16. First Step: Add Concurrency Regression Tests

Do not redesign the persistence layer before proving the race.

Add real SQLite WAL tests.

File:

```text
vidpool-backend/tests/accounts/test_account_repository.py
```

or preferably new:

```text
vidpool-backend/tests/accounts/test_account_concurrency.py
```

Use:

```text
real temporary SQLite file
two independent Sessions
threading.Barrier
```

Required scenarios:

```text
acquire vs disable
acquire vs delete
acquire vs relogin eligibility transition
```

---

# 17. Preferred Invariant Model

The DB operation selecting an account for lease should atomically guarantee:

```text
account.status == ACTIVE
no active lease
account still exists
```

And administrative mutations should atomically guarantee:

```text
no active lease at mutation commit time
```

SQLite does not support the same row-locking behavior as PostgreSQL.

Therefore prefer conditional database mutations rather than assuming `SELECT ... FOR UPDATE`.

---

# 18. Suggested Fix if Tests Reproduce Race

Use conditional update/delete semantics.

Example disable concept:

```sql
UPDATE provider_accounts
SET status = 'disabled'
WHERE id = :account_id
AND NOT EXISTS (
    SELECT 1
    FROM account_leases
    WHERE account_leases.account_id = provider_accounts.id
    AND account_leases.expires_at > :now
)
```

Then inspect:

```text
rowcount
```

If:

```text
rowcount == 0
```

re-read state and return:

```text
AccountInUse
```

This makes the lease check part of the mutation itself.

Similar concept for delete.

---

# 19. Alternative: Transaction Serialization

Because this is a local desktop app using SQLite, another valid solution is a process-level synchronization primitive around account allocation/mutation.

For example:

```python
AccountPoolCoordinator
```

with one lock around:

```text
acquire
disable
delete
relogin transition
```

This is less horizontally scalable but completely acceptable for a single-user local desktop application.

However:

**do not add this unless concurrency tests prove it is needed.**

Prefer the smallest correct solution.

---

# 20. Acceptance Criteria for Lease Invariants

```text
PASS: acquire vs acquire never duplicates lease
PASS: acquire vs disable never leaves disabled+leased invalid state
PASS: acquire vs delete never returns a usable lease for a deleted account
PASS: acquire vs relogin never allows worker + interactive browser ownership conflict
PASS: expired lease still recovers correctly
```

## Suggested commit

```text
test: enforce account lease mutation concurrency invariants
```

If code change required:

```text
fix: make account lease state transitions atomic
```

---

# 21. Phase 4 — Make Ruff and Pyright Real CI Gates

## Priority

**P2 — Required**

## Problem

`pyproject.toml` already includes:

```text
ruff
pyright
```

and configuration for both.

But GitHub Actions backend currently runs:

```text
pytest -q
alembic upgrade head
alembic current
```

It does not run:

```text
ruff check
pyright
```

Therefore `CURRENT_STATUS.md` currently overstates implementation by calling them CI gates.

---

# 22. CI Change

File:

```text
.github/workflows/ci.yml
```

Backend job should become:

```yaml
- run: python -m pip install -e ".[dev]"
- run: ruff check .
- run: pyright
- run: pytest -q
- run: alembic upgrade head
- run: alembic current
```

Recommended order:

```text
ruff
pyright
pytest
migration
```

because lint/type failures are cheaper to discover first.

---

# 23. Optional Formatting Gate

Do not force automatic formatting in CI unless project style has been agreed.

If desired:

```bash
ruff format --check .
```

Recommended eventual backend gate:

```text
ruff check .
ruff format --check .
pyright
pytest -q
```

But initially:

```text
ruff check .
pyright
```

is sufficient.

---

# 24. Fix Existing Ruff/Pyright Findings Before Enabling Gate

Run locally:

```bash
cd vidpool-backend

ruff check .
pyright
pytest -q
```

Do not add:

```text
# noqa
type: ignore
```

blindly just to make CI green.

For every ignore:

```text
understand why the type/lint warning exists
fix structure if reasonable
ignore only intentional cases
```

---

# 25. CURRENT_STATUS Alignment

After CI is changed, this statement becomes true:

```text
backend static analysis gates with Ruff and Pyright
```

If CI is not changed, update status wording to:

```text
backend Ruff and Pyright configuration
```

Do not claim a "gate" unless GitHub Actions enforces it.

## Acceptance criteria

```text
PASS: ruff failure breaks CI
PASS: pyright failure breaks CI
PASS: pytest still passes
PASS: CURRENT_STATUS matches actual CI
```

## Suggested commit

```text
ci: enforce backend lint and type checking
```

---

# 26. Phase 5 — Improve Frontend Mutation Error UX

## Priority

**P2**

## Problem

`useAccountActions()` currently wraps mutations:

```text
validate
enable
disable
delete
```

and only handles:

```text
onSuccess -> invalidate
```

There is no centralized user-visible error handling.

Examples:

```text
disable fails because account is leased
delete fails because browser is open
validate fails because provider session is unavailable
```

The user may click a button and see nothing obvious.

---

# 27. Minimal Fix

Expose errors from the hook.

Example:

```typescript
return {
  ...
  error:
    validateMutation.error ??
    enableMutation.error ??
    disableMutation.error ??
    deleteMutation.error,
}
```

Then in:

```text
accounts-page.tsx
```

show an inline alert.

Example UX:

```text
Không thể tắt tài khoản:
Account is currently leased.
```

Do not use browser `alert()`.

Use existing card/alert styling.

---

# 28. Better Future Design

Eventually create a standard mutation feedback mechanism.

For now keep it small.

Possible shape:

```typescript
type AccountActionError = {
  action: "validate" | "enable" | "disable" | "delete"
  message: string
}
```

Then:

```typescript
clearError()
```

on the next action.

---

# 29. Acceptance Criteria

```text
PASS: failed account mutation gives visible message
PASS: error disappears or updates on next action
PASS: success still invalidates accounts query
```

## Suggested commit

```text
fix: surface account action failures in frontend
```

---

# 30. Phase 6 — Remove Application Mapping Duplication

## Priority

**P2 — Cleanup**

## Problem

There are duplicate `_to_view()` helpers in:

```text
application/service.py
application/login_service.py
application/health_service.py
```

All map:

```text
ProviderAccount -> AccountView
```

Duplicating this mapping risks drift when `AccountView` gains a field.

---

# 31. Recommended Fix

Create:

```text
vidpool-backend/app/modules/accounts/application/mappers.py
```

Example:

```python
from app.modules.accounts.domain.account import ProviderAccount
from .queries import AccountView


def account_to_view(account: ProviderAccount) -> AccountView:
    return AccountView(
        id=account.id,
        provider_key=account.provider_key,
        display_name=account.display_name,
        external_identity=account.external_identity,
        status=account.status,
        last_used_at=account.last_used_at,
        last_validated_at=account.last_validated_at,
        cooldown_until=account.cooldown_until,
    )
```

Then remove duplicate functions.

Do not put this mapper in infrastructure.

It maps:

```text
domain -> application read model
```

so application layer is the correct location.

## Acceptance criteria

```text
PASS: only one ProviderAccount -> AccountView mapper remains
PASS: tests unchanged
```

## Suggested commit

```text
refactor: centralize account application view mapping
```

---

# 32. Phase 7 — Tauri Sidecar Port TOCTOU Hardening

## Priority

**P3 — Not a blocker**

## Current flow

Desktop currently:

```text
bind 127.0.0.1:0
get selected ephemeral port
drop listener
spawn backend with that port
backend binds that port
```

There is a small race between:

```text
drop(listener)
```

and:

```text
uvicorn bind()
```

Another process can theoretically claim the same port.

The implementation already retries startup, which makes this low risk.

---

# 33. Recommended Near-Term Action

Do not over-engineer this before provider functionality.

Keep the retry mechanism.

Improve diagnostics.

When sidecar startup fails, log:

```text
attempt number
selected port
sidecar spawn success/failure
readiness timeout
child termination result
```

---

# 34. Future Strong Solution

If needed later, use one of:

```text
parent keeps socket open and transfers handle
backend selects its own port and reports it
named pipe / IPC bootstrap handshake
```

For a local desktop app, the cleanest future design is:

```text
backend starts with --port 0
backend determines bound port
backend reports runtime config to parent
```

But Uvicorn integration makes this more involved.

Do not prioritize now.

## Acceptance criteria

For this phase:

```text
PASS: failed startup retries cleanly
PASS: child from failed attempt is terminated
PASS: error message identifies startup attempt
```

---

# 35. Phase 8 — Add a Provider Contract Integration Harness

## Priority

**P3 / immediately before Seedance adapter**

The current provider infrastructure is intentionally empty in production:

```python
ProviderRegistry()
```

The Account Pool should not be considered fully proven until a provider adapter exercises the real lifecycle.

Before Seedance implementation, create a reusable contract test.

---

# 36. ProviderAuthPort Contract to Prove

Every browser-auth provider must support:

```text
provider_key
login_url()
validate_active_session(profile_key)
resolve_identity(profile_key)
validate_persisted_session(profile_key)
```

The contract test should validate behavior, not website-specific selectors.

---

# 37. Generic Provider Contract Tests

Create:

```text
tests/accounts/provider_contract/
```

Suggested reusable test cases:

```text
login URL is non-empty and valid
active session validation returns typed result
identity resolution returns typed identity
persisted session validation works without interactive open session
invalid session does not throw arbitrary transport exceptions
provider key is stable
```

For fake adapter:

```text
run all contract tests
```

Later the Seedance adapter should run the same contract suite with provider-specific fixtures where possible.

---

# 38. Phase 9 — Implement First Production Provider

Only start this after P1/P2 fixes.

Recommended first provider:

```text
Seedance
```

if that is the primary product target.

Do not implement:

```text
generic browser automation engine
generic universal provider DSL
plugin marketplace
provider scripting language
```

yet.

Implement one real adapter cleanly.

---

# 39. Target Seedance Wiring

Target production container:

```python
browser_runtime = BrowserRuntime(...)

seedance_adapter = SeedanceAuthAdapter(
    browser=browser_runtime,
)

providers = ProviderRegistry(
    auth_adapters=[
        seedance_adapter,
    ]
)
```

Depending on the final port design, the adapter may receive:

```text
BrowserSessionPort
```

or invoke browser operations through the profile-aware runtime abstraction.

Do not let the adapter instantiate Playwright directly.

---

# 40. Provider Folder Layout

Recommended:

```text
vidpool-backend/app/modules/accounts/infrastructure/providers/
    __init__.py
    registry.py
    browser_auth_base.py

    seedance/
        __init__.py
        auth.py
        selectors.py
        session_detection.py
```

If provider execution grows beyond auth, later move to:

```text
modules/providers/seedance/
```

But do not migrate early.

---

# 41. Account Pool End-to-End Proof

Before moving on to durable jobs, manually verify:

```text
1. start desktop
2. open Accounts
3. click Add Account
4. choose Seedance
5. browser opens
6. user logs in manually
7. click "Đã đăng nhập"
8. account becomes ACTIVE
9. close VidPool
10. restart VidPool
11. account still exists
12. Validate succeeds without manual login
13. acquire lease
14. release lease
15. mark auth failure
16. account becomes AUTH_REQUIRED
17. Login again
18. existing profile is reused
19. successful relogin returns ACTIVE
20. delete account removes profile
```

This is the real completion condition for Account Pool.

---

# 42. Recommended Test Matrix

## Domain

```text
create
authenticate
auth_required
cooldown
success
temporary failure
rate limit
disable
enable
disabled-state preservation
```

## Repository

```text
CRUD
LRU
never-used first
expired lease cleanup
unique lease
concurrent acquire
save missing account
DB errors propagate
```

## Application

```text
start login
complete login
invalid login
cancel new login
cancel relogin
start relogin
validate
disable
enable
delete
acquire
release
health report
```

## Runtime

```text
open profile
duplicate open
close
delete
delete active profile rejection
run active
run persisted
shutdown
reject after shutdown
context close callback
browser launch fallback
```

## API

```text
401 missing/invalid token
503 no configured token
404 unknown account
404 unknown provider
409 leased
409 invalid state
409 invalid session
503 browser unavailable
204 delete success
```

## Frontend

```text
list accounts
empty state
add
relogin
validation retry
cancel add
cancel relogin
disable
enable
delete confirmation
mutation errors
query invalidation
```

---

# 43. CI Target

Final workflow should effectively enforce:

```text
Frontend:
    pnpm install --frozen-lockfile
    pnpm check

Backend:
    pip install -e ".[dev]"
    ruff check .
    pyright
    pytest -q
    alembic upgrade head
    alembic current

Desktop:
    build sidecar
    verify sidecar
    cargo test --locked
    cargo check --locked
```

Optional later:

```text
ruff format --check .
```

---

# 44. Documentation Cleanup

After completing the stabilization pass, update:

```text
docs/CURRENT_STATUS.md
```

It should say exactly what exists.

Do not mark:

```text
Seedance provider adapter
provider execution
durable jobs
```

as implemented until real code exists and is wired in production.

Also update or archive the previous fix plan:

```text
docs/fixbug/2026-09-17-vidpool-latest-code-review-detailed-fix-plan.md
```

Recommended header:

```text
Status: SUPERSEDED / COMPLETED
Superseded by: <new plan filename>
```

This prevents AI coding agents from following an obsolete P0 list that has already been fixed.

---

# 45. Exact Implementation Order

Follow this order.

## Batch 1 — correctness

```text
1. InvalidAccountState API mapping
2. new-login vs relogin cancellation
3. frontend cancellation refresh
4. tests for all above
```

Run:

```bash
pytest -q
pnpm check
```

Commit.

---

## Batch 2 — concurrency proof

```text
5. acquire-vs-disable concurrency test
6. acquire-vs-delete concurrency test
7. acquire-vs-relogin concurrency test
8. fix only races actually reproduced
```

Run:

```bash
pytest -q
```

Commit.

---

## Batch 3 — quality gates

```text
9. run Ruff locally
10. fix Ruff findings
11. run Pyright locally
12. fix Pyright findings
13. add Ruff to GitHub Actions
14. add Pyright to GitHub Actions
15. update CURRENT_STATUS
```

Run full CI equivalent.

Commit.

---

## Batch 4 — cleanup

```text
16. centralize account_to_view mapping
17. improve frontend mutation error UI
18. improve desktop startup logs
```

Commit.

---

## Batch 5 — provider implementation

```text
19. create Seedance provider auth adapter
20. register adapter in production container
21. verify persistent login session
22. verify restart persistence
23. verify lease/release lifecycle
```

Only after this should the project move into provider execution / job orchestration.

---

# 46. Commands to Run Before Each Commit

## Backend

```bash
cd vidpool-backend

ruff check .
pyright
pytest -q
alembic upgrade head
alembic current
```

## Frontend

```bash
cd vidpool-frontend

pnpm check
```

## Desktop

From repository root:

```bash
python scripts/build-sidecar.py

cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

---

# 47. Final Full Verification

Before declaring Account Pool foundation complete:

```text
[ ] backend tests pass
[ ] frontend tests pass
[ ] frontend lint/type/build pass
[ ] Ruff passes
[ ] Pyright passes
[ ] migration from empty DB passes
[ ] desktop sidecar builds
[ ] Rust tests pass
[ ] Rust check passes
[ ] GitHub Actions passes
[ ] CURRENT_STATUS accurate
```

Then run manual desktop flow:

```text
Add
Cancel
Add again
Login
Restart
Validate
Disable
Enable
Relogin
Delete
```

---

# 48. What Not to Do

Do not:

```text
- redesign AccountService into CQRS now
- replace SQLite with PostgreSQL
- add Redis
- add distributed locking
- create microservices
- add generic provider scripting
- create a second BrowserRuntime abstraction
- expose browser session IDs again
- put Playwright objects into API DTOs
- let repositories commit
- let provider adapters open their own unrelated browser runtime
- implement durable jobs before Account Pool is stable
```

The project is a local single-user desktop application.

Optimize for:

```text
clarity
correctness
testability
easy provider extension
easy maintenance
```

not infrastructure complexity.

---

# 49. Expected State After This Plan

The resulting architecture should look like:

```text
Tauri Desktop
     |
     v
Local FastAPI Sidecar
     |
     +--> session-token protected API
     |
     v
Account Module
     |
     +--> Login Service
     +--> Lease Service
     +--> Health Service
     |
     v
Unit of Work
     |
     v
SQLite
```

Browser:

```text
Account Module
     |
     v
BrowserRuntime
     |
     v
single Playwright owner thread
     |
     v
persistent profile per provider account
```

Provider:

```text
Account Module
     |
     v
ProviderRegistry
     |
     v
SeedanceAuthAdapter
```

Then future job execution can safely use:

```text
job
 |
 v
acquire account lease
 |
 v
provider operation
 |
 +--> success
 +--> auth failure
 +--> temporary failure
 +--> rate limit
 |
 v
update account health
 |
 v
release lease
```

That is the point where VidPool is ready to move from "Account Pool foundation" to actual provider automation.

---

# 50. Final Recommendation

Do not perform another large architecture migration.

The current Account Pool architecture is already good enough.

The immediate work should be:

```text
1. fix cancellation semantics
2. fix API domain-error mapping
3. prove cross-operation lease concurrency
4. enforce Ruff/Pyright in CI
5. clean minor duplication / UX
6. implement the first production provider
```

Once the first real provider passes the full lifecycle:

```text
login
persist
restart
validate
lease
execute
release
relogin
delete
```

freeze the Account Pool architecture unless a real production problem requires a change.
