# 04 — React Frontend Rules

Use:

- React
- Vite
- TypeScript
- Tailwind CSS

Prefer feature-oriented structure.

Frontend may:

- edit project data through APIs
- show progress
- subscribe to SSE
- preview media

Frontend may not:

- hold provider secrets
- call provider APIs directly
- depend on SQLite schema
- build provider-specific payloads
- expose raw remote model IDs as core state

Clearly distinguish candidate, approved, locked, stale, invalidated, and failed data.
