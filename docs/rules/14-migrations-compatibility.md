# 14 — Migrations & Compatibility Rules

The project is pre-production unless explicitly changed.

Prefer clean migration and cleanup over permanent compatibility debt.

When superseding an implementation:

1. add new path
2. migrate callers
3. migrate schema/data
4. remove old path
5. remove dead tests/docs/config
6. verify stale references are gone

Use Alembic for schema changes.

After real user data exists, do not rewrite applied migration history.

Docs must not describe removed features as current.
