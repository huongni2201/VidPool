# Dependency Map

## Domain

May depend on:

- Python standard library
- domain-local modules
- small dependency-free shared primitives

Must not depend on:

- FastAPI
- SQLAlchemy
- API Pydantic DTOs
- httpx/requests
- FFmpeg wrappers
- Tauri
- keyring
- provider SDKs

## Application

May depend on:

- domain
- ports
- application commands/queries/results

Must not depend on:

- concrete provider adapters
- concrete repository implementations
- SQLAlchemy models
- API routers
- keyring implementation
- filesystem implementation

## Infrastructure

May depend on:

- application ports
- domain types
- SQLAlchemy
- httpx/provider SDKs
- keyring
- subprocess/FFmpeg integrations

## API

May depend on:

- application commands/queries
- API DTOs
- dependency/composition container

Routes must not own business rules.

## Runtime vs Source Dependency

Runtime call flow can be:

```text
Application -> VideoProviderPort -> SeedanceAdapter
```

but source dependencies remain:

```text
Application -> VideoProviderPort
SeedanceAdapter -> VideoProviderPort
```

Application never imports `SeedanceAdapter`.

## Composition Root

Concrete wiring happens at startup:

```text
VideoProviderPort implementation = SeedanceAdapter(...)
JobRepository implementation = SqlAlchemyJobRepository(...)
Renderer implementation = FFmpegRenderer(...)
```

The composition root may know all layers because its purpose is assembly.

## Enforcement

Architecture tests should fail on forbidden imports rather than relying only on code review.
