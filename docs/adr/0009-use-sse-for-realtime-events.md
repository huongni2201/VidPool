# ADR-0009: Use Server-Sent Events for Realtime Updates

Date: 2026-09-16  
Status: Accepted

## Context

Frontend mostly needs one-way job/status events from backend.

## Decision

Use SSE as the default realtime mechanism and keep REST polling as fallback.

## Consequences

### Positive

- Simpler than WebSocket
- Fits one-way event flow

### Negative

- Not suitable for complex bidirectional realtime messaging

## Alternatives Considered

- WebSocket
- Polling only
