# ADR-0010: Store Provider Secrets in OS Keyring

Date: 2026-09-16  
Status: Accepted

## Context

Provider tokens and cookies are sensitive and should not be stored in plaintext SQLite.

## Decision

Store actual secrets in OS credential storage through a SecretStore abstraction. Persist only secret references in SQLite.

## Consequences

### Positive

- Reduces secret exposure
- Database backups do not automatically contain credentials

### Negative

- Requires platform keyring integration

## Alternatives Considered

- Plaintext SQLite
- Encrypted local JSON
