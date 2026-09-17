# ADR-0007: Use Durable Database-Backed Jobs

Date: 2026-09-17
Status: Accepted

## Context

Generation/rendering may take minutes and must survive restarts.

## Decision

Represent long-running operations as durable SQLite-backed jobs processed by a worker.

## Consequences

### Positive

- Crash recovery
- Persistent progress
- No Redis required

### Negative

- Worker lifecycle and leases require careful implementation

## Alternatives Considered

- FastAPI BackgroundTasks
- Celery + Redis
