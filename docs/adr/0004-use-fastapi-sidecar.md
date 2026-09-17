# ADR-0004: Use FastAPI as Application Backend

Date: 2026-09-16  
Status: Accepted

## Context

Story AI, media processing, TTS integration, and provider integrations fit the Python ecosystem.

## Decision

Use FastAPI as the backend process and application API boundary.

## Consequences

### Positive

- Strong Python ecosystem integration
- Backend remains independently testable
- Clear local API boundary

### Negative

- Requires sidecar packaging

## Alternatives Considered

- Rust backend
- Node backend
