# 21 — Boundary Contract Rules

## External Boundary Rule

Every external system must have a contract owned by the application.

Examples:

- video provider
- image provider
- TTS
- LLM
- translation
- filesystem storage
- renderer
- secret store

## Internal Contract

The application defines provider-neutral inputs/outputs.

Example:

```text
GenerationRequest
ProviderJob
ProviderJobStatus
GeneratedArtifact
```

## Adapter Responsibility

Adapters translate between:

```text
Application Contract
        ↕
Provider Contract
```

## No Raw Provider Payloads Outside Adapter

Provider JSON schemas must not appear in:

- domain
- application
- frontend
- timeline
- story model

## Capability Discovery

Provider capability differences are surfaced as metadata, not scattered conditionals.

## Contract Stability

Prefer stable semantic contracts.

Do not mirror every provider field into the application contract unless the application truly needs it.

## Escape Hatch

Provider-specific advanced options may be stored in a clearly isolated extension structure only when necessary.

They must not become core domain fields without an architectural decision.
