# VidPool Account Pool + Browser Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build VidPool's first reusable Account Pool subsystem so users can add authorized provider accounts by logging in through an isolated persistent browser profile, keep sessions across app restarts, and safely lease eligible accounts to future provider jobs.

**Architecture:** Account Pool is a backend module independent from Project and Durable Job. Domain/application own account state, leases, selection policy, and ports; SQLAlchemy, Playwright browser sessions, and provider-specific login detection remain infrastructure adapters. React only uses protected local FastAPI management endpoints and never sees cookies, tokens, profile paths, or provider secrets.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2, Alembic, SQLite, Playwright Python, Microsoft Edge/Google Chrome channels, pytest, React 19, TypeScript, Zod, TanStack Query, Vitest, Tauri v2, PyInstaller.

**Spec:** `docs/superpowers/specs/2026-09-17-account-pool-browser-session-design.md`

## Global Constraints

- Read and follow `AGENTS.md` before implementation.
- Complete the desktop-foundation fix plan first; do not build this feature on a red desktop CI baseline.
- VidPool remains desktop-first, single-user, local-first.
- Current verified target is Windows x64.
- Tauri remains lifecycle/shell only.
- React never calls provider websites directly.
- FastAPI routes contain transport logic only.
- Domain/application must not import FastAPI, SQLAlchemy, Playwright, Tauri, provider SDKs, or OS APIs.
- Provider-specific selectors, URLs, cookies, storage keys, and identity parsing stay inside provider infrastructure adapters.
- Browser login must be user-driven; VidPool must not store Gmail/provider passwords or bypass 2FA/CAPTCHA.
- Credential/account scheduling may only use authorized accounts and must not bypass provider quotas/rate limits.
- A quota/rate-limit error must not trigger automatic reacquisition of another account for the same operation.
- Browser profiles are persistent and isolated per account.
- Do not reuse the user's normal Chrome/Edge profile.
- Do not expose browser profile paths, cookies, localStorage, tokens, or authorization data to React or logs.
- SQLite stores metadata/leases only.
- `BUSY` is not a persisted account status.
- One unexpired lease per account.
- MVP selection policy is LRU; no weighted scheduler.
- No Redis/Celery/Postgres/broker/microservices.
- Every behavior change follows RED -> GREEN -> REFACTOR.
- Every task ends with focused tests and a logical commit.

---

# Preconditions

Before Task 1:

```powershell
cd vidpool-backend
pytest -q
alembic current
cd ../vidpool-frontend
pnpm check
cd ..
python scripts/build-sidecar.py
cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

Expected: all commands exit successfully.

If the repository does not yet contain the foundation fixes from the earlier plan, implement that plan first.

---

# Target source layout

Create one backend bounded module rather than a global `services/` folder:

```text
vidpool-backend/app/modules/accounts/
├── __init__.py
├── domain/
│   ├── __init__.py
│   ├── account.py
│   ├── errors.py
│   ├── lease.py
│   └── values.py
├── application/
│   ├── __init__.py
│   ├── commands.py
│   ├── ports.py
│   ├── queries.py
│   └── service.py
├── infrastructure/
│   ├── __init__.py
│   ├── browser/
│   │   ├── __init__.py
│   │   ├── playwright_session.py
│   │   └── profile_paths.py
│   ├── persistence/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── repository.py
│   │   └── mapper.py
│   └── providers/
│       ├── __init__.py
│       └── registry.py
└── api/
    ├── __init__.py
    ├── router.py
    └── schemas.py
```

Tests:

```text
vidpool-backend/tests/accounts/
├── test_account_domain.py
├── test_account_service.py
├── test_account_repository.py
├── test_browser_profile_paths.py
├── test_playwright_session_manager.py
├── test_account_api.py
└── fakes.py
```

Frontend:

```text
vidpool-frontend/src/features/accounts/
├── accounts-api.ts
├── accounts-api.test.ts
├── accounts-page.tsx
├── accounts-page.test.tsx
├── add-account-dialog.tsx
├── account-row.tsx
└── types.ts
```

---

# Task 1: Add Account Pool design/ADR to the repository

**Files:**
- Create: `docs/superpowers/specs/2026-09-17-account-pool-browser-session-design.md`
- Create: `docs/adr/ADR-XXXX-account-pool-browser-sessions.md`
- Modify: `docs/CURRENT_STATUS.md`

**Interfaces:**
- Produces the architectural contract all later tasks implement.

- [ ] **Step 1: Save the approved design spec**

Copy the approved design document exactly into:

```text
docs/superpowers/specs/2026-09-17-account-pool-browser-session-design.md
```

- [ ] **Step 2: Add an ADR**

Create an ADR with these decisions:

```markdown
# ADR: Account Pool uses isolated persistent browser profiles

## Context

VidPool needs a no-setup account login flow for browser-backed providers.
Users should log in normally and keep the session across app restarts.

## Decision

- Account metadata and lease state live in SQLite.
- Browser session state lives in a dedicated persistent Chromium profile.
- Playwright is an infrastructure adapter.
- Windows uses Microsoft Edge first and Google Chrome as fallback.
- Every account receives an isolated profile.
- Account Pool does not store provider passwords.
- `BUSY` is derived from active lease state, not persisted on the account.
- Rate-limit/quota failures do not automatically fail over to another account.

## Consequences

- Session survives app restart without cookie export/import.
- Browser automation remains provider-infrastructure detail.
- Profile directories are sensitive local data.
- Playwright packaging must be verified with PyInstaller.
```

Use the next ADR number already established by the repository instead of literally naming the file `ADR-XXXX...`.

- [ ] **Step 3: Mark the feature as planned, not implemented**

In `docs/CURRENT_STATUS.md`, add Account Pool/Browser Session under planned/not implemented.

Do not mark it implemented yet.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs docs/adr docs/CURRENT_STATUS.md
git commit -m "docs: define account pool browser session architecture"
```

**Acceptance criteria:**

- Architectural choice is documented before production code.
- Future provider adapters can reference the spec.
- Current-status document remains truthful.

---

# Task 2: Add Playwright runtime dependency and prove packaging compatibility

**Files:**
- Modify: `vidpool-backend/pyproject.toml`
- Modify: `scripts/build-sidecar.py`
- Create: `vidpool-backend/tests/accounts/test_playwright_packaging.py`

**Interfaces:**
- Produces a backend runtime in which `playwright.sync_api` is available from both source execution and the packaged sidecar.
- Browser channels used later: `msedge`, then `chrome`.

- [ ] **Step 1: Write a RED dependency smoke test**

Create:

```python
def test_playwright_sync_api_is_importable() -> None:
    from playwright.sync_api import sync_playwright

    assert callable(sync_playwright)
```

- [ ] **Step 2: Verify RED**

```powershell
cd vidpool-backend
pytest tests/accounts/test_playwright_packaging.py -q
```

Expected before dependency change: import failure for `playwright`.

- [ ] **Step 3: Add Playwright dependency**

In `pyproject.toml` add a bounded dependency:

```toml
"playwright>=1.55,<2",
```

Do not add `pytest-playwright`; production code needs the library, while tests will mock the browser boundary unless explicitly performing a browser smoke test.

- [ ] **Step 4: Install and run test**

```powershell
python -m pip install -e ".[dev]"
pytest tests/accounts/test_playwright_packaging.py -q
```

Expected: PASS.

- [ ] **Step 5: Update sidecar build so Playwright driver data is collected**

Inspect the existing PyInstaller command in `scripts/build-sidecar.py`.

Add the minimum PyInstaller collection required for the current Playwright package, for example:

```text
--collect-all playwright
```

Do not bundle Chromium in this task.

- [ ] **Step 6: Build packaged sidecar**

```powershell
cd ..
python scripts/build-sidecar.py
```

Expected:

```text
vidpool-frontend/src-tauri/binaries/vidpool-backend-x86_64-pc-windows-msvc.exe
```

exists and is non-empty.

- [ ] **Step 7: Run packaged backend health smoke test**

Start the packaged backend on a temporary loopback port with a test session token, call `/api/health`, then terminate it.

Expected: HTTP 200.

This verifies the PyInstaller change did not break startup.

- [ ] **Step 8: Commit**

```bash
git add vidpool-backend/pyproject.toml scripts/build-sidecar.py vidpool-backend/tests/accounts/test_playwright_packaging.py
git commit -m "build: package Playwright runtime with backend sidecar"
```

**Acceptance criteria:**

- Source backend imports Playwright.
- PyInstaller sidecar still starts.
- No Playwright browser download is required.

---

# Task 3: Implement Account domain model and state transitions

**Files:**
- Create: `vidpool-backend/app/modules/accounts/domain/values.py`
- Create: `vidpool-backend/app/modules/accounts/domain/account.py`
- Create: `vidpool-backend/app/modules/accounts/domain/lease.py`
- Create: `vidpool-backend/app/modules/accounts/domain/errors.py`
- Create: `vidpool-backend/tests/accounts/test_account_domain.py`

**Interfaces:**
- Produces:
  - `AccountId`
  - `AccountStatus`
  - `ProviderAccount`
  - `AccountLease`
  - account domain errors

- [ ] **Step 1: Write RED status-transition tests**

Test these exact behaviors:

```python
def test_new_account_requires_authentication() -> None:
    account = ProviderAccount.create(
        provider_key="fake-provider",
        profile_key="browser-profile/fake-provider/account-1",
    )
    assert account.status is AccountStatus.AUTH_REQUIRED


def test_successful_validation_activates_account() -> None:
    account = ProviderAccount.create(...)
    account.mark_authenticated(
        display_name="User One",
        external_identity="user-1",
        now=NOW,
    )
    assert account.status is AccountStatus.ACTIVE
    assert account.last_validated_at == NOW


def test_invalid_session_requires_authentication_again() -> None:
    account = active_account()
    account.mark_auth_required(now=NOW)
    assert account.status is AccountStatus.AUTH_REQUIRED


def test_disabled_account_stays_disabled_until_explicit_enable() -> None:
    account = active_account()
    account.disable(now=NOW)
    assert account.status is AccountStatus.DISABLED

    account.enable(now=LATER)
    assert account.status is AccountStatus.AUTH_REQUIRED
```

Enable returns to `AUTH_REQUIRED`, not blindly `ACTIVE`, because the session must be validated again.

- [ ] **Step 2: Verify RED**

```powershell
pytest tests/accounts/test_account_domain.py -q
```

Expected: import/module failures.

- [ ] **Step 3: Implement values**

Use:

```python
class AccountStatus(StrEnum):
    AUTH_REQUIRED = "auth_required"
    ACTIVE = "active"
    COOLDOWN = "cooldown"
    DISABLED = "disabled"
```

Use UUID-backed account/lease IDs.

- [ ] **Step 4: Implement ProviderAccount**

Required methods:

```python
ProviderAccount.create(...)
mark_authenticated(...)
mark_auth_required(...)
mark_cooldown(...)
clear_elapsed_cooldown(...)
record_success(...)
record_failure(...)
disable(...)
enable(...)
```

Domain methods must not know HTTP status codes or provider exception classes.

- [ ] **Step 5: Implement AccountLease**

Fields:

```python
id
account_id
owner_id
acquired_at
expires_at
```

Method:

```python
def is_expired(self, now: datetime) -> bool:
    return self.expires_at <= now
```

- [ ] **Step 6: Run domain tests**

```powershell
pytest tests/accounts/test_account_domain.py -q
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add vidpool-backend/app/modules/accounts/domain vidpool-backend/tests/accounts/test_account_domain.py
git commit -m "feat: add account pool domain model"
```

**Acceptance criteria:**

- No infrastructure imports exist in domain files.
- No persisted `BUSY` state exists.
- State transitions are explicit and tested.

---

# Task 4: Define application ports and fake adapters

**Files:**
- Create: `vidpool-backend/app/modules/accounts/application/ports.py`
- Create: `vidpool-backend/tests/accounts/fakes.py`

**Interfaces:**
- Produces:
  - `AccountRepositoryPort`
  - `BrowserSessionPort`
  - `ProviderAuthPort`
  - `ProviderRegistryPort`
  - DTO/value results used by application service

- [ ] **Step 1: Write compile-time application test imports**

Create/update `test_account_service.py` with imports for all intended ports.

Run it before implementing and verify import failure.

- [ ] **Step 2: Define AccountRepositoryPort**

Required methods:

```python
def add(self, account: ProviderAccount) -> None: ...
def get(self, account_id: AccountId) -> ProviderAccount | None: ...
def list(self, provider_key: str | None = None) -> list[ProviderAccount]: ...
def save(self, account: ProviderAccount) -> None: ...
def delete(self, account_id: AccountId) -> None: ...

def acquire_lru(
    self,
    provider_key: str,
    owner_id: str,
    now: datetime,
    expires_at: datetime,
) -> tuple[ProviderAccount, AccountLease] | None: ...

def release_lease(self, lease_id: UUID) -> bool: ...
def get_lease(self, lease_id: UUID) -> AccountLease | None: ...
def has_active_lease(self, account_id: AccountId, now: datetime) -> bool: ...
```

Atomic lease acquisition belongs behind the repository port.

- [ ] **Step 3: Define BrowserSessionPort**

Use opaque application handles:

```python
@dataclass(frozen=True)
class BrowserSessionHandle:
    id: str
    profile_key: str


class BrowserSessionPort(Protocol):
    def open_login(
        self,
        *,
        provider_key: str,
        profile_key: str,
        login_url: str,
    ) -> BrowserSessionHandle: ...

    def close(self, session_id: str) -> None: ...
    def has_open_session(self, profile_key: str) -> bool: ...
    def delete_profile(self, profile_key: str) -> None: ...
```

Do not expose Playwright `Page` or `BrowserContext`.

- [ ] **Step 4: Define ProviderAuthPort**

Provider auth adapter should receive `profile_key`, not a Playwright object:

```python
@dataclass(frozen=True)
class SessionValidation:
    valid: bool


@dataclass(frozen=True)
class ProviderIdentity:
    display_name: str
    external_identity: str


class ProviderAuthPort(Protocol):
    provider_key: str

    def login_url(self) -> str: ...
    def validate_session(self, profile_key: str) -> SessionValidation: ...
    def resolve_identity(self, profile_key: str) -> ProviderIdentity: ...
```

Provider adapter may internally use BrowserSession infrastructure through its own composition wiring, but application does not see browser objects.

- [ ] **Step 5: Define ProviderRegistryPort**

```python
@dataclass(frozen=True)
class ProviderDefinition:
    key: str
    display_name: str
    auth_kind: str


class ProviderRegistryPort(Protocol):
    def list(self) -> list[ProviderDefinition]: ...
    def get_auth(self, provider_key: str) -> ProviderAuthPort | None: ...
```

- [ ] **Step 6: Implement in-memory fakes for application tests**

Fakes must track calls and mutable state without importing SQLAlchemy/Playwright.

- [ ] **Step 7: Run tests**

```powershell
pytest tests/accounts/test_account_service.py -q
```

Expected: imports/pass for current port tests.

- [ ] **Step 8: Commit**

```bash
git add vidpool-backend/app/modules/accounts/application/ports.py vidpool-backend/tests/accounts
git commit -m "feat: define account pool application ports"
```

---

# Task 5: Add SQLAlchemy account/lease persistence and Alembic migration

**Files:**
- Create: `vidpool-backend/app/modules/accounts/infrastructure/persistence/models.py`
- Create: `vidpool-backend/app/modules/accounts/infrastructure/persistence/mapper.py`
- Create: `vidpool-backend/app/modules/accounts/infrastructure/persistence/repository.py`
- Modify: Alembic model import/composition file used by current migration environment
- Create: new Alembic revision
- Create: `vidpool-backend/tests/accounts/test_account_repository.py`

**Interfaces:**
- Implements `AccountRepositoryPort`.

- [ ] **Step 1: Write RED repository persistence test**

Test round-trip of:

```text
provider_key
display_name
external_identity
status
profile_key
timestamps
failure count
cooldown
```

Expected before implementation: failure.

- [ ] **Step 2: Define provider_accounts SQLAlchemy model**

Columns:

```text
id                  VARCHAR/UUID textual PK
provider_key        VARCHAR NOT NULL
display_name        VARCHAR NULL
external_identity   VARCHAR NULL
status              VARCHAR NOT NULL
profile_key         VARCHAR NOT NULL UNIQUE
last_used_at        DATETIME NULL
last_validated_at   DATETIME NULL
last_success_at     DATETIME NULL
last_failure_at     DATETIME NULL
consecutive_failures INTEGER NOT NULL DEFAULT 0
cooldown_until      DATETIME NULL
created_at          DATETIME NOT NULL
updated_at          DATETIME NOT NULL
```

Indexes:

```text
(provider_key, status)
last_used_at
cooldown_until
```

- [ ] **Step 3: Define account_leases model**

Columns:

```text
id          VARCHAR PK
account_id  VARCHAR NOT NULL UNIQUE FK provider_accounts(id) ON DELETE CASCADE
owner_id    VARCHAR NOT NULL
acquired_at DATETIME NOT NULL
expires_at  DATETIME NOT NULL
```

Index `expires_at`.

The unique `account_id` ensures one persisted lease row per account.

- [ ] **Step 4: Add mapper**

Mapping functions:

```python
account_to_model(...)
account_from_model(...)
lease_from_model(...)
```

Do not return SQLAlchemy models from the repository.

- [ ] **Step 5: Generate Alembic migration**

```powershell
cd vidpool-backend
alembic revision --autogenerate -m "add provider accounts and leases"
```

Review the generated migration manually.

- [ ] **Step 6: Test migration from empty DB**

Use a temporary `VIDPOOL_DATA_DIR`.

Run:

```powershell
alembic upgrade head
alembic current
```

Expected: migration head.

- [ ] **Step 7: Implement repository CRUD**

Implement add/get/list/save/delete.

- [ ] **Step 8: Run focused repository tests**

```powershell
pytest tests/accounts/test_account_repository.py -q
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add vidpool-backend/app/modules/accounts/infrastructure/persistence vidpool-backend/alembic vidpool-backend/tests/accounts/test_account_repository.py
git commit -m "feat: persist provider accounts and leases"
```

**Acceptance criteria:**

- DB contains no passwords/cookies/tokens.
- Profile path itself is not required; only opaque profile_key.
- SQLAlchemy objects do not escape infrastructure.

---

# Task 6: Implement isolated browser profile path resolution

**Files:**
- Create: `vidpool-backend/app/modules/accounts/infrastructure/browser/profile_paths.py`
- Modify: `vidpool-backend/app/infrastructure/persistence/paths.py`
- Create: `vidpool-backend/tests/accounts/test_browser_profile_paths.py`

**Interfaces:**
- Produces:
  - `get_data_dir()`
  - `BrowserProfilePathResolver.resolve(profile_key)`

- [ ] **Step 1: Refactor common data directory behavior with test**

Current database path logic already honors `VIDPOOL_DATA_DIR`.

Introduce:

```python
def get_data_dir() -> Path:
    ...
```

and make `get_database_path()` call it.

Test that `VIDPOOL_DATA_DIR` still works exactly as before.

- [ ] **Step 2: Write profile path isolation tests**

Examples:

```python
resolver.resolve("browser-profile/provider-a/account-1")
```

must resolve under:

```text
<data-dir>/browser-profiles/provider-a/account-1
```

Reject values containing:

```text
..
absolute paths
drive letters
backslashes as injected separators
```

- [ ] **Step 3: Implement resolver**

Only allow internally generated components matching:

```text
[a-z0-9][a-z0-9._-]*
```

Account IDs are generated UUID text.

- [ ] **Step 4: Verify tests**

```powershell
pytest tests/accounts/test_browser_profile_paths.py -q
pytest tests/test_persistence.py -q
```

Use the current persistence test filename if different.

- [ ] **Step 5: Commit**

```bash
git add vidpool-backend/app/infrastructure/persistence/paths.py vidpool-backend/app/modules/accounts/infrastructure/browser/profile_paths.py vidpool-backend/tests/accounts/test_browser_profile_paths.py
git commit -m "feat: isolate persistent browser profiles per account"
```

---

# Task 7: Implement Playwright persistent browser session manager

**Files:**
- Create: `vidpool-backend/app/modules/accounts/infrastructure/browser/playwright_session.py`
- Create: `vidpool-backend/tests/accounts/test_playwright_session_manager.py`

**Interfaces:**
- Implements `BrowserSessionPort`.
- Browser channel order:
  1. `msedge`
  2. `chrome`

- [ ] **Step 1: Write RED manager tests around an injected browser launcher**

Do not launch a real browser in unit tests.

Test:

```text
open_login stores one live session for profile
second open for same profile raises AccountInUse/BrowserProfileInUse
close removes live session
delete_profile rejects an open profile
browser launch failures normalize to BrowserUnavailable
```

- [ ] **Step 2: Define BrowserUnavailable and BrowserProfileInUse errors**

Keep Playwright exception classes out of application/domain.

- [ ] **Step 3: Implement PlaywrightBrowserSessionManager**

Responsibilities:

```text
resolve profile path
start Playwright
try Edge persistent context
fallback Chrome persistent context
open login URL
hold context in in-memory map
return opaque session handle
```

Use headed mode:

```python
headless=False
```

Use persistent context:

```python
chromium.launch_persistent_context(
    user_data_dir=str(profile_path),
    channel=channel,
    headless=False,
)
```

- [ ] **Step 4: Do not use the user's normal browser profile**

Every context must receive the VidPool-resolved account profile directory.

- [ ] **Step 5: Implement shutdown**

Add:

```python
def close_all(self) -> None:
    ...
```

It closes all contexts and Playwright runtime resources without deleting profile directories.

- [ ] **Step 6: Run unit tests**

```powershell
pytest tests/accounts/test_playwright_session_manager.py -q
```

Expected: PASS.

- [ ] **Step 7: Add manual local browser smoke test script/test marker**

Run manually on Windows:

```powershell
python -c "<small project-local smoke entrypoint>"
```

Expected:

- Edge opens;
- page navigates to a harmless test URL;
- closing context leaves profile directory;
- opening the same profile again works.

Do not run provider login in automated CI.

- [ ] **Step 8: Commit**

```bash
git add vidpool-backend/app/modules/accounts/infrastructure/browser vidpool-backend/tests/accounts/test_playwright_session_manager.py
git commit -m "feat: manage persistent browser sessions with Playwright"
```

---

# Task 8: Implement provider registry without provider logic leaking into Account Pool

**Files:**
- Create: `vidpool-backend/app/modules/accounts/infrastructure/providers/registry.py`
- Create: `vidpool-backend/tests/accounts/test_provider_registry.py`

**Interfaces:**
- Implements `ProviderRegistryPort`.

- [ ] **Step 1: Write RED registry tests**

Test:

```python
registry.list()
registry.get_auth("registered")
registry.get_auth("unknown") is None
```

- [ ] **Step 2: Implement registry**

Constructor receives adapters explicitly:

```python
ProviderRegistry(auth_adapters=[...])
```

Build mapping by stable `provider_key`.

Reject duplicate provider keys at startup.

- [ ] **Step 3: Do not add real web-provider selectors in this task**

Production registry may initially be empty until the first provider adapter is implemented.

Application/account pool remains complete and testable using fakes.

- [ ] **Step 4: Run tests**

```powershell
pytest tests/accounts/test_provider_registry.py -q
```

- [ ] **Step 5: Commit**

```bash
git add vidpool-backend/app/modules/accounts/infrastructure/providers/registry.py vidpool-backend/tests/accounts/test_provider_registry.py
git commit -m "feat: add provider auth registry"
```

**Acceptance criteria:**

- No `if provider == ...` chains.
- No provider URLs/selectors in account service.

---

# Task 9: Implement login lifecycle application service

**Files:**
- Create: `vidpool-backend/app/modules/accounts/application/commands.py`
- Create: `vidpool-backend/app/modules/accounts/application/queries.py`
- Create: `vidpool-backend/app/modules/accounts/application/service.py`
- Modify: `vidpool-backend/tests/accounts/test_account_service.py`

**Interfaces:**
- Produces `AccountService` methods:

```python
list_providers()
list_accounts(provider_key=None)
get_account(account_id)

start_login(provider_key)
complete_login(account_id, browser_session_id)
cancel_login(account_id, browser_session_id)
start_relogin(account_id)

validate_account(account_id)
enable_account(account_id)
disable_account(account_id)
delete_account(account_id)
```

- [ ] **Step 1: Write RED start-login test**

Expected flow:

```text
registry provider exists
-> create AUTH_REQUIRED account
-> profile_key generated
-> repository.add
-> browser.open_login(provider login URL)
-> return account + browser_session_id
```

- [ ] **Step 2: Verify RED**

```powershell
pytest tests/accounts/test_account_service.py::test_start_login_creates_auth_required_account_and_opens_profile -q
```

- [ ] **Step 3: Implement start_login minimally**

Use generated UUID account ID and deterministic profile key:

```python
f"browser-profile/{provider_key}/{account_id}"
```

If browser opening fails after repository insert, keep the account `AUTH_REQUIRED` so the user can retry; do not orphan a hidden record.

- [ ] **Step 4: Write RED complete-login success test**

Fake provider:

```text
validate_session -> valid
resolve_identity -> display/external ID
```

Expected:

```text
account ACTIVE
identity stored
last_validated_at set
browser closed
```

- [ ] **Step 5: Implement complete_login**

Order:

```text
validate
resolve identity
save account ACTIVE
close browser
```

If validation fails:

```text
keep AUTH_REQUIRED
close browser
raise SessionInvalid
```

- [ ] **Step 6: Write and implement cancel-login behavior**

Cancel:

```text
close browser
keep account AUTH_REQUIRED
```

Do not delete profile automatically; partial login state may be useful for retry.

- [ ] **Step 7: Write and implement relogin**

Rules:

```text
same account ID
same profile key
provider must still exist
active lease -> AccountInUse
open same profile
```

- [ ] **Step 8: Write and implement validate_account**

Use provider auth adapter.

Valid:

```text
last_validated_at updated
AUTH_REQUIRED/COOLDOWN -> ACTIVE only if not user-disabled
```

Invalid:

```text
AUTH_REQUIRED
```

Disabled account remains disabled.

- [ ] **Step 9: Implement enable/disable/delete**

Disable:

```text
reject if active lease
set DISABLED
```

Enable:

```text
set AUTH_REQUIRED
```

Delete:

```text
reject active lease
close profile if open
delete profile directory
delete DB account
```

- [ ] **Step 10: Run service tests**

```powershell
pytest tests/accounts/test_account_service.py -q
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add vidpool-backend/app/modules/accounts/application vidpool-backend/tests/accounts/test_account_service.py
git commit -m "feat: add account login lifecycle"
```

---

# Task 10: Implement durable LRU account leasing

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/infrastructure/persistence/repository.py`
- Modify: `vidpool-backend/app/modules/accounts/application/service.py`
- Modify: `vidpool-backend/tests/accounts/test_account_repository.py`
- Modify: `vidpool-backend/tests/accounts/test_account_service.py`

**Interfaces:**
- Produces:

```python
AccountService.acquire(
    provider_key: str,
    owner_id: str,
    ttl: timedelta,
) -> AccountLeaseView

AccountService.release(lease_id: UUID) -> None
```

`AccountLeaseView` includes account ID/provider/profile key internally for future provider execution, but is not exposed to React API.

- [ ] **Step 1: Write RED LRU selection test**

Seed:

```text
A ACTIVE last_used 10:00
B ACTIVE last_used 09:00
C DISABLED
D COOLDOWN until future
```

Expected: B leased.

- [ ] **Step 2: Write RED active-lease exclusion test**

Lease B, acquire again.

Expected: A leased.

- [ ] **Step 3: Write RED expired-lease recovery test**

Persist lease with `expires_at <= now`.

Expected: account becomes eligible and stale lease is replaced/removed.

- [ ] **Step 4: Implement atomic repository acquisition**

Inside a DB transaction:

```text
remove/ignore expired lease rows
select eligible accounts LRU
attempt lease insert
unique account_id protects race
update last_used_at
commit
```

If a unique conflict occurs because another caller won, retry with remaining candidates.

Do not rely only on an in-memory lock.

- [ ] **Step 5: Implement release**

Delete lease by ID.

Unknown lease:

```text
LeaseNotFound
```

Expired lease may be cleaned up and report `LeaseExpired` if the caller presents it after expiration.

- [ ] **Step 6: Run repository/service tests**

```powershell
pytest tests/accounts/test_account_repository.py tests/accounts/test_account_service.py -q
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add vidpool-backend/app/modules/accounts/infrastructure/persistence/repository.py vidpool-backend/app/modules/accounts/application/service.py vidpool-backend/tests/accounts
git commit -m "feat: lease provider accounts with LRU selection"
```

**Acceptance criteria:**

- two active callers cannot successfully lease the same account;
- expired lease is recoverable after app restart;
- no `BUSY` account state is persisted.

---

# Task 11: Add health/failure/cooldown reporting without quota bypass

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/application/service.py`
- Modify: `vidpool-backend/tests/accounts/test_account_service.py`

**Interfaces:**
- Produces:

```python
report_success(account_id, now)
report_auth_failure(account_id, now)
report_temporary_failure(account_id, now, cooldown_until=None)
report_rate_limited(account_id, now, retry_after=None)
```

- [ ] **Step 1: Write RED success-reset test**

After consecutive failures:

```text
report_success
-> consecutive_failures = 0
-> last_success_at = now
-> ACTIVE
```

- [ ] **Step 2: Write RED auth failure test**

Expected:

```text
AUTH_REQUIRED
last_failure_at updated
```

- [ ] **Step 3: Write RED temporary failure test**

For threshold 3:

```text
first/second failure -> increment count
third failure -> COOLDOWN
```

Use a fixed default cooldown such as 5 minutes for internal transient-failure protection.

This is health backoff, not quota evasion.

- [ ] **Step 4: Write RED rate-limit test**

Expected:

```text
record cooldown/retry-after metadata
current call returns/fails
NO automatic AccountService.acquire() call
```

Assert fake repository/browser/provider receive no request to choose another account.

- [ ] **Step 5: Implement reporting methods**

Do not make account service call provider execution.

- [ ] **Step 6: Run tests**

```powershell
pytest tests/accounts/test_account_service.py -q
```

- [ ] **Step 7: Commit**

```bash
git add vidpool-backend/app/modules/accounts/application/service.py vidpool-backend/tests/accounts/test_account_service.py
git commit -m "feat: track account health and cooldown"
```

---

# Task 12: Wire Account Pool in the backend composition root

**Files:**
- Create/Modify: backend composition root under `app/core/` following current dependency-injection rule
- Modify: `vidpool-backend/app/main.py`
- Modify: backend shutdown/lifespan wiring
- Create: `vidpool-backend/tests/accounts/test_account_wiring.py`

**Interfaces:**
- Produces one application-scoped `AccountService`.

- [ ] **Step 1: Read current composition pattern**

Use the existing app factory/config/database initialization. Do not introduce a service locator.

- [ ] **Step 2: Write RED wiring test**

Build app with test DB and fake browser/provider registry.

Assert AccountService resolves and uses provided ports.

- [ ] **Step 3: Add composition**

Wire:

```text
SQLAlchemyAccountRepository
PlaywrightBrowserSessionManager
ProviderRegistry
AccountService
```

Provider registry may contain zero production adapters at this stage.

- [ ] **Step 4: Register backend shutdown cleanup**

On FastAPI lifespan shutdown call:

```python
browser_session_manager.close_all()
```

Do not delete profile directories.

- [ ] **Step 5: Run wiring + existing backend tests**

```powershell
pytest tests/accounts/test_account_wiring.py -q
pytest -q
```

- [ ] **Step 6: Commit**

```bash
git add vidpool-backend/app/core vidpool-backend/app/main.py vidpool-backend/tests/accounts/test_account_wiring.py
git commit -m "feat: wire account pool into backend runtime"
```

---

# Task 13: Add protected FastAPI management API

**Files:**
- Create: `vidpool-backend/app/modules/accounts/api/schemas.py`
- Create: `vidpool-backend/app/modules/accounts/api/router.py`
- Modify: protected API router composition
- Create: `vidpool-backend/tests/accounts/test_account_api.py`

**Interfaces:**
- Protected endpoints only.

- [ ] **Step 1: Define response schema that excludes sensitive fields**

Account response:

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

Never include:

```text
profile_key
absolute profile path
cookies
tokens
browser session storage
lease owner details
```

- [ ] **Step 2: Write RED provider/account list API tests**

Endpoints:

```http
GET /api/providers
GET /api/accounts
GET /api/accounts/{account_id}
```

Verify app session token is required.

- [ ] **Step 3: Add login routes**

```http
POST /api/providers/{provider_key}/accounts/login/start
POST /api/accounts/{account_id}/login/complete
POST /api/accounts/{account_id}/login/cancel
POST /api/accounts/{account_id}/relogin/start
```

Start response:

```json
{
  "accountId": "...",
  "browserSessionId": "...",
  "status": "waiting_for_user"
}
```

The browser-session ID is ephemeral but not a provider credential.

- [ ] **Step 4: Add management routes**

```http
POST /api/accounts/{id}/validate
POST /api/accounts/{id}/enable
POST /api/accounts/{id}/disable
DELETE /api/accounts/{id}
```

- [ ] **Step 5: Map normalized errors**

Examples:

```text
ProviderNotRegistered -> 404
AccountNotFound -> 404
AccountInUse -> 409
SessionInvalid -> 409
BrowserUnavailable -> 503
```

Do not send raw Playwright stack traces to client.

- [ ] **Step 6: Run API tests**

```powershell
pytest tests/accounts/test_account_api.py -q
```

- [ ] **Step 7: Run full backend tests**

```powershell
pytest -q
alembic current
```

- [ ] **Step 8: Commit**

```bash
git add vidpool-backend/app/modules/accounts/api vidpool-backend/app/api vidpool-backend/tests/accounts/test_account_api.py
git commit -m "feat: expose protected account management API"
```

---

# Task 14: Add frontend typed Account API client

**Files:**
- Create: `vidpool-frontend/src/features/accounts/types.ts`
- Create: `vidpool-frontend/src/features/accounts/accounts-api.ts`
- Create: `vidpool-frontend/src/features/accounts/accounts-api.test.ts`

**Interfaces:**
- Uses existing runtime-scoped authenticated ApiClient.

- [ ] **Step 1: Write RED schema tests**

Zod schema for:

```text
ProviderSummary
AccountSummary
StartLoginResponse
```

Reject unexpected secret fields if practical by using strict schemas.

- [ ] **Step 2: Implement Account API functions**

Functions:

```ts
listProviders(client)
listAccounts(client)
startLogin(client, providerKey)
completeLogin(client, accountId, browserSessionId)
cancelLogin(client, accountId, browserSessionId)
startRelogin(client, accountId)
validateAccount(client, accountId)
enableAccount(client, accountId)
disableAccount(client, accountId)
deleteAccount(client, accountId)
```

- [ ] **Step 3: Run tests**

```powershell
cd vidpool-frontend
pnpm vitest run src/features/accounts/accounts-api.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add vidpool-frontend/src/features/accounts
git commit -m "feat: add typed account management client"
```

---

# Task 15: Build the no-setup Add Account UI

**Files:**
- Create: `vidpool-frontend/src/features/accounts/accounts-page.tsx`
- Create: `vidpool-frontend/src/features/accounts/add-account-dialog.tsx`
- Create: `vidpool-frontend/src/features/accounts/account-row.tsx`
- Create: `vidpool-frontend/src/features/accounts/accounts-page.test.tsx`
- Modify: `vidpool-frontend/src/App.tsx`

**Interfaces:**
- User-facing UX:
  - `+ Add account`
  - choose provider
  - `Login`
  - browser opens externally
  - `Đã đăng nhập`
  - account becomes ACTIVE

- [ ] **Step 1: Write RED empty-state test**

Expected:

```text
Accounts
No accounts yet
+ Add account
```

- [ ] **Step 2: Implement account list**

Use TanStack Query if already present in the app runtime.

Show:

```text
display name
provider
status
last validation
cooldown timestamp when relevant
```

Do not display profile/session details.

- [ ] **Step 3: Write RED add flow test**

Mock API:

```text
providers list -> Provider A
startLogin -> waiting_for_user
completeLogin -> ACTIVE account
```

Expected interaction:

```text
click Add
choose Provider A
click Login
show "Hoàn tất đăng nhập trong cửa sổ trình duyệt"
click "Đã đăng nhập"
refresh accounts
```

- [ ] **Step 4: Implement AddAccountDialog state machine**

UI states:

```text
choose_provider
starting
waiting_for_user
validating
completed
error
```

Do not expose authentication mechanics.

- [ ] **Step 5: Add account-row actions**

State actions:

```text
AUTH_REQUIRED -> Login again
ACTIVE -> Validate, Disable, Delete
COOLDOWN -> show availability + Disable/Delete
DISABLED -> Enable/Delete
```

Delete requires confirmation because it deletes the stored browser profile/session.

- [ ] **Step 6: Implement relogin flow**

Uses same account ID/profile.

- [ ] **Step 7: Run focused UI tests**

```powershell
pnpm vitest run src/features/accounts
```

- [ ] **Step 8: Run full frontend gate**

```powershell
pnpm check
```

- [ ] **Step 9: Commit**

```bash
git add vidpool-frontend/src/features/accounts vidpool-frontend/src/App.tsx
git commit -m "feat: add browser-login account pool UI"
```

---

# Task 16: Verify session persistence across backend/app restart

**Files:**
- Create: an integration test or documented Windows smoke script under `scripts/`
- Modify tests only if a defect is found.

**Interfaces:**
- Verifies the central product requirement: login once, use again after restart.

- [ ] **Step 1: Create a local browser-profile smoke harness**

Use a harmless local/test site or test provider fixture that writes persistent browser storage.

Flow:

```text
open profile
set cookie/localStorage
close context
stop BrowserSessionManager
construct a new manager
open same profile
verify state still exists
```

- [ ] **Step 2: Run the harness on Windows**

Expected: state persists.

- [ ] **Step 3: Verify different accounts are isolated**

Profile A state must not appear in profile B.

- [ ] **Step 4: Verify delete removes session**

Delete account/profile then reopen same generated profile location.

Expected: prior state absent.

- [ ] **Step 5: Run packaged sidecar smoke**

```powershell
python scripts/build-sidecar.py
```

Start packaged backend and execute management API smoke with a fake/test auth adapter where practical.

- [ ] **Step 6: Commit smoke harness/tests**

```bash
git add scripts vidpool-backend/tests/accounts
git commit -m "test: verify persistent isolated browser sessions"
```

---

# Task 17: Add first-provider integration contract test without hard-coding a provider into the pool

**Purpose:** Prove the extension point before building Seedance/Gemini/etc.

**Files:**
- Create: `vidpool-backend/tests/accounts/test_provider_auth_contract.py`

**Interfaces:**
- Any future production `ProviderAuthPort` implementation must pass the same contract.

- [ ] **Step 1: Define contract expectations**

A provider auth adapter must:

```text
have stable provider_key
return HTTPS login URL
validate profile without exposing raw secret data
resolve display identity after valid login
return invalid for expired/login-required profile
not mutate Account Pool state directly
```

- [ ] **Step 2: Run contract against FakeProviderAuthAdapter**

Expected: PASS.

- [ ] **Step 3: Document how future provider adapters are added**

Example:

```text
app/infrastructure/providers/<provider_key>/auth_adapter.py
```

Then register in composition root.

No AccountService changes should be required.

- [ ] **Step 4: Commit**

```bash
git add vidpool-backend/tests/accounts/test_provider_auth_contract.py docs
git commit -m "test: define provider auth adapter contract"
```

---

# Task 18: Security and logging regression tests

**Files:**
- Create: `vidpool-backend/tests/accounts/test_account_security.py`
- Modify logging/error code only if tests expose leaks.

- [ ] **Step 1: Assert API responses never contain forbidden names**

Scan serialized account API payload for keys/values matching:

```text
cookie
token
password
profile_path
user_data_dir
authorization
```

`browserSessionId` is allowed as an ephemeral local flow handle.

- [ ] **Step 2: Assert profile_key is not returned**

Even though it is not a secret by itself, it is internal execution metadata.

- [ ] **Step 3: Assert errors are normalized**

Force a fake low-level browser exception containing a fake secret string:

```text
SECRET_TEST_VALUE
```

Verify API response does not contain that string.

- [ ] **Step 4: Verify logs do not contain fake credentials/session storage**

Use caplog around service/API flows.

- [ ] **Step 5: Run tests**

```powershell
pytest tests/accounts/test_account_security.py -q
```

- [ ] **Step 6: Commit**

```bash
git add vidpool-backend/tests/accounts/test_account_security.py
git commit -m "test: prevent account session data leaks"
```

---

# Task 19: Update CI and build verification for Account Pool dependencies

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/CURRENT_STATUS.md`

- [ ] **Step 1: Backend CI remains full pytest**

No real provider/browser login in CI.

- [ ] **Step 2: Desktop CI builds PyInstaller sidecar with Playwright**

Existing desktop job must execute:

```text
install backend dependencies
build sidecar
verify sidecar
cargo test/check
```

This catches Playwright packaging regressions.

- [ ] **Step 3: Do not download Playwright Chromium in CI**

The first implementation uses installed branded browser channels at runtime; CI only verifies package/build/unit behavior.

- [ ] **Step 4: Mark implemented feature accurately**

After all gates pass, update `CURRENT_STATUS.md` with:

```text
- Account Pool domain and SQLite persistence
- durable account leases
- LRU account selection
- persistent isolated browser profiles
- browser-session login lifecycle
- account management UI
- provider auth registry/port
```

Keep specific provider integrations in "not implemented" until they actually exist.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml docs/CURRENT_STATUS.md
git commit -m "ci: verify account pool browser runtime packaging"
```

---

# Task 20: Final verification gate

No new feature work in this task.

- [ ] **Step 1: Backend**

```powershell
cd vidpool-backend
python -m pip install -e ".[dev]"
pytest -q
alembic current
cd ..
```

Expected: PASS.

- [ ] **Step 2: Frontend**

```powershell
cd vidpool-frontend
pnpm install --frozen-lockfile
pnpm check
cd ..
```

Expected: PASS.

- [ ] **Step 3: Sidecar**

```powershell
python scripts/build-sidecar.py
```

Expected: sidecar exists and is non-empty.

- [ ] **Step 4: Rust/Tauri**

```powershell
cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

Expected: PASS.

- [ ] **Step 5: Desktop manual smoke**

```powershell
cd vidpool-frontend
pnpm tauri dev
```

Verify:

```text
[ ] App starts and protected session bootstrap succeeds.
[ ] Accounts page loads.
[ ] Add Account lists only registered providers.
[ ] Starting login opens an isolated browser profile.
[ ] No API key/cookie entry is requested for browser-session providers.
[ ] Closing/reopening VidPool preserves browser profile data.
[ ] Re-login uses the same account/profile.
[ ] Two accounts use different profile directories.
[ ] Same account cannot be leased twice concurrently.
[ ] Expired lease becomes recoverable.
[ ] Delete account removes its browser profile.
[ ] No password/cookie/token/profile path appears in UI/logs.
[ ] Closing VidPool closes managed browser contexts and backend sidecar.
```

- [ ] **Step 6: Packaged desktop**

```powershell
pnpm tauri build
```

Install/run the produced Windows package and repeat:

```text
Add Account -> Login browser opens -> persistent profile survives restart
```

- [ ] **Step 7: Git cleanliness**

```powershell
git status --short
```

Browser profile directories and runtime databases must not be inside the repository.

- [ ] **Step 8: Push and verify CI**

Expected:

```text
backend   success
frontend  success
desktop   success
```

---

# Suggested commit sequence

```text
1. docs: define account pool browser session architecture
2. build: package Playwright runtime with backend sidecar
3. feat: add account pool domain model
4. feat: define account pool application ports
5. feat: persist provider accounts and leases
6. feat: isolate persistent browser profiles per account
7. feat: manage persistent browser sessions with Playwright
8. feat: add provider auth registry
9. feat: add account login lifecycle
10. feat: lease provider accounts with LRU selection
11. feat: track account health and cooldown
12. feat: wire account pool into backend runtime
13. feat: expose protected account management API
14. feat: add typed account management client
15. feat: add browser-login account pool UI
16. test: verify persistent isolated browser sessions
17. test: define provider auth adapter contract
18. test: prevent account session data leaks
19. ci: verify account pool browser runtime packaging
```

---

# Definition of Done

```text
[ ] User can start Add Account without creating API keys.
[ ] Browser-backed login opens an isolated VidPool-managed Edge/Chrome profile.
[ ] User manually completes Google/email/password/2FA/CAPTCHA in provider login page.
[ ] VidPool does not know or store the password.
[ ] Login completion validates through ProviderAuthPort.
[ ] Valid account becomes ACTIVE.
[ ] Invalid/expired session becomes AUTH_REQUIRED.
[ ] Re-login reuses same account/profile.
[ ] Browser session survives VidPool restart.
[ ] Different accounts never share a profile.
[ ] SQLite stores account metadata and leases only.
[ ] Account Pool does not import Playwright/SQLAlchemy/FastAPI.
[ ] Provider-specific login logic does not leak into Account Pool.
[ ] No BUSY account state exists.
[ ] One unexpired lease per account.
[ ] Expired leases recover automatically.
[ ] LRU selection is deterministic and tested.
[ ] Disabled/cooldown/auth-required accounts are not acquired.
[ ] Rate-limit/quota failure does not automatically switch account for the same operation.
[ ] Account management API is protected by local app-session auth.
[ ] React never receives profile path/cookies/tokens.
[ ] Delete account deletes its stored browser profile.
[ ] Backend pytest passes.
[ ] Alembic is at head.
[ ] Frontend pnpm check passes.
[ ] PyInstaller sidecar includes required Playwright runtime files.
[ ] Cargo test/check --locked pass.
[ ] Windows Tauri build passes.
[ ] Desktop packaged smoke confirms session persists.
[ ] GitHub backend/frontend/desktop CI are green.
```

---

# Next plan after Account Pool

After this plan is complete, implement the first real provider auth/execution adapter as a separate spec/plan.

That adapter should plug into:

```text
ProviderRegistry
   -> ProviderAuthPort
   -> existing Account Pool
```

without modifying Account Pool domain or selection logic.

Then implement Durable Job Engine and bind:

```text
owner_id = "job:<job_id>"
```

to durable account leases before adding long-running generation pipelines.
