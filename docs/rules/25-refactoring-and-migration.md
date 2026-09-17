# 25 — Refactoring & Migration Rules

## Refactor by Boundary

When untangling code:

1. identify business ownership
2. define target port/contract
3. move implementation behind adapter
4. migrate callers
5. remove old path
6. add regression/architecture tests

## No Dual Architecture Long-Term

Do not keep both:

```text
new application handler
old service
legacy route logic
```

after migration is complete.

## Strangler Use

Temporary compatibility code is acceptable during an active migration only if:

- scope is explicit
- deletion point is known
- tests cover both transition paths

## Pre-Production Preference

Because the project is pre-production, prefer complete cleanup over accumulating compatibility debt.

## Rename Semantics

Rename files/classes when old names no longer describe their responsibility.

Avoid historical names such as:

```text
seaart_service.py
```

when the object has become a generic provider orchestration layer.
