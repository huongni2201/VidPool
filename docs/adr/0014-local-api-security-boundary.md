# ADR-0014: Use a Local API Security Boundary

Date: 2026-09-17
Status: Accepted

## Context

A localhost service should not trust every local web origin.

## Decision

Bind to 127.0.0.1, restrict CORS, and use a per-session app token when implemented.

## Consequences

### Positive

- Reduces accidental local exposure
- Separates app session from arbitrary browser pages

### Negative

- Requires startup token propagation

## Alternatives Considered

- Trust localhost without session validation
