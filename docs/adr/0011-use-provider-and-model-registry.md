# ADR-0011: Use Provider and Model Registry

Date: 2026-09-16  
Status: Accepted

## Context

Remote model IDs and capabilities can change without application semantics changing.

## Decision

Expose stable provider/model keys internally and map them to provider-specific identifiers/capabilities through registries.

## Consequences

### Positive

- Frontend is provider-agnostic
- Remote IDs can change safely

### Negative

- Registry metadata must be maintained

## Alternatives Considered

- Expose remote IDs directly
