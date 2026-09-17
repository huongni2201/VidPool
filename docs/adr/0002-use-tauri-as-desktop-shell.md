# ADR-0002: Use Tauri as Desktop Shell

Date: 2026-09-17
Status: Accepted

## Context

The application needs desktop packaging and OS integration without moving business logic into the shell.

## Decision

Use Tauri for windowing, packaging, lifecycle, sidecar management, dialogs, notifications, and OS integration.

## Consequences

### Positive

- Lightweight shell
- Clear separation from backend logic

### Negative

- Requires Rust/Tauri packaging configuration

## Alternatives Considered

- Electron
- Native Rust UI
