# ADR-0016: Use Modular Monolith with Clean and Hexagonal Backend Architecture

Date: 2026-09-17
Status: Accepted

## Context

VidPool has multiple substantial domains but does not need independent deployment or distributed-system complexity.

## Decision

Use a Modular Monolith with Clean Architecture dependency direction, Hexagonal boundaries, and lightweight DDD.

## Consequences

### Positive

- Clear domain ownership
- Replaceable infrastructure
- Testable business rules
- No premature microservices

### Negative

- Requires disciplined boundaries and explicit contracts

## Alternatives Considered

- Flat technical-layer architecture
- Full enterprise DDD everywhere
- Microservices
