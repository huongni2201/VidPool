# Architecture Overview

## Status

This directory describes the accepted target architecture.

Read `../CURRENT_STATUS.md` for implementation reality.

## End-to-End Target Flow

```text
Source Story
  ↓
Story Normalization
  ↓
Story Analysis
  ↓
Story Memory / Character / World State
  ↓
Script / Spoken Text
  ↓
TTS
  ↓
Forced Alignment
  ↓
Timing Plan
  ↓
Visual Planning / Prompt Compiler
  ↓
Durable Generation Jobs
  ↓
Generated Assets
  ↓
Sound Design
  ↓
Timeline
  ↓
RenderPlan
  ↓
FFmpeg Renderer
  ↓
Post-Render Quality Control
  ↓
Export
```

Storyboard Studio surrounds the flow and allows review, locks, versions, selective regeneration, and editing.

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

## Core Architecture Files

- `context.md`
- `containers.md`
- `python-backend-architecture.md`
- `module-boundaries.md`
- `dependency-map.md`
- `data-model.md`
- `generation-flow.md`
- `state-machines.md`
- `dependency-invalidation.md`

## Target Technology

```text
Desktop      Tauri
Frontend     React + Vite + TypeScript + Tailwind CSS
Backend      FastAPI
Persistence  SQLite + SQLAlchemy 2.x + Alembic
Realtime     SSE
Worker       Durable DB-backed worker
Media        FFmpeg + ffprobe
Secrets      OS credential store
```
