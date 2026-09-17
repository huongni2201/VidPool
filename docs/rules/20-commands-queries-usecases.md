# 20 — Commands, Queries & Use Cases

## Lightweight CQRS

Use command/query separation as a code organization pattern.

No distributed CQRS infrastructure is required.

## Commands

Commands change state.

Examples:

```text
CreateProject
AnalyzeChapter
CreateGeneration
RetryGeneration
LockBeat
UpdateCharacterState
RenderPreview
ExportVideo
```

## Queries

Queries read state.

Examples:

```text
GetProject
GetChapter
ListVisualBeats
GetTimeline
ListGenerationJobs
GetAssetVersions
```

## Handler Scope

A handler should represent one business use case.

Avoid one handler that supports many unrelated operation modes.

## Transactional Commands

Commands that mutate related state must run transactionally where required.

## Queries

Queries may use optimized projections.

They do not need to reconstruct full domain aggregates when no business behavior is being executed.

## No Business Logic in DTOs

Commands and query DTOs carry data.

They do not own domain behavior.
