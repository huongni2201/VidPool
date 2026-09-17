# ADR-0002: Use Tauri as Desktop Shell

Date: 2026-09-16  
Status: Accepted

## Context

The React UI must be distributed as a desktop application without moving business logic into the desktop shell.

## Decision

Use Tauri for windowing, packaging, lifecycle, OS integration, and backend sidecar control.

## Consequences

### Positive

- Lightweight desktop shell
- Clear separation between shell and backend

### Negative

- Requires Rust/Tauri packaging configuration

## Alternatives Considered

- Electron
- Native Rust UI
