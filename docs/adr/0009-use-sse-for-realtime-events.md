# ADR-0009: Use SSE for Realtime Updates

Date: 2026-09-17
Status: Accepted

## Context

Frontend primarily needs one-way job/status events.

## Decision

Use SSE as default realtime transport with REST polling fallback.

## Consequences

### Positive

- Simpler than WebSocket
- Fits one-way status flow

### Negative

- Not suited to complex bidirectional realtime messaging

## Alternatives Considered

- WebSocket
- Polling only
