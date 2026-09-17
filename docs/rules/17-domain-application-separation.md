# 17 — Domain / Application Separation Rules

## Domain Owns Rules

Domain decides:

- valid state transitions
- invariants
- business constraints
- value semantics
- continuity rules that do not require external I/O

## Application Owns Orchestration

Application decides:

- what repository to load from
- which domain operation to call
- which provider port to invoke
- what to persist
- what event/job to enqueue

## Example

Correct:

```text
Application
  load job
  → Domain job.mark_submitting()
  → save job
  → call provider port
```

Incorrect:

```text
Route
  manually sets job.status = "SUBMITTING"
  → calls httpx
  → writes DB
```

## Domain Purity

Domain code should be testable without:

- database
- network
- environment variables
- FastAPI
- filesystem
- external processes

## Application Return Values

Application services return application/domain results, not ORM rows.

## No God Service

Avoid application classes such as:

```text
StoryVideoService
EverythingService
ProjectManager
```

that coordinate unrelated workflows.

Prefer use-case-specific orchestration.
