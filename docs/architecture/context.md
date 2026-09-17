# System Context

## User

A single local user creates story-video projects.

## System Responsibilities

The application:

- imports and structures story text
- maintains long-term story continuity
- generates narration and dialogue audio
- aligns real audio to timestamps
- plans visual beats
- generates images/video through replaceable providers
- manages assets and versions
- edits a canonical timeline
- renders preview/final video
- validates output quality

## External Systems

Possible external systems include:

- frontier LLM APIs
- translation APIs
- video generation providers
- image generation providers
- TTS providers

Local systems may include:

- VoiceStudio
- WhisperX
- local LLM/embedding models
- local image/video models
- FFmpeg

All external/local engines are treated as providers behind adapters.

## Trust Boundary

Tauri + local backend run on the user's machine.

External provider calls leave the local trust boundary.

Secrets remain in OS credential storage.
