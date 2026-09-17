# ADR-0005: Use SQLite for Local Persistence

Date: 2026-09-16  
Status: Accepted

## Context

The product is local-first and single-user.

## Decision

Use SQLite with SQLAlchemy 2.x, Alembic, WAL mode, and foreign keys.

## Consequences

### Positive

- No database server
- Easy backup
- Sufficient for local workload

### Negative

- Would need migration if product becomes multi-user/cloud

## Alternatives Considered

- PostgreSQL
- Embedded key-value database
