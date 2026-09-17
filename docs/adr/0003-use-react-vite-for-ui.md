# ADR-0003: Use React + Vite for UI

Date: 2026-09-16  
Status: Accepted

## Context

The application does not require SSR, SEO, or public server rendering.

## Decision

Use React, Vite, TypeScript, and Tailwind CSS rather than Next.js.

## Consequences

### Positive

- Simpler desktop frontend runtime
- Fast development workflow
- No unnecessary Next.js server

### Negative

- No built-in SSR, which is not needed

## Alternatives Considered

- Next.js
- Native desktop UI toolkit
