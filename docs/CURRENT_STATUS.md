# Current Implementation Status

**Status:** ACCOUNT POOL FOUNDATION & PERSISTENT BROWSER SESSIONS  
**Last reviewed:** 2026-09-17

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
- restricted localhost CORS and per-session local API token validation (`/api/session/probe`).
- desktop CI compile/package gate (verified for Windows x64 / NSIS installer via `pnpm tauri build`).
- Account Pool domain model and application ports.
- Account Pool SQLAlchemy persistence models and repository with DB-backed account leases.
- Unique provider account identity `(provider_key, external_identity)` enforced at database level (migration `c5d1758e92ea`), repository, and domain with provisional profile cleanup on duplicate conflict.
- Serialized account lifecycle mutations via coordination lock preventing race conditions between `complete_login`, `disable`, `delete`, `relogin`, and health updates.
- Browser runtime execution safety: hard timeouts on browser launch, contexts, page navigation, and action evaluation (`BrowserExecutionTimeout`) preventing hung processes.
- durable LRU account leasing with explicit lease state transitions.
- persistent isolated browser profile path resolver (`BrowserProfilePathResolver`).
- dedicated single-owner Playwright browser runtime (`BrowserRuntime`).
- backend-owned account/profile browser session mapping with browser session ID removed from public API and frontend.
- persistent session validation through BrowserRuntime.
- account login failure compensation and proactive provisional session cleanup on modal dismiss.
- explicit container shutdown lifecycle.
- SQLAlchemy Unit of Work (`SQLAlchemyAccountUnitOfWork` / `AccountUnitOfWorkPort`).
- provider auth registry (`ProviderRegistry`).
- protected account management FastAPI API.
- account management frontend feature derived solely from real backend data: exposes provider identity, authentication/session state, lease-ready status, enable/disable toggle, session re-validation, account deletion, and interactive browser login/relogin dialog (zero fake operational metrics/credits/stamina).
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
