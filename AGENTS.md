# AGENTS.md

## Purpose

This file is the mandatory entrypoint for any human or coding agent modifying VidPool.

Before changing code, read:

- `docs/CURRENT_STATUS.md`
- `ARCHITECTURE-CHECKLIST.md`
- the relevant documents under `docs/rules/`
- the relevant documents under `docs/architecture/`
- the relevant ADRs under `docs/adr/`

Architecture documents define the accepted target. `docs/CURRENT_STATUS.md` defines implementation reality.

## Non-Negotiable Rules

1. VidPool is desktop-first, single-user, and local-first.
2. Tauri is a shell and lifecycle host, not the business backend.
3. React must never call external AI/TTS/image/video providers directly.
4. FastAPI routes contain transport logic only.
5. Domain code must not depend on FastAPI, SQLAlchemy, Pydantic API DTOs, HTTP clients, FFmpeg, Tauri, keyring, provider SDKs, or OS APIs.
6. External systems are accessed through application-owned ports and infrastructure adapters.
7. Backend architecture is a Modular Monolith with Clean Architecture dependency direction, Hexagonal boundaries, and lightweight DDD.
8. Project continuity belongs to persisted project data, never to an LLM conversation.
9. Character identity and character state are separate concepts.
10. Actual aligned audio timestamps are the master timing source once real audio exists.
11. Timeline is the editing source of truth. FFmpeg is only a renderer.
12. Long-running work must be represented as durable jobs.
13. Durable job state must exist before an external operation begins whenever recovery requires knowing that operation exists.
14. Media binaries belong on the filesystem. Metadata belongs in SQLite. Secrets belong in OS credential storage.
15. Regeneration invalidates only affected downstream dependencies.
16. User locks and approved assets must never be silently overwritten.
17. Generated assets must be traceable through lineage metadata.
18. Provider-specific payloads must not leak into domain, application, timeline, or frontend code.
19. SQLAlchemy models are persistence representations, not domain entities.
20. Do not create a global business `services/` dumping ground.
21. Do not introduce Redis, Celery, PostgreSQL, message brokers, Kubernetes, or microservices without a concrete requirement and ADR.
22. In pre-production, remove superseded implementations instead of keeping permanent compatibility layers.
23. Do not trust provider timestamps or estimated text duration once aligned audio exists.
24. Do not log tokens, cookies, refresh credentials, or authorization headers.
25. Bug fixes require regression tests when behavior is testable.
26. AI output is candidate data until validation and merge.
27. User decisions override AI suggestions.
28. Credential scheduling may only use authorized credentials and must not bypass quotas, rate limits, or platform restrictions.

## Dependency Direction

Source-code dependencies point inward:

```text
API / Worker
    |
    v
Application -----> Port <----- Infrastructure Adapter
    |
    v
Domain
```

Allowed:

```text
API -> Application
Application -> Domain
Application -> Port
Infrastructure -> Port
Infrastructure -> Domain when mapping requires it
```

Forbidden:

```text
Domain -> API
Domain -> Infrastructure
Application -> concrete Infrastructure
Application -> concrete Provider Client
Application -> SQLAlchemy Model
React -> SQLite
React -> provider HTTP API
React -> provider secret
```

Runtime call direction may be:

```text
Application -> VideoProviderPort -> SeedanceAdapter
```

but source dependencies remain:

```text
Application -> VideoProviderPort
SeedanceAdapter -> VideoProviderPort
```

Concrete wiring belongs in the composition root such as `core/container.py`.

## Source of Truth

### Story meaning

`VisualBeat`

### Character identity

`CharacterProfile`

### Mutable character state

`CharacterState`

### Long-term continuity

Persisted project state:

- StoryBible
- GlobalStorySummary
- CharacterProfile
- CharacterState
- CharacterEvolution
- RelationshipGraph
- LocationProfile / LocationState
- WorldState
- EventLedger
- OpenPlotThread
- ItemState
- StyleBible

### Timing

Aligned narration/dialogue timestamps.

### Editing

Timeline.

### Rendering

`RenderPlan` compiled from Timeline.

The final MP4 is never canonical project state.

## Required Reading by Change Type

| Change | Required docs |
|---|---|
| Any backend architecture work | `16`, `17`, `23`, `26` |
| New backend module | `01`, `16`, `17`, `18`, `23` |
| Domain/entity changes | `02`, `07`, `17` |
| FastAPI/API changes | `03`, `20` |
| React UI changes | `04` |
| Database changes | `05`, `19`, `14` |
| Jobs/worker | `06`, `20`, `24` |
| Story/AI | `07`, `21` |
| Provider/model | `08`, `21`, `24` |
| Audio/subtitle/timing | `09` |
| FFmpeg/rendering | `10`, `21` |
| Credentials/security | `11` |
| Dependency injection | `18` |
| Repository/mapping | `19` |
| Python implementation | `22`, `23` |
| Testing | `12`, `24` |
| Refactoring/migration | `14`, `25` |
| Architecture decisions | `15`, `26` |

Rule numbers refer to files under `docs/rules/`.

## Before Completion

Check:

1. no provider-specific logic leaked outside its adapter
2. no external boundary bypassed its port
3. no second mutable source of truth was introduced
4. no locked data can be silently overwritten
5. invalidation is no broader than necessary
6. long-running work can recover after restart
7. job state exists before recoverable external execution
8. secrets remain protected
9. story/audio/timeline continuity remains correct
10. domain/application do not import concrete infrastructure
11. migrations are present when needed
12. ADR is present when architecture changed
13. tests are present and passing
14. `ARCHITECTURE-CHECKLIST.md` passes
