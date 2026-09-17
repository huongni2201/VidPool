# ADR-0004: Use FastAPI as Application Backend

Date: 2026-09-17
Status: Accepted

## Context

Story AI, provider integration, media processing, and local AI tooling fit the Python ecosystem.

## Decision

Use FastAPI as the local backend/API boundary.

## Consequences

### Positive

- Python ecosystem fit
- Independent backend testing
- Clear API boundary

### Negative

- Requires sidecar packaging

## Alternatives Considered

- Rust backend
- Node backend
