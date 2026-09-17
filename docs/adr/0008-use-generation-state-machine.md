# ADR-0008: Use Explicit Generation State

Date: 2026-09-17
Status: Accepted

## Context

A single PROCESSING state is insufficient for recovery and diagnostics.

## Decision

Use a generic JobStatus and a separate generation-specific phase.

## Consequences

### Positive

- Clear recovery behavior
- Better diagnostics
- Better UI progress

### Negative

- More transitions to test

## Alternatives Considered

- One generic PROCESSING state
