# 08 — Provider Adapter Rules

## Provider Types

Use explicit ports such as:

- `LLMProviderPort`
- `TranslationProviderPort`
- `ImageProviderPort`
- `VideoProviderPort`
- `TTSProviderPort`

## Provider Isolation

Provider-specific logic must live under infrastructure.

Example:

```text
infrastructure/providers/seedance/
├── adapter.py
├── client.py
├── mapper.py
├── schemas.py
└── errors.py
```

## No Provider Branching in Application Code

Avoid:

```python
if provider == "seedance":
    ...
elif provider == "wan":
    ...
```

Use a provider registry.

## Stable Internal Model Keys

Application and frontend use:

```text
provider_key
model_key
```

Provider adapter maps to remote IDs.

## Capabilities

Provider registry may expose:

- text-to-video
- image-to-video
- reference image support
- supported ratios
- supported durations
- max prompt length
- resolution constraints

## Error Mapping

Provider errors must map to application-level errors:

- authentication expired
- quota exceeded
- rate limited
- unavailable
- invalid request
- unsupported capability

Do not leak raw provider error semantics into domain logic.

## Credentials

Credential scheduling may only use accounts/credentials the user is authorized to use.

Do not implement quota evasion, restriction bypassing, or rate-limit circumvention.

## Replaceability Test

Replacing one provider with another must not require changing:

- domain entities
- timeline model
- story model
- frontend business behavior
