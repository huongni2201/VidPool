# 22 — Python Coding Standards

Define one Python version in `pyproject.toml`.

Type public domain/application interfaces.

Prefer:

- Protocol
- dataclass
- Enum
- explicit result types

Avoid pervasive `Any`.

Use async for real I/O boundaries, not pure domain logic.

Use Pydantic mainly for:

- FastAPI DTOs
- provider schemas
- config

Do not make every domain entity a Pydantic model.

Centralize environment/config access.

Use typed internal IDs where helpful.

Use a Clock abstraction when deterministic time testing matters.
