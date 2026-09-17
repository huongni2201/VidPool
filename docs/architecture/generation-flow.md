# Generation Flow

## Chapter Processing

```text
Import Chapter
  ↓
Normalize Source
  ↓
Analyze Chapter
  ↓
Scene Segmentation
  ↓
Entity/State Extraction
  ↓
Continuity Validation
  ↓
Visual Beat Creation
```

## Audio-First Flow

```text
Visual Beat / Script
  ↓
Spoken Text
  ↓
TTS Job persisted
  ↓
Worker executes TTS
  ↓
Actual WAV
  ↓
Alignment Job persisted
  ↓
Worker executes alignment
  ↓
Actual Timestamps
  ↓
Timing Plan
```

## Visual Generation Flow

Durable state must exist before remote execution begins.

```text
Timing Plan
  ↓
Context Resolver
  ↓
Prompt Compiler
  ↓
Character / Location References
  ↓
Create Generation Request
  ↓
Persist GenerationJob
status = QUEUED
  ↓
Worker atomically claims job
  ↓
Credential / Provider selection
  ↓
Provider Registry
  ↓
Provider Adapter
  ↓
Remote Submit
  ↓
Persist remote_job_id / submission checkpoint
  ↓
REMOTE_QUEUED / REMOTE_PROCESSING
  ↓
Scheduled Polling
  ↓
Result Available
  ↓
DOWNLOADING
  ↓
Temporary .part file
  ↓
Media Validation / ffprobe
  ↓
Atomic Rename
  ↓
Persist MediaAsset + lineage
  ↓
COMPLETED
```

## Why Job Persistence Comes First

Never make a remote generation request and only then create the durable job.

If the provider accepts the request and the application crashes before persistence, the remote task may become orphaned or be submitted twice during recovery.

The durable job and submission checkpoint are therefore part of the recovery contract.

## Editing Flow

```text
Media Assets
  ↓
Timeline
  ↓
Render Plan
  ↓
Persist Render Job
  ↓
Worker
  ↓
Preview Render
  ↓
Validation
  ↓
User Review
  ↓
Final Render Job
  ↓
Validation
  ↓
Export
```

## Regeneration

Regenerating one beat invalidates only affected downstream nodes.

Approved or locked unrelated work must remain intact.

## Recovery

On restart:

```text
Load unfinished jobs
  ↓
Resolve stale claims
  ↓
Reconcile submitted remote jobs
  ↓
Resume polling/download/render where safe
  ↓
Retry only when idempotency/replay policy allows it
```
