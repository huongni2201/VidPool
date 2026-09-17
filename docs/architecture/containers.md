# Container / Runtime Architecture

## Desktop Shell

Tauri:

- creates application window
- starts/stops FastAPI sidecar
- handles OS integrations
- opens files/folders
- owns desktop lifecycle

It does not own core business logic.

## Frontend

React/Vite:

- project UI
- storyboard
- asset previews
- timeline controls
- generation controls
- settings
- SSE subscriptions

## Backend

FastAPI exposes local REST/SSE contracts.

## Application Layer

Coordinates use cases and workflows.

## Domain Layer

Owns business concepts and invariants.

## Worker

Processes durable jobs from SQLite.

## Persistence

SQLite stores structured state.

Filesystem stores media.

OS keyring stores secrets.

## Providers

Provider adapters integrate:

- LLM
- translation
- image
- video
- TTS
- local engines

## Media Pipeline

Handles:

- download
- validation
- probing
- transcoding
- thumbnails
- audio mixing
- rendering
