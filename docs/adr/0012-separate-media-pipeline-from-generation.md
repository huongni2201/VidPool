# ADR-0012: Separate Media Pipeline from Provider Integration

Date: 2026-09-16  
Status: Accepted

## Context

Downloading, probing, transcoding, thumbnailing, and rendering are not provider responsibilities.

## Decision

Keep media processing in a dedicated media pipeline separate from generation adapters.

## Consequences

### Positive

- Reusable media tooling
- Cleaner provider adapters
- Easier testing

### Negative

- More modules

## Alternatives Considered

- Provider adapters handle all media work
