# 01 — Architecture Boundaries

## Layer Model

```text
Presentation
├── Tauri
└── React

Transport
└── FastAPI

Application
├── commands
├── queries
├── orchestrators
└── application services

Domain
├── entities
├── value objects
├── policies
└── domain errors

Infrastructure
├── provider adapters
├── persistence adapters
├── filesystem
├── keyring
├── worker runtime
└── FFmpeg tooling
```

## Dependency Rule

Domain has no dependency on outer layers.

Application depends on domain and port abstractions.

Infrastructure implements ports.

Presentation calls application through API contracts.

## Allowed Examples

```text
FastAPI route
  → CreateGeneration command
  → JobRepositoryPort
  → SQLiteJobRepository
```

```text
GenerationOrchestrator
  → VideoProviderPort
  → SeedanceAdapter
```

## Forbidden Examples

Do not write:

```python
# application layer
from app.infrastructure.providers.seedance.client import SeedanceClient
```

Do not write:

```python
# domain layer
from sqlalchemy.orm import Session
```

Do not write:

```ts
// frontend
fetch("https://provider.example/internal/generate")
```

## Module Ownership

Each module owns its business concepts.

Examples:

- `generation` owns generation jobs and generation lifecycle
- `story` owns chapters, scenes, beats, story memory
- `media` owns local media metadata and processing contracts
- `timeline` owns editing structure
- `credentials` owns credential metadata and secret references

Do not create one global `services/` directory that mixes unrelated concerns.

## Cross-Module Interaction

Prefer explicit application contracts.

Do not reach directly into another module's persistence models.

## Boundary Test

If changing an external technology would require rewriting domain code, the boundary is wrong.
