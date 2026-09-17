# ADR-0001: Desktop-first Architecture

Date: 2026-09-17
Status: Accepted

## Context

The application needs direct access to local media, FFmpeg, SQLite, credentials, and potentially local GPU workloads.

## Decision

Build the product as desktop-first while keeping application core logic independent of the desktop shell.

## Consequences

### Positive

- Simple local media access
- No cloud infrastructure required for the primary use case
- Backend can still be hosted remotely later

### Negative

- Requires desktop packaging and lifecycle management

## Alternatives Considered

- Web-only application
- Native-only UI with no backend boundary
