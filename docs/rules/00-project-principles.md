# 00 — Project Principles

## Purpose

These principles define the default behavior of the system and guide implementation tradeoffs.

## Product Model

The product is a desktop-first, single-user AI Story Video Studio.

It is optimized for:

- long-form webnovel and story adaptation
- local media storage
- local editing and rendering
- replaceable cloud or local AI providers
- reliable project continuity across many chapters
- human review and regeneration at beat level

## Core Principles

### Desktop-first, not desktop-coupled

Tauri packages the application, but application logic lives in FastAPI/application/domain layers.

The backend must remain usable independently of Tauri.

### Single-user first

Do not design for multi-tenant SaaS unless requirements change.

Avoid:

- RBAC
- organization membership
- distributed locks
- multi-user collaboration
- cloud account systems

until actually needed.

### Local-first project state

Canonical project state stays local.

This includes:

- story metadata
- character profiles
- character states
- generation jobs
- timeline
- media metadata
- prompt lineage
- render history

### Replace providers, do not rewrite the application

Cloud and local providers must sit behind ports/adapters.

No provider may define the internal project data model.

### Deterministic project state

AI output must be converted into structured, validated data.

Never treat an AI chat transcript as project state.

### Audio-first timing

Once TTS and alignment exist, actual aligned audio timestamps become the master clock.

Video planning, subtitles, and timeline duration derive from this timing.

### Human authority

AI proposes.

The user approves, locks, edits, regenerates, or overrides.

A user lock always wins.

### Durable work

Long-running tasks must survive process restarts.

The job database is the durable queue.

### Minimal infrastructure

Prefer:

- SQLite
- filesystem
- process-local worker
- SSE

until concrete scale requirements require more.

### Explicit source of truth

Every important concept must have one canonical representation.

Avoid duplicated mutable state.

## YAGNI Rule

Do not introduce infrastructure based on hypothetical future scale.

A future migration is acceptable if current boundaries are clean.

## Reversibility Rule

Prefer architecture decisions that are cheap to reverse:

- adapters over provider-specific service calls
- timeline model over raw FFmpeg command storage
- repository ports over direct ORM access
- stable model keys over provider model IDs
