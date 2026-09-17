# 09 — Audio, Timing & Sync Rules

## Master Clock

Once real TTS audio exists and is aligned, actual aligned audio timestamps become the timing source of truth.

## Pipeline

```text
Spoken Text
  ↓
TTS
  ↓
Actual Audio
  ↓
Forced Alignment
  ↓
Sentence / Word Timestamps
  ↓
Timing Plan
  ↓
Visual Duration + Subtitle + Timeline
```

## Never Use Estimated Timing After Alignment

Do not prefer:

- estimated text duration
- manual beat duration
- provider video duration
- generated subtitle guess

over aligned audio timestamps.

## Spoken Text vs Source Text

Keep both:

- `source_text`
- `spoken_text`

Never overwrite source text during TTS normalization.

## Voice Identity

Each recurring character/narrator must have a stable voice profile.

Lock:

- provider/engine
- model version where practical
- master reference audio
- core voice settings

## Emotion

Voice identity stays stable.

Emotion/state may vary separately.

## Reference Audio

Always derive recurring voice generations from the stable master reference.

Do not recursively use generated output as the next master reference.

## Alignment

Alignment output must reference the exact generated audio artifact.

## Subtitle

Subtitle timing derives from aligned speech.

Subtitles do not need to fill silent video tails.

## Duration Planning

Preferred order when visual duration does not match narration:

1. choose a provider-supported duration close to target
2. split visual beat
3. merge compatible beats
4. hold frame
5. subtle slow motion
6. safe loop
7. aggressive retiming as last resort
