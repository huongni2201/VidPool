# Dependency & Invalidation Model

## Goal

Regeneration should invalidate only affected downstream work.

## Examples

### Prompt changed

Invalidate:

```text
selected visual generation
preview render
final render
```

Do not invalidate:

```text
story analysis
TTS
alignment
unrelated beats
```

### Narration changed

Invalidate:

```text
spoken text
TTS
alignment
TimingPlan
affected visual duration plan
subtitle
timeline timing
renders
```

### Subtitle style changed

Invalidate:

```text
preview render
final render
```

Do not regenerate audio or video.

### Character identity changed

Invalidate affected:

```text
character reference derivatives
visual prompts
visual assets
renders
```

Do not automatically invalidate unrelated characters.

## Locks

Locked nodes stop automatic overwrite.

Invalidation may mark a locked downstream result as `STALE`, but must not replace it automatically.

## Dependency Graph

Dependencies should be explicit enough that invalidation can be computed rather than hard-coded across routes/services.
