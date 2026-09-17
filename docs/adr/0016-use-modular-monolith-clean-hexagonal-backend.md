# ADR-0016: Use Modular Monolith with Clean and Hexagonal Backend Architecture

Date: 2026-09-17  
Status: Accepted

## Context

VidPool is a desktop-first, single-user application with multiple substantial business areas including story analysis, character continuity, generation, audio, timing, jobs, timeline, and media processing.

The backend must remain easy to maintain and extend while avoiding premature distributed-system complexity.

A flat technical structure such as `routes/`, `services/`, `models/`, and `repositories/` across the entire application would allow unrelated domains to become tightly coupled as the product grows.

At the same time, full enterprise DDD or microservices would add unnecessary complexity for the current product.

## Decision

The Python backend will use:

- Modular Monolith as the deployment/module topology
- Clean Architecture dependency direction
- Hexagonal / Ports-and-Adapters boundaries for external integrations
- Lightweight DDD for domains with meaningful business invariants

Backend business code is organized primarily by domain module.

Each substantial module may contain:

```text
domain/
application/
ports/
```

Concrete technical implementations live in infrastructure.

Source-code dependencies must obey dependency inversion:

```text
Application -----> Port <----- Infrastructure Adapter
    |
    v
Domain
```

Application code must not import concrete provider clients, ORM models, renderers, or secret-store implementations.

A composition root wires ports to concrete implementations.

## DDD Scope

Rich domain modeling is encouraged for:

- story continuity
- character identity/state/evolution
- generation lifecycle
- durable job lifecycle
- timing
- timeline/invalidation

DDD ceremony is not required for:

- stateless utilities
- hashing
- file helpers
- ffprobe wrappers
- simple mappers
- DTOs

Repositories are introduced for meaningful persistence boundaries, not automatically for every table.

## Consequences

### Positive

- domains can evolve independently inside one deployable backend
- external providers remain replaceable
- persistence technology is isolated
- business rules are testable without infrastructure
- migration to another provider/database/renderer is localized
- avoids premature microservice complexity
- architecture can be enforced with import-boundary tests

### Negative

- requires disciplined module ownership
- introduces explicit port and mapping code at real external boundaries
- composition/bootstrap code must wire implementations explicitly
- developers must distinguish runtime call direction from source dependency direction

## Alternatives Considered

### Flat routes/services/models/repositories structure

Rejected because it groups by technical layer rather than business ownership and tends to create service-to-service coupling as the codebase grows.

### Full enterprise DDD everywhere

Rejected because many infrastructure/helper concerns do not justify aggregates, repositories, and domain services.

### Microservices

Rejected because the current single-user desktop product does not need independent deployment, distributed coordination, or network boundaries between business modules.
