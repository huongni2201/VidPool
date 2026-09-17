# Python Backend Architecture

## Decision

The Python backend uses:

> Modular Monolith + Clean Architecture + Hexagonal Boundaries + Lightweight DDD

This is the default architecture unless an ADR explicitly supersedes it.

## Why

The product contains several domains that evolve independently but do not require independent deployment:

- story
- characters
- generation
- audio
- timing
- timeline
- jobs
- media
- credentials

A modular monolith keeps operational complexity low while preserving strong internal boundaries.

## Dependency Model

```text
API / Worker
    |
    v
Application -----> Port <----- Infrastructure
    |
    v
Domain
```

Source-code dependency rules:

```text
Application -> Domain
Application -> Port
Infrastructure -> Port
Infrastructure -> Domain when mapping requires it
API -> Application
```

Forbidden:

```text
Domain -> Infrastructure
Domain -> API
Application -> concrete provider
Application -> ORM model
```

## Recommended Layout

```text
app/
├── story/
│   ├── domain/
│   ├── application/
│   └── ports/
├── characters/
│   ├── domain/
│   ├── application/
│   └── ports/
├── generation/
│   ├── domain/
│   ├── application/
│   └── ports/
├── audio/
│   ├── domain/
│   ├── application/
│   └── ports/
├── timing/
│   ├── domain/
│   ├── application/
│   └── ports/
├── timeline/
│   ├── domain/
│   ├── application/
│   └── ports/
├── jobs/
│   ├── domain/
│   ├── application/
│   └── ports/
├── media/
│   ├── domain/
│   ├── application/
│   └── ports/
├── credentials/
│   ├── domain/
│   ├── application/
│   └── ports/
├── infrastructure/
├── api/
├── core/
└── main.py
```

## Lightweight DDD

Use rich domain modeling where business invariants exist.

Strong candidates:

- story continuity
- character identity/state/evolution
- generation lifecycle
- durable job lifecycle
- timing
- timeline/invalidation

Do not force DDD ceremony onto:

- file helpers
- ffprobe wrappers
- hashing
- DTO mapping
- simple stateless utilities

## No Global Service Dumping Ground

Do not organize the entire backend as:

```text
routes/
services/
repositories/
models/
schemas/
```

Technical-layer-only organization causes unrelated domains to become coupled.

## Microservices

Do not split the system into microservices while the product remains single-user and desktop-first.

Clean boundaries inside the monolith are the migration path if independent deployment is ever needed.
