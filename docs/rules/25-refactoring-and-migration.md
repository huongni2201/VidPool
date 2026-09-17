# 25 — Refactoring & Migration Rules

Refactor by boundary:

1. identify ownership
2. define target contract
3. move implementation behind adapter
4. migrate callers
5. remove old path
6. add tests

Do not maintain dual architecture long-term.

Temporary compatibility code is allowed only with explicit scope and removal criteria.

Because the project is pre-production, prefer full cleanup over compatibility debt.

Rename historical files/classes when names no longer match responsibility.
