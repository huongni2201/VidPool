# 14 — Migrations & Compatibility Rules

## Current Product Stage

The application is pre-production unless explicitly changed.

## Pre-Production Rule

Prefer clean migration history and clean architecture over preserving unused legacy behavior.

If an old implementation has been fully superseded:

- remove old code
- remove old configuration
- remove old fallback
- remove stale docs
- rename misleading migrations when safe
- update tests

## Avoid Permanent Compatibility Layers

Do not retain:

```text
old path
new path
legacy path
temporary adapter
fallback adapter
```

without a concrete compatibility requirement.

## Database Migrations

Use Alembic.

Every schema change must have a migration unless the project explicitly resets its pre-production baseline.

## Migration Safety

After a release with real user data, do not rewrite historical applied migrations.

Create forward migrations instead.

## Breaking Internal Changes

Internal APIs may break in pre-production if all callers are migrated in the same change.

## Cleanup Rule

When migrating completely:

1. implement new path
2. migrate callers
3. migrate data/schema
4. remove old path
5. remove dead tests/docs
6. verify no stale references remain

## No Ghost Features

Docs must not describe removed features.

Code must not expose endpoints/settings for abandoned features.
