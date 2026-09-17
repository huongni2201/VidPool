# 15 — Documentation & ADR Rules

Create ADRs for significant architecture changes.

Examples:

- Tauri → Electron
- SQLite → PostgreSQL
- local worker → Celery
- SSE → WebSocket
- provider abstraction redesign
- timing source change
- timeline architecture change
- renderer strategy change
- secret storage change

Do not create ADRs for minor refactors.

Accepted ADR history is immutable.

If replaced:

```text
Status: Superseded by ADR-00XX
```

and create a new ADR.

Do not delete accepted ADRs.
