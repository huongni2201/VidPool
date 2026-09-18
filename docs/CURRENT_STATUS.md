# Current Implementation Status

**Status:** ACCOUNT POOL FOUNDATION & PERSISTENT BROWSER SESSIONS  
**Last reviewed:** 2026-09-18  
**Last verified commit:** `2153e7ae5c9dbded4676fb53ad07d526d70564e2` (and working tree descendant implementing Account Pool browser login fix plan)


## Purpose

This file distinguishes target architecture from implemented reality.

## Implemented

- architecture documentation baseline
- architecture rules
- ADR baseline
- Python architecture enforcement rules
- React/Vite/Tailwind/shadcn frontend Feature-Sliced Design (FSD) architecture strictly enforced:
  - Page implementations live canonically in `src/pages/<name>/ui/<name>-page.tsx`.
  - Legacy non-FSD paths (`src/components/`, `src/lib/`, `src/runtime/`, `src/app/api-client-context*`, and page-shaped `src/features/*`) are completely removed and blocked by architectural tests.
  - Reusable design system primitives are consolidated into single canonical implementations in `src/shared/ui/` (`StatCard`, `StatusBadge`, `WaveformVisualizer`).
  - Account table and pool summary widgets (`AccountTable`, `AccountPoolSummary`) are consolidated and reused across the Accounts and Dashboard views.
  - Demo fixtures are strictly isolated under `src/shared/demo/` and not mixed with production runtime state.
  - Store initialization is truthful: `useProjectStore` starts closed/empty with no mock project injected.
  - Sidebar runtime is truthful: hardcoded fake badges ("3", "8") and fake user profile card removed; dynamic version display using `@tauri-apps/api/app` `getVersion()` with `v0.1.0` fallback.
  - API client consolidated with unified `request<T>` handler and structured `ApiError` (extracting FastAPI `detail` without leaking credentials).
  - Zero dead code enforced via `pnpm knip` (0 unused files, 0 unused exports, 0 unused dependencies).
  - Version consistency enforced via `node scripts/check-version-sync.mjs` across `package.json`, `tauri.conf.json`, and `Cargo.toml` (`0.1.0`).
- React Router URL state is the sole navigation source of truth with active sidebar and topbar synchronization.
- desktop-safe local vector assets (`assets/demo/`) bundled for demo views conforming strictly to Tauri Content Security Policy (`img-src 'self' data:`) with zero remote image dependencies.
- Studio UI design baseline with client routing, navigation sidebar, topbar, and high-fidelity screen views (Tổng quan, Dự án, Chỉnh sửa, Chapters, Visual Beat, Nhân vật, Voice, Account Pool, Jobs, Cài đặt).
- frontend test/build/lint verification gate (`pnpm check`, `pnpm knip`) including architectural boundary tests.
- FastAPI application scaffold with `/api/health` probe.
- SQLite/SQLAlchemy persistence bootstrap with Alembic migrations up to head (`c5d1758e92ea`).
- frontend-to-local-backend health status integration.
- GitHub Actions CI workflow for frontend, backend, and desktop verification (including full `pnpm tauri build`).
- Tauri v2 desktop shell scaffold with packaged FastAPI sidecar bootstrap.
- Tauri-owned backend lifecycle with runtime API endpoint injection via minimal Tauri IPC.
- restricted localhost CORS and per-session local API token validation (`/api/session/probe` with Bearer token authentication verified on Tauri startup readiness probe).
- desktop CI compile/package gate (verified for Windows x64 / NSIS installer via `pnpm tauri build`).
- Account Pool domain model and application ports.
- Account Pool SQLAlchemy persistence models and repository with DB-backed account leases.
- Packaged startup database migrations (`migrate_database` in `app/infrastructure/persistence/migrations.py`) executed on container build before application readiness for fresh installs and legacy DB upgrades; migration assets bundled into Tauri sidecar binary.
- Unique provider account identity `(provider_key, external_identity)` enforced at database level (migration `c5d1758e92ea`), repository, and domain with provisional profile cleanup on duplicate conflict.
- Serialized account lifecycle mutations via coordination lock preventing race conditions between `complete_login`, `disable`, `delete`, `relogin`, and health updates.
- Browser runtime execution safety: hard timeouts on browser launch, contexts, page navigation, command execution (`BrowserCommandTimeout`), and shutdown (`BrowserShutdownTimeout`) with `RuntimeState.FAILED` poison queue to prevent hanging processes.
- Truthful browser shutdown lifecycle: `RuntimeState.STOPPED` is strictly enforced only when owner thread has terminated; `delete_profile` guards against direct execution while owner thread is alive.
- Durable LRU account leasing with explicit lease state transitions.
- Cooldown preservation and recovery: `record_validation(valid=True)` and `mark_authenticated` preserve active cooldowns until expired; `AccountLeaseService.acquire` recovers elapsed cooldown accounts via `AccountRepositoryPort.list_elapsed_cooldowns` and domain `clear_elapsed_cooldown` in the same transaction.
- Durable browser profile cleanup on deletion: profile deletion precedes database record deletion in `delete_account`, `cancel_new_login`, and duplicate identity handling in `complete_login` to prevent orphaned persisted sessions on disk.
- Infrastructure API error sanitization: infrastructure exceptions (`BrowserUnavailable`, `BrowserLaunchFailed`, `BrowserCommandTimeout`, `ProviderUnavailable`) map to sanitized public responses (`Browser service unavailable`, `Provider service unavailable`) preventing leaks of internal filesystem paths, tokens, or URLs.
- Account login lifecycle robustness: idempotent cancellation, duplicate terminal conflict (`ACCOUNT_ALREADY_EXISTS`) with immediate close and retry support, unmount cleanup with generation tracking.
- BrowserRuntime decoupled launch and navigation: browser context is created and registered into `_LiveSession` immediately upon launch; provider navigation uses `wait_until="commit"`; navigation timeout or network failure does not close the browser or poison the runtime into `RuntimeState.FAILED`.
- Playwright context close listener: listener uses `lambda *_: self._on_context_closed(profile_key)` accepting context arguments, ensuring live session map and lock cleanup when user closes the browser window.
- Relogin identity integrity: `complete_login` and `validate_account` enforce matching `external_identity` for existing accounts; mismatched identities trigger contaminated profile deletion, transition account to `AUTH_REQUIRED`, and raise `DuplicateProviderIdentity`.
- Standardized backend error code contract: structured error payload `{"detail": {"code": "...", "message": "..."}}` across account endpoints (`ACCOUNT_ALREADY_EXISTS`, `SESSION_INVALID`, `BROWSER_PROFILE_IN_USE`, `BROWSER_SESSION_NOT_OPEN`, `INVALID_ACCOUNT_STATE`, `ACCOUNT_IN_USE`, `BROWSER_UNAVAILABLE`, `PROVIDER_UNAVAILABLE`).
- Frontend login error recovery: `AddAccountDialog` differentiates `ACCOUNT_ALREADY_EXISTS` (terminal conflict) from `SESSION_INVALID` (retryable session probe failure); users can retry validation or re-open the browser without state corruption.
- Account pool summary truthful availability: `readyCount` strictly equals `availableCount` (no fallback to active); summary and table accurately distinguish active accounts from lease-ready accounts.
- Tauri sidecar diagnostics & graceful shutdown: Tauri shell captures and sanitizes backend stdout/stderr; shutdown performs authenticated `POST /api/session/shutdown` to allow clean SQLite and Playwright shutdown before SIGKILL fallback.
- Restored repo verification scripts: `build-sidecar.py`, `check-docs.py`, `check-source-duplicates.py`, `check-version-sync.mjs`, `smoke-browser-profile.py`.
- Chapter route and analysis ownership: React Router URL (`/chapters/:chapterId`) is the sole source of truth for chapter navigation; creating a chapter navigates to its URL; analysis state (result, progress, isAnalyzing) is strictly isolated and keyed by `chapterId`; async analysis completion preserves concurrently edited chapter text and word count.
- Chapter -> Scene -> Visual Beat studio hierarchy: `VisualBeatPage` adheres to story breakdown architecture (Chapter -> Scenes -> Visual Beats) with Chapter selector, Scene tab navigation (`all` vs specific scene), Storyboard Grid view (16:9 aspect ratio cards with camera badges and quick generation CTA), studio Table view, granular status filters, URL parameter synchronization (`?chapterId=...&sceneId=...`), and deep-link integration from `ChapterPage` (`AnalyzedSceneList`).
- persistent isolated browser profile path resolver (`BrowserProfilePathResolver`).
- dedicated single-owner Playwright browser runtime (`BrowserRuntime`).
- backend-owned account/profile browser session mapping with browser session ID removed from public API and frontend.
- persistent session validation through BrowserRuntime.
- account login failure compensation and proactive provisional session cleanup on modal dismiss.
- explicit container shutdown lifecycle.
- SQLAlchemy Unit of Work (`SQLAlchemyAccountUnitOfWork` / `AccountUnitOfWorkPort`).
- provider auth registry (`ProviderRegistry`).
- protected account management FastAPI API.
- account management frontend feature derived solely from real backend data: exposes provider identity, authentication/session state, truthful scheduling availability (`isAvailable`, `isLeased`, `leaseExpiresAt`), enable/disable toggle, session re-validation, account deletion, and interactive browser login/relogin dialog (zero fake operational metrics/credits/stamina).
- browser-session restart persistence verification and security regression tests.
- single-container / single-BrowserRuntime application factory (`app/factory.py`, `app/asgi.py`).
- strict Unit of Work database transaction ownership (zero commit/rollback in repositories).
- active lease and account state invariant enforcement on account disable, delete, and relogin.
- serialized browser profile deletion on owner thread and graceful shutdown lifecycle.
- domain-encapsulated account status transitions (`record_success`, `record_validation`, `record_auth_failure`, etc.).
- specialized account application services (`AccountLoginService`, `AccountLeaseService`, `AccountHealthService`) coordinated by `AccountService` facade.
- centralized application query mapping (`account_to_view` in `application/mappers.py`).
- frontend relogin and validation retry UX flows with custom hooks (`useAccounts`, `useAccountActions`).
- user-visible frontend mutation error feedback with inline alerts and dismissal in `AccountsPage`.
- explicit separation of new-login cancellation (`cancel_new_login` deleting provisional record & profile with 204 response) vs relogin cancellation (`cancel_relogin` preserving existing record).
- controlled API error mapping for `InvalidAccountState` domain conflicts (HTTP 409 Conflict) and `DuplicateAccountError` (HTTP 409 Conflict).
- verified account mutation vs lease concurrency invariants: account validation is serialized with lease acquisition and destructive mutations within the single backend process.
- backend static analysis CI gates with Ruff and Pyright enforced in GitHub Actions (`.github/workflows/ci.yml`).
- consolidated provider auth port contract test harness (`test_provider_auth_contract.py`).
- structured event and debug logging for browser and account lifecycles.
- explicit backend bootstrap configuration precedence (CLI > environment > defaults) without fallback dev-token or committed development credentials.
- testable browser automation boundary protocol (`BrowserAutomationRuntime`) for provider adapters.
- production Dreamina browser auth adapter implementation (`DreaminaAuthAdapter`) and probe (`DreaminaAuthProbe`) for Seedance-capable accounts.
- Dreamina provider registration in default Account Pool container (`/api/providers`).
- opt-in guarded live Dreamina session smoke test harness (`test_dreamina_live.py`).
- packaged Playwright browser runtime smoke-test command (`--browser-smoke-test`).

## Not Implemented Yet

The repository currently does not contain production implementation for:

- production project/domain modules
- Story Engine
- Story Memory
- Character continuity engine
- production Gemini provider auth adapter
- durable job worker
- provider execution jobs
- Seedance video submission/poll/download execution adapter
- quota/stamina/credit provider contract
- durable job integration with account leases
- TTS/audio engine
- forced alignment
- Timing Engine
- asset generation pipeline
- Timeline Engine
- FFmpeg render pipeline
- quality-control pipeline
- OS keyring integration

## Verification Gates

### Automated

- Ruff/Pyright/backend pytest/Alembic CI: verified on 2026-09-18
- frontend `pnpm check` (Oxlint, Vitest, TypeScript build, Vite build): verified on 2026-09-18
- Windows sidecar build/Rust tests/Rust compile: verified on 2026-09-18
- Windows x64 Tauri production compile and NSIS bundle (`pnpm tauri build` producing `VidPool_0.1.0_x64-setup.exe`): verified on 2026-09-18
- packaged Playwright browser runtime smoke test: verified on 2026-09-18

### Manual / Opt-In

- real Dreamina logged-out signal: verified in `docs/verification/2026-09-17-dreamina-auth-signals.md` on 2026-09-17
- real Dreamina logged-in signal and identity: verified in `docs/verification/2026-09-17-dreamina-auth-signals.md` on 2026-09-17
- persisted Dreamina session across restart: verified only after `test_dreamina_live.py` passes against an actual local profile

## Documentation Semantics

- `docs/architecture/` = accepted target architecture
- `docs/rules/` = mandatory implementation constraints
- `docs/adr/` = architecture decision history
- this file = implemented reality

Do not infer that a class/module exists because documentation names it.

## Update Rule

When implementation changes, update this file in the same change.

Do not mark a component implemented based only on scaffolding, placeholder classes, or disconnected prototypes.
