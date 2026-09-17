# ADR-0011: Use Provider and Model Registry

Date: 2026-09-17
Status: Accepted

## Context

Provider model IDs and capabilities can change independently of application semantics.

## Decision

Use stable internal provider/model keys and map them through registries/adapters.

## Consequences

### Positive

- Frontend stays provider-neutral
- Remote IDs may change safely

### Negative

- Registry metadata must be maintained

## Alternatives Considered

- Expose remote IDs directly
