# 20 — Commands, Queries & Use Cases

Use lightweight command/query separation.

Commands change state.

Examples:

- CreateProject
- AnalyzeChapter
- CreateGeneration
- RetryJob
- LockBeat
- UpdateCharacterState
- RenderPreview
- ExportVideo

Queries read state.

Examples:

- GetProject
- ListVisualBeats
- GetTimeline
- ListJobs
- GetAssetVersions

A handler represents one business use case.

No distributed CQRS infrastructure is required.
