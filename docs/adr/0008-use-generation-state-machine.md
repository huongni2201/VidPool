# ADR-0008: Use Explicit Generation State Machine

Date: 2026-09-16  
Status: Accepted

## Context

A single PROCESSING state is insufficient for debugging, recovery, and UI status.

## Decision

Use explicit states such as QUEUED, SUBMITTING, REMOTE_PROCESSING, DOWNLOADING, POST_PROCESSING, COMPLETED, RETRY_WAIT, FAILED, and CANCELLED.

## Consequences

### Positive

- Clear recovery behavior
- Better diagnostics
- More informative UI

### Negative

- More state transitions to test

## Alternatives Considered

- PENDING/PROCESSING/SUCCESS/FAILED only
