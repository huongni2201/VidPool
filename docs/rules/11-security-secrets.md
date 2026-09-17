# 11 — Security & Secrets Rules

Bind backend to `127.0.0.1` by default.

Use restricted CORS.

Use a random local app-session token when implemented.

Store secrets in OS credential storage.

Never store secrets in:

- frontend localStorage
- source code
- plaintext DB fields
- logs
- diagnostics bundles

Validate file paths.

Prefer subprocess argument arrays over shell string concatenation.
