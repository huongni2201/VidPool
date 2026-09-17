# System Context

## User

A single local user creates and edits story-video projects.

## Responsibilities

VidPool:

- imports story text
- normalizes and structures chapters/scenes/beats
- maintains long-term story continuity
- manages character and location references
- generates narration/dialogue audio
- aligns real audio to timestamps
- plans visual beats
- generates images/video through replaceable providers
- manages assets and versions
- builds an editable timeline
- renders preview/final video
- validates final output

## External Integrations

Possible integrations include:

- frontier LLM APIs
- translation APIs
- image generation providers
- video generation providers
- TTS providers
- local LLM/embedding engines
- local image/video engines
- VoiceStudio
- WhisperX
- FFmpeg / ffprobe
- OS credential storage
- filesystem

All external/local integrations are accessed through explicit ports and adapters when they represent a replaceable technical boundary.

## Trust Boundary

Tauri, React, FastAPI, SQLite, and local media run on the user's machine.

Calls to remote providers leave the local trust boundary.

Provider secrets remain in OS credential storage.
