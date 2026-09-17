# 16 — Python Module Architecture Rules

Use a modular monolith.

Each substantial domain module owns:

```text
domain/
application/
ports/
```

Concrete implementations live in infrastructure.

Do not create a global business `app/services/`.

One file/class should have one primary responsibility.

Circular imports between domain modules indicate unclear ownership.

Use domain language in names.

Prefer:

```text
generation
timeline
story
characters
```

over:

```text
manager
misc
common_service
helpers2
```
