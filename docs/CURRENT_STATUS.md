# Current Implementation Status

**Status:** PRE-SCAFFOLD / DOCS-ONLY  
**Last reviewed:** 2026-09-17

## Purpose

This file distinguishes target architecture from implemented reality.

## Implemented

- architecture documentation baseline
- architecture rules
- ADR baseline
- Python architecture enforcement rules

## Not Implemented Yet

The repository currently does not contain production implementation for:

- Tauri desktop shell
- React/Vite frontend
- FastAPI backend
- SQLite/SQLAlchemy persistence
- Alembic migrations
- durable worker
- Story Engine
- Story Memory
- Character continuity engine
- provider registry/adapters
- TTS/audio engine
- forced alignment
- Timing Engine
- asset generation pipeline
- Timeline Engine
- FFmpeg render pipeline
- quality-control pipeline
- local API session security
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
