# State Machines

## Generic JobStatus

Use one generic durable lifecycle:

```text
CREATED
QUEUED
RUNNING
WAITING
RETRY_WAIT
COMPLETED
FAILED
CANCELLED
```

`PAUSED` may be added if pause/resume is implemented.

## GenerationPhase

Generation-specific progress is separate from JobStatus:

```text
PREPARING
SUBMITTING
REMOTE_QUEUED
REMOTE_PROCESSING
DOWNLOADING
VALIDATING
POST_PROCESSING
```

Example:

```text
JobStatus = WAITING
GenerationPhase = REMOTE_PROCESSING
```

This avoids two competing lifecycle state machines.

## Allowed Principles

- terminal states do not transition back to running states without explicit retry semantics
- retries increment attempt count
- remote submission checkpoint is persisted
- cancellation is best-effort when provider cancellation is unavailable
- stale worker claims are recoverable
- phase updates never replace the generic durable lifecycle

## Asset State

Recommended semantic states:

```text
CANDIDATE
APPROVED
LOCKED
STALE
INVALIDATED
FAILED
```

A locked asset cannot be overwritten by automatic regeneration.
