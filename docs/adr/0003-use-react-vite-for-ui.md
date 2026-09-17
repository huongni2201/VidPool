# ADR-0003: Use React + Vite for UI

Date: 2026-09-17
Status: Accepted

## Context

The desktop UI does not require SSR, SEO, or public server rendering.

## Decision

Use React, Vite, TypeScript, and Tailwind CSS.

## Consequences

### Positive

- Simple desktop frontend runtime
- Fast development workflow

### Negative

- No SSR, which is not required

## Alternatives Considered

- Next.js
- Native desktop UI
