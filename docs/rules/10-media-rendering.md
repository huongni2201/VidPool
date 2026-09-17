# 10 — Media & Rendering Rules

## Timeline Is Canonical

Timeline data is the editing source of truth.

FFmpeg commands are compiled output, not project state.

## Timeline Model

Support logical tracks such as:

- video
- voice
- BGM
- SFX
- subtitle

## TimelineClip

Recommended semantic fields:

```text
asset_id
start
end
source_in
source_out
speed
volume
transition
transform
```

## Render Plan

Compile Timeline into a `RenderPlan`.

The renderer consumes the RenderPlan.

## Download Safety

Use:

```text
remote URL
  ↓
temporary .part file
  ↓
download complete
  ↓
validate size/content
  ↓
ffprobe
  ↓
atomic rename
```

Never publish a partially downloaded file as a valid asset.

## FFprobe

Validate at minimum where relevant:

- decodeability
- duration
- resolution
- streams
- codec metadata

## Preview vs Final

Use separate render profiles.

Preview may prioritize speed and lower resolution.

Final render prioritizes quality.

## Audio Mixing

Voice has highest intelligibility priority.

Support:

- loudness normalization
- BGM ducking
- fades
- limiter/peak protection

## Post-Render Validation

After render, validate:

- video duration
- audio duration
- subtitle end
- stream presence
- decodeability
- expected resolution
- A/V drift tolerance

Do not mark export successful until validation passes.
