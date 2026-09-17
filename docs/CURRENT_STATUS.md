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
- React/Vite/Tailwind/shadcn frontend scaffold
- frontend test/build/lint verification gate (`pnpm check`)
- FastAPI application scaffold with `/api/health` probe
- SQLite/SQLAlchemy persistence bootstrap (path resolution & engine creation)
- Alembic migration environment configuration
- frontend-to-local-backend health status integration
- GitHub Actions CI workflow for frontend, backend, and desktop verification
- Tauri v2 desktop shell scaffold
- packaged FastAPI sidecar bootstrap
- Tauri-owned backend lifecycle
- runtime API endpoint injection via minimal Tauri IPC
- restricted localhost CORS
- per-session local API token validation
- temporary protected session probe endpoint (`/api/session/probe`)
- desktop CI compile/package gate (verified for Windows x64 / NSIS)
- Account Pool domain model
- Account Pool application ports/fakes
- Account Pool SQLAlchemy persistence models/repository
- Account Pool Alembic schema for provider accounts and leases
- Account Pool application service (`AccountService`)
- durable LRU account leasing
- persistent isolated browser profile path resolver (`BrowserProfilePathResolver`)
- dedicated single-owner Playwright browser runtime (`BrowserRuntime`)
- backend-owned account/profile browser session mapping
- browser session ID removed from public API and frontend
- persistent session validation through BrowserRuntime
- account login failure compensation
- explicit container shutdown lifecycle
- SQLAlchemy Unit of Work (`SQLAlchemyAccountUnitOfWork` / `AccountUnitOfWorkPort`)
- provider auth registry (`ProviderRegistry`)
- protected account management FastAPI API
- account management frontend feature (account list, actions, user-driven browser login dialog)
- browser-session restart persistence verification and security regression tests
- single-container / single-BrowserRuntime application factory (`app/factory.py`, `app/asgi.py`)
- strict Unit of Work database transaction ownership (zero commit/rollback in repositories)
- active lease and account state invariant enforcement on account disable, delete, and relogin
- serialized browser profile deletion on owner thread and graceful shutdown lifecycle
- domain-encapsulated account status transitions (`record_success`, `record_validation`, `record_auth_failure`, etc.)
- specialized account application services (`AccountLoginService`, `AccountLeaseService`, `AccountHealthService`) coordinated by `AccountService` facade
- centralized application query mapping (`account_to_view` in `application/mappers.py`)
- frontend relogin and validation retry UX flows with custom hooks (`useAccounts`, `useAccountActions`)
- user-visible frontend mutation error feedback with inline alerts and dismissal in `AccountsPage`
- explicit separation of new-login cancellation (`cancel_new_login` deleting provisional record & profile with 204 response) vs relogin cancellation (`cancel_relogin` preserving existing record)
- controlled API error mapping for `InvalidAccountState` domain conflicts (HTTP 409 Conflict)
- verified account mutation vs lease concurrency invariants with multi-threaded SQLite WAL tests and coordinator synchronization
- backend static analysis CI gates with Ruff and Pyright enforced in GitHub Actions (`.github/workflows/ci.yml`)
- provider auth port contract test harness (`test_provider_contract.py`)
- structured event and debug logging for browser and account lifecycles

## Not Implemented Yet

The repository currently does not contain production implementation for:

- production project/domain modules
- Story Engine
- Story Memory
- Character continuity engine
- production provider auth adapters (e.g. Seedance, Gemini)
- durable job worker
- provider execution jobs
- durable job integration with account leases
- TTS/audio engine
- forced alignment
- Timing Engine
- asset generation pipeline
- Timeline Engine
- FFmpeg render pipeline
- quality-control pipeline
- OS keyring integration

## Documentation Semantics

- `docs/architecture/` = accepted target architecture
- `docs/rules/` = mandatory implementation constraints
- `docs/adr/` = architecture decision history
- this file = implemented reality

Do not infer that a class/module exists because documentation names it.

## Update Rule

When implementation changes, update this file in the same change.

Do not mark a component implemented based only on scaffolding, placeholder classes, or disconnected prototypes.
