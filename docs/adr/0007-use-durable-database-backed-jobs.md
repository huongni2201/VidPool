# ADR-0007: Use Durable Database-Backed Jobs

Date: 2026-09-16  
Status: Accepted

## Context

Video generation and rendering may take minutes and must survive backend restarts.

## Decision

Represent long-running operations as durable SQLite-backed jobs processed by a worker.

## Consequences

### Positive

- Crash recovery
- Progress persistence
- No Redis required

### Negative

- Worker lifecycle must be implemented carefully

## Alternatives Considered

- FastAPI BackgroundTasks
- Celery + Redis
