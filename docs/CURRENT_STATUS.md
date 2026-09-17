# Current Implementation Status

**Status:** PRE-SCAFFOLD / DOCS-ONLY  
**Last reviewed:** 2026-09-17

## Purpose

This file distinguishes the accepted target architecture from the code that actually exists in the repository.

`docs/architecture/`, `docs/rules/`, and accepted ADRs define the target and constraints.

This file defines the current implementation state.

## Implemented

At the time of this review:

- architecture documentation baseline
- architecture rules
- ADR baseline
- Python architecture enforcement rules

## Not Implemented Yet

The repository does not yet contain production implementation for:

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

Unless explicitly marked otherwise:

- `docs/architecture/` describes **target architecture**
- `docs/rules/` describes **mandatory implementation constraints**
- `docs/adr/` records **accepted architecture decisions**
- this file describes **implemented reality**

Do not infer that a class/module/service exists merely because architecture documentation names it.

## Update Rule

Whenever a feature or architectural component becomes implemented, update this file in the same change.

Never mark a component implemented based only on scaffolding, placeholder classes, or an unconnected prototype.
