# ADR-0001: Desktop-first Architecture

Date: 2026-09-16  
Status: Accepted

## Context

The application requires direct access to local files, FFmpeg, SQLite, local credentials, and potentially local GPU workloads.

## Decision

Build the product as desktop-first while keeping the application core independent of the desktop shell.

## Consequences

### Positive

- Simple local file/media access
- No cloud infrastructure required for the primary use case
- Backend can still be hosted remotely later

### Negative

- Requires desktop packaging and lifecycle management

## Alternatives Considered

- Web-only application
- Native-only desktop application
