# AGENTS.md

## Purpose

This repository contains a desktop-first, single-user AI Story Video Studio.

The application turns long-form story text into structured story data, narration, visual assets, synchronized timelines, and final rendered video.

This file is the mandatory entrypoint for any human or coding agent modifying the repository.

Before changing code, read this file, `docs/CURRENT_STATUS.md`, and the relevant documents under:

- `docs/rules/`
- `docs/architecture/`
- `docs/adr/`

Architecture documents describe the accepted target architecture. `docs/CURRENT_STATUS.md` is the authority for what is actually implemented today.

## Non-Negotiable Project Rules

1. This is a desktop-first, single-user application.
2. Tauri is a desktop shell, not the application backend.
3. React must never call external AI, TTS, image, or video providers directly.
4. FastAPI routes must contain transport logic only, not business logic.
5. Domain code must not depend on FastAPI, SQLAlchemy, HTTP clients, FFmpeg, Tauri, provider SDKs, or OS APIs.
6. External providers must be accessed through application ports and infrastructure adapters.
7. Project continuity belongs to persisted project data, never to an LLM conversation's memory.
8. Character identity and character state are separate concepts.
9. Actual aligned audio timestamps are the master timing source whenever audio exists.
10. Timeline data is the source of truth for editing. FFmpeg is only a renderer.
11. Long-running operations must run as durable jobs.
12. Media belongs on the filesystem. Metadata belongs in SQLite. Secrets belong in OS credential storage.
13. Regeneration must invalidate only downstream dependencies.
14. Never silently overwrite a user-locked field, asset, voice, prompt, timing value, or approved generation.
15. Generated assets must remain traceable through lineage metadata.
16. Do not introduce Redis, PostgreSQL, Celery, message brokers, Kubernetes, or microservices unless a real requirement justifies them.
17. In pre-production, remove superseded implementations instead of maintaining unnecessary compatibility layers.
18. Every architectural change must preserve provider, model, TTS, renderer, and storage replaceability.
19. Do not let provider-specific payloads leak into application or domain layers.
20. Do not trust provider timestamps, generated clip duration, or estimated reading duration when actual aligned audio timestamps are available.
21. Do not use provider account rotation to bypass quotas, rate limits, or platform restrictions.
22. Never log tokens, cookies, refresh credentials, secret values, or full authorization headers.
23. Bug fixes require a regression test when the behavior is testable.
24. User decisions override AI suggestions.
25. AI output is always candidate data until validated and persisted by the application.
26. Backend architecture is a Modular Monolith with Clean Architecture dependency direction, Hexagonal boundaries, and lightweight DDD.
27. Do not create a global business `services/` dumping ground; organize backend behavior by domain module.
28. SQLAlchemy models are infrastructure persistence models, not domain entities.
29. Long-running work must be persisted before external execution begins whenever recovery requires knowing the operation exists.

## Architecture Dependency Direction

The backend uses dependency inversion.

Source-code dependencies must point inward:

```text
API / Worker
    |
    v
Application -----> Port <----- Infrastructure Adapter
    |
    v
Domain
```

More explicitly:

```text
Application -> Domain
Application -> Port
Infrastructure -> Port
Infrastructure -> Domain when mapping requires it
API -> Application

Application -X-> concrete Infrastructure
Domain      -X-> Application / Infrastructure / API
```

At runtime an application use case may call an adapter through a port, but the application source code must not import that concrete adapter.

External presentation layers call inward:

```text
Tauri / React
      |
      v
FastAPI
      |
      v
Application
      |
      v
Domain
```

Forbidden examples:

```text
Domain -> FastAPI
Domain -> SQLAlchemy
Domain -> httpx
Domain -> FFmpeg
Domain -> Tauri
Domain -> Seedance

React -> SQLite
React -> provider HTTP APIs
React -> provider tokens

Application -> concrete SeaArtClient
Application -> concrete SQLAlchemy models
Application -> concrete FFmpeg renderer
```

Concrete wiring belongs in the composition root, normally `core/container.py` or an equivalent bootstrap module.

## When to Add an Abstraction

Do not add abstractions by default.

Add one when there is a real boundary, especially:

- external provider
- persistence
- secret storage
- media renderer
- operating-system integration
- filesystem/object storage
- external AI/TTS/video/image service

Do not create interfaces for simple internal helpers with one stable implementation.

Do not skip an abstraction at an external boundary merely to reduce file count.

## Source of Truth

### Story meaning

`VisualBeat` is the source of truth for a beat's narrative and visual intent.

### Character identity

`CharacterProfile` is the source of truth for stable identity.

### Character scene state

`CharacterState` is the source of truth for mutable state.

### Story continuity

The project database is the source of truth for:

- Story Bible
- Event Ledger
- Character State
- Relationship Graph
- Location State
- World State
- Open Plot Threads
- Item State

### Timing

Actual aligned narration/dialogue timestamps are the source of truth once generated.

### Editing

The Timeline is the source of truth.

### Rendering

`RenderPlan` is a compiled representation of Timeline data.

The final MP4 is never used as the canonical project state.

## Required Reading by Change Type

| Change | Required docs |
|---|---|
| Any backend architecture work | `16-python-module-architecture.md`, `17-domain-application-separation.md`, `23-import-and-dependency-rules.md`, `26-architecture-review-gates.md` |
| New backend module | `01-architecture-boundaries.md`, `16-python-module-architecture.md`, `17-domain-application-separation.md`, `18-dependency-injection.md`, `23-import-and-dependency-rules.md` |
| Domain/entity changes | `02-domain-modeling.md`, `07-ai-story-continuity.md`, `17-domain-application-separation.md` |
| FastAPI/API changes | `03-backend-fastapi.md`, `20-commands-queries-usecases.md` |
| React UI changes | `04-frontend-react.md` |
| Database changes | `05-database-persistence.md`, `19-repositories-and-mappers.md`, `14-migrations-compatibility.md` |
| Job/worker changes | `06-jobs-and-orchestration.md`, `20-commands-queries-usecases.md` |
| Story/AI changes | `07-ai-story-continuity.md`, `21-boundary-contracts.md` |
| Provider/model changes | `08-provider-adapters.md`, `21-boundary-contracts.md`, `24-architecture-testing.md` |
| Audio/subtitle/timing | `09-audio-timing-sync.md` |
| FFmpeg/rendering | `10-media-rendering.md`, `21-boundary-contracts.md` |
| Credentials/security | `11-security-secrets.md` |
| Dependency injection/composition | `18-dependency-injection.md` |
| Repository/mapping work | `19-repositories-and-mappers.md` |
| Python implementation style | `22-python-coding-standards.md`, `23-import-and-dependency-rules.md` |
| Tests/quality | `12-testing-quality.md`, `24-architecture-testing.md` |
| Refactoring/migrations | `14-migrations-compatibility.md`, `25-refactoring-and-migration.md` |
| Errors/logging | `13-errors-observability.md` |
| Architecture changes | `15-documentation-adr.md`, `26-architecture-review-gates.md` |

## Pre-Commit Questions

Before finalizing a change, answer:

1. Did this introduce provider-specific logic outside an adapter?
2. Did this bypass a port at an external boundary?
3. Did this create a second source of truth?
4. Could this overwrite user-approved or locked data?
5. Does this invalidate more downstream work than necessary?
6. Can the operation resume after app restart?
7. Was durable job state persisted before an external operation that may outlive the process?
8. Are secrets protected?
9. Are story, character, audio, and timeline continuity preserved?
10. Did domain/application code import concrete infrastructure?
11. Is a migration required?
12. Is an ADR required?
13. Are the relevant tests present and passing?
14. Does `ARCHITECTURE-CHECKLIST.md` pass for this change?
