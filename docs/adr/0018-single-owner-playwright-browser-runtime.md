# ADR-0018: Playwright runs on a single owner thread

Date: 2026-09-17
Status: Accepted

## Context

VidPool keeps browser-backed provider sessions alive across multiple HTTP
requests using persistent browser profiles.

FastAPI synchronous route handlers may execute on different worker threads.
Playwright synchronous objects must not be shared arbitrarily across threads.

## Decision

- One BrowserRuntime instance exists per VidPool backend process.
- BrowserRuntime owns one dedicated thread.
- Playwright is started on that thread.
- Every BrowserContext and Page is created, accessed, and closed on that thread.
- Calls from application/provider adapters are submitted as commands to the runtime.
- `profile_key` is the stable account/browser identity.
- Browser session IDs are internal runtime details and are not exposed to React.
- Raw Playwright objects never enter domain or application layers.
- Provider-specific browser logic remains in infrastructure adapters.

## Consequences

- Browser actions are serialized safely.
- Account/profile ownership is simpler.
- Session IDs no longer need to cross API boundaries.
- Provider adapters remain replaceable.
- BrowserRuntime becomes shared infrastructure for browser-backed providers.
