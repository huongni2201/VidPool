# ADR-0006: Use Ports and Adapters for Providers

Date: 2026-09-16  
Status: Accepted

## Context

AI, image, video, translation, and TTS providers can change independently.

## Decision

Application code depends on provider ports. Concrete providers live in infrastructure adapters.

## Consequences

### Positive

- Provider replacement is localized
- Domain remains stable
- Local and cloud engines share the same boundary

### Negative

- Requires explicit interfaces and mapping code

## Alternatives Considered

- Direct provider service calls
- Provider-specific application services
