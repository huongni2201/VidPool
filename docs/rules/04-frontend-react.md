# 04 — Frontend / React Rules

## Technology

Use:

- React
- Vite
- TypeScript
- Tailwind CSS

Do not introduce Next.js unless requirements change to need SSR/SEO/public web serving.

## Structure by Feature

Preferred:

```text
src/
├── app/
├── features/
│   ├── generation/
│   ├── storyboard/
│   ├── characters/
│   ├── timeline/
│   ├── assets/
│   └── settings/
├── shared/
└── services/
```

## Frontend Responsibilities

Frontend may:

- collect user input
- display job progress
- preview media
- edit structured project data through APIs
- manage local UI state
- subscribe to SSE events

Frontend may not:

- hold provider tokens
- call provider APIs directly
- depend on SQLite schema
- embed provider-specific model IDs
- construct provider payloads
- execute FFmpeg directly

## Stable Keys

Frontend uses stable application keys:

```text
provider_key
model_key
voice_profile_id
asset_id
beat_id
```

Never expose remote implementation IDs unless needed for diagnostics.

## Generated Data

Clearly distinguish:

- AI-generated candidate
- user-approved
- locked
- stale/invalidated
- failed

## Destructive Actions

Require explicit user intent for:

- deleting assets
- deleting project
- clearing versions
- replacing locked generation
- resetting character state

## Regeneration

Regenerate only the selected scope.

Frontend should expose dependency impact before broad invalidation when practical.
