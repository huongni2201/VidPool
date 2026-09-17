# ADR-0014: Local API Security Boundary

Date: 2026-09-16  
Status: Accepted

## Context

A localhost service should not assume every local web origin is trusted.

## Decision

Bind FastAPI to 127.0.0.1, use a per-session app token, and restrict CORS.

## Consequences

### Positive

- Reduces accidental local API exposure
- Separates UI session from arbitrary browser pages

### Negative

- Requires token propagation during startup

## Alternatives Considered

- Trust localhost without authentication
