# 12 — Testing & Quality Rules

## Bug Fix

```text
failing regression test
→ fix
→ passing test
```

when feasible.

## Test Layers

Domain tests:
- invariants
- state transitions
- timing
- invalidation

Application tests:
- orchestration with fake ports

Repository tests:
- persistence behavior

Adapter contract tests:
- mapping
- capabilities
- error normalization

Integration tests:
- Story → VisualBeat
- TTS → Alignment → Timing
- Timeline → RenderPlan

Do not assert exact nondeterministic AI prose.
Assert schemas and invariants.
