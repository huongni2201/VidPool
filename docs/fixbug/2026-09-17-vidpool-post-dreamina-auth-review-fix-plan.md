# VidPool Post-Dreamina Auth Review Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Baseline commit:** `7e5a969a3be31af13e2d3f6134b4730952071852`

**Goal:** Fix the correctness gaps found after the first Dreamina authentication implementation so VidPool can distinguish an actually expired session from provider/browser failures, verify real persisted profiles instead of false-positive smoke tests, prove Playwright works from the packaged Windows sidecar, and make UI/design documentation accurately distinguish implemented behavior from future prototype behavior.

**Architecture:** Keep the existing Account Pool, `ProviderAuthPort`, `ProviderRegistry`, single-owner `BrowserRuntime`, SQLAlchemy Unit of Work, and frontend account flow. Provider-specific Dreamina detection remains isolated under `accounts/infrastructure/providers/dreamina`; a generic `ProviderUnavailable` error is propagated without mutating account state, while only confirmed logged-out state returns `SessionValidation(valid=False)` and transitions an account to `AUTH_REQUIRED`.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.x, SQLite, Playwright Python, pytest, Ruff, Pyright, PyInstaller, React 19, Vite, Tauri v2, Rust, GitHub Actions Windows/Linux runners.

**Spec / Source of Truth:**
- `AGENTS.md`
- `ARCHITECTURE-CHECKLIST.md`
- `docs/CURRENT_STATUS.md`
- `docs/design/2026-09-17-account-pool-browser-session-design.md`
- `docs/adr/0017-account-pool-browser-sessions.md`
- `docs/adr/0018-single-owner-playwright-browser-runtime.md`
- `docs/rules/08-provider-adapters.md`
- `docs/rules/11-security-secrets.md`
- `docs/rules/12-testing-quality.md`
- `docs/plan/2026-09-17-vidpool-dreamina-seedance-auth-implementation-plan.md`

## Global Constraints

- VidPool remains desktop-first, single-user, and local-first.
- Do not redesign Account Pool.
- Do not add Redis, Celery, PostgreSQL, brokers, microservices, or distributed scheduling.
- React must never call Dreamina or Seedance directly.
- Dreamina-specific URLs, selectors, DOM interpretation, and account identity extraction stay inside the Dreamina infrastructure adapter/probe.
- Do not store or log passwords, cookies, refresh credentials, access tokens, authorization headers, storage-state dumps, or browser-profile contents.
- Do not expose absolute browser profile paths to React/FastAPI responses.
- Do not use a user's personal Chrome/Edge profile.
- Only a **confirmed unauthenticated provider state** may return `SessionValidation(valid=False)`.
- Network failure, page timeout, selector failure, malformed provider DOM, JavaScript evaluation error, browser failure, or ambiguous provider state must **not** mutate an ACTIVE account into `AUTH_REQUIRED`.
- Provider technical failures must normalize to a generic application-visible `ProviderUnavailable` error and map to HTTP `503 Service Unavailable`.
- `ProviderUnavailable` must not trigger automatic reacquisition of another account for the same provider operation.
- Keep exactly one production `BrowserRuntime`.
- Keep current UoW transaction ownership; repositories do not commit or rollback.
- Bug fixes follow RED → GREEN → REFACTOR where behavior is testable.
- The live Dreamina smoke test remains opt-in and must never run in normal CI.
- The packaged-browser smoke test must run in Windows CI and must not require Dreamina credentials or external network access.
- `docs/CURRENT_STATUS.md` remains implementation reality.
- UI prototype/spec files may describe target UI, but must explicitly label behavior that is not implemented.
- Do not start Durable Jobs until this plan is fully green.

---

# 1. Review Findings This Plan Must Close

## P1 — Live Dreamina test can pass while the session is invalid

Current test:

```python
monkeypatch.setenv("VIDPOOL_DATA_DIR", str(tmp_path))
...
result = adapter.validate_persisted_session(profile_key)
assert isinstance(result.valid, bool)
```

This has two defects:

1. it points `BrowserRuntime` at an empty temporary data directory instead of the real profile directory;
2. both `True` and `False` satisfy `isinstance(result.valid, bool)`.

Target:

```text
real explicit test data dir
+ existing real profile
+ result.valid is True
```

## P1 — Technical probe errors are interpreted as logged-out

Current `DreaminaAuthProbe.inspect()` catches every exception and returns:

```python
DreaminaAuthState(authenticated=False)
```

Then `AccountHealthService` records invalid validation and the domain transitions the account to:

```text
AUTH_REQUIRED
```

Target:

```text
confirmed logged-out
    -> SessionValidation(False)
    -> AUTH_REQUIRED

provider/browser/DOM/network/ambiguous error
    -> ProviderUnavailable
    -> HTTP 503
    -> account state unchanged
```

## P1 — Current Dreamina selectors are too broad / insufficiently verified

Current logic includes:

```css
[class*="avatar"]
[class*="user-name"]
[class*="userName"]
```

These are vulnerable to unrelated DOM elements and generated class-name changes.

Target:

```text
prefer provider-owned auth ID signal / URL / stable data-* / ARIA signal
remove wildcard class heuristics
fail indeterminate instead of guessing
verify with a real logged-out and logged-in session
```

## P2 — UI source-of-truth mixes target prototype with implemented behavior

Current prototype/spec mentions SeaArt, stamina, credits, exhausted quota, quota refresh, fixed port 8000, and "persistent cookie session", while current production code does not implement several of those items.

Target:

```text
CURRENT_STATUS = implementation truth
UI-SOURCE-OF-TRUTH = target visual/interaction design
prototype mock data = explicitly labeled mock/future
runtime endpoint = dynamic in desktop, 8000 only in browser development
browser persistence = isolated persistent browser profile, not "we store a cookie"
```

## P2 — PyInstaller build is not a runtime Playwright verification

CI proves:

```text
sidecar binary exists
Rust tests pass
Rust compiles
```

It does not prove:

```text
packaged .exe can import Playwright
packaged .exe can start Playwright driver
packaged .exe can launch Edge/Chrome persistent context
packaged .exe can close the context cleanly
```

Target: add a credential-free browser smoke-test CLI and run it on the packaged Windows sidecar in CI.

---

# 2. Target Error Semantics

Use exactly these semantics throughout this fix:

```text
Dreamina page explicitly indicates logged out
    -> DreaminaAuthState(authenticated=False)
    -> SessionValidation(valid=False)

Dreamina page explicitly indicates logged in
    -> DreaminaAuthState(authenticated=True, identity optional)

logged in but stable identity cannot be read
    -> ProviderUnavailable
    -> account state unchanged

page.goto timeout
    -> ProviderUnavailable
    -> account state unchanged

page.evaluate throws
    -> ProviderUnavailable
    -> account state unchanged

neither trusted logged-out nor trusted logged-in signal exists
    -> ProviderUnavailable
    -> account state unchanged

BrowserRuntime cannot launch Edge/Chrome
    -> existing BrowserUnavailable
    -> HTTP 503
    -> account state unchanged
```

Do **not** use:

```text
unknown = logged out
exception = logged out
identity selector missing = logged out
```

---

# 3. File Map

## Modify

```text
vidpool-backend/app/modules/accounts/domain/errors.py
vidpool-backend/app/modules/accounts/api/router.py
vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_probe.py
vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_adapter.py

vidpool-backend/tests/accounts/fakes.py
vidpool-backend/tests/accounts/test_account_api.py
vidpool-backend/tests/accounts/test_account_service.py
vidpool-backend/tests/accounts/test_dreamina_auth_adapter.py
vidpool-backend/tests/accounts/test_dreamina_live.py

vidpool-backend/app/bootstrap.py
vidpool-backend/tests/test_bootstrap.py
.github/workflows/ci.yml

docs/CURRENT_STATUS.md
docs/design/UI-SOURCE-OF-TRUTH.md
docs/design/desktop-ui-prototype.html
vidpool-frontend/public/prototype.html
```

## No expected production changes

```text
vidpool-backend/app/modules/accounts/application/health_service.py
vidpool-backend/app/modules/accounts/application/login_service.py
vidpool-backend/app/modules/accounts/application/ports.py
vidpool-backend/app/modules/accounts/domain/account.py
vidpool-backend/app/core/container.py

vidpool-frontend/src/features/accounts/*
```

If implementation requires provider-specific changes in any file above, stop and re-check the design.

---

# 4. Task 1 — Introduce Generic Provider Availability Error

**Goal:** Give infrastructure adapters a normalized failure that means "provider auth state could not be checked right now" without claiming the session is invalid.

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/domain/errors.py`
- Modify: `vidpool-backend/app/modules/accounts/api/router.py`
- Modify: `vidpool-backend/tests/accounts/test_account_api.py`

**Interfaces:**

Produce:

```python
class ProviderUnavailable(AccountDomainError):
    """Raised when a provider operation cannot be completed due to a transient/technical failure."""
```

API mapping:

```text
ProviderUnavailable -> 503 Service Unavailable
```

### Steps

- [ ] **Step 1: Write RED API error-mapping coverage**

In `test_account_api.py`, add:

```python
from app.modules.accounts.domain.errors import ProviderUnavailable
```

The test will use the extended `FakeProviderAuthAdapter` from Task 2:

```python
adapter = FakeProviderAuthAdapter(
    provider_key="test-provider",
    persisted_validation_error=ProviderUnavailable(
        "Provider session check unavailable"
    ),
)
```

After creating an ACTIVE account, call:

```python
res = client.post(
    f"/api/accounts/{account_id}/validate",
    headers=AUTH_HEADER,
)

assert res.status_code == 503
assert res.json()["detail"] == "Provider session check unavailable"
```

Run:

```powershell
cd vidpool-backend
pytest tests/accounts/test_account_api.py -q
```

Expected before implementation: FAIL because `ProviderUnavailable` does not exist / is not mapped.

- [ ] **Step 2: Add `ProviderUnavailable`**

In `domain/errors.py`, place it near provider/session errors:

```python
class ProviderUnavailable(AccountDomainError):
    """Raised when a provider operation is temporarily unavailable."""
```

Do not create a Dreamina-specific domain exception.

- [ ] **Step 3: Map it to HTTP 503**

Update `_handle_error()`:

```python
if isinstance(exc, (BrowserUnavailable, ProviderUnavailable)):
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=str(exc),
    )
```

Keep `SessionInvalid` as HTTP 409.

- [ ] **Step 4: Run focused tests**

```powershell
pytest tests/accounts/test_account_api.py -q
```

Expected: PASS.

- [ ] **Step 5: Run static checks**

```powershell
ruff check app tests
pyright
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add \
  vidpool-backend/app/modules/accounts/domain/errors.py \
  vidpool-backend/app/modules/accounts/api/router.py \
  vidpool-backend/tests/accounts/test_account_api.py

git commit -m "fix: distinguish provider unavailability from invalid sessions"
```

**Acceptance criteria:**

```text
PASS: ProviderUnavailable exists as a generic error
PASS: API maps it to 503
PASS: SessionInvalid remains 409
PASS: no Dreamina-specific error leaks into API/application/domain interfaces
```

---

# 5. Task 2 — Make Account-State Regression Tests Prove 503 Does Not Mutate State

**Goal:** Protect the critical invariant: transient provider failure does not turn an ACTIVE account into `AUTH_REQUIRED`.

**Files:**
- Modify: `vidpool-backend/tests/accounts/fakes.py`
- Modify: `vidpool-backend/tests/accounts/test_account_service.py`
- Modify: `vidpool-backend/tests/accounts/test_account_api.py`

## Extend fake adapter deterministically

Change constructor to:

```python
class FakeProviderAuthAdapter(ProviderAuthPort):
    def __init__(
        self,
        provider_key: str = "fake-provider",
        valid_session: bool = True,
        display_name: str = "Fake User",
        external_identity: str = "fake-user-id",
        active_validation_error: Exception | None = None,
        persisted_validation_error: Exception | None = None,
        identity_error: Exception | None = None,
    ) -> None:
        self.provider_key = provider_key
        self.valid_session = valid_session
        self.display_name = display_name
        self.external_identity = external_identity
        self.active_validation_error = active_validation_error
        self.persisted_validation_error = persisted_validation_error
        self.identity_error = identity_error
```

Update methods:

```python
def validate_active_session(self, profile_key: str) -> SessionValidation:
    if self.active_validation_error is not None:
        raise self.active_validation_error
    return SessionValidation(valid=self.valid_session)
```

```python
def validate_persisted_session(self, profile_key: str) -> SessionValidation:
    if self.persisted_validation_error is not None:
        raise self.persisted_validation_error
    return SessionValidation(valid=self.valid_session)
```

```python
def resolve_identity(self, profile_key: str) -> ProviderIdentity:
    if self.identity_error is not None:
        raise self.identity_error
    return ProviderIdentity(
        display_name=self.display_name,
        external_identity=self.external_identity,
    )
```

### Steps

- [ ] **Step 1: Add the fake failure controls**

Run:

```powershell
ruff check tests/accounts/fakes.py
pyright
```

Expected: PASS.

- [ ] **Step 2: Write RED service regression test**

In `test_account_service.py`, import:

```python
from app.modules.accounts.domain.errors import ProviderUnavailable
```

Create an account through the existing service flow and make it ACTIVE.

Save:

```python
previous_last_validated_at = account.last_validated_at
```

Then configure:

```python
adapter.persisted_validation_error = ProviderUnavailable(
    "Provider session check unavailable"
)
```

Call:

```python
with pytest.raises(ProviderUnavailable):
    service.validate_account(account_id)
```

Then assert:

```python
account = repo.get(account_id)
assert account is not None
assert account.status is AccountStatus.ACTIVE
assert account.last_validated_at == previous_last_validated_at
```

- [ ] **Step 3: Add explicit invalid-session control test if not already present**

Reset:

```python
adapter.persisted_validation_error = None
adapter.valid_session = False
```

Call:

```python
view = service.validate_account(account_id)
```

Assert:

```python
assert view.status is AccountStatus.AUTH_REQUIRED
```

This prevents over-correcting the service into never marking sessions invalid.

- [ ] **Step 4: Finish the API 503 test from Task 1**

Use the fake error controls to create a deterministic API regression.

- [ ] **Step 5: Run tests**

```powershell
pytest \
  tests/accounts/test_account_service.py \
  tests/accounts/test_account_api.py \
  -q
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add \
  vidpool-backend/tests/accounts/fakes.py \
  vidpool-backend/tests/accounts/test_account_service.py \
  vidpool-backend/tests/accounts/test_account_api.py

git commit -m "test: preserve account state on provider validation outage"
```

**Acceptance criteria:**

```text
PASS: provider outage propagates
PASS: provider outage does not update account state
PASS: explicit invalid session still becomes AUTH_REQUIRED
PASS: API returns 503 for provider outage
```

---

# 6. Task 3 — Refactor Dreamina Probe to Separate Invalid From Indeterminate

**Goal:** Make `DreaminaAuthProbe` return `authenticated=False` only when there is trusted evidence that the user is logged out.

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_probe.py`
- Modify: `vidpool-backend/tests/accounts/test_dreamina_auth_adapter.py`

## New infrastructure-local exception

Add:

```python
class DreaminaProbeUnavailable(RuntimeError):
    """Raised when Dreamina authentication state cannot be determined reliably."""
```

This error stays inside Dreamina infrastructure.

## Change state semantics

Keep:

```python
@dataclass(frozen=True, slots=True)
class DreaminaAuthState:
    authenticated: bool
    display_name: str | None = None
    external_identity: str | None = None
```

But allow:

```python
DreaminaAuthState(
    authenticated=True,
    display_name=None,
    external_identity=None,
)
```

Authentication and identity resolution are separate concerns.

## Required inspect flow

Refactor to this shape:

```python
def inspect(self, context: Any) -> DreaminaAuthState:
    start_time = time.perf_counter()
    try:
        page = _get_or_create_page(context)
        self._ensure_workspace(page)

        if self._is_logged_out(page):
            state = DreaminaAuthState(authenticated=False)
        elif self._is_logged_in(page):
            display_name, external_identity = self._read_identity(page)
            state = DreaminaAuthState(
                authenticated=True,
                display_name=display_name,
                external_identity=external_identity,
            )
        else:
            raise DreaminaProbeUnavailable(
                "Dreamina authentication state is indeterminate"
            )

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        logger.info(
            "dreamina_probe_complete provider_key=dreamina authenticated=%s elapsed_ms=%d",
            state.authenticated,
            elapsed_ms,
        )
        return state
    except DreaminaProbeUnavailable:
        raise
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        logger.warning(
            "dreamina_probe_failed provider_key=dreamina error_type=%s elapsed_ms=%d",
            exc.__class__.__name__,
            elapsed_ms,
        )
        raise DreaminaProbeUnavailable(
            "Dreamina authentication probe could not complete"
        ) from exc
```

Add:

```python
def _ensure_workspace(self, page: Any) -> None:
    current_url = getattr(page, "url", "")
    if (
        not current_url
        or current_url == "about:blank"
        or not current_url.startswith("https://dreamina.capcut.com")
    ):
        page.goto(
            self._workspace_url,
            wait_until="domcontentloaded",
            timeout=self._timeout_ms,
        )
```

## Remove internal exception swallowing

Use:

```python
def _is_logged_out(self, page: Any) -> bool:
    url = getattr(page, "url", "")
    if "need_login=true" in url or "/login" in url or "/signin" in url:
        return True
    return bool(page.evaluate(LOGGED_OUT_SCRIPT))
```

```python
def _is_logged_in(self, page: Any) -> bool:
    return bool(page.evaluate(LOGGED_IN_SCRIPT))
```

```python
def _read_identity(self, page: Any) -> tuple[str | None, str | None]:
    result = page.evaluate(IDENTITY_SCRIPT)
    if not isinstance(result, dict):
        raise DreaminaProbeUnavailable(
            "Dreamina identity result has an unexpected shape"
        )
    return result.get("display_name"), result.get("external_identity")
```

Do not convert `page.evaluate()` exceptions into auth failure.

### Regression tests

- [ ] **Step 1: Replace ambiguous-state expectation**

```python
def test_probe_raises_when_auth_state_is_indeterminate() -> None:
    page = FakePage(
        eval_responses={
            "LOGGED_OUT": False,
            "LOGGED_IN": False,
        }
    )
    context = FakeContext(pages=[page])
    probe = DreaminaAuthProbe()

    with pytest.raises(
        DreaminaProbeUnavailable,
        match="indeterminate",
    ):
        probe.inspect(context)
```

- [ ] **Step 2: Add evaluation-failure test**

Configure:

```python
def raise_eval(expression: str, arg: Any) -> Any:
    raise RuntimeError("javascript evaluation failed")
```

Assert:

```python
with pytest.raises(DreaminaProbeUnavailable):
    probe.inspect(context)
```

- [ ] **Step 3: Add navigation-failure test**

Extend `FakePage`:

```python
goto_error: Exception | None = None
```

and:

```python
def goto(self, url: str, **kwargs: Any) -> None:
    if self.goto_error is not None:
        raise self.goto_error
    self.goto_calls.append(url)
    self.url = url
```

Use `url="about:blank"` and:

```python
goto_error=RuntimeError("navigation timeout")
```

Assert `DreaminaProbeUnavailable`.

- [ ] **Step 4: Add logged-in-without-identity test**

Use:

```python
"LOGGED_OUT": False,
"LOGGED_IN": True,
"IDENTITY": {
    "external_identity": None,
    "display_name": None,
},
```

Assert:

```python
result = probe.inspect(context)

assert result.authenticated is True
assert result.display_name is None
assert result.external_identity is None
```

- [ ] **Step 5: Implement probe semantics**
- [ ] **Step 6: Run focused tests**

```powershell
pytest tests/accounts/test_dreamina_auth_adapter.py -q
```

Expected: PASS.

- [ ] **Step 7: Run static checks**

```powershell
ruff check app/modules/accounts/infrastructure/providers/dreamina tests/accounts/test_dreamina_auth_adapter.py
pyright
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add \
  vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_probe.py \
  vidpool-backend/tests/accounts/test_dreamina_auth_adapter.py

git commit -m "fix: fail indeterminate dreamina auth checks without expiring sessions"
```

**Acceptance criteria:**

```text
PASS: confirmed logged-out -> authenticated False
PASS: confirmed logged-in -> authenticated True
PASS: logged-in identity may temporarily be absent
PASS: evaluate failure -> DreaminaProbeUnavailable
PASS: navigation failure -> DreaminaProbeUnavailable
PASS: ambiguous DOM -> DreaminaProbeUnavailable
```

---

# 7. Task 4 — Normalize Dreamina Probe Failure in the Auth Adapter

**Goal:** Prevent infrastructure-local `DreaminaProbeUnavailable` from leaking beyond the adapter and map it to generic `ProviderUnavailable`.

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_adapter.py`
- Modify: `vidpool-backend/tests/accounts/test_dreamina_auth_adapter.py`

## Imports

Use:

```python
from app.modules.accounts.domain.errors import (
    ProviderUnavailable,
    SessionInvalid,
)
from app.modules.accounts.infrastructure.providers.dreamina.auth_probe import (
    DreaminaAuthProbe,
    DreaminaAuthState,
    DreaminaProbeUnavailable,
)
```

## Validation mapping

In `validate_active_session()`:

```python
try:
    state = self._browser.run_active(
        profile_key,
        self._probe.inspect,
    )
except DreaminaProbeUnavailable as exc:
    raise ProviderUnavailable(
        "Dreamina session validation is temporarily unavailable"
    ) from exc

return SessionValidation(valid=state.authenticated)
```

In `validate_persisted_session()`:

```python
try:
    state = self._browser.run_persisted_profile(
        profile_key,
        self._probe.inspect,
    )
except DreaminaProbeUnavailable as exc:
    raise ProviderUnavailable(
        "Dreamina session validation is temporarily unavailable"
    ) from exc

return SessionValidation(valid=state.authenticated)
```

## Identity semantics

Implement:

```python
def resolve_identity(self, profile_key: str) -> ProviderIdentity:
    try:
        state = self._browser.run_active(
            profile_key,
            self._probe.inspect,
        )
    except DreaminaProbeUnavailable as exc:
        raise ProviderUnavailable(
            "Dreamina account identity is temporarily unavailable"
        ) from exc

    if not state.authenticated:
        raise SessionInvalid("Dreamina browser session is not authenticated")

    if not state.display_name or not state.external_identity:
        raise ProviderUnavailable(
            "Dreamina account identity is temporarily unavailable"
        )

    return ProviderIdentity(
        display_name=state.display_name,
        external_identity=state.external_identity,
    )
```

### Tests

- [ ] **Step 1: Add probe-outage stub**

```python
class RaisingDreaminaProbe:
    def inspect(self, context: Any) -> DreaminaAuthState:
        raise DreaminaProbeUnavailable("probe failed")
```

- [ ] **Step 2: Assert active validation maps to ProviderUnavailable**

```python
with pytest.raises(
    ProviderUnavailable,
    match="temporarily unavailable",
):
    adapter.validate_active_session("profile-key")
```

- [ ] **Step 3: Assert persisted validation maps to ProviderUnavailable**

```python
with pytest.raises(ProviderUnavailable):
    adapter.validate_persisted_session("profile-key")
```

- [ ] **Step 4: Change missing identity expectation**

Current missing-identity test must become:

```python
with pytest.raises(
    ProviderUnavailable,
    match="identity",
):
    adapter.resolve_identity("profile-key")
```

- [ ] **Step 5: Add explicit logged-out identity test**

Use a probe returning:

```python
DreaminaAuthState(authenticated=False)
```

Assert:

```python
with pytest.raises(SessionInvalid):
    adapter.resolve_identity("profile-key")
```

- [ ] **Step 6: Implement mapping**
- [ ] **Step 7: Run tests**

```powershell
pytest \
  tests/accounts/test_dreamina_auth_adapter.py \
  tests/accounts/test_account_service.py \
  tests/accounts/test_account_api.py \
  -q
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add \
  vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_adapter.py \
  vidpool-backend/tests/accounts/test_dreamina_auth_adapter.py

git commit -m "fix: normalize dreamina probe outages as provider unavailable"
```

**Acceptance criteria:**

```text
PASS: DreaminaProbeUnavailable never escapes adapter
PASS: ProviderUnavailable propagates to application/API
PASS: missing identity does not invalidate session
PASS: confirmed logout remains distinct from provider outage
```

---

# 8. Task 5 — Remove Broad Dreamina DOM Heuristics and Perform Real Signal Verification

**Goal:** Stop authenticating based on unrelated wildcard class names and verify the remaining Dreamina auth signals against real logged-out/logged-in sessions.

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_probe.py`
- Modify: `vidpool-backend/tests/accounts/test_dreamina_auth_adapter.py`
- Create: `docs/verification/2026-09-17-dreamina-auth-signals.md`

## Immediately remove unsafe heuristics

Remove:

```javascript
[class*="avatar"]
[class*="user-name"]
[class*="userName"]
```

Do not replace them with another wildcard class selector.

## Signal priority

Use:

```text
1. provider-owned authenticated user ID signal, if confirmed in real DOM
2. provider-owned login URL / redirect state
3. stable data-testid / data-* signal confirmed in real DOM
4. stable ARIA role/name confirmed in real DOM
```

Visible localized button text may be a secondary logged-out signal, not the sole logged-in signal.

## Verification evidence document

Create the file with this concrete structure:

```markdown
# Dreamina Authentication Signal Verification

**Date:** 2026-09-17
**Provider:** Dreamina
**Workspace URL:** https://dreamina.capcut.com/tools/ai-video-generator

## Logged-out observation

- final URL: <record exact observed URL without sensitive query values>
- trusted logged-out signal: <record exact non-secret signal>
- signal type: URL / data attribute / ARIA / provider-owned DOM value
- why it is not secret: <concrete reason>
- survives reload: yes/no

## Logged-in observation

- final URL: <record exact observed URL without sensitive query values>
- trusted logged-in signal: <record exact non-secret signal>
- signal type: provider-owned DOM value / data attribute / ARIA
- contains secret material: no
- survives reload: yes/no

## Identity observation

- display-name source: <exact non-secret source>
- external-identity source: <exact non-secret source>
- why external identity is stable: <concrete reason>
- token/cookie/storage secret used: no

## Rejected heuristics

- wildcard CSS classes
- nth-child selectors
- generated CSS class names
- cookie values
- access/refresh tokens
- localStorage/sessionStorage credential values
```

Angle-bracket text above is an instruction to the executor while gathering real evidence; **do not commit the evidence file until every field has been replaced by an observed concrete value**.

## Manual reconnaissance

- [ ] **Step 1: Start desktop VidPool**

```powershell
python scripts/build-sidecar.py
cd vidpool-frontend
pnpm tauri dev
```

- [ ] **Step 2: Open a fresh Dreamina profile while logged out**

Use Add Account.

Inspect only URL and DOM structure.

Do not export cookies or storage state.

- [ ] **Step 3: Verify existing logged-out URL assumptions**

Check whether these are actually observed:

```text
need_login=true
/login
/signin
```

Remove any rule that is not observed.

- [ ] **Step 4: Log in manually**

Use normal Dreamina/Google login and manually complete 2FA/CAPTCHA if required.

- [ ] **Step 5: Verify the current provider-owned ID assumption**

Check whether:

```text
#__GTW_USER_ID__
GATEWAY_INJECTED_USER_ID
```

exists in the real logged-in page and is a stable, non-secret account identifier.

If yes, document it and retain it.

If no, remove it and use the next stable non-secret provider-owned signal observed.

- [ ] **Step 6: Verify identity source**

Prefer:

```text
stable non-secret provider user ID
```

Fallback:

```text
normalized visible account email
```

Never use credential material.

- [ ] **Step 7: Update JS constants**

The final auth scripts must contain no:

```text
[class*=
nth-child
localStorage
sessionStorage
Authorization
access token
refresh token
```

- [ ] **Step 8: Update unit fixtures to mirror verified signal behavior**
- [ ] **Step 9: Run checks**

```powershell
cd vidpool-backend
pytest tests/accounts/test_dreamina_auth_adapter.py -q
ruff check app tests
pyright
```

Expected: PASS.

- [ ] **Step 10: Commit only after live evidence is concrete**

```bash
git add \
  vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina/auth_probe.py \
  vidpool-backend/tests/accounts/test_dreamina_auth_adapter.py \
  docs/verification/2026-09-17-dreamina-auth-signals.md

git commit -m "fix: use verified dreamina authentication signals"
```

**Hard gate:**

```text
logged-out profile -> explicit false
logged-in profile -> explicit true
identity -> non-empty, stable, non-secret
reload -> still true
```

Unit tests alone do not satisfy this task.

---

# 9. Task 6 — Fix the Opt-In Live Dreamina Test So It Tests the Real Profile

**Goal:** Make `test_dreamina_live.py` fail if the real persisted profile is missing or invalid.

**Files:**
- Modify: `vidpool-backend/tests/accounts/test_dreamina_live.py`

## Environment contract

Use exactly:

```text
VIDPOOL_RUN_DREAMINA_LIVE_TESTS=1
VIDPOOL_DREAMINA_TEST_DATA_DIR=<actual VidPool data directory>
VIDPOOL_DREAMINA_TEST_PROFILE_KEY=browser-profile/dreamina/<account-id>
```

## Target test

Replace current tmp-path behavior with:

```python
import os
from pathlib import Path

import pytest

from app.core.container import build_container
from app.modules.accounts.application.ports import SessionValidation
from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)

pytestmark = pytest.mark.skipif(
    os.getenv("VIDPOOL_RUN_DREAMINA_LIVE_TESTS") != "1",
    reason="Dreamina live tests require an authenticated local browser profile",
)


def test_persisted_dreamina_profile_is_valid(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    data_dir_value = os.getenv("VIDPOOL_DREAMINA_TEST_DATA_DIR")
    profile_key = os.getenv("VIDPOOL_DREAMINA_TEST_PROFILE_KEY")

    if not data_dir_value:
        pytest.skip("VIDPOOL_DREAMINA_TEST_DATA_DIR not set")
    if not profile_key:
        pytest.skip("VIDPOOL_DREAMINA_TEST_PROFILE_KEY not set")

    data_dir = Path(data_dir_value).expanduser().resolve()
    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(data_dir))

    resolver = BrowserProfilePathResolver(data_dir)
    profile_path = resolver.resolve(profile_key)

    assert profile_path.is_dir(), (
        f"Dreamina test profile does not exist: {profile_path}"
    )

    container = build_container()
    try:
        providers = container.provider_registry
        assert providers is not None

        adapter = providers.get_auth("dreamina")
        assert adapter is not None

        result = adapter.validate_persisted_session(profile_key)

        assert isinstance(result, SessionValidation)
        assert result.valid is True
    finally:
        container.close()
```

### Steps

- [ ] **Step 1: Replace test implementation**
- [ ] **Step 2: Verify default run skips**

```powershell
pytest tests/accounts/test_dreamina_live.py -q
```

Expected: `1 skipped`.

- [ ] **Step 3: Verify missing profile fails**

Enable live flag with an absent profile path.

Expected: assertion failure before browser validation.

- [ ] **Step 4: Run against real authenticated profile**

```powershell
$env:VIDPOOL_RUN_DREAMINA_LIVE_TESTS="1"
$env:VIDPOOL_DREAMINA_TEST_DATA_DIR="$HOME\.vidpool"
$env:VIDPOOL_DREAMINA_TEST_PROFILE_KEY="browser-profile/dreamina/<real-account-uuid>"

pytest tests/accounts/test_dreamina_live.py -q -s
```

Expected:

```text
1 passed
```

- [ ] **Step 5: Clear environment**

```powershell
Remove-Item Env:VIDPOOL_RUN_DREAMINA_LIVE_TESTS
Remove-Item Env:VIDPOOL_DREAMINA_TEST_DATA_DIR
Remove-Item Env:VIDPOOL_DREAMINA_TEST_PROFILE_KEY
```

- [ ] **Step 6: Commit**

```bash
git add vidpool-backend/tests/accounts/test_dreamina_live.py
git commit -m "fix: validate real dreamina profile in live smoke test"
```

**Acceptance criteria:**

```text
PASS: normal suite skips live test
PASS: missing profile cannot pass
PASS: invalid session cannot pass
PASS: valid real session requires result.valid is True
```

---

# 10. Task 7 — Add Packaged Sidecar Browser Smoke-Test CLI

**Goal:** Verify the PyInstaller sidecar itself can import Playwright and launch a persistent Edge/Chrome browser context.

**Files:**
- Modify: `vidpool-backend/app/bootstrap.py`
- Modify: `vidpool-backend/tests/test_bootstrap.py`

## CLI contract

Add:

```text
--browser-smoke-test
```

It must:

```text
create temporary VidPool data dir
construct BrowserProfilePathResolver
construct BrowserRuntime
open isolated persistent profile to about:blank
verify it is registered
close profile
close runtime
delete temporary directory
exit 0
```

It must not start FastAPI or access external network.

## BootstrapArgs

Add:

```python
browser_smoke_test: bool
```

Parser:

```python
parser.add_argument(
    "--browser-smoke-test",
    action="store_true",
    help="Launch and close an isolated browser profile, then exit",
)
```

## Smoke helper

Add:

```python
from pathlib import Path
```

and:

```python
def run_browser_smoke_test() -> None:
    from tempfile import TemporaryDirectory

    from app.modules.accounts.infrastructure.browser.profile_paths import (
        BrowserProfilePathResolver,
    )
    from app.modules.accounts.infrastructure.browser.runtime import BrowserRuntime

    with TemporaryDirectory(prefix="vidpool-browser-smoke-") as tmp:
        resolver = BrowserProfilePathResolver(Path(tmp))
        runtime = BrowserRuntime(resolver=resolver)
        profile_key = "browser-profile/smoke/smoke-account"

        try:
            runtime.open_login(
                provider_key="smoke",
                profile_key=profile_key,
                login_url="about:blank",
            )
            if not runtime.has_open_session(profile_key):
                raise RuntimeError("Browser smoke profile did not open")
            runtime.close_profile(profile_key)
        finally:
            runtime.close_all()
```

Main:

```python
def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)

    if args.browser_smoke_test:
        run_browser_smoke_test()
        return

    config = resolve_config(args)
    ...
```

### Tests

- [ ] **Step 1: Parser true test**

```python
def test_parse_args_accepts_browser_smoke_test() -> None:
    args = parse_args(["--browser-smoke-test"])
    assert args.browser_smoke_test is True
```

- [ ] **Step 2: Default false test**

```python
def test_browser_smoke_test_defaults_false() -> None:
    args = parse_args([])
    assert args.browser_smoke_test is False
```

- [ ] **Step 3: Main routing unit test**

Monkeypatch:

```python
called = False

def fake_smoke() -> None:
    nonlocal called
    called = True

monkeypatch.setattr("app.bootstrap.run_browser_smoke_test", fake_smoke)
monkeypatch.setattr(
    "app.bootstrap.uvicorn.run",
    lambda *args, **kwargs: pytest.fail("uvicorn must not start"),
)

main(["--browser-smoke-test"])

assert called is True
```

- [ ] **Step 4: Implement smoke mode**
- [ ] **Step 5: Run tests**

```powershell
pytest tests/test_bootstrap.py -q
```

Expected: PASS.

- [ ] **Step 6: Run local Python smoke**

From `vidpool-backend`:

```powershell
python -m app.bootstrap --browser-smoke-test
```

Expected exit code 0.

- [ ] **Step 7: Commit**

```bash
git add \
  vidpool-backend/app/bootstrap.py \
  vidpool-backend/tests/test_bootstrap.py

git commit -m "feat: add packaged browser runtime smoke-test command"
```

**Acceptance criteria:**

```text
PASS: smoke mode does not start FastAPI
PASS: no external network required
PASS: no provider credentials required
PASS: BrowserRuntime launches/closes supported browser
```

---

# 11. Task 8 — Run Browser Smoke Test Against Packaged Windows Sidecar in CI

**Goal:** Prove `--collect-all=playwright` works in the actual packaged `.exe`.

**Files:**
- Modify: `.github/workflows/ci.yml`

After `Verify sidecar binary exists`, add:

```yaml
- name: Verify packaged Playwright browser runtime
  shell: pwsh
  run: |
    $bin = "vidpool-frontend/src-tauri/binaries/vidpool-backend-x86_64-pc-windows-msvc.exe"
    & $bin --browser-smoke-test
    if ($LASTEXITCODE -ne 0) {
      throw "Packaged VidPool backend failed browser smoke test with exit code $LASTEXITCODE"
    }
```

Do not install a separate Playwright Chromium browser for this test.

The runtime policy remains:

```text
msedge
then chrome
```

### Steps

- [ ] **Step 1: Add CI step**
- [ ] **Step 2: Push/run CI**
- [ ] **Step 3: Confirm Windows desktop job**

Required:

```text
Build sidecar binary = success
Verify sidecar binary exists = success
Verify packaged Playwright browser runtime = success
Run Rust tests = success
Verify Rust compiles = success
```

If the hosted Windows runner genuinely has neither Edge nor Chrome, do not skip silently. Revisit the supported-browser/runtime policy explicitly.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: verify playwright from packaged backend sidecar"
```

**Acceptance criteria:**

```text
PASS: packaged .exe imports Playwright
PASS: packaged .exe starts Playwright driver
PASS: packaged .exe launches supported browser
PASS: packaged context closes cleanly
```

---

# 12. Task 9 — Correct UI Source-of-Truth Semantics

**Goal:** Prevent coding agents from mistaking mock/future UI behavior for implemented backend behavior.

**Files:**
- Modify: `docs/design/UI-SOURCE-OF-TRUTH.md`

Add near the top:

```markdown
## Implementation Semantics

This document is the canonical **target UI/interaction design**, not proof that the corresponding backend capability already exists.

Implementation reality is defined only by:

- `docs/CURRENT_STATUS.md`
- production source code
- passing tests

Rules for implementation agents:

1. A screen, metric, button, state, provider, or workflow shown here may be prototype-only.
2. Never create backend behavior solely because the prototype displays it.
3. Before wiring a UI control, verify the capability exists in `CURRENT_STATUS.md`.
4. Mock quota/stamina/credits values are visual examples until a production provider execution/quota contract exists.
5. Provider credentials must not be rotated to bypass provider quotas, rate limits, or platform restrictions.
```

## Runtime endpoint wording

Replace:

```text
FastAPI (Port 8000)
```

with:

```text
FastAPI Sidecar (runtime-selected loopback port; browser development defaults to 8000)
```

## Account Pool implemented baseline

Add:

```markdown
**Currently implemented account interactions:**

- backend-discovered provider list;
- Dreamina browser-session account registration;
- isolated persistent browser profiles;
- account states: `AUTH_REQUIRED`, `ACTIVE`, `COOLDOWN`, `DISABLED`;
- Add Account;
- Re-login;
- Validate;
- Enable/Disable;
- Delete;
- durable LRU account lease infrastructure.
```

## Prototype-only/future health UI

Add:

```markdown
**Prototype-only / future provider-health visualization:**

- stamina;
- credits;
- provider quota percentage;
- quota reset countdown;
- exhausted-quota counters;
- refresh-all quota snapshots;
- provider execution job assignment.

These elements are mock UI until provider execution/quota contracts are implemented.
```

## Provider wording

Use:

```text
Dreamina is the currently wired browser-auth provider. Other provider tiles shown in prototypes are mock/future examples unless listed in CURRENT_STATUS.md.
```

## Browser persistence wording

Use:

```text
VidPool keeps authentication state inside an isolated persistent browser profile managed locally by Playwright. The application does not store the provider password or expose browser-session secrets through the API/UI.
```

Do not say "only stores a cookie".

### Steps

- [ ] **Step 1: Add implementation semantics**
- [ ] **Step 2: Fix runtime port**
- [ ] **Step 3: Split current vs future Account Pool capability**
- [ ] **Step 4: Fix provider wording**
- [ ] **Step 5: Fix browser persistence wording**
- [ ] **Step 6: Search stale claims**

```powershell
rg -n "Port 8000|SeaArt|persistent cookie|Stamina|Credits|EXHAUSTED|Quota Exhausted" docs/design/UI-SOURCE-OF-TRUTH.md
```

Every remaining hit must be explicitly development-only or prototype/future.

- [ ] **Step 7: Commit**

```bash
git add docs/design/UI-SOURCE-OF-TRUTH.md
git commit -m "docs: distinguish target ui from implemented capabilities"
```

---

# 13. Task 10 — Correct Both HTML Prototypes

**Goal:** Keep the prototype visually useful while making fake/future data explicit and aligning the account wizard with the current Dreamina implementation.

**Files:**
- Modify: `docs/design/desktop-ui-prototype.html`
- Modify: `vidpool-frontend/public/prototype.html`

## Required text changes

Replace wizard provider:

```text
SeaArt AI
```

with:

```text
Dreamina (Seedance)
```

Replace:

```text
Đăng nhập Google / SeaArt như thông thường.
```

with:

```text
Đăng nhập Dreamina bằng phương thức đăng nhập bạn sử dụng bình thường.
```

Replace:

```text
VidPool không lưu password của bạn. Chỉ lưu persistent cookie session.
```

with:

```text
VidPool không lưu password của bạn. Phiên đăng nhập được giữ trong browser profile biệt lập trên máy.
```

Replace:

```text
Checking SeaArt Session…
```

with:

```text
Checking Dreamina Session…
```

Replace:

```text
SeaArt Account · 130/130 Stamina · ACTIVE
```

with:

```text
Dreamina Account · ACTIVE
```

## Add prototype banner

Use a small visible banner:

```text
UI PROTOTYPE — Some metrics and workflows are mock/future capabilities.
```

## Runtime status

Replace static production-like:

```text
FastAPI :8000
```

with:

```text
FastAPI Sidecar · Runtime Port
```

### Steps

- [ ] **Step 1: Update docs prototype**
- [ ] **Step 2: Apply same semantic changes to public prototype**
- [ ] **Step 3: Search**

```powershell
rg -n "SeaArt|persistent cookie|:8000|130/130 Stamina" \
  docs/design/desktop-ui-prototype.html \
  vidpool-frontend/public/prototype.html
```

Expected: no misleading hits.

- [ ] **Step 4: Run prototype**

```powershell
cd vidpool-frontend
pnpm dev
```

Open:

```text
http://localhost:5173/prototype.html
```

- [ ] **Step 5: Run frontend gate**

```powershell
pnpm check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add \
  docs/design/desktop-ui-prototype.html \
  vidpool-frontend/public/prototype.html

git commit -m "docs: align desktop prototype with current account architecture"
```

---

# 14. Task 11 — Make CURRENT_STATUS Explicit About Verification Level

**Goal:** Separate source-code implementation from real-provider/live-runtime verification.

**Files:**
- Modify: `docs/CURRENT_STATUS.md`

Change:

```text
production Dreamina browser auth adapter
```

to:

```text
Dreamina browser auth adapter implementation
```

until live verification is complete.

Add:

```markdown
## Verification Gates

### Automated

- Ruff/Pyright/backend pytest/Alembic CI: verified
- frontend `pnpm check`: verified
- Windows sidecar build/Rust compile: verified
- packaged Playwright browser runtime: verified only after the packaged browser smoke-test CI task is green

### Manual / Opt-In

- real Dreamina logged-out signal: verified only after `docs/verification/2026-09-17-dreamina-auth-signals.md` is completed
- real Dreamina logged-in signal and identity: verified only after the same evidence document is completed
- persisted Dreamina session across restart: verified only after `test_dreamina_live.py` passes against an actual local profile
```

After the gates actually pass, replace the conditional wording with:

```text
verified on 2026-09-17
```

Keep in Not Implemented Yet:

```text
durable job worker
provider execution jobs
Seedance video submission/poll/download execution adapter
quota/stamina/credit provider contract
```

### Steps

- [ ] **Step 1: Add Verification Gates**
- [ ] **Step 2: Add quota/stamina/credit contract to Not Implemented Yet**
- [ ] **Step 3: Ensure no prototype-only feature is under Implemented**
- [ ] **Step 4: Commit**

```bash
git add docs/CURRENT_STATUS.md
git commit -m "docs: track dreamina and packaged-browser verification gates"
```

---

# 15. Task 12 — Full Real Dreamina Lifecycle Verification

**Goal:** Prove the corrected semantics and persisted profile behavior end-to-end.

## A. Logged-out validation

- [ ] Open fresh Dreamina profile.
- [ ] Do not log in.
- [ ] Complete/validate.

Expected:

```text
confirmed invalid session
account = AUTH_REQUIRED
not ProviderUnavailable
```

## B. Logged-in validation

- [ ] Log in normally.
- [ ] Click `Đã đăng nhập`.

Expected:

```text
HTTP 200
account = ACTIVE
displayName != null
externalIdentity != null
interactive browser closes
profile remains on disk
```

## C. Restart validation

- [ ] Close Tauri + sidecar.
- [ ] Restart.
- [ ] Trigger Validate.

Expected:

```text
HTTP 200
account remains ACTIVE
no interactive login required
lastValidatedAt updates
```

## D. Provider failure regression

Use automated fake/probe tests, not traffic manipulation against Dreamina.

Expected:

```text
ProviderUnavailable
HTTP 503
account remains ACTIVE
lastValidatedAt unchanged
```

## E. Explicit logout

- [ ] Log out using Dreamina UI.
- [ ] Close profile.
- [ ] Trigger Validate.

Expected:

```text
status = auth_required
```

## F. Re-login

- [ ] Start re-login.
- [ ] Log in.
- [ ] Complete.

Expected:

```text
same account ID
same internal profile
ACTIVE
```

## G. Live persisted-session test

```powershell
$env:VIDPOOL_RUN_DREAMINA_LIVE_TESTS="1"
$env:VIDPOOL_DREAMINA_TEST_DATA_DIR="$HOME\.vidpool"
$env:VIDPOOL_DREAMINA_TEST_PROFILE_KEY="browser-profile/dreamina/<real-account-uuid>"

cd vidpool-backend
pytest tests/accounts/test_dreamina_live.py -q -s
```

Required:

```text
1 passed
```

Clear all three variables afterwards.

---

# 16. Task 13 — Full Automated Verification Gate

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
Ruff PASS
Pyright 0 errors
pytest PASS; live Dreamina test skipped by default
Alembic current = head
```

## Frontend

```powershell
cd ../vidpool-frontend
pnpm check
```

Expected: PASS.

## Packaged sidecar

From repo root:

```powershell
python scripts/build-sidecar.py

$bin = "vidpool-frontend/src-tauri/binaries/vidpool-backend-x86_64-pc-windows-msvc.exe"
& $bin --browser-smoke-test
if ($LASTEXITCODE -ne 0) {
    throw "browser smoke failed"
}
```

Expected exit code 0.

## Desktop

```powershell
cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

Expected: PASS.

## GitHub Actions

Required:

```text
backend = success
frontend = success
desktop = success
```

Desktop must contain:

```text
Verify packaged Playwright browser runtime = success
```

---

# 17. Architecture Review Gate

Check:

```text
[ ] Dreamina DOM logic only under infrastructure/providers/dreamina
[ ] AccountHealthService has no Dreamina branch
[ ] AccountLoginService has no Dreamina branch
[ ] AccountService has no Dreamina branch
[ ] React has no provider HTTP calls
[ ] React receives no profile path/cookie/token
[ ] BrowserRuntime remains single Playwright owner
[ ] only explicit logged-out evidence returns SessionValidation(False)
[ ] technical provider failures do not mutate account status
[ ] ProviderUnavailable maps to 503
[ ] no broad [class*=...] auth selectors remain
[ ] no cookie/localStorage/token auth inspection was introduced
[ ] packaged .exe browser launch is CI-tested
[ ] UI docs distinguish target prototype from implementation
[ ] CURRENT_STATUS is truthful
[ ] no automatic quota/rate-limit bypass behavior exists
```

Search:

```powershell
rg -n '\[class\*=' vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina
rg -n 'localStorage|sessionStorage|Authorization|access.?token|refresh.?token' vidpool-backend/app/modules/accounts/infrastructure/providers/dreamina
rg -n 'dreamina' vidpool-backend/app/modules/accounts/application vidpool-backend/app/modules/accounts/domain
```

Expected:

- no wildcard auth selectors;
- no secret inspection;
- no provider-specific application/domain branching.

---

# 18. Recommended Commit Sequence

```text
1. fix: distinguish provider unavailability from invalid sessions
2. test: preserve account state on provider validation outage
3. fix: fail indeterminate dreamina auth checks without expiring sessions
4. fix: normalize dreamina probe outages as provider unavailable
5. fix: use verified dreamina authentication signals
6. fix: validate real dreamina profile in live smoke test
7. feat: add packaged browser runtime smoke-test command
8. ci: verify playwright from packaged backend sidecar
9. docs: distinguish target ui from implemented capabilities
10. docs: align desktop prototype with current account architecture
11. docs: track dreamina and packaged-browser verification gates
```

Keep every commit green before continuing.

---

# 19. Definition of Done

## Error semantics

```text
[ ] explicit Dreamina logout -> invalid session
[ ] ambiguous Dreamina state -> ProviderUnavailable
[ ] navigation timeout -> ProviderUnavailable
[ ] JS evaluate error -> ProviderUnavailable
[ ] missing identity on authenticated page -> ProviderUnavailable
[ ] ProviderUnavailable -> HTTP 503
[ ] ProviderUnavailable does not change ACTIVE -> AUTH_REQUIRED
[ ] actual invalid session still changes -> AUTH_REQUIRED
```

## Dreamina signals

```text
[ ] no wildcard class selector is auth evidence
[ ] logged-out signal verified in real browser
[ ] logged-in signal verified in real browser
[ ] identity source verified in real browser
[ ] no secret is used as identity
[ ] evidence file contains concrete observations
```

## Live profile

```text
[ ] live test uses explicit actual VidPool data dir
[ ] profile directory existence is verified
[ ] live test requires result.valid is True
[ ] missing/invalid profile cannot pass
[ ] normal CI skips the live test
```

## Packaged runtime

```text
[ ] --browser-smoke-test exists
[ ] smoke mode does not start FastAPI
[ ] smoke mode needs no external network
[ ] packaged Windows .exe passes browser smoke
[ ] desktop CI runs packaged browser smoke
```

## Documentation

```text
[ ] CURRENT_STATUS is implementation truth
[ ] UI source-of-truth is explicitly target UI design
[ ] prototype quota metrics are labeled mock/future
[ ] no fixed production port 8000 claim
[ ] no "only persistent cookie" claim
[ ] Dreamina is current auth example
```

## Global gates

```text
[ ] Ruff passes
[ ] Pyright passes
[ ] pytest passes
[ ] Alembic head passes
[ ] pnpm check passes
[ ] cargo test passes
[ ] cargo check passes
[ ] all CI jobs pass
[ ] working tree clean
```

---

# 20. Stop Conditions

## Stop A — No trustworthy logged-in signal exists

Do not fall back to broad CSS classes, position, cookie/token values, or secret storage.

## Stop B — Identity requires credential material

Do not decode or expose credentials to populate identity.

## Stop C — Packaged sidecar fails Playwright while editable Python passes

Fix PyInstaller packaging/runtime resources before claiming desktop browser auth is ready.

## Stop D — Dreamina-specific condition appears in application/domain/frontend

Move it back to the adapter/probe.

## Stop E — Quota/execution work starts creeping into this fix

Do not add stamina scraping, credit scraping, quota rotation, automatic failover, or Seedance generation submission.

---

# 21. Next Phase

Only after this plan is fully green should VidPool move to the **Durable Job Worker** phase.

That next plan should cover:

```text
Job aggregate/state machine
SQLite persistence
atomic claim
worker lifecycle
heartbeat/stale claim recovery
retry policy
restart recovery
tests
```

After Durable Jobs is stable, create a separate provider-execution plan for:

```text
VideoProviderPort
Dreamina/Seedance execution adapter
job-account lease integration
remote submit checkpoint
poll/status
download
MediaAsset persistence
normalized provider errors
```

Do not keep refactoring Account Pool after this fix pass unless a concrete provider integration exposes a real contract defect.
