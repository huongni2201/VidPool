# 19 — Repository & Mapper Rules

Repositories abstract meaningful persistence boundaries.

Do not create one repository per table automatically.

Repository contracts return domain/application types, not ORM rows.

SQLAlchemy models remain infrastructure details.

Use explicit mapping:

```text
ORM Model
↔
Domain Entity
```

Business logic does not belong in repositories.

Read-heavy UI queries may use optimized projections/read models without reconstructing full aggregates.
