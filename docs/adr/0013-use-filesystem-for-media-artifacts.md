# ADR-0013: Use Filesystem for Media Artifacts

Date: 2026-09-16  
Status: Accepted

## Context

Video/audio/image artifacts are large and the application is local-first.

## Decision

Store binary media on the filesystem and only metadata/path references in SQLite.

## Consequences

### Positive

- Efficient media handling
- Simple external inspection
- Avoids huge DB files

### Negative

- Requires path/reference integrity management

## Alternatives Considered

- SQLite BLOB storage
