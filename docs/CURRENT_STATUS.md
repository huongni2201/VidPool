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
