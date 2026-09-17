# ADR-0010: Store Provider Secrets in OS Keyring

Date: 2026-09-17
Status: Accepted

## Context

Provider tokens and cookies are sensitive.

## Decision

Store secret material in OS credential storage; SQLite stores only secret references and non-secret metadata.

## Consequences

### Positive

- Reduces secret exposure
- DB backups do not automatically contain credentials

### Negative

- Requires platform keyring integration

## Alternatives Considered

- Plaintext SQLite
- Encrypted local JSON
