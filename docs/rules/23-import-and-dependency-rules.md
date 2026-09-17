# 23 — Import & Dependency Rules

Domain must not import:

- fastapi
- sqlalchemy
- httpx
- requests
- keyring
- provider SDKs
- subprocess wrappers

Application must not import:

- concrete providers
- ORM models
- API routers

Circular dependencies must be fixed structurally.

Before adding a dependency, confirm:

- standard library is insufficient
- existing dependency does not already solve it
- maintenance/security cost is acceptable
- dependency belongs in the correct layer

Provider-specific dependencies should stay isolated and optional where practical.
