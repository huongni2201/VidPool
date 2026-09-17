# 16 — Python Module Architecture Rules

## Default Architecture

Use a modular monolith.

Each major domain feature owns:

```text
domain/
application/
ports/
```

Concrete technical implementations live in infrastructure.

## Do Not Create a Global Service Layer

Avoid:

```text
app/services/
```

containing unrelated business logic.

Prefer:

```text
app/generation/application/
app/story/application/
app/audio/application/
```

## One Primary Responsibility Per File

Prefer small focused files.

Avoid classes/files that combine:

- HTTP transport
- DB writes
- provider calls
- state transitions
- FFmpeg processing

in one unit.

## Cross-Module Rules

A module may use another module only through a defined contract.

No direct access to another module's ORM tables or implementation classes.

## Cycles

Circular imports between domain modules are architecture failures.

Fix ownership or introduce a contract.

Do not solve architecture cycles with runtime imports unless the dependency is genuinely optional infrastructure code.

## Naming

Use domain language in module names.

Prefer:

```text
generation
timeline
story
characters
```

over generic names like:

```text
manager
handler_utils
common_service
misc
```
