# ADR-0006: Use Ports and Adapters for Providers

Date: 2026-09-17
Status: Accepted

## Context

LLM, image, video, TTS, and translation providers can change independently.

## Decision

Application code depends on provider ports; concrete providers live in infrastructure adapters.

## Consequences

### Positive

- Provider replacement is localized
- Domain remains stable
- Local and cloud engines share one boundary

### Negative

- Requires explicit mapping and contracts

## Alternatives Considered

- Direct provider calls from services
- Provider-specific application modules
