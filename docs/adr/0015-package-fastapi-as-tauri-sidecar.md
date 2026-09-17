# ADR-0015: Package FastAPI as Tauri Sidecar

Date: 2026-09-17
Status: Accepted

## Context

Users should launch one desktop application rather than manually starting backend and frontend.

## Decision

Package the Python backend as a sidecar controlled by Tauri.

## Consequences

### Positive

- Single-app experience
- Development and production remain separable

### Negative

- Cross-platform packaging complexity

## Alternatives Considered

- Manual backend startup
- Rewrite backend in Rust
