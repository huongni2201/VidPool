# 11 — Security & Secrets Rules

## Local API

Production FastAPI binds to:

```text
127.0.0.1
```

by default.

## Local Session Token

Tauri should create a random per-session application token.

Frontend sends it to FastAPI using a local app header.

## CORS

Do not use wildcard CORS in production.

Allow only required local origins.

## Secret Storage

Provider secrets belong in OS credential storage.

SQLite stores only secret references.

## Never Store Secrets In

- frontend localStorage
- committed source code
- database plaintext fields
- logs
- diagnostics bundles
- exported project metadata

unless the user explicitly requests an encrypted export feature.

## Logging

Never log:

- bearer tokens
- cookies
- refresh tokens
- complete authorization headers
- secret request bodies

## External Provider Rules

Respect provider terms, quotas, rate limits, and access controls.

Credential pools must not be designed to evade platform restrictions.

## File Paths

Validate user-controlled paths.

Avoid directory traversal and accidental writes outside project/storage roots.

## Local Process Execution

FFmpeg/sidecar process arguments must be structured and escaped safely.

Avoid shell command concatenation where subprocess argument arrays are possible.
