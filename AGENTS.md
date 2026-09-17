# AGENTS.md

## Purpose

This repository contains a desktop-first, single-user AI Story Video Studio.

The application turns long-form story text into structured story data, narration, visual assets, synchronized timelines, and final rendered video.

This file is the mandatory entrypoint for any human or coding agent modifying the repository.

Before changing code, read this file and the relevant documents under:

- `docs/rules/`
- `docs/architecture/`
- `docs/adr/`

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

## Architecture Dependency Direction

Allowed dependency direction:

```text
Infrastructure
      ↓
Application
      ↓
Domain
```

External presentation layers call inward:

```text
Tauri / React
      ↓
FastAPI
      ↓
Application
      ↓
Domain
```

Forbidden examples:

```text
Domain → FastAPI
Domain → SQLAlchemy
Domain → httpx
Domain → FFmpeg
Domain → Tauri
Domain → Seedance

React → SQLite
React → provider HTTP APIs
React → provider tokens

Application → concrete SeaArtClient
Application → concrete SQLAlchemy models
```

Required pattern:

```text
Application
   ↓
Port / Interface
   ↓
Infrastructure Adapter
```

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
| Domain/entity changes | `02-domain-modeling.md`, `07-ai-story-continuity.md` |
| FastAPI/API changes | `03-backend-fastapi.md` |
| React UI changes | `04-frontend-react.md` |
| Database changes | `05-database-persistence.md`, `14-migrations-compatibility.md` |
| Job/worker changes | `06-jobs-and-orchestration.md` |
| Story/AI changes | `07-ai-story-continuity.md` |
| Provider/model changes | `08-provider-adapters.md` |
| Audio/subtitle/timing | `09-audio-timing-sync.md` |
| FFmpeg/rendering | `10-media-rendering.md` |
| Credentials/security | `11-security-secrets.md` |
| Tests/quality | `12-testing-quality.md` |
| Errors/logging | `13-errors-observability.md` |
| Architecture changes | `15-documentation-adr.md` |

## Pre-Commit Questions

Before finalizing a change, answer:

1. Did this introduce provider-specific logic outside an adapter?
2. Did this bypass a port at an external boundary?
3. Did this create a second source of truth?
4. Could this overwrite user-approved or locked data?
5. Does this invalidate more downstream work than necessary?
6. Can the operation resume after app restart?
7. Are secrets protected?
8. Are story, character, audio, and timeline continuity preserved?
9. Is a migration required?
10. Is an ADR required?
11. Are the relevant tests present and passing?
