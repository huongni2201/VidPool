# VidPool Dreamina / Seedance Auth Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Baseline commit:** `f3fc3cd25a1ac0e7df48cb16c91e393d079032a9`

**Goal:** Finish the first real browser-authenticated provider integration for VidPool by cleaning the current bootstrap edge cases, consolidating the provider-auth contract, implementing a production `DreaminaAuthAdapter`, wiring it into the existing Account Pool, and proving that a user can log in once and keep the persisted browser session across application restart.

**Architecture:** Keep the current Account Pool architecture. Authentication belongs to the web platform account, so the provider key should be `dreamina`; Seedance is a model/capability used through Dreamina and must not become an authentication-specific branch inside `AccountService`. The concrete Dreamina adapter remains in infrastructure and plugs into the existing `ProviderRegistry` / `ProviderAuthPort`; application/domain code stays unchanged unless a real contract defect is discovered and documented.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.x, SQLite, Playwright Python, pytest, Ruff, Pyright, React/Vite/Tauri, Windows x64.

**Specs / architecture to read before execution:**
- `AGENTS.md`
- `ARCHITECTURE-CHECKLIST.md`
- `docs/CURRENT_STATUS.md`
- `docs/adr/0006-use-ports-and-adapters-for-providers.md`
- `docs/adr/0017-account-pool-browser-sessions.md`
- `docs/adr/0018-single-owner-playwright-browser-runtime.md`
- `docs/design/2026-09-17-account-pool-browser-session-design.md`
- `docs/plan/2026-09-17-vidpool-account-pool-next-phase-implementation-plan.md`

## Global Constraints

- VidPool remains desktop-first, single-user, and local-first.
- Do not redesign Account Pool.
- Do not add Redis, Celery, PostgreSQL, message brokers, Kubernetes, or microservices.
- Do not call Dreamina directly from React.
- Do not expose cookies, refresh credentials, authorization headers, absolute profile paths, or browser storage to the frontend.
- Do not log cookie values, token values, localStorage values, sessionStorage values, authorization headers, or password-like data.
- Keep browser session persistence inside isolated Playwright browser profiles.
- Do not reuse the user's normal Chrome/Edge profile.
- Do not store provider passwords.
- Do not add provider-specific branches to `AccountService`, `AccountLoginService`, `AccountHealthService`, domain entities, API DTOs, or frontend state.
- Provider-specific DOM, URL, auth-state, and identity extraction logic must remain inside the Dreamina infrastructure adapter.
- Keep `ProviderAuthPort` stable unless a real provider requirement proves the current contract insufficient.
- Browser work must continue to be owned by the single-owner `BrowserRuntime`.
- Preserve the current Unit of Work transaction ownership.
- Follow RED → GREEN → REFACTOR for behavior changes.
- Every task ends with focused tests and a logical commit.
- Do not begin durable generation jobs or Seedance video submission in this plan.
- This plan is complete only when a real Dreamina account can be added, validated, closed, application restarted, and validated again from the persisted browser profile.

---

# 0. Target Result

At the end of this plan, the runtime flow must be:

```text
Accounts UI
   ↓
GET /api/providers
   ↓
ProviderRegistry
   ↓
DreaminaAuthAdapter
   ↓
user clicks Add Account
   ↓
BrowserRuntime.open_login()
   ↓
Dreamina login page / workspace opens
   ↓
user logs in manually
   ↓
POST /accounts/{id}/login/complete
   ↓
DreaminaAuthAdapter.validate_active_session()
   ↓
DreaminaAuthAdapter.resolve_identity()
   ↓
ProviderAccount = ACTIVE
   ↓
BrowserRuntime closes interactive context
   ↓
browser profile remains on disk
   ↓
VidPool exits
   ↓
VidPool restarts
   ↓
POST /accounts/{id}/validate
   ↓
DreaminaAuthAdapter.validate_persisted_session()
   ↓
BrowserRuntime opens same profile headless
   ↓
session is still valid
   ↓
ProviderAccount remains ACTIVE
```

The Account Pool must not know how Dreamina authentication works.

---

# 1. File Map

## Modify

```text
vidpool-backend/app/bootstrap.py
vidpool-backend/tests/test_bootstrap.py

vidpool-backend/app/modules/accounts/infrastructure/providers/browser_auth_base.py
vidpool-backend/app/modules/accounts/infrastructure/providers/registry.py
vidpool-backend/app/core/container.py

vidpool-backend/tests/accounts/test_provider_auth_contract.py
vidpool-backend/tests/accounts/test_account_wiring.py

docs/CURRENT_STATUS.md
```

## Delete after contract consolidation

```text
vidpool-backend/tests/accounts/test_provider_contract.py
```

## Create

```text
vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/__init__.py
vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_adapter.py
vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_probe.py

vidpool-backend/tests/accounts/test_dreamina_auth_adapter.py
vidpool-backend/tests/accounts/test_dreamina_provider_wiring.py
```

## No expected frontend production-code change

The existing account UI already discovers providers through:

```text
GET /api/providers
```

The provider should appear automatically after registry wiring.

If frontend production code must be changed merely to special-case Dreamina, stop and re-check the architecture.

---

# 2. Task 1 — Fix Bootstrap Configuration Precedence

**Goal:** Remove the accidental backend fallback to `"dev-token"` and make `VIDPOOL_ALLOWED_ORIGINS` actually reachable.

**Files:**
- Modify: `vidpool-backend/app/bootstrap.py`
- Modify: `vidpool-backend/tests/test_bootstrap.py`

**Current defects:**

1. `parse_args()` always materializes default origins, so this branch in `main()` cannot execute:

```python
if not args.allowed_origins and os.getenv("VIDPOOL_ALLOWED_ORIGINS"):
```

2. `main()` silently falls back to:

```python
"dev-token"
```

This weakens the existing fail-closed design. Development already has an explicit token configuration path.

**Interfaces:**

```python
@dataclass(frozen=True, slots=True)
class BootstrapArgs:
    host: str
    port: int
    session_token: str | None
    allowed_origins: tuple[str, ...] | None
```

CLI precedence must be:

```text
CLI option
  > environment
  > application default
```

Session token precedence must be:

```text
--session-token
  > VIDPOOL_SESSION_TOKEN
  > None
```

Never:

```text
> "dev-token"
```

### Steps

- [ ] **Step 1: Change the `BootstrapArgs.allowed_origins` type**

Change:

```python
allowed_origins: tuple[str, ...]
```

to:

```python
allowed_origins: tuple[str, ...] | None
```

Do not resolve default origins inside `parse_args()`.

- [ ] **Step 2: Write RED tests for origin precedence**

Add:

```python
def test_allowed_origins_are_none_when_cli_not_supplied() -> None:
    args = parse_args([])
    assert args.allowed_origins is None
```

Add:

```python
def test_repeated_allowed_origin_cli_values_are_preserved() -> None:
    args = parse_args(
        [
            "--allowed-origin",
            "http://localhost:5173",
            "--allowed-origin",
            "http://127.0.0.1:5173",
        ]
    )

    assert args.allowed_origins == (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )
```

Run:

```powershell
cd vidpool-backend
pytest tests/test_bootstrap.py -q
```

Expected: first test FAILS before implementation.

- [ ] **Step 3: Extract deterministic config resolution**

Add to `bootstrap.py`:

```python
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
```

Then make `main()` use:

```python
config = resolve_config(args)
```

Remove:

```python
or "dev-token"
```

- [ ] **Step 4: Add RED/GREEN tests for env resolution**

Add:

```python
def test_resolve_config_uses_environment_session_token(monkeypatch) -> None:
    monkeypatch.setenv("VIDPOOL_SESSION_TOKEN", "env-token")
    args = parse_args([])

    config = resolve_config(args)

    assert config.session_token == "env-token"
```

Add:

```python
def test_resolve_config_keeps_missing_session_token_as_none(monkeypatch) -> None:
    monkeypatch.delenv("VIDPOOL_SESSION_TOKEN", raising=False)
    args = parse_args([])

    config = resolve_config(args)

    assert config.session_token is None
```

Add:

```python
def test_resolve_config_uses_environment_allowed_origins(monkeypatch) -> None:
    monkeypatch.setenv(
        "VIDPOOL_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    args = parse_args([])

    config = resolve_config(args)

    assert config.allowed_origins == (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )
```

Add:

```python
def test_cli_session_token_overrides_environment(monkeypatch) -> None:
    monkeypatch.setenv("VIDPOOL_SESSION_TOKEN", "env-token")
    args = parse_args(["--session-token", "cli-token"])

    config = resolve_config(args)

    assert config.session_token == "cli-token"
```

- [ ] **Step 5: Run focused tests**

```powershell
pytest tests/test_bootstrap.py tests/test_config.py tests/test_security.py -q
```

Expected: PASS.

- [ ] **Step 6: Run backend static checks**

```powershell
ruff check app tests
pyright
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add vidpool-backend/app/bootstrap.py vidpool-backend/tests/test_bootstrap.py
git commit -m "fix: make backend bootstrap config precedence explicit"
```

**Acceptance criteria:**

```text
PASS: VIDPOOL_ALLOWED_ORIGINS works
PASS: --allowed-origin overrides environment
PASS: missing backend token remains None
PASS: protected API remains fail-closed
PASS: no implicit dev-token exists in backend
```

---

# 3. Task 2 — Consolidate the Provider Auth Contract

**Goal:** Keep one authoritative provider-auth contract test before implementing Dreamina.

**Files:**
- Modify: `vidpool-backend/tests/accounts/test_provider_auth_contract.py`
- Delete: `vidpool-backend/tests/accounts/test_provider_contract.py`

**Problem:**

The repository currently has two overlapping provider contract tests with different URL rules:

```text
test_provider_auth_contract.py
test_provider_contract.py
```

One requires HTTPS while the other permits HTTP.

Production provider login URLs must use HTTPS.

**Interfaces to preserve:**

```python
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

### Steps

- [ ] **Step 1: Keep `test_provider_auth_contract.py` as the canonical file**

Create one reusable helper:

```python
def assert_provider_auth_contract(
    adapter: ProviderAuthPort,
    profile_key: str,
    *,
    expected_valid: bool,
) -> None:
    ...
```

Required assertions:

```python
assert isinstance(adapter, ProviderAuthPort)
assert adapter.provider_key.strip()

login_url = adapter.login_url()
parsed = urlparse(login_url)

assert parsed.scheme == "https"
assert parsed.netloc

active = adapter.validate_active_session(profile_key)
assert isinstance(active, SessionValidation)
assert active.valid is expected_valid

persisted = adapter.validate_persisted_session(profile_key)
assert isinstance(persisted, SessionValidation)
assert persisted.valid is expected_valid
```

If `expected_valid` is true:

```python
identity = adapter.resolve_identity(profile_key)

assert isinstance(identity, ProviderIdentity)
assert identity.display_name.strip()
assert identity.external_identity.strip()
```

Also assert that obvious secret labels do not appear in returned identity strings:

```python
for value in (identity.display_name, identity.external_identity):
    lowered = value.lower()
    assert "cookie" not in lowered
    assert "password" not in lowered
    assert "authorization" not in lowered
```

- [ ] **Step 2: Keep explicit failure coverage**

Keep a test that rejects:

```python
"http://insecure.test/login"
```

Expected:

```text
AssertionError
```

- [ ] **Step 3: Delete duplicate contract file**

Delete:

```text
vidpool-backend/tests/accounts/test_provider_contract.py
```

- [ ] **Step 4: Run focused tests**

```powershell
pytest tests/accounts/test_provider_auth_contract.py -q
```

Expected: PASS.

- [ ] **Step 5: Run architecture/account tests**

```powershell
pytest tests/accounts tests/architecture -q
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add vidpool-backend/tests/accounts/test_provider_auth_contract.py
git rm vidpool-backend/tests/accounts/test_provider_contract.py
git commit -m "test: consolidate provider authentication contract"
```

**Acceptance criteria:**

```text
PASS: only one provider-auth contract remains
PASS: production login URL contract is HTTPS-only
PASS: fake provider satisfies contract
PASS: invalid URL fails deterministically
```

---

# 4. Task 3 — Introduce a Testable Browser Automation Boundary for Auth Adapters

**Goal:** Make browser-backed provider adapters unit-testable without binding them to a real Playwright instance.

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/infrastructure/providers/browser_auth_base.py`
- Test: `vidpool-backend/tests/accounts/test_dreamina_auth_adapter.py`

**Reason:**

`BrowserBackedAuthAdapter` currently depends directly on concrete:

```python
BrowserRuntime
```

The Dreamina adapter needs:

```text
run_active(...)
run_persisted_profile(...)
```

These methods are infrastructure-specific and should remain outside the application `BrowserSessionPort`.

Do **not** enlarge `BrowserSessionPort` just to satisfy a provider adapter.

**Interfaces:**

Add an infrastructure-local protocol:

```python
from typing import Any, Protocol, TypeVar
from collections.abc import Callable

T = TypeVar("T")

class BrowserAutomationRuntime(Protocol):
    def run_active(
        self,
        profile_key: str,
        operation: Callable[[Any], T],
    ) -> T: ...

    def run_persisted_profile(
        self,
        profile_key: str,
        operation: Callable[[Any], T],
    ) -> T: ...
```

Change constructor:

```python
def __init__(
    self,
    browser_runtime: BrowserAutomationRuntime,
) -> None:
    self._browser = browser_runtime
```

`BrowserRuntime` already structurally satisfies this protocol.

### Steps

- [ ] **Step 1: Add the protocol to `browser_auth_base.py`**

Keep it infrastructure-local.

Do not move it to application ports.

- [ ] **Step 2: Update `BrowserBackedAuthAdapter` constructor typing**

Only typing changes are expected.

No behavior change.

- [ ] **Step 3: Run static checks**

```powershell
ruff check app
pyright
```

Expected: PASS.

- [ ] **Step 4: Run account tests**

```powershell
pytest tests/accounts -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add vidpool-backend/app/modules/accounts/infrastructure/providers/browser_auth_base.py
git commit -m "refactor: decouple provider auth adapters from concrete browser runtime"
```

**Acceptance criteria:**

```text
PASS: application ports are unchanged
PASS: BrowserRuntime remains single owner
PASS: provider auth adapters can receive a fake automation runtime
PASS: no Playwright type leaks into application/domain
```

---

# 5. Task 4 — Establish Dreamina Authentication Signals Before Coding the Adapter

**Goal:** Capture the smallest stable set of real Dreamina auth signals used by the adapter.

**Important architectural decision:**

Use:

```text
provider_key = "dreamina"
```

not:

```text
provider_key = "seedance"
```

because Account Pool authenticates the Dreamina web account. Seedance is the model used inside that platform.

Use:

```text
display_name = "Dreamina (Seedance)"
```

for the current UI.

**Official browser entry point for the initial implementation:**

```text
https://dreamina.capcut.com/tools/ai-video-generator
```

The public page currently exposes Dreamina video generation and Seedance model selection. The adapter must not assume a specific Seedance version for authentication.

## Required signals

Before implementing production selectors, manually inspect one logged-out and one logged-in session with Playwright DevTools and record exactly these four facts:

```text
A. canonical login/workspace URL
B. logged-out signal
C. logged-in signal
D. stable identity source
```

### Signal selection rules

Use this priority order:

```text
1. stable provider-owned URL / redirect behavior
2. stable data-* attribute or aria role/name
3. stable account-menu structure
4. visible localized text only as a last resort
```

Do not use:

```text
generated CSS class names
nth-child selectors
pixel position
random element IDs
cookie values
token values
undocumented localStorage token values
```

## Identity rule

`ProviderIdentity.external_identity` should prefer:

```text
stable provider account ID
```

If the UI does not expose one without reading secrets, use:

```text
normalized account email
```

If neither can be obtained safely, use a deterministic hash of a non-secret stable visible account identifier.

Never use:

```text
cookie value
access token
refresh token
session token
```

## Completion gate

Do not continue to Task 5 until the agent can demonstrate, in a real browser:

```text
logged out -> probe returns false
logged in  -> probe returns true
identity   -> non-empty display_name + stable external_identity
```

This is a required live-reconnaissance gate because provider DOM/redirect behavior is an external contract and cannot be safely invented from repository code.

---

# 6. Task 5 — Implement Dreamina Auth Probe

**Goal:** Put all site-specific auth detection and identity extraction into one focused infrastructure file.

**Files:**
- Create: `vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/__init__.py`
- Create: `vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_probe.py`
- Create/Modify tests: `vidpool-backend/tests/accounts/test_dreamina_auth_adapter.py`

**Responsibility of `auth_probe.py`:**

```text
Playwright context/page
    ↓
Dreamina-specific inspection
    ↓
plain internal auth result
```

It must not know about:

```text
ProviderAccount
AccountId
SQLAlchemy
FastAPI
AccountService
```

## Interface

Implement:

```python
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class DreaminaAuthState:
    authenticated: bool
    display_name: str | None = None
    external_identity: str | None = None


class DreaminaAuthProbe:
    def inspect(self, context: Any) -> DreaminaAuthState:
        ...
```

## Internal helper behavior

Use:

```python
def _get_or_create_page(context: Any) -> Any:
    pages = context.pages
    return pages[0] if pages else context.new_page()
```

The probe should navigate to the canonical Dreamina workspace/entry determined in Task 4 when required.

Use a finite timeout.

Example structure:

```python
class DreaminaAuthProbe:
    def __init__(self, workspace_url: str, timeout_ms: int = 15_000) -> None:
        self._workspace_url = workspace_url
        self._timeout_ms = timeout_ms

    def inspect(self, context: Any) -> DreaminaAuthState:
        page = _get_or_create_page(context)

        page.goto(
            self._workspace_url,
            wait_until="domcontentloaded",
            timeout=self._timeout_ms,
        )

        if self._is_logged_out(page):
            return DreaminaAuthState(authenticated=False)

        if not self._is_logged_in(page):
            return DreaminaAuthState(authenticated=False)

        display_name, external_identity = self._read_identity(page)

        return DreaminaAuthState(
            authenticated=True,
            display_name=display_name,
            external_identity=external_identity,
        )
```

### Security logging rule

Allowed log fields:

```text
provider_key
probe_result
elapsed_ms
error_type
```

Forbidden:

```text
email unless deliberately chosen as external identity and never logged
cookie value
token
authorization
storage values
full DOM dump
```

### Tests

Build fake page/context classes with only the methods/properties the probe uses.

Required tests:

```python
def test_probe_returns_logged_out_when_logged_out_signal_present():
    ...
```

```python
def test_probe_returns_authenticated_with_identity():
    ...
```

```python
def test_probe_returns_false_when_no_trusted_authenticated_signal_exists():
    ...
```

```python
def test_probe_never_requires_cookie_values():
    ...
```

Do not mock Playwright globally if small fake objects are sufficient.

### Steps

- [ ] **Step 1: Write fake page/context fixtures**

Keep them inside:

```text
test_dreamina_auth_adapter.py
```

unless they exceed roughly 100 lines; if larger, move them to:

```text
tests/accounts/dreamina_fakes.py
```

- [ ] **Step 2: Write RED logged-out test**

- [ ] **Step 3: Implement minimal logged-out detection**

Use only the signal verified in Task 4.

- [ ] **Step 4: Write RED logged-in test**

- [ ] **Step 5: Implement logged-in detection**

Use only the signal verified in Task 4.

- [ ] **Step 6: Write RED identity test**

- [ ] **Step 7: Implement identity extraction**

Return:

```python
DreaminaAuthState(
    authenticated=True,
    display_name=...,
    external_identity=...,
)
```

- [ ] **Step 8: Add fail-closed behavior**

Unknown/ambiguous page state must return:

```python
DreaminaAuthState(authenticated=False)
```

Do not guess authenticated state.

- [ ] **Step 9: Run focused tests**

```powershell
pytest tests/accounts/test_dreamina_auth_adapter.py -q
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add \
  vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina \
  vidpool-backend/tests/accounts/test_dreamina_auth_adapter.py

git commit -m "feat: add dreamina authentication probe"
```

**Acceptance criteria:**

```text
PASS: logged-out page is rejected
PASS: logged-in page is accepted
PASS: ambiguous state fails closed
PASS: identity extraction returns stable values
PASS: no secret material is returned or logged
```

---

# 7. Task 6 — Implement `DreaminaAuthAdapter`

**Goal:** Implement the existing `ProviderAuthPort` for Dreamina without changing Account application services.

**Files:**
- Create/Modify: `vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_adapter.py`
- Modify: `vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/__init__.py`
- Test: `vidpool-backend/tests/accounts/test_dreamina_auth_adapter.py`

## Public adapter interface

```python
class DreaminaAuthAdapter(BrowserBackedAuthAdapter):
    provider_key = "dreamina"
    display_name = "Dreamina (Seedance)"
    auth_kind = "browser_session"

    LOGIN_URL = "https://dreamina.capcut.com/tools/ai-video-generator"

    def login_url(self) -> str:
        return self.LOGIN_URL

    def validate_active_session(
        self,
        profile_key: str,
    ) -> SessionValidation:
        ...

    def resolve_identity(
        self,
        profile_key: str,
    ) -> ProviderIdentity:
        ...

    def validate_persisted_session(
        self,
        profile_key: str,
    ) -> SessionValidation:
        ...
```

Constructor:

```python
def __init__(
    self,
    browser_runtime: BrowserAutomationRuntime,
    probe: DreaminaAuthProbe | None = None,
) -> None:
    super().__init__(browser_runtime)
    self._probe = probe or DreaminaAuthProbe(self.LOGIN_URL)
```

## Active validation

Implement:

```python
def validate_active_session(
    self,
    profile_key: str,
) -> SessionValidation:
    state = self._browser.run_active(
        profile_key,
        self._probe.inspect,
    )
    return SessionValidation(valid=state.authenticated)
```

## Persisted validation

Implement:

```python
def validate_persisted_session(
    self,
    profile_key: str,
) -> SessionValidation:
    state = self._browser.run_persisted_profile(
        profile_key,
        self._probe.inspect,
    )
    return SessionValidation(valid=state.authenticated)
```

This uses the same isolated browser profile in a headless temporary context.

## Identity resolution

Identity resolution is only called while the interactive browser session is still open.

Implement:

```python
def resolve_identity(
    self,
    profile_key: str,
) -> ProviderIdentity:
    state = self._browser.run_active(
        profile_key,
        self._probe.inspect,
    )

    if (
        not state.authenticated
        or not state.display_name
        or not state.external_identity
    ):
        raise SessionInvalid(
            "Dreamina session is authenticated but account identity could not be resolved"
        )

    return ProviderIdentity(
        display_name=state.display_name,
        external_identity=state.external_identity,
    )
```

Use the existing domain/application error type if appropriate. Do not introduce a provider-specific exception into application/domain.

### Tests

Create a fake automation runtime:

```python
class FakeBrowserAutomationRuntime:
    def __init__(self, context) -> None:
        self.context = context
        self.active_calls: list[str] = []
        self.persisted_calls: list[str] = []

    def run_active(self, profile_key, operation):
        self.active_calls.append(profile_key)
        return operation(self.context)

    def run_persisted_profile(self, profile_key, operation):
        self.persisted_calls.append(profile_key)
        return operation(self.context)
```

Required tests:

```python
def test_dreamina_adapter_has_stable_metadata():
    adapter = DreaminaAuthAdapter(fake_runtime)

    assert adapter.provider_key == "dreamina"
    assert adapter.display_name == "Dreamina (Seedance)"
    assert adapter.auth_kind == "browser_session"
    assert adapter.login_url().startswith("https://")
```

```python
def test_validate_active_session_uses_active_browser_profile():
    ...
```

```python
def test_validate_persisted_session_uses_persisted_profile():
    ...
```

```python
def test_resolve_identity_returns_provider_identity():
    ...
```

```python
def test_resolve_identity_fails_when_identity_is_missing():
    ...
```

Then run the generic contract against the Dreamina adapter using a fully fake runtime/probe.

### Steps

- [ ] **Step 1: Write RED metadata test**
- [ ] **Step 2: Implement class metadata + login URL**
- [ ] **Step 3: Write RED active validation test**
- [ ] **Step 4: Implement `validate_active_session()`**
- [ ] **Step 5: Write RED persisted validation test**
- [ ] **Step 6: Implement `validate_persisted_session()`**
- [ ] **Step 7: Write RED identity test**
- [ ] **Step 8: Implement `resolve_identity()`**
- [ ] **Step 9: Run generic provider contract against Dreamina adapter**
- [ ] **Step 10: Run tests**

```powershell
pytest \
  tests/accounts/test_dreamina_auth_adapter.py \
  tests/accounts/test_provider_auth_contract.py \
  -q
```

Expected: PASS.

- [ ] **Step 11: Run static checks**

```powershell
ruff check app tests
pyright
```

Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add \
  vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina \
  vidpool-backend/tests/accounts/test_dreamina_auth_adapter.py \
  vidpool-backend/tests/accounts/test_provider_auth_contract.py

git commit -m "feat: implement dreamina browser auth adapter"
```

**Acceptance criteria:**

```text
PASS: adapter satisfies ProviderAuthPort
PASS: active validation uses existing interactive context
PASS: persisted validation opens same profile through BrowserRuntime
PASS: identity resolution is provider-local
PASS: no AccountService change is required
```

---

# 8. Task 7 — Register Dreamina in the Production Container

**Goal:** Make Dreamina appear automatically in `/api/providers`.

**Files:**
- Modify: `vidpool-backend/app/core/container.py`
- Create: `vidpool-backend/tests/accounts/test_dreamina_provider_wiring.py`
- Modify if useful: `vidpool-backend/tests/accounts/test_account_wiring.py`

## Target wiring

Current default:

```python
providers = (
    provider_registry
    if provider_registry is not None
    else ProviderRegistry()
)
```

Change production default to:

```python
if provider_registry is not None:
    providers = provider_registry
else:
    providers = ProviderRegistry(
        auth_adapters=[
            DreaminaAuthAdapter(runtime),
        ]
    )
```

The injected-test registry path must remain unchanged.

Do not instantiate another `BrowserRuntime`.

The adapter must receive the exact same:

```python
runtime
```

instance owned by the container.

### Tests

Add:

```python
def test_default_container_registers_dreamina(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(tmp_path))

    container = build_container()
    try:
        providers = container.provider_registry
        assert providers is not None

        definitions = providers.list()

        assert any(
            item.key == "dreamina"
            and item.display_name == "Dreamina (Seedance)"
            for item in definitions
        )
    finally:
        container.close()
```

Add:

```python
def test_dreamina_adapter_uses_container_browser_runtime(
    tmp_path,
    monkeypatch,
) -> None:
    ...
```

The test can inspect the registered adapter through:

```python
container.provider_registry.get_auth("dreamina")
```

and assert it exists.

Do not depend on private adapter fields unless there is no public way to prove wiring.

### API test

Build a TestClient with production-like default registry and verify:

```http
GET /api/providers
```

contains:

```json
{
  "key": "dreamina",
  "displayName": "Dreamina (Seedance)",
  "authKind": "browser_session"
}
```

### Steps

- [ ] **Step 1: Write RED registry wiring test**
- [ ] **Step 2: Wire `DreaminaAuthAdapter` into default `ProviderRegistry`**
- [ ] **Step 3: Run wiring test**
- [ ] **Step 4: Write RED `/api/providers` test**
- [ ] **Step 5: Verify API response**
- [ ] **Step 6: Run account API tests**

```powershell
pytest \
  tests/accounts/test_dreamina_provider_wiring.py \
  tests/accounts/test_account_wiring.py \
  tests/accounts/test_account_api.py \
  -q
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add \
  vidpool-backend/app/core/container.py \
  vidpool-backend/tests/accounts/test_dreamina_provider_wiring.py \
  vidpool-backend/tests/accounts/test_account_wiring.py

git commit -m "feat: register dreamina provider in account pool"
```

**Acceptance criteria:**

```text
PASS: exactly one BrowserRuntime exists
PASS: default registry contains Dreamina
PASS: injected registries still work in tests
PASS: /api/providers exposes Dreamina
PASS: no frontend special case is added
```

---

# 9. Task 8 — Verify the Existing Frontend Discovers Dreamina

**Goal:** Confirm that current UI becomes usable without provider-specific frontend changes.

**Expected result:**

```text
Accounts page
  ↓
provider selector/list
  ↓
Dreamina (Seedance)
```

## Steps

- [ ] **Step 1: Run backend in browser-development mode**

PowerShell:

```powershell
cd vidpool-backend

$env:VIDPOOL_SESSION_TOKEN="dev-token"
$env:VIDPOOL_ALLOWED_ORIGINS="http://localhost:5173"

vidpool-backend --port 8000
```

- [ ] **Step 2: Run frontend**

In another shell:

```powershell
cd vidpool-frontend
pnpm dev
```

The committed development env already provides:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SESSION_TOKEN=dev-token
```

- [ ] **Step 3: Open Accounts UI**

Verify:

```text
Dreamina (Seedance)
```

appears from the backend provider API.

- [ ] **Step 4: If it does not appear, debug the generic provider-discovery flow**

Allowed frontend fixes:

```text
generic list rendering bug
generic provider query bug
generic stale query invalidation bug
```

Forbidden frontend fix:

```ts
if (provider.key === "dreamina") {
   ...
}
```

unless the difference is purely presentation metadata and is represented generically.

- [ ] **Step 5: Run frontend gate**

```powershell
pnpm check
```

Expected: PASS.

**Commit only if generic frontend code actually changed.**

Suggested commit:

```bash
git commit -m "fix: render registered account providers"
```

---

# 10. Task 9 — Live Add-Account Smoke Test

**Goal:** Prove the real login lifecycle end-to-end.

This is a live integration test and should not run in CI because it requires user-driven provider authentication.

## Test sequence

- [ ] **Step 1: Start VidPool in desktop mode**

Build sidecar:

```powershell
python scripts/build-sidecar.py
```

Run desktop:

```powershell
cd vidpool-frontend
pnpm tauri dev
```

- [ ] **Step 2: Navigate to Accounts**

Expected:

```text
Dreamina (Seedance)
```

is available.

- [ ] **Step 3: Click Add Account**

Expected:

```text
new provisional account created
isolated profile path allocated
browser opens Dreamina
```

- [ ] **Step 4: Log in manually**

Do not automate password entry.

Do not capture password.

Do not export cookies.

- [ ] **Step 5: Complete login from VidPool**

Expected backend flow:

```text
validate_active_session = valid
resolve_identity = non-empty
ProviderAccount.status = ACTIVE
browser closes
profile remains on disk
```

- [ ] **Step 6: Verify account UI**

Expected:

```text
status = ACTIVE
display name visible
no cookie/token/profile path visible
```

- [ ] **Step 7: Inspect logs**

Allowed:

```text
account_login_started
browser_open_start
browser_open_success
account_login_completed
browser_close
```

Forbidden:

```text
cookies
Authorization header
access token
refresh token
password
```

## Failure behavior

If `Complete login` returns session invalid while the visible browser is authenticated:

1. do not change Account Pool domain/application;
2. fix only Dreamina auth signal logic;
3. add a regression test using the observed state;
4. repeat this smoke test.

**Acceptance criteria:**

```text
PASS: real account becomes ACTIVE
PASS: browser context closes after complete login
PASS: profile remains persisted
PASS: no secrets leak to API/UI/logs
```

---

# 11. Task 10 — Restart Persistence Smoke Test

**Goal:** Prove "login once, reuse later."

This is the most important acceptance test for the Account Pool phase.

## Steps

- [ ] **Step 1: Confirm account is ACTIVE before shutdown**

- [ ] **Step 2: Fully close VidPool**

Ensure Tauri process and backend sidecar terminate.

Do not delete app data.

- [ ] **Step 3: Restart VidPool**

```powershell
cd vidpool-frontend
pnpm tauri dev
```

- [ ] **Step 4: Open Accounts**

The same account record must still exist.

- [ ] **Step 5: Trigger Validate**

Expected flow:

```text
AccountHealthService.validate_account()
    ↓
DreaminaAuthAdapter.validate_persisted_session()
    ↓
BrowserRuntime.run_persisted_profile()
    ↓
same profile directory
    ↓
headless persistent context
    ↓
DreaminaAuthProbe.inspect()
    ↓
valid
```

- [ ] **Step 6: Verify result**

Expected:

```text
status remains ACTIVE
lastValidatedAt updates
no interactive login browser required
```

- [ ] **Step 7: Verify temporary headless context closes**

No Dreamina profile should remain locked after validation.

- [ ] **Step 8: Run validation a second time**

Expected: PASS again.

This catches profile-lock leaks.

**Acceptance criteria:**

```text
PASS: account survives app restart
PASS: provider session survives app restart
PASS: validate works headlessly
PASS: no second login is required
PASS: profile is not left locked
```

---

# 12. Task 11 — Expired-Session Regression Test

**Goal:** Prove that a real expired session moves the account back to `AUTH_REQUIRED` without destroying the profile.

## Manual setup

Use one of these safe approaches:

```text
log out from Dreamina inside the isolated VidPool profile
or
invalidate the Dreamina session through normal account UI
```

Do not manually edit cookie databases.

## Steps

- [ ] **Step 1: Start from an ACTIVE account**

- [ ] **Step 2: Log out from Dreamina using its own UI**

- [ ] **Step 3: Close the interactive browser**

- [ ] **Step 4: Trigger account validation**

Expected:

```text
DreaminaAuthAdapter.validate_persisted_session() -> false
AccountHealthService.record_validation(valid=False)
ProviderAccount.status -> AUTH_REQUIRED
```

- [ ] **Step 5: Start relogin**

Expected:

```text
existing account reused
existing profile reused
no duplicate ProviderAccount
```

- [ ] **Step 6: Cancel relogin**

Expected:

```text
account record remains
profile remains
status remains AUTH_REQUIRED
```

- [ ] **Step 7: Start relogin again and complete it**

Expected:

```text
same account ID
same provider key
ACTIVE
```

**Acceptance criteria:**

```text
PASS: expired session becomes AUTH_REQUIRED
PASS: account is not deleted
PASS: relogin reuses the existing account/profile
PASS: cancel relogin does not delete account/profile
```

---

# 13. Task 12 — Add a Guarded Live Integration Test Entry Point

**Goal:** Preserve a repeatable live verification path without making CI depend on Dreamina.

**Files:**
- Create: `vidpool-backend/tests/accounts/test_dreamina_live.py`

The test must be skipped by default.

## Example guard

```python
import os
import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("VIDPOOL_RUN_DREAMINA_LIVE_TESTS") != "1",
    reason="Dreamina live tests require an authenticated local browser profile",
)
```

Do **not** put credentials in environment variables.

The test may consume a locally existing profile key explicitly supplied by the developer:

```text
VIDPOOL_DREAMINA_TEST_PROFILE_KEY
```

This is a profile identifier, not a secret.

The test must never print:

```text
cookies
tokens
storage state
authorization
email unless required for an assertion and redacted
```

## Minimum live assertion

```python
def test_persisted_dreamina_profile_is_valid(...):
    result = adapter.validate_persisted_session(profile_key)
    assert result.valid is True
```

If the profile is expired, the developer may expect false locally; do not make CI use this test.

### Steps

- [ ] **Step 1: Add skipped-by-default test**
- [ ] **Step 2: Verify normal pytest skips it**
- [ ] **Step 3: Verify opt-in live run locally**

Example:

```powershell
$env:VIDPOOL_RUN_DREAMINA_LIVE_TESTS="1"
$env:VIDPOOL_DREAMINA_TEST_PROFILE_KEY="<existing-profile-key>"

pytest tests/accounts/test_dreamina_live.py -q -s
```

- [ ] **Step 4: Clear shell variables after run**

```powershell
Remove-Item Env:VIDPOOL_RUN_DREAMINA_LIVE_TESTS
Remove-Item Env:VIDPOOL_DREAMINA_TEST_PROFILE_KEY
```

- [ ] **Step 5: Commit**

```bash
git add vidpool-backend/tests/accounts/test_dreamina_live.py
git commit -m "test: add opt-in dreamina session smoke test"
```

**Acceptance criteria:**

```text
PASS: CI never requires a real Dreamina account
PASS: developers have a repeatable live-session validation command
PASS: no credentials are committed
```

---

# 14. Task 13 — Update Current Implementation Status

**Goal:** Make repository docs match reality.

**Files:**
- Modify: `docs/CURRENT_STATUS.md`

## Move from "Not Implemented Yet"

Remove the generic statement:

```text
production provider auth adapters (e.g. Seedance, Gemini)
```

Replace with more precise state.

## Add to implemented

```text
- production Dreamina browser auth adapter for Seedance-capable Dreamina accounts
- Dreamina provider registration in Account Pool
- live user-driven Dreamina login validation
- persisted Dreamina browser-session validation across application restart
```

Only mark the last two as implemented after the live smoke tests actually pass.

## Keep explicitly not implemented

```text
- durable job worker
- provider execution jobs
- Seedance video submission/poll/download adapter
- generation pipeline
```

Authentication completion must not be confused with video execution support.

### Steps

- [ ] **Step 1: Update status after live acceptance**
- [ ] **Step 2: Verify no doc claims video generation is implemented**
- [ ] **Step 3: Commit**

```bash
git add docs/CURRENT_STATUS.md
git commit -m "docs: mark dreamina account authentication implemented"
```

---

# 15. Task 14 — Full Verification Gate

Do not declare this phase complete until every automated gate below passes.

## Backend

```powershell
cd vidpool-backend

ruff check .
pyright
pytest -q
alembic upgrade head
alembic current
```

Expected:

```text
PASS
PASS
PASS
PASS
current revision = head
```

## Frontend

```powershell
cd ../vidpool-frontend

pnpm check
```

Expected: PASS.

## Desktop

From repository root:

```powershell
python scripts/build-sidecar.py

cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml

cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

Expected: PASS.

## Architecture review

Manually verify:

```text
[ ] React has no Dreamina HTTP calls
[ ] React has no provider cookies/tokens
[ ] FastAPI routes contain no Dreamina DOM logic
[ ] AccountService contains no "dreamina" branch
[ ] AccountLoginService contains no "dreamina" branch
[ ] AccountHealthService contains no "dreamina" branch
[ ] domain contains no Dreamina imports
[ ] application contains no Dreamina imports
[ ] Dreamina adapter lives under infrastructure/providers
[ ] only one BrowserRuntime is constructed in production container
[ ] adapter uses the container-owned BrowserRuntime
[ ] no secrets are logged
[ ] CURRENT_STATUS.md matches implementation reality
```

## Git verification

```powershell
git status
git log --oneline -10
```

Expected:

```text
working tree clean
logical commits visible
```

---

# 16. Definition of Done

This plan is DONE only when all boxes below are true.

## Bootstrap

```text
[ ] Backend no longer silently defaults to "dev-token"
[ ] VIDPOOL_ALLOWED_ORIGINS actually works
[ ] CLI overrides environment
[ ] missing token still fails closed on protected API
```

## Contract

```text
[ ] one provider-auth contract test exists
[ ] HTTPS is required for provider login URL
[ ] duplicate provider contract test removed
```

## Dreamina adapter

```text
[ ] provider_key = "dreamina"
[ ] display_name = "Dreamina (Seedance)"
[ ] login_url is HTTPS
[ ] active session validation works
[ ] persisted session validation works
[ ] identity resolution works
[ ] ambiguous auth state fails closed
[ ] no cookie/token is returned
[ ] no provider-specific logic leaks into application/domain
```

## Wiring

```text
[ ] Dreamina is registered in default ProviderRegistry
[ ] /api/providers exposes Dreamina
[ ] existing UI discovers Dreamina without a special-case branch
[ ] exactly one BrowserRuntime remains
```

## Real lifecycle

```text
[ ] Add Account opens Dreamina
[ ] user can login manually
[ ] Complete Login marks account ACTIVE
[ ] browser closes after completion
[ ] profile persists
[ ] restart VidPool
[ ] Validate reuses persisted session
[ ] no login is required after restart
[ ] expired session becomes AUTH_REQUIRED
[ ] relogin reuses account/profile
```

## Quality

```text
[ ] ruff passes
[ ] pyright passes
[ ] pytest passes
[ ] alembic upgrade head passes
[ ] pnpm check passes
[ ] cargo test --locked passes
[ ] cargo check --locked passes
[ ] docs updated
[ ] working tree clean
```

---

# 17. Stop Conditions

Stop implementation and investigate instead of adding workarounds if any of these occur:

## Stop condition A — Provider requires credentials outside browser profile

If Dreamina cannot restore authentication from the isolated persistent profile alone:

```text
STOP
```

Do not store passwords.

Do not copy cookies into SQLite.

Document the actual requirement before changing architecture.

## Stop condition B — BrowserRuntime cannot support provider inspection

If provider inspection requires functionality not exposed by:

```text
run_active
run_persisted_profile
```

first prove the missing capability with a focused test.

Do not bypass BrowserRuntime by starting Playwright inside the adapter.

## Stop condition C — Provider account and Seedance model are being conflated

If implementation starts adding:

```text
seedance-2.0 account
seedance-2.5 account
```

stop.

The account is:

```text
Dreamina account
```

Model/version selection belongs later in the provider execution/model registry.

## Stop condition D — UI starts holding provider auth state

If React starts reading or persisting:

```text
cookies
profile path
provider token
provider session data
```

stop.

Frontend may only operate on account IDs and sanitized account/provider views.

## Stop condition E — Live provider DOM changes

If the provider UI changes and the auth probe breaks:

```text
update only DreaminaAuthProbe / DreaminaAuthAdapter
add regression test
```

Do not change Account Pool architecture.

---

# 18. Commit Sequence

Recommended commit order:

```text
1. fix: make backend bootstrap config precedence explicit
2. test: consolidate provider authentication contract
3. refactor: decouple provider auth adapters from concrete browser runtime
4. feat: add dreamina authentication probe
5. feat: implement dreamina browser auth adapter
6. feat: register dreamina provider in account pool
7. test: add opt-in dreamina session smoke test
8. docs: mark dreamina account authentication implemented
```

If a generic frontend bug is found:

```text
fix: render registered account providers
```

Keep it as a separate commit.

---

# 19. What NOT to Implement in This Plan

Do not add:

```text
VideoProviderPort
Seedance submit API/browser automation
generation request schema
remote_job_id
polling
download
MediaAsset
durable job worker
job claim/heartbeat
quota scheduling
automatic account rotation after rate limit
Story Engine
Timeline
FFmpeg pipeline
```

Those belong to the next phase.

---

# 20. Next Plan After This One

After this plan is fully green, the next implementation document should be:

```text
docs/superpowers/plans/2026-09-17-durable-job-worker-implementation-plan.md
```

Its scope should be only:

```text
Job aggregate/state machine
SQLite persistence
atomic claim
worker lifecycle
retry/recovery
stale lease recovery
restart tests
```

After durable jobs are complete, create a separate plan for:

```text
VideoProviderPort
Dreamina/Seedance execution adapter
AccountLease ↔ Job integration
remote submit/poll/download
MediaAsset persistence
```

Do not combine those phases into the current auth plan.
