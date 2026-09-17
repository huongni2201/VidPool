# Generation Flow

## Story Processing

```text
Import Chapter
  ↓
Normalize Source
  ↓
Pass 1: Chapter Understanding
  ↓
Pass 2: Scene Segmentation
  ↓
Pass 3: Entity / State Extraction
  ↓
Candidate State Updates
  ↓
Continuity Validation
  ↓
Merge Canonical State
  ↓
Pass 4: Visual Beat Generation
  ↓
Pass 5: Continuity Validation
```

## Audio-First Timing

```text
VisualBeat / Script
  ↓
Spoken Text
  ↓
Persist TTS Job
  ↓
Worker
  ↓
TTS Provider
  ↓
Actual WAV
  ↓
Persist Alignment Job
  ↓
Worker
  ↓
Alignment Engine
  ↓
Actual Sentence / Word Timestamps
  ↓
TimingPlan
```

## Visual Generation

Durable state exists before remote execution:

```text
TimingPlan
  ↓
ContextResolver
  ↓
PromptCompiler
  ↓
Character / Location References
  ↓
Create Generation Request
  ↓
Persist Job
status = QUEUED
  ↓
Worker atomically claims Job
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
WAITING_EXTERNAL
  ↓
Scheduled Polling
  ↓
Result Available
  ↓
DOWNLOADING
  ↓
.part file
  ↓
Validate
  ↓
ffprobe
  ↓
Atomic Rename
  ↓
Persist MediaAsset + lineage
  ↓
COMPLETED
```

## Why Persistence Comes First

Never submit a remote generation request and only then create local durable state.

If the provider accepts the request and the app crashes before persistence, the remote task can become orphaned or be submitted twice.

## Editing / Rendering

```text
Media Assets
  ↓
Timeline
  ↓
Compile RenderPlan
  ↓
Persist Render Job
  ↓
Worker
  ↓
FFmpeg Renderer
  ↓
Post-Render Validation
  ↓
Preview / Final Artifact
```

## Recovery

```text
Load unfinished jobs
  ↓
Resolve stale leases
  ↓
Reconcile remote submissions
  ↓
Resume polling / download / render
  ↓
Retry only when replay policy allows
```
