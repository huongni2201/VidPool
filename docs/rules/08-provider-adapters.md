# 08 — Provider Adapter Rules

Use ports such as:

- LLMProviderPort
- TranslationProviderPort
- ImageProviderPort
- VideoProviderPort
- TTSProviderPort

Provider-specific logic lives under infrastructure.

Use a provider registry instead of scattered `if provider == ...`.

Use stable internal:

```text
provider_key
model_key
```

Adapter maps to remote IDs.

Expose capabilities as metadata:

- T2V
- I2V
- reference support
- aspect ratios
- durations
- prompt limits
- resolution constraints

Normalize provider errors.

Provider credentials must be authorized and must not be used to bypass platform limits.
