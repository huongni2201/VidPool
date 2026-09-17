# 13 — Errors & Observability Rules

## Typed Errors

Prefer explicit application errors.

Examples:

- `ProviderAuthExpired`
- `ProviderQuotaExceeded`
- `ProviderRateLimited`
- `ProviderUnavailable`
- `MediaDownloadFailed`
- `MediaValidationFailed`
- `TTSGenerationFailed`
- `AlignmentFailed`
- `RenderFailed`
- `ContinuityConflict`

Avoid generic:

```python
raise Exception("something failed")
```

## Error Boundaries

Provider-specific errors are normalized by adapters.

Infrastructure errors do not leak raw implementation details to the UI.

## Structured Logging

Include relevant context:

- `project_id`
- `chapter_id`
- `scene_id`
- `beat_id`
- `job_id`
- `provider_key`
- `operation`

## Do Not Log

- tokens
- cookies
- secrets
- full private story text by default
- huge provider payloads by default

## Job Errors

Persist:

- error code
- user-safe message
- technical detail for diagnostics where safe
- retryability
- attempt count

## Diagnostics

Diagnostics may expose:

- backend health
- provider health
- FFmpeg version
- storage path
- DB path
- job counts
- recent sanitized errors

## Correlation

Every long-running operation should have a stable job/correlation ID.
