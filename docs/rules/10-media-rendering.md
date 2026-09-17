# 10 — Media & Rendering Rules

Timeline is canonical editing state.

RenderPlan is compiled from Timeline.

FFmpeg commands are not project state.

## Safe Download

```text
remote URL
→ .part
→ validate
→ ffprobe
→ atomic rename
```

## Preview vs Final

Use separate render profiles.

## Audio Mix

Support:

- voice priority
- loudness normalization
- BGM ducking
- fades
- limiter / peak protection

## Post-Render Validation

Validate:

- decodeability
- video duration
- audio duration
- subtitle end
- stream presence
- expected resolution
- A/V drift tolerance
