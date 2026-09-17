# 23 — Import & Dependency Rules

## Forbidden Imports

Domain must not import:

```text
fastapi
sqlalchemy
httpx
requests
keyring
subprocess wrappers
provider SDKs
```

Application must not import:

```text
infrastructure.providers.*
infrastructure.persistence.models.*
api.*
```

Frontend-specific code must never be imported by backend modules.

## Relative Imports

Use clear package imports consistently.

Avoid deep relative imports that hide architectural direction.

## Circular Dependency Rule

Circular dependency means ownership is unclear.

Resolve by:

1. moving the concept to its true owner
2. extracting a small contract
3. introducing a domain event/application interface when appropriate

Do not normalize circular imports as acceptable architecture.

## Dependency Budget

Before adding a new third-party Python dependency, confirm:

- standard library cannot reasonably solve it
- existing dependency does not already solve it
- maintenance/security cost is acceptable
- it belongs in the correct layer

## Optional Dependencies

Provider-specific dependencies should remain optional when practical and isolated to that provider.
