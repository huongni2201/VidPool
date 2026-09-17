# 24 — Architecture Testing Rules

## Goal

Architecture rules should be testable where practical.

## Import Boundary Tests

Add automated tests that detect forbidden imports.

Examples to enforce:

```text
domain !→ infrastructure
domain !→ api
application !→ concrete providers
application !→ ORM models
```

Tools may include lightweight AST/import inspection or an architecture-testing library.

## Repository Contract Tests

Repository implementations must satisfy the same behavior contract.

## Provider Adapter Contract Tests

Each provider adapter should be tested against provider-neutral expectations:

- submit mapping
- status mapping
- error normalization
- capability handling

## State Machine Tests

Generation/job state transitions require table-driven tests.

## Invalidation Tests

Dependency invalidation must prove:

- only downstream nodes are invalidated
- unrelated beats remain intact
- locked data is preserved

## Timing Tests

Use deterministic fixtures to validate:

- aligned timestamps
- subtitle boundaries
- beat timing
- render-plan duration

## Architecture Test Failure

Do not disable architecture tests merely to merge a change.

Fix the boundary.
