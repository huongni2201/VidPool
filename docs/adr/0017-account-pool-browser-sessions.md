# ADR-0017: Account Pool uses isolated persistent browser profiles

Date: 2026-09-17
Status: Accepted

## Context

VidPool needs a no-setup account login flow for browser-backed providers.
Users should log in normally and keep the session across app restarts.

## Decision

- Account metadata and lease state live in SQLite.
- Browser session state lives in a dedicated persistent Chromium profile.
- Playwright is an infrastructure adapter.
- Windows uses Microsoft Edge first and Google Chrome as fallback.
- Every account receives an isolated profile.
- Account Pool does not store provider passwords.
- `BUSY` is derived from active lease state, not persisted on the account.
- Rate-limit/quota failures do not automatically fail over to another account.

## Consequences

- Session survives app restart without cookie export/import.
- Browser automation remains provider-infrastructure detail.
- Profile directories are sensitive local data.
- Playwright packaging must be verified with PyInstaller.
