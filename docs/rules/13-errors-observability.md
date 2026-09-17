# 13 — Errors & Observability Rules

Prefer typed errors:

- ProviderAuthExpired
- ProviderQuotaExceeded
- ProviderRateLimited
- ProviderUnavailable
- MediaDownloadFailed
- MediaValidationFailed
- TTSGenerationFailed
- AlignmentFailed
- RenderFailed
- ContinuityConflict

Adapters normalize provider-specific errors.

Structured logs may include:

- project_id
- chapter_id
- scene_id
- beat_id
- job_id
- provider_key
- operation

Never log secrets.

Persist user-safe error information and sanitized technical diagnostics.
