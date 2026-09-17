# 09 — Audio, Timing & Sync Rules

Once actual TTS audio is aligned, aligned timestamps are the timing source of truth.

```text
Spoken Text
→ TTS
→ Actual Audio
→ Forced Alignment
→ Sentence / Word Timestamps
→ TimingPlan
→ Visual Duration + Subtitle + Timeline
```

Keep:

- `source_text`
- `spoken_text`

separate.

Recurring characters use stable VoiceProfile and master reference audio.

Do not recursively use generated audio as the next master reference.

Subtitle timing derives from aligned speech.

Silent video tails do not require subtitle extension.

Duration mismatch preference:

1. choose closer provider duration
2. split beat
3. merge compatible beats
4. hold frame
5. subtle slow motion
6. safe loop
7. aggressive retime last
