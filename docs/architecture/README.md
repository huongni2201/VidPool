# Architecture Overview

## System

AI Story Video Studio is a desktop-first, single-user production application.

Primary flow:

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

## Technology

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
