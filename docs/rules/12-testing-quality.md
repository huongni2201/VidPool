# 12 — Testing & Quality Rules

## Bug Fix Rule

When a bug can be reproduced in an automated test:

1. write failing regression test
2. verify failure
3. implement fix
4. verify test passes
5. run related suite

## Test Layers

### Domain Tests

Pure, fast tests for:

- state transitions
- continuity policies
- invalidation rules
- timing calculations

### Application Tests

Test orchestration using fake ports.

### Repository Tests

Verify persistence behavior against test SQLite databases.

### Adapter Contract Tests

Verify provider mapping and error normalization.

Avoid hitting paid external APIs in normal test runs.

### Integration Tests

Cover critical pipelines such as:

```text
Story → VisualBeat
TTS → Alignment → Timing
Timeline → RenderPlan
```

## Golden Fixtures

Keep stable fixtures for:

- story parsing
- continuity extraction
- subtitle generation
- render-plan compilation

## Quality Gates

Before merge:

- tests pass
- migrations validate
- lint/type-check pass
- architecture boundaries are not violated
- secrets are not introduced
- no obsolete implementation remains unintentionally

## AI Tests

Do not assert exact prose from non-deterministic AI.

Assert schema, required fields, invariants, and validation behavior.

## Media Tests

Use small deterministic test media assets.

Do not require large production files for routine tests.
