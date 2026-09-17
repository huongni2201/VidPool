# ADR-0013: Use Filesystem for Media Artifacts

Date: 2026-09-17
Status: Accepted

## Context

Media files are large and the application is local-first.

## Decision

Store binary media on filesystem and metadata/path references in SQLite.

## Consequences

### Positive

- Efficient media access
- Avoids large DB files
- Easy external inspection

### Negative

- Requires path/reference integrity management

## Alternatives Considered

- SQLite BLOB storage
