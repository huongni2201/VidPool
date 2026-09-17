# 01 — Architecture Boundaries

## Layers

```text
Presentation: Tauri + React
Transport: FastAPI
Application: commands / queries / orchestrators
Domain: entities / value objects / policies
Infrastructure: providers / persistence / media / secrets / worker runtime
```

## Rule

```text
Application -----> Port <----- Infrastructure
    |
    v
Domain
```

Domain never imports outer layers.

Application does not import concrete infrastructure.

## Module Ownership

Business concepts belong to a clear module.

Do not create one global `services/` directory for unrelated business logic.

## Boundary Test

If replacing a provider/database/renderer requires rewriting domain behavior, the boundary is wrong.
