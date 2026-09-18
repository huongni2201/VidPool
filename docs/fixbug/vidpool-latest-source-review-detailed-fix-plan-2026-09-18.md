# VidPool — Detailed Fix Plan After Latest Source Review

**Repository:** `huongni2201/VidPool`  
**Reviewed branch:** `main`  
**Reviewed HEAD:** `d7af2061ede35641a712fc71023444568fd09a75`  
**Review date:** 2026-09-18  
**Priority:** Stabilize foundations before expanding Chapter → Visual Beat → Jobs/provider execution

---

# 1. Executive Summary

VidPool has improved significantly after the recent clean-architecture and documentation-alignment refactor.

The following areas are now in a much better state:

- Frontend FSD migration is mostly complete.
- Legacy frontend directories have been removed.
- Frontend dead-code checking exists through `knip`.
- Backend passes Ruff, Pyright, pytest, and Alembic checks.
- Account Pool has stronger transaction and concurrency handling.
- Provider identity uniqueness is enforced at the database level.
- Browser lifecycle is centralized into a single-owner runtime.
- Documentation cleanup and CI gates have improved.

However, several issues remain that should be fixed **before adding major production features**.

Highest-priority findings:

1. Infrastructure/provider errors can leak internal details to the API.
2. Security regression tests currently do not reliably catch those leaks.
3. `BrowserRuntime` can still block forever on arbitrary operations.
4. Browser shutdown can claim `STOPPED` while its thread may still be alive.
5. `CURRENT_STATUS.md` claims `BrowserExecutionTimeout` exists although implementation does not.
6. The newly added Chapter implementation violates the FSD design direction.
7. Chapter data and analysis are still demo-only but are placed inside operational feature code.
8. Chapter analysis state is not isolated per chapter.
9. Account deletion can leave orphan browser profiles containing persisted sessions.
10. Documentation and duplicate-code gates are weaker than their names imply.

The stabilization order should be:

```text
Security boundary
    ↓
BrowserRuntime reliability
    ↓
Account profile cleanup durability
    ↓
Chapter architecture normalization
    ↓
Chapter state correctness
    ↓
Demo isolation
    ↓
Architecture/docs gates
    ↓
Production Chapter backend
    ↓
Story analysis
    ↓
Visual Beat
```

---

# 2. Global Rules for This Fix

These rules apply to every task in this plan.

## 2.1 Architecture

Backend dependency direction:

```text
API / Transport
        ↓
Application
        ↓
Domain

Infrastructure → implements Application/Domain ports
```

Never allow:

```text
Domain → FastAPI
Domain → SQLAlchemy
Domain → Playwright

Application → concrete SQLAlchemy
Application → concrete Playwright
Application → FastAPI
```

Frontend dependency direction:

```text
app
 ↓
pages
 ↓
widgets
 ↓
features
 ↓
entities
 ↓
shared
```

Do not create new shortcuts around the architecture just to make one screen work.

---

## 2.2 No fake production state

Demo/prototype data must never appear as real operational state.

Allowed:

```text
src/shared/demo/*
```

Forbidden:

```text
features/**/api/* containing fake data
entities/** using fake current project
sidebar fake counters
fake active jobs
fake provider balances
fake chapter analysis presented as persisted state
```

---

## 2.3 Tests must prove the invariant

Do not keep tests that merely execute code without asserting the actual security/consistency guarantee.

Bad:

```python
assert secret_not_present or unrelated_condition
```

Good:

```python
assert secret not in response.text
assert secret not in caplog.text
```

---

## 2.4 No broad refactor unrelated to current task

Each phase should leave the repository buildable.

Do not mix:

- security refactor,
- Chapter feature implementation,
- provider execution,
- visual redesign

inside one commit.

---

# 3. Phase A — Fix API Error Sanitization

**Priority:** P0 / Security  
**Risk:** High  
**Do this first.**

## A1. Problem

Current account API error mapping sends infrastructure exception messages to the client.

Relevant file:

```text
vidpool-backend/app/modules/accounts/api/router.py
```

Current pattern:

```python
if isinstance(exc, (BrowserUnavailable, ProviderUnavailable)):
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=str(exc),
    )
```

This is unsafe because infrastructure errors may contain:

- local filesystem paths,
- browser profile paths,
- Playwright messages,
- provider URLs,
- selector details,
- provider response fragments,
- access/session-related values.

Example from browser runtime:

```python
raise BrowserUnavailable(
    f"No supported browser channel could be launched for profile '{profile_path}'"
)
```

The public API should not receive the path.

## A2. Target Behavior

Internal logging:

```text
Detailed error
traceback
error class
provider
account ID if non-sensitive
```

Public API:

```json
{
  "detail": "Browser service unavailable"
}
```

or:

```json
{
  "detail": "Provider service unavailable"
}
```

Never expose raw infrastructure exception strings.

## A3. Files to modify

Primary:

```text
vidpool-backend/app/modules/accounts/api/router.py
vidpool-backend/tests/accounts/test_account_security.py
```

Potential helper extraction:

```text
vidpool-backend/app/api/errors.py
```

Only extract if multiple modules need the same mapping.

## A4. Implementation

Replace public mappings with fixed public messages.

Recommended policy:

```text
Domain validation/user-action error → safe normalized message
Infrastructure/provider/browser error → fixed public message
Unexpected exception → generic 500
```

Review explicitly:

```text
BrowserLaunchFailed
BrowserUnavailable
ProviderUnavailable
BrowserSessionNotOpen
BrowserProfileInUse
SessionInvalid
DuplicateProviderIdentity
InvalidProfileKey
```

Do not pass `str(exc)` for infrastructure failures.

## A5. Fix security regression tests

Replace weak assertions such as:

```python
assert "SECRET_TEST_VALUE" not in caplog.text or "password" not in caplog.text
```

with strict assertions:

```python
assert response.status_code == 503
assert "SECRET_TEST_VALUE" not in response.text
assert "SECRET_TEST_VALUE" not in caplog.text
assert "profile" not in response.text.lower()
```

Also test:

```text
absolute filesystem path
fake cookie value
fake Authorization token
fake provider response body
```

## A6. Acceptance criteria

- [ ] Browser infrastructure exception text never reaches API response.
- [ ] Provider infrastructure exception text never reaches API response.
- [ ] Secret marker cannot appear in `response.text`.
- [ ] Session token cannot appear in response or logs.
- [ ] Absolute browser profile path cannot appear in public API.
- [ ] Security tests fail when a secret is deliberately leaked.
- [ ] Existing Account API behavior remains unchanged otherwise.

## A7. Verification

```powershell
cd vidpool-backend

pytest tests/accounts/test_account_security.py -q
pytest tests/accounts/test_account_api.py -q
ruff check .
pyright
pytest -q
```

## A8. Suggested commit

```bash
git add vidpool-backend
git commit -m "fix: sanitize account infrastructure errors"
```

---

# 4. Phase B — Add Real BrowserRuntime Operation Timeouts

**Priority:** P0 / Runtime reliability

## B1. Problem

Current `BrowserRuntime._submit()` effectively does:

```python
return future.result()
```

with no timeout.

Although browser launch and navigation have Playwright timeouts, arbitrary operations executed through the browser runtime can still block indefinitely.

Affected operations include:

```text
run_active()
run_persisted_profile()
provider validation callbacks
identity resolution callbacks
page.evaluate()
DOM probing
future provider execution actions
```

This can freeze:

```text
Account validation
Login completion
Backend shutdown
Future generation jobs
Tauri shutdown
```

## B2. Documentation inconsistency

`docs/CURRENT_STATUS.md` currently claims behavior equivalent to:

```text
BrowserExecutionTimeout exists
hard action evaluation timeout exists
```

but the code does not contain this exception.

Implement the feature rather than keeping the inaccurate claim.

## B3. Files to modify

```text
vidpool-backend/app/modules/accounts/domain/errors.py
vidpool-backend/app/modules/accounts/infrastructure/browser/runtime.py
vidpool-backend/tests/accounts/test_browser_runtime.py
vidpool-backend/app/modules/accounts/api/router.py
docs/CURRENT_STATUS.md
```

## B4. Add explicit exception

```python
class BrowserExecutionTimeout(AccountDomainError):
    """Raised when a browser runtime command exceeds its allowed execution time."""
```

Do not alias this to `BrowserUnavailable`.

The distinction is useful for:

```text
metrics
debugging
future retries
provider health
job handling
```

## B5. Add command timeout configuration

Example:

```python
DEFAULT_OPERATION_TIMEOUT_SECONDS = 45.0
```

Constructor:

```python
def __init__(
    ...,
    operation_timeout_s: float = DEFAULT_OPERATION_TIMEOUT_SECONDS,
):
    self._operation_timeout_s = operation_timeout_s
```

Then:

```python
def _submit(self, operation):
    ...
    try:
        return future.result(timeout=self._operation_timeout_s)
    except TimeoutError as exc:
        raise BrowserExecutionTimeout(
            "Browser operation exceeded allowed execution time"
        ) from exc
```

Do not expose callback internals, URLs, profile paths, or provider secret values.

## B6. Important limitation

`Future.result(timeout=...)` does **not** kill the owner-thread operation automatically.

Therefore timeout handling must also address runtime recovery.

Recommended behavior:

```text
operation times out
    ↓
mark runtime DEGRADED
    ↓
reject new commands
    ↓
controlled shutdown/recreate runtime
```

Do not simply throw a timeout while silently letting the same owner thread remain blocked forever.

## B7. Introduce explicit runtime states

Current:

```text
RUNNING
STOPPING
STOPPED
```

Recommended:

```text
RUNNING
DEGRADED
STOPPING
STOPPED
```

If a browser owner-thread operation exceeds timeout:

```python
self._state = RuntimeState.DEGRADED
```

New submissions should raise `BrowserUnavailable` until a fresh runtime instance is created.

For a local personal desktop app, replacing the whole runtime instance is safer than force-killing an unknown Playwright operation.

## B8. Tests

Required:

### Timeout

Fake callback:

```python
def blocked_operation(context):
    event.wait()
```

Assert:

```text
BrowserExecutionTimeout raised
runtime enters DEGRADED
new command rejected
```

### Normal operation

```text
operation completes before timeout
result returned
runtime remains RUNNING
```

### Shutdown after timeout

Verify shutdown:

- does not claim clean `STOPPED` prematurely;
- does not allow unsafe profile deletion while thread is still alive.

## B9. Acceptance criteria

- [ ] Every submitted browser operation has a bounded wait time.
- [ ] Timeout has dedicated exception type.
- [ ] Runtime becomes unavailable after unrecoverable owner-thread hang.
- [ ] API receives normalized safe error.
- [ ] Documentation accurately describes implementation.
- [ ] Tests cover blocking callbacks.

---

# 5. Phase C — Make BrowserRuntime Shutdown Truthful

**Priority:** P0

## C1. Problem

Current shutdown sequence roughly:

```text
wait shutdown_future with timeout
join browser thread with timeout
state = STOPPED
```

The code can set `STOPPED` even if the thread has not actually terminated.

This creates:

```text
state says stopped
thread may still exist
```

Later code may directly delete profile directories when state is `STOPPED`.

## C2. Target invariant

This must always be true:

```text
RuntimeState.STOPPED
⇔
browser owner thread is not alive
```

Never mark `STOPPED` merely because shutdown timeout elapsed.

## C3. Implementation

After:

```python
self._thread.join(timeout=self._shutdown_timeout_s)
```

check:

```python
if self._thread.is_alive():
    with self._state_lock:
        self._state = RuntimeState.DEGRADED
    ...
```

Optionally define:

```python
class BrowserShutdownTimeout(AccountDomainError):
    ...
```

If it is only an internal shutdown condition, logging + truthful state is sufficient.

## C4. Profile deletion rule

Direct profile deletion is only allowed when:

```text
state == STOPPED
AND
thread is definitely dead
```

Prefer a helper:

```python
def _can_delete_profile_directly(self) -> bool:
    return (
        self.state == RuntimeState.STOPPED
        and not self._thread.is_alive()
    )
```

## C5. Tests

- [ ] clean shutdown sets STOPPED.
- [ ] blocked owner thread does not set STOPPED.
- [ ] profile cannot be deleted directly while thread is alive.
- [ ] `close_all()` remains idempotent.
- [ ] application shutdown does not deadlock.

---

# 6. Phase D — Make Browser Profile Deletion Durable

**Priority:** P1 / Security & lifecycle

## D1. Problem

Current account deletion pattern:

```text
delete account DB row
commit
delete browser profile
```

If profile deletion fails:

```text
account disappears from DB
browser profile remains on disk
```

The profile may still contain:

```text
provider cookies
localStorage
session state
logged-in browser data
```

This creates orphaned persisted sessions.

## D2. Recommended approach

For this desktop app, prefer:

```text
load account
    ↓
ensure no active lease
    ↓
ensure no live browser session
    ↓
delete browser profile
    ↓
delete DB row
    ↓
commit
```

If profile deletion fails:

```text
keep account record
return controlled error
allow retry
```

The existing mutation lock protects the lifecycle operation from racing with lease/login mutation inside the process.

## D3. Also fix provisional login cancellation

`cancel_new_login()` should follow the same principle:

```text
close browser
delete profile
delete provisional DB row
```

If profile deletion fails, do not silently lose the only database reference to the profile.

## D4. Optional startup reconciliation

Later add a maintenance check:

```text
registered profile keys from DB
vs
profile directories on disk
```

Detect:

```text
orphan directory
missing profile directory
malformed profile directory
```

Initially report only; do not auto-delete unknown directories.

## D5. Tests

- [ ] deletion failure preserves account DB record.
- [ ] successful profile delete then removes DB record.
- [ ] active lease prevents profile deletion.
- [ ] active browser session prevents profile deletion.
- [ ] provisional cancel failure does not orphan an untracked profile.

---

# 7. Phase E — Normalize Chapter Frontend Architecture

**Priority:** P1

## E1. Problem

New Chapter functionality is currently under:

```text
src/features/chapters/
```

with:

```text
api/
components/
hooks/
model/
```

This is effectively a full vertical module inside `features`.

It conflicts with the documented FSD rule:

```text
features = discrete user actions
entities = domain concepts
widgets = composite UI
pages = route composition
```

## E2. Target structure

Recommended:

```text
src/
├── entities/
│   └── chapter/
│       ├── model/
│       │   ├── types.ts
│       │   └── schemas.ts
│       ├── api/
│       │   └── chapter-api.ts        # only after real backend API exists
│       └── index.ts
│
├── features/
│   ├── chapter-create/
│   ├── chapter-save/
│   └── chapter-analyze/
│
├── widgets/
│   ├── chapter-list/
│   ├── chapter-editor/
│   ├── chapter-analysis-panel/
│   └── analyzed-scene-list/
│
└── pages/
    └── chapters/
        └── ui/
            └── chapter-page.tsx
```

## E3. File migration mapping

Move:

```text
features/chapters/model/types.ts
features/chapters/model/schemas.ts
```

to:

```text
entities/chapter/model/types.ts
entities/chapter/model/schemas.ts
```

Move:

```text
chapter-list.tsx
chapter-list-item.tsx
```

to:

```text
widgets/chapter-list/
```

Move:

```text
chapter-editor-form.tsx
chapter-header.tsx
```

to composition under:

```text
widgets/chapter-editor/
```

Keep save/analyze actions as feature entry points where appropriate.

Move:

```text
chapter-analysis-settings.tsx
chapter-analysis-progress.tsx
chapter-analysis-result.tsx
```

to:

```text
widgets/chapter-analysis-panel/
```

Move analysis action/hook to:

```text
features/chapter-analyze/
```

## E4. Do not over-fragment

Do not create a feature folder for every input.

Good:

```text
chapter-analyze
chapter-save
chapter-create
```

Usually unnecessary:

```text
chapter-change-title
chapter-change-summary
chapter-change-pacing
```

## E5. Acceptance criteria

- [ ] No generic `features/chapters` vertical module remains.
- [ ] Chapter domain types live in entity layer.
- [ ] Large reusable chapter panels are widgets.
- [ ] Analyze is a feature.
- [ ] Page only composes lower layers.
- [ ] Architecture tests enforce the new structure.

---

# 8. Phase F — Move All Chapter Demo Data to `shared/demo`

**Priority:** P1

## F1. Problem

Current:

```text
features/chapters/api/chapter-api.ts
```

contains:

```text
INITIAL_CHAPTERS
DEMO_ANALYZED_SCENES
DEFAULT_ANALYSIS_SETTINGS
DEMO_ANALYSIS_RESULT
DEMO_ANALYSIS_STEPS
```

This is not an API.

It also violates the repo's own demo-isolation rule.

## F2. Target

Move prototype data to:

```text
src/shared/demo/chapters.ts
src/shared/demo/chapter-analysis.ts
```

or, if small:

```text
src/shared/demo/chapters.ts
```

Export through:

```text
src/shared/demo/index.ts
```

## F3. Remove fake API

Delete the fake:

```text
features/chapters/api/chapter-api.ts
```

until a real backend endpoint exists.

Do not preserve fake constants behind an `api` name.

## F4. Prototype naming

Until real backend analysis exists, prefer:

```text
useDemoChapterAnalyzer
```

instead of pretending it is production:

```text
useChapterAnalyzer
```

---

# 9. Phase G — Fix Per-Chapter Analysis State

**Priority:** P1

## G1. Problem

Current analysis hook stores one global:

```typescript
result
steps
isAnalyzing
```

while only `scenesMap` is keyed by chapter.

This allows Chapter B to display Chapter A's result.

## G2. Target temporary state

Until server state exists:

```typescript
type ChapterAnalysisState = {
  result: AnalysisResult | null
  steps: AnalysisProgressStep[]
  status: "idle" | "analyzing" | "completed" | "error"
}

type ChapterAnalysisStateMap =
  Record<string, ChapterAnalysisState>
```

State:

```typescript
const [analysisByChapter, setAnalysisByChapter] =
  useState<ChapterAnalysisStateMap>({})
```

Selectors:

```text
getAnalysisState(chapterId)
getChapterScenes(chapterId)
```

## G3. Prevent stale closure bugs

Current async completion must not depend on whatever chapter happens to be selected later.

Use:

```text
chapterId captured at start
```

and ID-based mutation:

```typescript
updateChapterById(chapterId, ...)
```

Never mutate "selected chapter" from an async callback that started for an older selection.

## G4. Tests

- [ ] analyze chapter A.
- [ ] switch to chapter B.
- [ ] B does not show A result.
- [ ] start A then switch B before completion.
- [ ] A completion updates only A.
- [ ] B remains unchanged.
- [ ] reselect A and see A result.

---

# 10. Phase H — Fix Chapter Save Semantics

**Priority:** P1

## H1. Problem

Current save is essentially:

```typescript
setIsSaved(true)
```

No persistence occurs.

UI can therefore display `Đã lưu` even though a restart loses the content.

## H2. Temporary direction

Do not spend much effort on localStorage if real Chapter backend is next.

Until backend persistence exists, either:

1. label the state truthfully as local/prototype; or
2. disable misleading persisted-save language.

Once backend Chapter CRUD exists, replace with a real TanStack Query mutation.

## H3. Acceptance criteria

- [ ] UI never claims server/persistent save unless persistence happened.
- [ ] dirty state is derived from real mutation state or a clear local draft state.
- [ ] failed save remains visible/actionable.

---

# 11. Phase I — Strengthen FSD Architecture Tests

**Priority:** P2

## I1. Problem

Current architecture test hardcodes known bad feature directories:

```text
accounts
dashboard
projects
editor
characters
jobs
settings
visual-beat
voice
```

This allowed `features/chapters` to bypass the intended rule.

## I2. Add structural checks

Recommended checks:

### No page implementation under features

Reject:

```text
*Page.tsx
*-page.tsx
```

inside:

```text
src/features/
```

### Prefer FSD naming

Discourage generic:

```text
features/<domain>/
```

that contains an entire page vertical slice.

### No generic `components/` inside feature slice

Prefer:

```text
ui/
model/
api/
lib/
```

where justified.

### Route pages only from pages layer

Router should import route implementations from:

```text
@/pages/*
```

not `@/features/*`.

## I3. Keep tooling proportional

The current custom Vitest architecture scanner is sufficient for now.

Do not add heavyweight architecture tooling solely for this fix.

---

# 12. Phase J — Strengthen Documentation Gates

**Priority:** P2

## J1. Problem

Current docs checker verifies only:

```text
manifest-listed file exists
markdown link target exists
```

It does not ensure docs accurately represent implementation.

The current `BrowserExecutionTimeout` claim demonstrates this gap.

## J2. Improve manifest coverage

Scan canonical directories:

```text
docs/architecture/**/*.md
docs/adr/**/*.md
docs/rules/**/*.md
docs/design/**/*.md
docs/verification/**/*.md
```

Compare against `DOCS-MANIFEST.md`.

Fail when:

```text
canonical doc exists but is not in manifest
manifest references missing doc
```

Document exclusions such as:

```text
docs/screens/
docs/archive/
temporary fix-plan directories
```

## J3. Add machine-readable implementation status

Do not try to fully parse free-form Markdown.

Create a small machine-readable status file, for example:

```text
docs/status.yaml
```

Example:

```yaml
account_pool: implemented
browser_execution_timeout: implemented
chapter_backend: not_implemented
story_analysis: not_implemented
visual_beat_backend: not_implemented
```

CI can validate important claims.

Example:

```text
browser_execution_timeout=implemented
→ BrowserExecutionTimeout symbol must exist
```

## J4. Current metadata

After stabilization, update:

```text
Last reviewed: 2026-09-18
```

and ensure every Implemented item is actually connected to runtime code.

---

# 13. Phase K — Improve Duplicate-Code Gate

**Priority:** P3

## K1. Problem

`check-source-duplicates.py` detects only identical normalized files.

It does not detect duplicated functions or JSX blocks.

## K2. Keep the existing exact checker

It still has value.

Do not build a complex clone detector yet.

Focus reviews/tests on high-value duplication zones:

```text
shared UI primitives
API error mapping
Zod schemas
route constants
query keys
domain → DTO mapping
```

Optional future tool:

```text
jscpd
```

Only add it when repository size justifies the maintenance cost.

---

# 14. Phase L — Production Chapter Backend

**Priority:** Only after stabilization phases are green

## L1. Backend module structure

Recommended:

```text
vidpool-backend/app/modules/chapters/
├── domain/
│   ├── chapter.py
│   ├── values.py
│   └── errors.py
│
├── application/
│   ├── ports.py
│   ├── service.py
│   ├── commands.py
│   └── queries.py
│
├── infrastructure/
│   └── persistence/
│       ├── models.py
│       ├── mapper.py
│       └── repository.py
│
└── api/
    ├── schemas.py
    └── router.py
```

Do not mix AI story analysis implementation into the Chapter domain.

## L2. Minimal Chapter API

```http
GET    /api/projects/{project_id}/chapters
POST   /api/projects/{project_id}/chapters
GET    /api/chapters/{chapter_id}
PATCH  /api/chapters/{chapter_id}
DELETE /api/chapters/{chapter_id}
```

Keep analysis separate from CRUD.

## L3. Suggested Chapter domain data

```text
id
project_id
order
title
summary
source_text
created_at
updated_at
```

Avoid storing derived UI counters as primary truth unless necessary.

Prefer:

```text
word_count → calculated
scene_count → analysis query
visual_beat_count → analysis query
```

---

# 15. Phase M — Story Analysis / Visual Beat Boundary

After Chapter persistence is real, add analysis as its own capability.

## M1. Do not make Chapter entity run AI

Avoid:

```text
Chapter.analyze_with_model()
```

Use an application service such as:

```text
StoryAnalysisService
```

with a port:

```python
class StoryAnalyzerPort(Protocol):
    def analyze(...): ...
```

Possible adapters later:

```text
local model
OpenAI-compatible model
Gemini
other hosted provider
```

This preserves the ability to switch models.

## M2. Define output contract before provider

Example:

```json
{
  "chapterId": "...",
  "characters": [],
  "locations": [],
  "scenes": [
    {
      "id": "...",
      "order": 1,
      "title": "...",
      "summary": "...",
      "visualBeats": []
    }
  ]
}
```

Use strict Pydantic schemas and matching frontend Zod schemas.

## M3. Analysis should become a durable job

Target:

```text
Chapter
  ↓
Analyze command
  ↓
Job
  ↓
StoryAnalyzerPort
  ↓
Analysis Result
  ↓
Scenes
  ↓
Visual Beats
```

Do not keep a long AI operation attached to a synchronous frontend request.

---

# 16. Phase N — Connect Frontend to Real Chapter API

Once Chapter CRUD exists, use TanStack Query for server state.

Recommended:

```text
entities/chapter/api/chapter-api.ts
entities/chapter/api/chapter-queries.ts
```

Query keys:

```typescript
chapterKeys.all
chapterKeys.byProject(projectId)
chapterKeys.detail(chapterId)
```

Mutations:

```text
create
update
delete
```

Remove:

```text
INITIAL_CHAPTERS
useState-based chapter repository
fake save
```

---

# 17. Testing Matrix

Before starting another major feature, all gates below should pass.

## Backend

```powershell
cd vidpool-backend

ruff check .
pyright
pytest -q

alembic upgrade head
alembic current
```

Focused suites:

```powershell
pytest tests/accounts/test_account_security.py -q
pytest tests/accounts/test_account_concurrency.py -q
pytest tests/accounts/test_browser_runtime.py -q
pytest tests/accounts/test_account_api.py -q
```

## Frontend

```powershell
cd vidpool-frontend

pnpm check
pnpm knip
```

Chapter tests should cover:

```text
route rendering
chapter switching
per-chapter state
async analysis completion
dirty/save state
demo isolation
FSD boundaries
```

## Documentation

```powershell
python scripts/check-docs.py
python scripts/check-source-duplicates.py
node scripts/check-version-sync.mjs
```

## Desktop

```powershell
python scripts/build-sidecar.py

cargo test --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml
cargo check --locked --manifest-path vidpool-frontend/src-tauri/Cargo.toml

cd vidpool-frontend
pnpm tauri build
```

Browser smoke:

```powershell
src-tauri/binaries/vidpool-backend-x86_64-pc-windows-msvc.exe --browser-smoke-test
```

---

# 18. Recommended Commit Sequence

Keep commits small and reversible.

```text
1. fix: sanitize account infrastructure errors

2. test: harden account security regression coverage

3. fix: bound browser runtime command execution

4. fix: make browser runtime shutdown state truthful

5. fix: make browser profile deletion retry-safe

6. refactor: move chapter domain model into entity layer

7. refactor: split chapter page into features and widgets

8. refactor: isolate chapter demo fixtures

9. fix: scope chapter analysis state by chapter

10. test: strengthen frontend architecture boundaries

11. ci: strengthen documentation integrity checks

12. docs: realign current implementation status
```

Do not combine all phases into one giant commit.

---

# 19. Definition of Done

This stabilization phase is complete only when all statements below are true.

## Security

- [ ] Raw Playwright/provider exception strings never reach frontend.
- [ ] Secret-marker tests fail if the marker is leaked.
- [ ] Browser/profile absolute paths never appear in API responses.
- [ ] Session token never appears in logs or error bodies.

## Browser Runtime

- [ ] Browser commands have bounded execution waits.
- [ ] Browser runtime has a real timeout exception.
- [ ] Hung runtime does not keep accepting new work.
- [ ] Runtime never reports STOPPED while owner thread is alive.
- [ ] Profile deletion cannot race with a live runtime thread.

## Account Pool

- [ ] Failed profile deletion does not orphan an untracked session directory.
- [ ] Account deletion remains lease-safe.
- [ ] Relogin/login lifecycle remains serialized.
- [ ] Existing Account Pool tests remain green.

## Frontend Architecture

- [ ] No page-shaped `features/chapters` module remains.
- [ ] Chapter domain types live in `entities/chapter`.
- [ ] Chapter panels are widgets.
- [ ] Analyze action is a feature.
- [ ] Demo data lives only under `shared/demo`.
- [ ] Architecture tests catch future violations automatically.

## Chapter Correctness

- [ ] Chapter A cannot display Chapter B analysis result.
- [ ] Async analysis updates the chapter that started it.
- [ ] Save UI does not falsely claim server persistence.
- [ ] Prototype analysis is clearly separated from future production API.

## Documentation

- [ ] `CURRENT_STATUS.md` matches actual code.
- [ ] Browser timeout claims are factual.
- [ ] Last reviewed metadata is current.
- [ ] Canonical docs are covered by manifest rules.
- [ ] No deleted/superseded plan remains referenced.

## CI

- [ ] Frontend pipeline passes.
- [ ] Backend pipeline passes.
- [ ] Desktop/Tauri pipeline passes.
- [ ] Docs/version/duplicate gates pass.

---

# 20. What NOT to Implement Yet

Until this plan passes, avoid expanding:

```text
Seedance execution
generation orchestration
durable provider jobs
Visual Beat production generation
TTS pipeline
video render pipeline
quota-based account routing
multiple provider execution adapters
```

These features depend on the foundations being trustworthy.

---

# 21. Recommended Next Feature After This Plan

After stabilization, implement:

```text
Project persistence
    ↓
Chapter CRUD
    ↓
Story Analysis contract
    ↓
Durable analysis Job
    ↓
Scene persistence
    ↓
Visual Beat persistence
    ↓
Provider execution
    ↓
Asset generation
```

The immediate production milestone should be:

```text
Real Chapter CRUD + persistent source story text
```

before real AI analysis.

That converts the current Chapter screen from a prototype into a stable application boundary and gives Visual Beat a reliable upstream source.

---

# 22. Short AI Implementation Prompt

Use this plan as the implementation source of truth.

Implement the phases strictly in order. Do not skip tests and do not expand scope into new production features.

For every phase:

1. inspect the existing implementation before editing;
2. preserve DDD / Clean Architecture backend boundaries;
3. preserve frontend FSD dependency direction;
4. reuse or extract duplicate logic instead of adding wrappers;
5. write a failing regression test first for each confirmed bug;
6. run focused tests after each change;
7. run full backend/frontend gates before completion;
8. update `CURRENT_STATUS.md` only after the implementation truly exists;
9. make one focused commit per logical phase.

Do not mark a task complete merely because TypeScript/Python compiles. Verify the exact invariant in the acceptance criteria.
