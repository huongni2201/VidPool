# VidPool Post-Scaffold Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the latest VidPool `main` snapshot after the frontend FSD scaffold by fixing account-login cleanup, account validation/lease concurrency, fake Account Pool data, duplicated frontend architecture, desktop CSP/assets, CI coverage, and documentation drift before implementing provider execution jobs.

**Architecture:** Keep the new Feature-Sliced Design structure as the canonical frontend architecture. Runtime composition remains in `app/`, API/config primitives live only in `shared/`, account schemas live only in `entities/account`, user actions live in `features/account-login` and `features/account-pool`, and `pages/` only compose features/widgets. Backend Account Pool remains DDD/modular with `AccountService` as the application facade; cross-operation invariants must be coordinated there.

**Tech Stack:** React 19, TypeScript 6, Vite 8, React Router 7, TanStack Query 5, Zustand 5, Zod 4, Tailwind CSS 4, Tauri 2, Rust, FastAPI, Python 3.12, SQLAlchemy 2, SQLite, Alembic, Playwright, Pytest, Ruff, Pyright, Vitest, Testing Library.

**Spec:** `docs/CURRENT_STATUS.md` plus repository snapshot `fff62dba974517f8ac1fe939d3cdea1a91973f53` reviewed on 2026-09-18.

## Global Constraints

- Preserve local-first desktop architecture: Tauri owns the FastAPI sidecar lifecycle.
- Backend must bind to loopback only.
- Protected API routes must keep per-session bearer-token authentication.
- Do not add cloud auth or user-account authentication to VidPool.
- Do not introduce a second frontend API client, runtime config implementation, account schema, or Account Pool implementation.
- Do not present quota, stamina, credits, project counts, jobs, or provider capabilities as real data until the backend exposes them.
- Preserve persistent isolated browser profiles for provider sessions.
- New-login cancellation must delete only provisional accounts and their provisional browser profile.
- Relogin cancellation must preserve the existing account record and profile.
- An account must never be leased while a validation operation is opening/using its persisted browser profile.
- Use TDD: each behavior change begins with a failing regression test.
- Run `pnpm check` after every frontend task that changes behavior or boundaries.
- Run `ruff check .`, `pyright`, and the focused Pytest suite after every backend task.
- Keep commits small and scoped to one independently reviewable task.
- Do not begin provider execution / Seedance generation-job implementation until all P1 tasks in this plan are complete.

---

# 0. Findings and Priority

The reviewed snapshot is buildable, but several correctness and architecture problems remain.

| Priority | Finding | Risk |
| --- | --- | --- |
| P1 | New account login can leave a provisional/ghost DB account when validation fails and the user closes the dialog | DB/profile lifecycle leak |
| P1 | `validate_account()` is not coordinated by the same mutation lock as `acquire()` | Account can be leased while validation uses the browser profile |
| P1 | Account Pool mixes real API data with hard-coded `12/8/2`, credits, quota and stamina | Misleading UI and invalid product state |
| P1 | New FSD folders coexist with old runtime/API/account implementations | Rapid architectural drift and duplicated fixes |
| P2 | Dashboard uses remote Unsplash images while Tauri CSP permits only `self` and `data:` images | Packaged desktop images fail |
| P2 | Desktop CI checks Rust/sidecar but does not prove a full Tauri production build | Packaging regressions can escape CI |
| P2 | Committed development token is static and weaker than the production runtime model | Dev/prod security model mismatch |
| P2 | `CURRENT_STATUS.md` overstates some implemented/verified capabilities | Documentation cannot be trusted as implementation reality |

## Required execution order

1. Fix account-login cleanup.
2. Serialize validation against lease mutations.
3. Remove fake Account Pool runtime data.
4. Migrate frontend runtime fully to canonical FSD modules.
5. Remove obsolete duplicate frontend modules.
6. Make desktop assets CSP-safe.
7. Strengthen desktop CI and development token handling.
8. Update implementation-status documentation and run full verification.

Do not perform a large rename/refactor before Tasks 1–3. Correctness regressions must be covered first.

---

# 1. Target File Structure

After this plan, the relevant frontend structure should converge to:

```text
vidpool-frontend/src/
├── app/
│   ├── App.tsx
│   ├── bootstrap.tsx
│   ├── layouts/
│   ├── providers/
│   └── router/
├── pages/
│   └── accounts/
│       └── accounts-page.tsx
├── widgets/
│   ├── account-table/
│   ├── sidebar/
│   └── topbar/
├── features/
│   ├── account-login/
│   │   ├── api/
│   │   │   └── account-login-api.ts
│   │   └── ui/
│   │       └── add-account-dialog.tsx
│   └── account-pool/
│       ├── api/
│       │   └── account-pool-api.ts
│       ├── hooks/
│       │   ├── use-account-actions.ts
│       │   └── use-accounts.ts
│       ├── lib/
│       │   └── account-pool-helpers.ts
│       ├── model/
│       └── ui/
│           └── account-row.tsx
├── entities/
│   └── account/
│       ├── model/
│       │   └── types.ts
│       └── ui/
│           └── account-status-badge.tsx
├── shared/
│   ├── api/
│   │   ├── api-client.ts
│   │   ├── api-client-context.tsx
│   │   ├── contracts.ts
│   │   └── index.ts
│   ├── config/
│   │   ├── runtime-config.ts
│   │   └── index.ts
│   ├── constants/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   └── ui/
└── test/
```

The following legacy/duplicate paths should no longer be needed after migration and verification:

```text
vidpool-frontend/src/lib/api-client.ts
vidpool-frontend/src/runtime/runtime-config.ts
vidpool-frontend/src/app/api-client-context.tsx
vidpool-frontend/src/features/accounts/
vidpool-frontend/src/app/shell/AppShell.tsx
vidpool-frontend/src/app/shell/Sidebar.tsx
vidpool-frontend/src/app/shell/Topbar.tsx
vidpool-frontend/src/app/store/navigation-store.ts
```

Do not delete a legacy file until repository-wide search confirms no production or test import still references it.

---

# Task 1: Add Regression Coverage for Provisional Account Cleanup

**Priority:** P1

**Files:**
- Modify: `vidpool-frontend/src/features/accounts/accounts-page.test.tsx` only if needed to preserve existing regression coverage before migration.
- Create or migrate test to: `vidpool-frontend/src/features/account-login/ui/add-account-dialog.test.tsx`
- Modify: `vidpool-frontend/src/features/account-login/ui/add-account-dialog.tsx`
- Use API contract from: `vidpool-frontend/src/features/account-login/api/account-login-api.ts`

**Interfaces:**
- Consumes:
  - `cancelNewLogin(client, accountId): Promise<void>`
  - `cancelRelogin(client, accountId): Promise<AccountSummary>`
  - `completeLogin(client, accountId): Promise<AccountSummary>`
  - `startLogin(client, providerKey): Promise<StartLoginResponse>`
  - `startRelogin(client, accountId): Promise<StartLoginResponse>`
- Produces:
  - Dialog close behavior that distinguishes new login from relogin.
  - No provisional DB/profile leak after failed new-login validation.
  - Cleanup failures remain visible to the user rather than being silently swallowed.

- [ ] **Step 1: Write a failing test for closing after new-login validation failure**

Mock the account-login API at the feature boundary. Test the following sequence:

```tsx
it("cancels the provisional account before closing after new-login validation fails", async () => {
  startLoginMock.mockResolvedValue({
    accountId: "11111111-1111-4111-8111-111111111111",
    status: "waiting_for_user",
  })
  completeLoginMock.mockRejectedValue(new Error("Browser session validation failed"))
  cancelNewLoginMock.mockResolvedValue(undefined)

  renderDialog({ target: { kind: "add" } })

  await chooseProviderAndStart()
  await clickLoggedIn()
  await screen.findByText("Đăng nhập chưa thành công")

  await user.click(screen.getByRole("button", { name: "Đóng" }))

  expect(cancelNewLoginMock).toHaveBeenCalledWith(
    expect.anything(),
    "11111111-1111-4111-8111-111111111111",
  )
  expect(onClose).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Write a failing test proving relogin close does not delete the account**

```tsx
it("cancels relogin without deleting the existing account", async () => {
  startReloginMock.mockResolvedValue({
    accountId: EXISTING_ACCOUNT_ID,
    status: "waiting_for_user",
  })
  completeLoginMock.mockRejectedValue(new Error("Session validation failed"))
  cancelReloginMock.mockResolvedValue(existingAccount)

  renderDialog({
    target: { kind: "relogin", accountId: EXISTING_ACCOUNT_ID },
  })

  await screen.findByText("Hoàn tất đăng nhập trong cửa sổ trình duyệt")
  await user.click(screen.getByRole("button", { name: "Đã đăng nhập" }))
  await screen.findByText("Đăng nhập chưa thành công")
  await user.click(screen.getByRole("button", { name: "Đóng" }))

  expect(cancelReloginMock).toHaveBeenCalledWith(
    expect.anything(),
    EXISTING_ACCOUNT_ID,
  )
  expect(cancelNewLoginMock).not.toHaveBeenCalled()
})
```

- [ ] **Step 3: Write a failing test for cleanup failure**

The dialog must not disappear if cleanup fails:

```tsx
it("keeps the dialog open when provisional cleanup fails", async () => {
  cancelNewLoginMock.mockRejectedValue(new Error("Cleanup failed"))

  // Drive dialog to an error state with a provisional accountId.
  // Click Đóng.

  expect(onClose).not.toHaveBeenCalled()
  expect(await screen.findByText(/Cleanup failed/)).toBeInTheDocument()
})
```

- [ ] **Step 4: Run the focused tests**

Run:

```bash
cd vidpool-frontend
pnpm vitest run src/features/account-login/ui/add-account-dialog.test.tsx
```

Expected: the new tests fail with current close behavior.

- [ ] **Step 5: Commit only the failing regression tests**

```bash
git add vidpool-frontend/src/features/account-login/ui/add-account-dialog.test.tsx
git commit -m "test: cover account login cleanup lifecycle"
```

**Acceptance criteria:**
- Tests describe new-login cleanup, relogin preservation, and cleanup-error UX separately.
- No implementation behavior is changed in this task.
- Test names make the lifecycle invariant explicit.

---

# Task 2: Fix Add/Relogin Dialog Cleanup Lifecycle

**Priority:** P1

**Files:**
- Modify: `vidpool-frontend/src/features/account-login/ui/add-account-dialog.tsx`
- Modify if necessary: `vidpool-frontend/src/features/account-login/api/account-login-api.ts`
- Test: `vidpool-frontend/src/features/account-login/ui/add-account-dialog.test.tsx`

**Interfaces:**
- Consumes the APIs listed in Task 1.
- Produces:
  - `cleanupLoginSession(): Promise<boolean>` or equivalent internal function.
  - `closeAfterCleanup(): Promise<void>` or equivalent internal function.
  - Idempotent UI close behavior.

- [ ] **Step 1: Centralize reset-only behavior**

Create an internal reset function that does not perform server cleanup:

```tsx
const resetDialogState = () => {
  setState("choose_provider")
  setSelectedProvider("")
  setAccountId(null)
  setErrorMessage("")
}
```

Do not call `onClose()` from this helper.

- [ ] **Step 2: Add lifecycle-aware cleanup**

Implement cleanup semantics equivalent to:

```tsx
const cleanupLoginSession = async (): Promise<boolean> => {
  if (!accountId) {
    return true
  }

  try {
    if (target?.kind === "relogin") {
      await cancelRelogin(client, accountId)
    } else {
      await cancelNewLogin(client, accountId)
    }
    return true
  } catch (err: unknown) {
    setErrorMessage(
      err instanceof Error ? err.message : "Không thể dọn phiên đăng nhập",
    )
    setState("error")
    return false
  }
}
```

- [ ] **Step 3: Make close after a started login asynchronous**

Use behavior equivalent to:

```tsx
const handleClose = async () => {
  const cleaned = await cleanupLoginSession()
  if (!cleaned) {
    return
  }

  resetDialogState()
  onClose()
}
```

For the initial provider-picker state where no `accountId` exists, this should close immediately.

- [ ] **Step 4: Reuse the same cleanup path for the existing Cancel action**

Replace the current silent-error branch in `handleCancelWaiting`.

Do not keep:

```tsx
catch {
  // Ignore cancel errors
}
```

Instead, reuse `cleanupLoginSession()` so cleanup failures remain visible.

- [ ] **Step 5: Avoid double-cancel after successful login**

Successful `completeLogin()` closes the backend browser session itself. Before calling the UI close path, clear the transient ID or use a dedicated success-close helper:

```tsx
await completeLogin(client, accountId)
onSuccess()
resetDialogState()
onClose()
```

Do not call `cancelNewLogin()` after a successful `completeLogin()` because the account is no longer provisional.

- [ ] **Step 6: Run focused tests**

```bash
cd vidpool-frontend
pnpm vitest run src/features/account-login/ui/add-account-dialog.test.tsx
```

Expected: all Task 1 tests pass.

- [ ] **Step 7: Run the full frontend gate**

```bash
pnpm check
```

Expected: lint, all Vitest tests, TypeScript build, and Vite build pass.

- [ ] **Step 8: Commit**

```bash
git add vidpool-frontend/src/features/account-login
git commit -m "fix: clean provisional account login sessions"
```

**Acceptance criteria:**
- Failed new-login + Close deletes the provisional record/profile through the existing backend endpoint.
- Failed relogin + Close preserves the existing account.
- Cleanup failures are visible and do not falsely close the dialog.
- Successful login never calls cancellation afterward.

---

# Task 3: Serialize Account Validation Against Leasing

**Priority:** P1

**Files:**
- Modify: `vidpool-backend/app/modules/accounts/application/service.py`
- Test: `vidpool-backend/tests/accounts/test_account_concurrency.py`
- Optional focused service test: `vidpool-backend/tests/accounts/test_account_service.py`

**Interfaces:**
- Consumes:
  - `AccountService._mutation_lock: threading.RLock`
  - `AccountHealthService.validate_account(account_id, now=None) -> AccountView`
  - `AccountLeaseService.acquire(...) -> AccountLeaseView`
- Produces:
  - Validation and acquire/disable/delete/relogin are mutually coordinated inside one backend process.

- [ ] **Step 1: Add a deterministic concurrency regression test**

Do not rely only on thread timing. Create a provider auth fake whose `validate_persisted_session()` blocks on a `threading.Event`.

Use a flow equivalent to:

```python
validation_started = threading.Event()
allow_validation_to_finish = threading.Event()

class BlockingAuthAdapter(FakeProviderAuthAdapter):
    def validate_persisted_session(self, profile_key):
        validation_started.set()
        assert allow_validation_to_finish.wait(timeout=5)
        return SessionValidation(valid=True)
```

Start validation first:

```python
validate_thread.start()
assert validation_started.wait(timeout=5)
```

Then start `service.acquire(...)` on another thread.

Before releasing validation, assert acquire has not completed:

```python
time.sleep(0.1)
assert acquire_result == []
assert acquire_errors == []
```

Release validation:

```python
allow_validation_to_finish.set()
validate_thread.join(timeout=5)
acquire_thread.join(timeout=5)
```

Finally assert both operations complete in serialization order and never overlap.

- [ ] **Step 2: Run the new regression test**

```bash
cd vidpool-backend
pytest tests/accounts/test_account_concurrency.py::test_validate_is_serialized_against_acquire -v
```

Expected: FAIL with current implementation because `validate_account()` is outside `_mutation_lock`.

- [ ] **Step 3: Protect validation with the existing coordinator lock**

Change:

```python
def validate_account(...):
    return self._health_service.validate_account(account_id, now=now)
```

to:

```python
def validate_account(...):
    with self._mutation_lock:
        return self._health_service.validate_account(account_id, now=now)
```

Do not add another independent lock inside `AccountHealthService`.

Reason: the invariant spans leasing and validation, therefore orchestration belongs in the facade/coordinator that already owns cross-operation mutation serialization.

- [ ] **Step 4: Add a second regression case for validate vs disable/delete if the existing suite does not cover it indirectly**

The expected invariant is that the mutation lock serializes:

```text
validate
acquire
disable
delete
start_relogin
```

Do not test private lock implementation; test observable completion ordering and account invariants.

- [ ] **Step 5: Run focused backend tests**

```bash
pytest tests/accounts/test_account_concurrency.py -v
pytest tests/accounts/test_account_service.py -v
```

Expected: PASS.

- [ ] **Step 6: Run backend static and full test gates**

```bash
ruff check .
pyright
pytest -q
alembic upgrade head
alembic current
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add \
  vidpool-backend/app/modules/accounts/application/service.py \
  vidpool-backend/tests/accounts/test_account_concurrency.py
git commit -m "fix: serialize account validation and leasing"
```

**Acceptance criteria:**
- No account can be leased while validation is using its persisted browser profile.
- Existing acquire/disable/delete/relogin concurrency tests remain green.
- No lock is added to repository or domain layers.

---

# Task 4: Remove Fake Account Pool Operational Data

**Priority:** P1

**Files:**
- Modify/migrate: `vidpool-frontend/src/features/account-pool/hooks/use-accounts.ts`
- Modify/migrate: `vidpool-frontend/src/features/account-pool/ui/account-row.tsx`
- Modify: `vidpool-frontend/src/pages/accounts/accounts-page.tsx`
- Modify: `vidpool-frontend/src/widgets/account-table/ui/account-table.tsx` if used by the page
- Modify: `vidpool-frontend/src/features/account-pool/lib/account-pool-helpers.ts`
- Test: create `vidpool-frontend/src/pages/accounts/accounts-page.test.tsx` or migrate the existing account page tests.

**Interfaces:**
- Consumes `AccountSummary[]`.
- Produces truthful derived metrics only from fields currently returned by the backend:
  - total
  - active
  - auth-required
  - cooldown
  - disabled
- Does not invent quota, credit, stamina, or provider capacity.

- [ ] **Step 1: Write regression tests for an empty account list**

Mock API result as `[]` and assert:

```tsx
expect(screen.getByText("0")).toBeInTheDocument()
expect(screen.queryByText("12.480")).not.toBeInTheDocument()
expect(screen.queryByText("8/12 account")).not.toBeInTheDocument()
expect(screen.getByText("No accounts yet")).toBeInTheDocument()
```

Use more specific test IDs if repeated `0` values make text queries ambiguous.

- [ ] **Step 2: Write tests for real derived status counts**

Given four accounts:

```ts
[
  { status: "active" },
  { status: "active" },
  { status: "auth_required" },
  { status: "cooldown" },
]
```

assert:

```text
total = 4
active = 2
auth_required = 1
cooldown = 1
```

Do not assert credits/stamina because the contract does not contain them.

- [ ] **Step 3: Remove fallback counts**

Remove logic equivalent to:

```tsx
const totalCount = accounts.length || 12
const activeCount = accounts.length ? readyCount : 8
```

Replace with:

```tsx
const totalCount = accounts.length
const activeCount = accounts.filter((a) => a.status === "active").length
const authRequiredCount = accounts.filter(
  (a) => a.status === "auth_required",
).length
const cooldownCount = accounts.filter((a) => a.status === "cooldown").length
const disabledCount = accounts.filter((a) => a.status === "disabled").length
```

- [ ] **Step 4: Remove fake quota/credit/stamina presentation**

Until a backend capability contract exists:

- Remove `Tổng credits 12.480`.
- Remove `Hết quota 1`.
- Remove `500/500` and `0/500`.
- Remove any fake progress bar based only on account `status`.
- Replace unavailable capability UI with either:
  - no card/column, or
  - an explicit non-operational label such as `Chưa hỗ trợ`.

Preferred for the current milestone: remove the fake values entirely to keep Account Pool focused on login/session readiness.

- [ ] **Step 5: Make the pool-health banner derived**

Use:

```tsx
const usableCount = activeCount

const poolMessage =
  totalCount === 0
    ? "Chưa có account nào trong pool."
    : `${usableCount}/${totalCount} account đang sẵn sàng sử dụng.`
```

Do not hard-code `8/12`.

- [ ] **Step 6: Make provider filter functional**

Extend the hook:

```ts
export function useAccounts(providerKey?: string) {
  const client = useApiClient()

  const query = useQuery({
    queryKey: ["accounts", providerKey ?? "all"],
    queryFn: () => listAccounts(client, providerKey),
  })

  return {
    accounts: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
```

Populate provider options from `listProviders()` rather than `SeaArt / Seedance / Kling` hard-coded strings.

- [ ] **Step 7: Make search functional locally**

Keep search as UI-local state:

```tsx
const normalizedSearch = search.trim().toLowerCase()

const visibleAccounts = accounts.filter((account) => {
  if (!normalizedSearch) return true

  return [
    account.displayName,
    account.externalIdentity,
    account.providerKey,
  ]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(normalizedSearch))
})
```

Search must not trigger network requests per keystroke.

- [ ] **Step 8: Run account page tests**

```bash
cd vidpool-frontend
pnpm vitest run src/pages/accounts/accounts-page.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Run full frontend gate**

```bash
pnpm check
```

- [ ] **Step 10: Commit**

```bash
git add vidpool-frontend/src/features/account-pool vidpool-frontend/src/pages/accounts
git commit -m "fix: derive account pool UI from real account data"
```

**Acceptance criteria:**
- Empty DB means the UI shows zero accounts, not sample numbers.
- Every operational number shown on Account Pool is derivable from the current API response.
- Provider filtering and search controls actually work.
- No quota/stamina/credit claim is displayed as production data.

---

# Task 5: Make the New FSD Data Layer Canonical

**Priority:** P1

**Files:**
- Modify: `vidpool-frontend/src/app/bootstrap.tsx`
- Modify: `vidpool-frontend/src/main.tsx`
- Modify: `vidpool-frontend/src/shared/api/contracts.ts`
- Modify: `vidpool-frontend/src/shared/api/index.ts`
- Modify: `vidpool-frontend/src/shared/config/index.ts`
- Modify imports throughout:
  - `vidpool-frontend/src/features/account-login/**`
  - `vidpool-frontend/src/features/account-pool/**`
  - `vidpool-frontend/src/pages/**`
  - `vidpool-frontend/src/widgets/**`
  - `vidpool-frontend/src/test/**`
- Delete only after all imports migrate:
  - `vidpool-frontend/src/lib/api-client.ts`
  - `vidpool-frontend/src/runtime/runtime-config.ts`
  - `vidpool-frontend/src/app/api-client-context.tsx`

**Interfaces:**
- Canonical API client:
  - `shared/api/createApiClient`
  - `shared/api/ApiClient`
  - `shared/api/ApiClientProvider`
  - `shared/api/useApiClient`
  - `shared/api/healthSchema`
  - `shared/api/sessionProbeSchema`
- Canonical runtime config:
  - `shared/config/loadRuntimeConfig`
  - `shared/config/getDevRuntimeConfig`
  - `shared/config/RuntimeConfig`

- [ ] **Step 1: Add an architecture test or static search gate for forbidden legacy imports**

Create a small Vitest architecture test, for example:

`vidpool-frontend/src/test/architecture/import-boundaries.test.ts`

The test should scan `src/**/*.ts` and `src/**/*.tsx` and fail on imports matching:

```text
@/lib/api-client
@/runtime/runtime-config
@/app/api-client-context
```

Exclude the architecture test file itself if needed.

A minimal implementation can use Node `fs/promises` and recursive directory traversal.

- [ ] **Step 2: Run the architecture test and verify it fails**

```bash
pnpm vitest run src/test/architecture/import-boundaries.test.ts
```

Expected: FAIL and print the remaining legacy import paths.

- [ ] **Step 3: Migrate `app/bootstrap.tsx` to shared primitives**

Replace legacy imports:

```tsx
import { sessionProbeSchema } from "@/lib/api"
import { createApiClient, type ApiClient } from "@/lib/api-client"
import { loadRuntimeConfig, type RuntimeConfig } from "@/runtime/runtime-config"
import { ApiClientProvider } from "./api-client-context"
```

with:

```tsx
import {
  ApiClientProvider,
  createApiClient,
  sessionProbeSchema,
  type ApiClient,
} from "@/shared/api"
import {
  loadRuntimeConfig,
  type RuntimeConfig,
} from "@/shared/config"
```

Keep bootstrap responsibility unchanged: resolve runtime config, create the API client, probe the protected backend, then provide the client.

- [ ] **Step 4: Ensure `shared/api/index.ts` exports one public API**

It should expose only supported feature-facing primitives, for example:

```ts
export * from "./api-client"
export * from "./api-client-context"
export * from "./contracts"
```

- [ ] **Step 5: Ensure `shared/config/index.ts` exposes runtime config**

```ts
export * from "./runtime-config"
```

- [ ] **Step 6: Migrate feature imports**

Production feature code must import:

```ts
import type { ApiClient } from "@/shared/api"
import { useApiClient } from "@/shared/api"
```

and must not import from `@/lib/api-client` or `@/app/api-client-context`.

- [ ] **Step 7: Run architecture and full gates**

```bash
pnpm vitest run src/test/architecture/import-boundaries.test.ts
pnpm check
```

Expected: PASS.

- [ ] **Step 8: Repository-wide search before deletion**

Run:

```bash
rg "@/lib/api-client|@/runtime/runtime-config|@/app/api-client-context" vidpool-frontend/src
```

Expected: no production/test references except any deliberately retained migration assertion strings.

- [ ] **Step 9: Delete the obsolete files**

Delete:

```text
src/lib/api-client.ts
src/runtime/runtime-config.ts
src/app/api-client-context.tsx
```

If `src/lib/api.ts` now duplicates `shared/api/contracts.ts`, migrate its remaining imports and delete it in the same commit.

- [ ] **Step 10: Run `pnpm check` again after deletion**

```bash
pnpm check
```

- [ ] **Step 11: Commit**

```bash
git add -A vidpool-frontend/src
git commit -m "refactor: make shared frontend runtime primitives canonical"
```

**Acceptance criteria:**
- Exactly one API client implementation exists.
- Exactly one runtime config implementation exists.
- Features do not import from `app/` except where FSD rules explicitly allow composition from above; `useApiClient` comes from `shared/api`.
- Bootstrap uses the canonical shared modules.

---

# Task 6: Consolidate Account Feature and Remove the Legacy Branch

**Priority:** P1

**Files:**
- Canonical:
  - `vidpool-frontend/src/entities/account/**`
  - `vidpool-frontend/src/features/account-login/**`
  - `vidpool-frontend/src/features/account-pool/**`
  - `vidpool-frontend/src/pages/accounts/accounts-page.tsx`
- Remove after migration:
  - `vidpool-frontend/src/features/accounts/accounts-api.ts`
  - `vidpool-frontend/src/features/accounts/types.ts`
  - `vidpool-frontend/src/features/accounts/account-row.tsx`
  - `vidpool-frontend/src/features/accounts/accounts-page.tsx`
  - `vidpool-frontend/src/features/accounts/add-account-dialog.tsx`
  - `vidpool-frontend/src/features/accounts/hooks/use-account-actions.ts`
  - `vidpool-frontend/src/features/accounts/hooks/use-accounts.ts`
  - associated legacy tests after their cases are migrated

**Interfaces:**
- Canonical account types from `@/entities/account`.
- Account data operations from `@/features/account-pool`.
- Login/relogin operations and dialog from `@/features/account-login`.

- [ ] **Step 1: Add an architecture assertion that `src/features/accounts` does not remain**

Extend the architecture test from Task 5:

```ts
expect(legacyFeatureDirectoryExists).toBe(false)
```

Initially keep this assertion skipped until migration steps are ready, then enable it before deleting the directory. Do not leave a skipped test in the final commit.

- [ ] **Step 2: Build the canonical accounts page using public feature APIs**

`pages/accounts/accounts-page.tsx` should compose public exports rather than re-export the old page.

Target dependency direction:

```text
pages/accounts
  -> features/account-pool
  -> features/account-login
  -> entities/account
  -> shared/*
```

It must not depend on `features/accounts`.

- [ ] **Step 3: Move all reusable account Zod schemas to `entities/account/model/types.ts`**

There must be one definition of:

```ts
accountStatusEnum
providerDefinitionSchema
accountSummarySchema
startLoginResponseSchema
```

Delete duplicate schemas from the legacy feature after all consumers migrate.

- [ ] **Step 4: Migrate account actions hook**

Canonical `features/account-pool/hooks/use-account-actions.ts` should own:

```text
validate
enable
disable
delete
invalidate
mutation error
pending state
```

Use TanStack Query invalidation after successful mutations.

Recommended query key:

```ts
["accounts"]
```

When provider filtering is active, invalidate using a prefix:

```ts
queryClient.invalidateQueries({ queryKey: ["accounts"] })
```

so all provider-specific variants are refreshed.

- [ ] **Step 5: Migrate login dialog tests and behavior**

All lifecycle tests from Tasks 1–2 must now import the canonical dialog.

No behavior may be lost during the move.

- [ ] **Step 6: Remove `features/accounts`**

Before deletion:

```bash
rg 'features/accounts|@/features/accounts' vidpool-frontend/src
```

Expected: no consumers.

Delete the directory.

- [ ] **Step 7: Run account-focused tests**

```bash
pnpm vitest run \
  src/features/account-login/ui/add-account-dialog.test.tsx \
  src/pages/accounts/accounts-page.test.tsx
```

- [ ] **Step 8: Run full frontend verification**

```bash
pnpm check
```

- [ ] **Step 9: Commit**

```bash
git add -A vidpool-frontend/src
git commit -m "refactor: consolidate account pool feature slices"
```

**Acceptance criteria:**
- `src/features/accounts` no longer exists.
- Account schemas exist only in `entities/account`.
- Page composition is thin.
- Login and pool operations are separate features.
- All existing real account-management functionality still works.

---

# Task 7: Remove Duplicate Navigation/Shell State

**Priority:** P2

**Files:**
- Keep:
  - `vidpool-frontend/src/app/layouts/app-layout.tsx`
  - `vidpool-frontend/src/app/router/router.tsx`
  - `vidpool-frontend/src/widgets/sidebar/**`
  - `vidpool-frontend/src/widgets/topbar/**`
  - `vidpool-frontend/src/shared/constants/routes.ts`
- Remove after search:
  - `vidpool-frontend/src/app/shell/AppShell.tsx`
  - `vidpool-frontend/src/app/shell/Sidebar.tsx`
  - `vidpool-frontend/src/app/shell/Topbar.tsx`
  - `vidpool-frontend/src/app/store/navigation-store.ts`

**Interfaces:**
- React Router URL state is the navigation source of truth.
- `ROUTES` is the route-name/path source of truth.
- No Zustand `activeScreen` is needed for route navigation.

- [ ] **Step 1: Write a navigation regression test**

Render router/layout at `/accounts` and assert:

```tsx
expect(screen.getByText("Account Pool")).toBeInTheDocument()
expect(accountLink).toHaveClass(/* active class indicator */)
```

Navigate to `/projects`, then assert Projects becomes active.

- [ ] **Step 2: Remove `useNavigationStore()` from dashboard and other pages**

Replace patterns like:

```tsx
setScreen(screenId)
navigate(route)
```

with:

```tsx
navigate(route)
```

The URL is enough.

Change helper from:

```tsx
const handleNavigate = (route: string, screenId: any) => {
  setScreen(screenId)
  navigate(route)
}
```

to:

```tsx
const handleNavigate = (route: AppRoute) => {
  navigate(route)
}
```

This also removes the `any`.

- [ ] **Step 3: Search for store/shell consumers**

```bash
rg "useNavigationStore|activeScreen|app/shell|navigation-store" vidpool-frontend/src
```

Expected after migration: no production consumers.

- [ ] **Step 4: Delete duplicate shell/store files**

Delete the old `app/shell` implementation and `app/store/navigation-store.ts`.

- [ ] **Step 5: Run frontend gate**

```bash
pnpm check
```

- [ ] **Step 6: Commit**

```bash
git add -A vidpool-frontend/src
git commit -m "refactor: use router as navigation source of truth"
```

**Acceptance criteria:**
- One Sidebar implementation.
- One Topbar implementation.
- No screen-state duplication between URL and Zustand.
- Browser refresh/deep link correctly selects the active navigation item.

---

# Task 8: Make Desktop Demo Assets Compatible With the Tauri CSP

**Priority:** P2

**Files:**
- Modify:
  - `vidpool-frontend/src/features/dashboard/DashboardPage.tsx`
  - other feature pages containing remote demo images
- Add local assets under one canonical location, for example:
  - `vidpool-frontend/src/assets/demo/project-placeholder-1.webp`
  - `vidpool-frontend/src/assets/demo/project-placeholder-2.webp`
  - `vidpool-frontend/src/assets/demo/avatar-placeholder-1.webp`
- Keep restrictive CSP in:
  - `vidpool-frontend/src-tauri/tauri.conf.json`

**Interfaces:**
- UI demo assets load through Vite-bundled local imports.
- CSP remains restrictive; do not add `https:` or `*` merely to allow Unsplash.

- [ ] **Step 1: Search for remote image URLs**

```bash
rg 'https?://.*\.(png|jpg|jpeg|webp)|images\.unsplash\.com' vidpool-frontend/src
```

Record every production source file containing a remote image.

- [ ] **Step 2: Add a test/static architecture guard**

Extend the frontend architecture test to fail when production TS/TSX contains:

```text
images.unsplash.com
```

and optionally generic remote image URLs in demo UI.

- [ ] **Step 3: Add local placeholder assets**

Use small repository-owned demo assets. Keep them intentionally generic and small.

Do not change CSP to:

```text
img-src *
```

or:

```text
img-src https:
```

for this problem.

- [ ] **Step 4: Replace remote string URLs with imports**

Example:

```tsx
import projectPlaceholder from "@/assets/demo/project-placeholder-1.webp"

const recentProjects = [
  {
    id: "p1",
    name: "Thanh Xuân Trở Lại",
    cover: projectPlaceholder,
  },
]
```

- [ ] **Step 5: Verify web production build**

```bash
cd vidpool-frontend
pnpm build
```

- [ ] **Step 6: Verify Tauri dev manually**

```bash
pnpm tauri dev
```

Manual acceptance:
- Dashboard loads all placeholders.
- DevTools shows no CSP image violations.
- Sidebar/page navigation still works.

- [ ] **Step 7: Commit**

```bash
git add vidpool-frontend/src/assets vidpool-frontend/src
git commit -m "fix: bundle desktop-safe local demo assets"
```

**Acceptance criteria:**
- No production UI depends on Unsplash for demo content.
- Tauri CSP remains restrictive.
- Packaged frontend can render demo assets offline.

---

# Task 9: Strengthen Desktop CI With a Full Tauri Production Build

**Priority:** P2

**Files:**
- Modify: `.github/workflows/ci.yml`
- Verify: `vidpool-frontend/src-tauri/tauri.conf.json`
- Verify: `scripts/build-sidecar.py`
- Potentially modify package scripts: `vidpool-frontend/package.json`

**Interfaces:**
- Existing desktop job already validates:
  - sidecar build
  - packaged Playwright browser runtime smoke test
  - Rust tests
  - Rust compile
- New gate must validate production frontend + Tauri integration.

- [ ] **Step 1: Keep the current focused checks**

Do not remove:

```text
Build sidecar binary
Verify sidecar binary exists
Verify packaged Playwright browser runtime
cargo test
cargo check
```

These provide faster failure localization.

- [ ] **Step 2: Add Node/pnpm setup to the Windows desktop job**

Add:

```yaml
- run: corepack enable

- uses: actions/setup-node@v4
  with:
    node-version: 24
    cache: pnpm
    cache-dependency-path: vidpool-frontend/pnpm-lock.yaml

- run: pnpm install --frozen-lockfile
  working-directory: vidpool-frontend
```

- [ ] **Step 3: Add a full production Tauri build**

Preferred verification:

```yaml
- name: Build Tauri desktop app
  run: pnpm tauri build
  working-directory: vidpool-frontend
```

If NSIS installation tooling makes this too slow for every push, use two tiers:

```text
PR/push gate: pnpm tauri build --no-bundle
main/release gate: pnpm tauri build
```

But `CURRENT_STATUS.md` must only claim NSIS/package verification when the bundle build actually runs successfully.

- [ ] **Step 4: Avoid rebuilding the sidecar incorrectly**

Confirm `beforeBuildCommand` and `externalBin` behavior do not overwrite the already-built sidecar.

If `pnpm tauri build` expects the exact target-suffixed binary:

```text
src-tauri/binaries/vidpool-backend-x86_64-pc-windows-msvc.exe
```

ensure `scripts/build-sidecar.py` creates it before Tauri build.

- [ ] **Step 5: Verify the workflow on a branch/PR**

Expected job sequence:

```text
frontend: PASS
backend: PASS
desktop:
  sidecar build: PASS
  sidecar exists: PASS
  browser smoke: PASS
  cargo test: PASS
  cargo check: PASS
  pnpm install: PASS
  Tauri production build: PASS
```

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml vidpool-frontend/package.json
git commit -m "ci: verify full tauri production build"
```

**Acceptance criteria:**
- CI proves more than Rust compilation.
- A failure in Vite `frontendDist`, Tauri bundling, sidecar path, or desktop integration fails the desktop job.
- Documentation uses the same meaning of “package verified” as the CI command actually executed.

---

# Task 10: Replace the Static Development Session Token

**Priority:** P2

**Files:**
- Modify: `vidpool-frontend/.env.development`
- Modify if needed: `.gitignore`
- Add: `vidpool-frontend/.env.example`
- Optional helper:
  - `scripts/dev.py`, `scripts/dev.ps1`, or existing dev launcher if the repository already has one
- Verify:
  - `vidpool-frontend/src/shared/config/runtime-config.ts`
  - backend bootstrap CLI/env precedence

**Interfaces:**
- Production Tauri path remains unchanged: Rust generates a random token and injects runtime config.
- Browser-only local development must have an explicit token matching the backend token.

- [ ] **Step 1: Remove a committed usable token**

Change the tracked example from:

```env
VITE_SESSION_TOKEN=dev-token
```

to documentation-only configuration, preferably in `.env.example`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SESSION_TOKEN=replace-with-local-dev-token-at-least-32-characters
```

Do not commit the real local token.

- [ ] **Step 2: Ignore local development secrets**

Ensure `.gitignore` covers:

```text
vidpool-frontend/.env.local
vidpool-frontend/.env.development.local
```

while keeping `.env.example` tracked.

- [ ] **Step 3: Keep runtime schema strict**

Do not weaken:

```ts
sessionToken: z.string().min(32)
```

for Tauri runtime configuration.

For browser-only dev, either provide a valid token or fail clearly.

- [ ] **Step 4: Document the local browser-dev command**

Example PowerShell flow:

```powershell
$env:VIDPOOL_SESSION_TOKEN="<same-strong-token>"
python -m app.bootstrap
```

and local frontend env:

```env
VITE_SESSION_TOKEN=<same-strong-token>
```

Prefer an existing repository dev script if one exists rather than introducing a second startup system.

- [ ] **Step 5: Run frontend and backend smoke locally**

Verify:
- wrong token -> protected probe returns 401
- missing backend token -> protected route returns 503
- matching valid token -> bootstrap reaches ready state

- [ ] **Step 6: Commit**

```bash
git add .gitignore vidpool-frontend/.env.example vidpool-frontend/.env.development
git commit -m "chore: remove static development session token"
```

**Acceptance criteria:**
- No usable development bearer token is committed.
- Production token flow is unchanged.
- Browser development remains documented and reproducible.

---

# Task 11: Align `CURRENT_STATUS.md` With Verified Reality

**Priority:** P2

**Files:**
- Modify: `docs/CURRENT_STATUS.md`
- Modify if relevant: `docs/design/UI-SOURCE-OF-TRUTH.md`
- Add a verification note only if useful:
  - `docs/verification/2026-09-18-post-scaffold-stabilization.md`

**Interfaces:**
- `CURRENT_STATUS.md` describes implemented reality, not target design.
- Verification claims correspond to actual commands/tests.

- [ ] **Step 1: Correct Account Pool UI capability wording**

Do not imply quota/stamina/credit operational support until a backend contract exists.

Keep those items under `Not Implemented Yet` if still absent.

If the UI has removed fake values, document that Account Pool currently exposes:

```text
provider identity
authentication/session state
enable/disable
validate
delete
login/relogin
lease-ready status
```

and not quota/credit.

- [ ] **Step 2: Correct desktop verification wording**

Only say:

```text
Windows x64 / NSIS package verified
```

if Task 9's full bundle command passes CI.

If CI only runs `--no-bundle`, use wording such as:

```text
Windows x64 Tauri production compile verified; installer bundle not yet verified.
```

- [ ] **Step 3: Record canonical frontend architecture**

State that the FSD scaffold is not merely directories; runtime imports have been migrated to:

```text
shared/api
shared/config
entities/account
features/account-login
features/account-pool
pages
widgets
```

and legacy duplicate implementations have been removed.

- [ ] **Step 4: Record concurrency invariant**

Add:

```text
Account validation is serialized with lease acquisition and destructive account mutations within the single backend process.
```

Do not claim cross-process/distributed locking; VidPool is a local single-sidecar app.

- [ ] **Step 5: Run a documentation/source consistency search**

Search terms:

```bash
rg "quota|stamina|credit|NSIS|package gate|features/accounts|lib/api-client|runtime/runtime-config" docs vidpool-frontend/src
```

Manually verify each remaining hit is intentional.

- [ ] **Step 6: Commit**

```bash
git add docs/CURRENT_STATUS.md docs/verification
git commit -m "docs: align implementation status with verified runtime"
```

**Acceptance criteria:**
- No capability is marked implemented solely because a mock UI exists.
- No packaging claim exceeds the CI evidence.
- Canonical frontend paths match the actual source tree.

---

# Task 12: Final Verification Gate Before Provider Execution Work

**Priority:** Release gate

**Files:** No implementation changes should be required in this task. If a gate fails, fix the root cause in the owning task area and rerun.

- [ ] **Step 1: Frontend full gate**

```bash
cd vidpool-frontend
pnpm install --frozen-lockfile
pnpm check
```

Expected: PASS.

- [ ] **Step 2: Frontend architecture searches**

```bash
rg "@/lib/api-client|@/runtime/runtime-config|@/app/api-client-context" src
rg "@/features/accounts|features/accounts" src
rg "useNavigationStore|activeScreen|app/shell|navigation-store" src
rg "images\.unsplash\.com" src
```

Expected: no production hits.

- [ ] **Step 3: Backend full gate**

```bash
cd ../vidpool-backend
python -m pip install -e ".[dev]"
ruff check .
pyright
pytest -q
alembic upgrade head
alembic current
```

Expected: PASS.

- [ ] **Step 4: Explicit concurrency regression**

```bash
pytest tests/accounts/test_account_concurrency.py -v
```

Expected: PASS including `validate vs acquire`.

- [ ] **Step 5: Sidecar browser smoke**

From repository root, build the sidecar using the repository script, then run:

```powershell
vidpool-frontend\src-tauri\binaries\vidpool-backend-x86_64-pc-windows-msvc.exe --browser-smoke-test
```

Expected: exit code `0`.

- [ ] **Step 6: Rust gate**

```bash
cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
```

Expected: PASS.

- [ ] **Step 7: Full desktop production build**

```bash
cd vidpool-frontend
pnpm tauri build
```

Expected:
- production frontend builds
- Tauri compiles
- external sidecar is found
- configured desktop bundle is generated successfully

- [ ] **Step 8: Manual Account Pool smoke test**

Use a disposable test provider account/profile.

Verify:

```text
1. App starts and backend status becomes ready.
2. /accounts loads with real counts.
3. Empty DB shows 0 rather than 12/8/2.
4. Add Account opens the isolated browser.
5. Cancel before login removes provisional DB account/profile.
6. Failed validation + Close removes provisional account/profile.
7. Successful login preserves account/profile.
8. Restart app; account remains and persisted session can be validated.
9. Relogin cancellation preserves the account.
10. Disable blocks leasing.
11. Active lease blocks destructive mutations as designed.
12. Search and provider filtering work.
13. No fake credits/stamina/quota are displayed.
```

- [ ] **Step 9: Manual desktop UI smoke test**

Verify:

```text
Dashboard
Projects
Editor
Visual Beat
Characters
Voice
Account Pool
Jobs
Settings
```

Check:
- router URL and active sidebar are consistent
- no CSP errors
- no missing remote placeholder images
- deep-link/reload behavior works in the supported desktop routing setup

- [ ] **Step 10: Final status review**

`docs/CURRENT_STATUS.md` must match what actually passed above.

- [ ] **Step 11: Final stabilization commit if documentation-only adjustments remain**

```bash
git add docs/CURRENT_STATUS.md
git commit -m "docs: finalize post-scaffold stabilization status"
```

**Exit criteria for the stabilization milestone:**
- Frontend `pnpm check` passes.
- Backend Ruff/Pyright/Pytest/Alembic gates pass.
- Desktop Rust, browser sidecar smoke, and full Tauri production build pass.
- No duplicated frontend API/config/account implementations remain.
- No ghost-account cleanup path remains.
- Validation cannot overlap lease acquisition.
- Account Pool contains no operational fake data.
- `CURRENT_STATUS.md` matches verified implementation.

---

# 2. Recommended Commit Sequence

Use this sequence so regressions are easy to bisect:

```text
1. test: cover account login cleanup lifecycle
2. fix: clean provisional account login sessions
3. fix: serialize account validation and leasing
4. fix: derive account pool UI from real account data
5. refactor: make shared frontend runtime primitives canonical
6. refactor: consolidate account pool feature slices
7. refactor: use router as navigation source of truth
8. fix: bundle desktop-safe local demo assets
9. ci: verify full tauri production build
10. chore: remove static development session token
11. docs: align implementation status with verified runtime
```

Avoid one giant commit. Tasks 1–3 are correctness fixes and should be independently revertible.

---

# 3. What Not to Do

Do not solve these findings by:

```text
- opening Tauri CSP to all remote images
- keeping both `features/accounts` and `features/account-pool`
- keeping both `lib/api-client` and `shared/api/api-client`
- keeping URL routing plus Zustand `activeScreen`
- inventing quota/stamina/credit fields on the frontend
- marking mock UI as an implemented backend capability
- silently swallowing login-cancel cleanup failures
- putting repository/database locking logic into React
- adding a second backend process
- replacing the account lease mechanism before the current invariant is stabilized
- starting Seedance generation jobs before the account/session foundation is trustworthy
```

---

# 4. Follow-Up Work After This Plan

Only after the stabilization exit criteria pass, the next implementation milestone should be **Provider Execution + Durable Jobs using Account Pool leases**.

That milestone should start from these interfaces:

```text
Job requests provider capability
        ↓
Durable job coordinator
        ↓
AccountService.acquire(provider_key, owner_id, ttl)
        ↓
provider execution adapter receives leased account/profile
        ↓
submit / poll / download
        ↓
report success / auth failure / rate limit / temporary failure
        ↓
release lease
```

Do not couple Seedance/Dreamina execution directly to Account Pool persistence repositories. The job layer should consume application-level account lease/health interfaces.

A separate implementation plan should be written for that milestone after this stabilization plan is complete.
