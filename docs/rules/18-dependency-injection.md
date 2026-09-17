# 18 — Dependency Injection Rules

Use explicit constructor injection.

Prefer a simple composition root.

Example:

```python
class CreateGenerationHandler:
    def __init__(self, jobs: JobRepository, providers: VideoProviderRegistry):
        ...
```

Concrete wiring belongs in `core/container.py` or equivalent.

Do not use a global service locator from domain/application code.

Do not inject FastAPI `Depends` into domain/application objects.

Tests instantiate handlers with fake ports directly.
