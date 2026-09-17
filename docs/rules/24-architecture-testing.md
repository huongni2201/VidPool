# 24 — Architecture Testing Rules

Add automated tests for forbidden imports.

Enforce:

```text
domain !-> infrastructure
domain !-> api
application !-> concrete providers
application !-> ORM models
```

Add contract tests for repositories and provider adapters.

State machines require table-driven tests.

Invalidation tests prove:

- only downstream nodes are invalidated
- unrelated beats remain intact
- locks are preserved

Do not disable architecture tests merely to merge.
