# 21 — Boundary Contract Rules

Every external integration uses an application-owned semantic contract.

Examples:

- provider ports
- repository ports
- SecretStorePort
- RendererPort
- MediaInspectorPort
- FilesystemStoragePort

Adapters translate:

```text
Application Contract
↕
External Contract
```

Raw provider schemas do not appear in domain/application/frontend.

Do not mirror every provider field into the core contract.

Capability differences are metadata.

Provider-specific advanced options may live in an isolated extension structure only when necessary.
