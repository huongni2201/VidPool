# 19 — Repository & Mapper Rules

## Repository Purpose

Repositories abstract persistence for meaningful aggregates/entities.

Do not create a repository for every table automatically.

## Repository Interfaces

Repository contracts belong close to the application/domain module that needs them.

Example:

```python
class GenerationJobRepository(Protocol):
    async def get(self, job_id: JobId) -> GenerationJob | None: ...
    async def save(self, job: GenerationJob) -> None: ...
```

## SQLAlchemy Isolation

SQLAlchemy models belong in infrastructure.

Do not return SQLAlchemy models from repository contracts.

## Mapping

Use explicit mapping:

```text
ORM Model
  ↔
Domain Entity
```

Mapping may live in:

```text
infrastructure/persistence/mappers/
```

or next to the repository implementation.

## Transaction Boundary

A use case that performs multiple related persistence operations must define one transaction boundary.

## Avoid Anemic Repositories

Do not place business logic inside repositories.

Repositories persist and retrieve.

Domain/application decides business behavior.

## Query Optimization

Read-heavy UI queries may use dedicated query models/read repositories when a full aggregate load is unnecessary.
