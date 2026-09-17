# VidPool

VidPool is a desktop-first, single-user AI Story Video Studio.

Its target workflow converts long-form stories into structured story memory, narration, synchronized visual beats, generated assets, an editable timeline, and validated final video.

## Target Stack

```text
Desktop shell : Tauri
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
