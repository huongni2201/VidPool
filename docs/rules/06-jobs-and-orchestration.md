# 06 — Jobs & Orchestration Rules

Long-running work must be durable:

- story analysis
- TTS
- alignment
- image generation
- video generation
- download
- media validation
- thumbnails
- preview render
- final render
- export

Do not use FastAPI `BackgroundTasks` for durable workflows.

Persist:

- type
- status
- phase if applicable
- progress
- attempt count
- max attempts
- error
- next_run_at / next_poll_at
- lease/claim information
- dependency information
- timestamps

Use atomic claim.

Persist remote submission checkpoints.

Use backoff + jitter for polling.

Recover unfinished jobs on startup.
