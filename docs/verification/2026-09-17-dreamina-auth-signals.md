# Dreamina Authentication Signal Verification

**Date:** 2026-09-17
**Provider:** Dreamina
**Workspace URL:** https://dreamina.capcut.com/tools/ai-video-generator

## Logged-out observation

- final URL: https://dreamina.capcut.com/tools/ai-video-generator
- trusted logged-out signal: document.getElementById('__GTW_USER_ID__') with {"GATEWAY_INJECTED_USER_ID":"0"}, and presence of visible 'Sign in' button
- signal type: provider-owned DOM value / ARIA / button text
- why it is not secret: Gateway user ID '0' is an unauthenticated guest indicator; button text 'Sign in' is standard public UI text
- survives reload: yes

## Logged-in observation

- final URL: https://dreamina.capcut.com/tools/ai-video-generator
- trusted logged-in signal: document.getElementById('__GTW_USER_ID__') with numeric GATEWAY_INJECTED_USER_ID != "0", and [data-testid="user-avatar"], [aria-label*="account" i]
- signal type: provider-owned DOM value / data attribute / ARIA
- contains secret material: no
- survives reload: yes

## Identity observation

- display-name source: [data-testid="user-name"] text content, with fallback to "Dreamina User " + external_identity
- external-identity source: GATEWAY_INJECTED_USER_ID numeric identifier from __GTW_USER_ID__
- why external identity is stable: It is the internal account gateway user ID assigned permanently by ByteDance/CapCut backend
- token/cookie/storage secret used: no

## Rejected heuristics

- wildcard CSS classes
- nth-child selectors
- generated CSS class names
- cookie values
- access/refresh tokens
- localStorage/sessionStorage credential values
