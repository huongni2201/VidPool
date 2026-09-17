# Runtime / Container Architecture

## Tauri

Responsibilities:

- desktop window
- packaging
- lifecycle
- start/stop backend sidecar
- OS dialogs
- notifications
- system integration

Tauri does not own business orchestration.

## React Frontend

Responsibilities:

- project UI
- storyboard
- character/reference management
- asset previews
- generation controls
- timeline controls
- settings
- SSE subscription

React does not access provider APIs, SQLite, or secrets directly.

## FastAPI Backend

Responsibilities:

- local REST/SSE boundary
- input/output DTO validation
- command/query dispatch
- app-session validation
- transport error mapping

FastAPI routes do not contain business logic.

## Application Layer

Coordinates use cases and external ports.

## Domain Layer

Owns:

- business invariants
- state transitions
- continuity rules
- timing rules
- timeline rules

## Durable Worker

Processes persisted jobs from SQLite.

Worker invokes application use cases.

Worker does not duplicate business logic.

## SQLite

Stores structured project state and job metadata.

## Filesystem

Stores media artifacts.

## OS Credential Store

Stores provider secrets.

## Infrastructure Adapters

Implement:

- provider ports
- repositories
- filesystem/media ports
- renderer ports
- secret-store ports
- OS integrations
