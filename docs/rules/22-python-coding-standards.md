# 22 — Python Coding Standards

## Python Version

Use one project-wide Python version defined in `pyproject.toml`.

Do not introduce code requiring a newer version without updating the project constraint intentionally.

## Typing

Type public application/domain interfaces.

Prefer:

- `Protocol`
- dataclasses
- enums
- explicit result types

Avoid pervasive `Any`.

## Async

Use async for real I/O boundaries such as:

- HTTP
- DB when using async SQLAlchemy
- async process I/O

Do not make pure domain logic async.

## Dataclasses

Use dataclasses/value objects for domain structures when Pydantic behavior is not required.

## Pydantic

Use Pydantic primarily for:

- FastAPI DTOs
- external provider schemas
- configuration

Do not make all domain entities Pydantic models by default.

## Functions and Files

Prefer focused functions and classes.

Split a file when it starts owning multiple unrelated concerns.

## Exceptions

Use typed exceptions.

Do not catch `Exception` broadly unless at an outer error boundary.

## Environment Access

Centralize environment/config access.

Do not scatter `os.getenv()` across business code.

## Time

Use a clock abstraction where deterministic tests require control over time.

## IDs

Prefer typed/stable internal IDs rather than raw provider IDs.
