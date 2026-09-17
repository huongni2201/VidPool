# Python Backend Architecture

## Decision

Use:

> Modular Monolith + Clean Architecture + Hexagonal Boundaries + Lightweight DDD

## Why

The application contains multiple substantial domains but does not require independent deployment.

Modular boundaries provide maintainability without microservice complexity.

## Layer Model

```text
API / Worker
    |
    v
Application -----> Port <----- Infrastructure
    |
    v
Domain
```

## Recommended Backend Layout

```text
app/
├── project/
├── story/
├── characters/
├── generation/
├── audio/
├── timing/
├── timeline/
├── jobs/
├── media/
├── credentials/
├── infrastructure/
├── api/
├── core/
└── main.py
```

Each substantial business module may contain:

```text
domain/
application/
ports/
```

Infrastructure contains concrete implementations.

## Lightweight DDD

Use rich models where invariants exist:

- story continuity
- character identity/state/evolution
- generation lifecycle
- job lifecycle
- timing
- timeline/invalidation

Do not force DDD ceremony onto:

- hashing
- ffprobe wrappers
- file helpers
- DTO mapping
- stateless utilities

## No Global Technical-Layer Architecture

Do not organize the whole backend as:

```text
routes/
services/
repositories/
models/
schemas/
```

because unrelated domains will become coupled.

Technical subfolders are allowed inside a module when they help readability.

## No Microservices Yet

Do not split into services while the product remains single-user and desktop-first.

If independent deployment is ever required, clean internal module boundaries provide the migration path.
