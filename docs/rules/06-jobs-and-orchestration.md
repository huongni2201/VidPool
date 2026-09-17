# 06 — Jobs & Orchestration Rules

## Durable Jobs

Long-running work must be represented as durable jobs.

Examples:

- story analysis
- image generation
- video generation
- TTS
- alignment
- download
- media validation
- thumbnail generation
- preview render
- final render
- export

## Do Not Use FastAPI BackgroundTasks

`BackgroundTasks` is not acceptable for durable generation workflows.

## Job Capabilities

A job must support, when applicable:

- queue
- claim
- progress
- retry
- cancel
- pause
- resume
- dependency
- failure reason
- timestamps
- recovery after restart

## Recommended Job States

```text
CREATED
QUEUED
RUNNING
WAITING_EXTERNAL
RETRY_WAIT
COMPLETED
FAILED
CANCELLED
```

Provider-specific generation can expose detailed substate separately.

## Generation State

Video generation may use:

```text
QUEUED
SUBMITTING
REMOTE_QUEUED
REMOTE_PROCESSING
DOWNLOADING
POST_PROCESSING
COMPLETED
RETRY_WAIT
FAILED
CANCELLED
```

## Polling

Persist `next_poll_at`.

Do not create one uncontrolled infinite loop per request.

Use backoff and jitter.

## Recovery

At startup:

1. inspect unfinished jobs
2. resolve stale leases
3. resume safe jobs
4. re-poll remote jobs when appropriate
5. mark unrecoverable jobs with explicit failure reason

## Idempotency

Each job step should be safe to retry when possible.

## Dependency Graph

Dependencies must support selective invalidation.

Changing one beat must not invalidate unrelated chapters.
