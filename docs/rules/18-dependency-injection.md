# 18 — Dependency Injection Rules

## Goal

Dependencies must be explicit and replaceable without introducing a heavyweight DI framework.

## Preferred Pattern

Constructor injection.

Example:

```python
class CreateGenerationHandler:
    def __init__(
        self,
        jobs: GenerationJobRepository,
        providers: VideoProviderRegistry,
    ) -> None:
        self._jobs = jobs
        self._providers = providers
```

## Composition Root

Concrete implementations are wired in one place:

```text
core/container.py
```

or another explicit composition root.

## FastAPI Dependencies

FastAPI dependencies may obtain already-composed application services from the container.

Routes should not build repositories/providers themselves.

## Avoid Service Locator

Do not call a global container from arbitrary domain/application code.

Dependencies should be visible in constructors/functions.

## Avoid Framework Lock-In

Do not make domain/application objects depend on FastAPI's `Depends`.

## Testing

Tests should instantiate application handlers with fake ports directly.
