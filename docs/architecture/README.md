# Architecture Overview

## Documentation Status

This directory describes the accepted **target architecture**.

For the code that actually exists today, read `docs/CURRENT_STATUS.md`.

## System

AI Story Video Studio is a desktop-first, single-user production application.

Primary target flow:

```text
Source Story
  ↓
Story Engine
  ↓
Story Memory / Character / World State
  ↓
Script + TTS
  ↓
Audio Alignment
  ↓
Timing Plan
  ↓
Visual Planning / Prompt Compiler
  ↓
Asset Generation
  ↓
Sound Design
  ↓
Timeline
  ↓
Render Plan
  ↓
FFmpeg Renderer
  ↓
Quality Control
  ↓
Export
```

Storyboard Studio surrounds the pipeline and allows human review, locking, version comparison, selective regeneration, and editing.

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

See:

- `python-backend-architecture.md`
- `module-boundaries.md`
- `dependency-map.md`
- `../adr/0016-use-modular-monolith-clean-hexagonal-backend.md`

## Target Technology

```text
Desktop: Tauri
Frontend: React + Vite + TypeScript + Tailwind
Backend: FastAPI
Persistence: SQLite + SQLAlchemy + Alembic
Realtime: SSE
Worker: Durable DB-backed worker
Media: FFmpeg + ffprobe
Secrets: OS keyring
```

## Key Design Decisions

See `docs/adr/`.

## Implementation Constraints

See `docs/rules/`.
