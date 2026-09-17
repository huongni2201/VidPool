# VidPool

VidPool is a desktop-first, single-user AI Story Video Studio.

Its target workflow converts long-form stories into structured story memory, narration, synchronized visual beats, generated assets, an editable timeline, and validated final video.

## Target Stack

```text
Desktop shell : Tauri v2
Frontend      : React + Vite + TypeScript + Tailwind CSS
Backend       : FastAPI
Persistence   : SQLite + SQLAlchemy 2.x + Alembic
Realtime      : SSE with REST polling fallback
Worker        : Durable SQLite-backed job worker
Media         : FFmpeg + ffprobe
Secrets       : OS credential store / keyring
```

## Backend Architecture

```text
Modular Monolith
+
Clean Architecture
+
Hexagonal / Ports & Adapters
+
Lightweight DDD
```

## Development Workflows

VidPool supports two development workflows:

### Mode A — Browser Frontend Development

Backend:

```powershell
$env:VIDPOOL_SESSION_TOKEN="dev-token"
$env:VIDPOOL_ALLOWED_ORIGINS="http://localhost:5173"
vidpool-backend --port 8000
```

Frontend:

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
$env:VITE_SESSION_TOKEN="dev-token"
cd vidpool-frontend
pnpm dev
```

### Mode B — Desktop Development

Desktop mode is the canonical runtime where Tauri generates the session token, selects an ephemeral loopback port, and manages the FastAPI sidecar lifecycle:

```bash
python scripts/build-sidecar.py
cd vidpool-frontend
pnpm tauri dev
```

## Start Here

Before implementing or modifying code, read:

1. `AGENTS.md`
2. `docs/CURRENT_STATUS.md`
3. `ARCHITECTURE-CHECKLIST.md`
4. relevant files under `docs/rules/`
5. relevant files under `docs/architecture/`
6. relevant ADRs under `docs/adr/`

## Documentation Semantics

- `docs/architecture/` describes the accepted target architecture.
- `docs/rules/` contains mandatory implementation constraints.
- `docs/adr/` records accepted architecture decisions and their history.
- `docs/CURRENT_STATUS.md` describes what is actually implemented today.

Do not infer that a component exists merely because architecture documentation names it.
