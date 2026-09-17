# 15 — Documentation & ADR Rules

## Documentation Purpose

Documentation must explain current architecture and important decisions.

It must not become a museum of obsolete behavior.

## ADR Required For

Create an ADR for decisions such as:

- Tauri → Electron
- SQLite → PostgreSQL
- local worker → Celery/Redis
- SSE → WebSocket
- provider abstraction redesign
- major story-memory model change
- timing source-of-truth change
- timeline model change
- renderer architecture change
- secret-storage strategy change
- packaging/lifecycle strategy change

## ADR Not Required For

Do not create ADRs for:

- renaming a component
- small refactors
- bug fixes
- UI text changes
- minor helper libraries

## ADR Format

```text
# ADR-NNNN: Title

Date:
Status:

## Context

## Decision

## Consequences

### Positive

### Negative

## Alternatives Considered
```

Statuses:

- Proposed
- Accepted
- Deprecated
- Superseded

## ADR Immutability

Do not rewrite old accepted ADRs to pretend the old decision never existed.

If replaced:

```text
Status: Superseded by ADR-00XX
```

Then create a new ADR.

## Architecture Docs

`docs/architecture/` describes the current system.

ADRs describe why important decisions were made.

Rules describe implementation constraints.

These three purposes must remain separate.
