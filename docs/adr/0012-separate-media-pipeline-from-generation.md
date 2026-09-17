# ADR-0012: Separate Media Pipeline from Generation

Date: 2026-09-17
Status: Accepted

## Context

Download, probing, transcoding, thumbnailing, and rendering are not provider responsibilities.

## Decision

Keep media processing in a dedicated media subsystem behind appropriate ports.

## Consequences

### Positive

- Reusable media tooling
- Cleaner provider adapters
- Easier testing

### Negative

- More explicit components

## Alternatives Considered

- Let provider adapters own all media operations
