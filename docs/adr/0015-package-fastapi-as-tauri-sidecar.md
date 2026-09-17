# ADR-0015: Package FastAPI as Tauri Sidecar

Date: 2026-09-16  
Status: Accepted

## Context

Users should launch one desktop application instead of manually starting backend and frontend processes.

## Decision

Package the Python backend as a sidecar and let Tauri start, health-check, and stop it.

## Consequences

### Positive

- Single-app user experience
- Development and production remain separable

### Negative

- Packaging complexity across platforms

## Alternatives Considered

- Require manual backend startup
- Rewrite backend in Rust
