# Dependency Map

## Domain

May import:

- standard library
- domain-local modules
- small dependency-free shared primitives

Must not import:

- FastAPI
- SQLAlchemy
- Pydantic API DTOs
- httpx / requests
- provider SDKs
- keyring
- FFmpeg wrappers
- Tauri
- filesystem implementations

## Application

May import:

- domain
- ports
- commands
- queries
- result DTOs

Must not import:

- concrete provider adapters
- concrete repositories
- ORM models
- API routers
- keyring implementation
- filesystem implementation
- concrete renderer

## Infrastructure

May import:

- application ports
- domain types
- SQLAlchemy
- HTTP clients
- provider SDKs
- keyring
- subprocess/FFmpeg integrations

## API

May import:

- application handlers
- API DTOs
- composition container

API must not own business rules.

## Composition Root

Concrete wiring happens at startup:

```text
VideoProviderPort = SeedanceAdapter(...)
TTSProviderPort = VoiceStudioAdapter(...)
JobRepository = SqlAlchemyJobRepository(...)
RendererPort = FFmpegRenderer(...)
SecretStorePort = KeyringSecretStore(...)
```

The composition root may know all layers because its only responsibility is assembly.

## Architecture Enforcement

Automated architecture tests should detect forbidden imports.
