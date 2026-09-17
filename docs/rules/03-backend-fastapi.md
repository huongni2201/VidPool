# 03 — Backend / FastAPI Rules

## Route Responsibility

FastAPI routes may:

- validate transport input
- authenticate local app session
- call a command/query
- map application result to HTTP response
- map known errors to HTTP status

Routes may not:

- select provider credentials
- call provider HTTP APIs
- perform FFmpeg work
- run TTS
- mutate ORM entities directly
- implement business workflows
- run long tasks inline

## Route Shape

Preferred:

```text
HTTP Request
  ↓
Pydantic Request DTO
  ↓
Command / Query
  ↓
Application Service
  ↓
Result DTO
  ↓
HTTP Response
```

## No Long-Running HTTP Work

Generation requests return quickly with a durable job ID.

Do not hold HTTP requests open while waiting for remote generation.

## API Versioning

Use:

```text
/api/v1/
```

for stable API routes.

Breaking transport changes require a new API version only when compatibility is necessary.

## Pydantic Models

API DTOs are not domain entities.

Do not leak ORM objects to the API layer.

## Dependency Injection

Inject interfaces or application services.

Do not instantiate provider clients inside routes.

## SSE

SSE is the default realtime channel for one-way job/status events.

Polling remains a fallback.

## Local Bind

Production backend binds to:

```text
127.0.0.1
```

unless explicitly configured otherwise.
