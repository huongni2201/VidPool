# 03 — FastAPI Rules

Routes may:

- validate transport input
- validate local app session
- call commands/queries
- map results/errors to HTTP

Routes may not:

- select provider credentials
- call provider HTTP APIs
- execute FFmpeg
- run TTS
- mutate ORM models directly
- run long workflows inline

## Shape

```text
HTTP
→ Pydantic DTO
→ Command / Query
→ Application Handler
→ Result DTO
→ HTTP
```

Long operations return a durable job ID quickly.

Use `/api/v1/` for stable API routes.

Bind production backend to `127.0.0.1`.
