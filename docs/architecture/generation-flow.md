# Generation Flow

## Chapter Processing

```text
Import Chapter
  ↓
Normalize Source
  ↓
Analyze Chapter
  ↓
Scene Segmentation
  ↓
Entity/State Extraction
  ↓
Continuity Validation
  ↓
Visual Beat Creation
```

## Audio-First Flow

```text
Visual Beat / Script
  ↓
Spoken Text
  ↓
TTS
  ↓
WAV
  ↓
Alignment
  ↓
Actual Timestamps
  ↓
Timing Plan
```

## Visual Flow

```text
Timing Plan
  ↓
Context Resolver
  ↓
Prompt Compiler
  ↓
Character/Location References
  ↓
Provider Adapter
  ↓
Generation Job
  ↓
Download
  ↓
Validation
  ↓
Media Asset
```

## Editing Flow

```text
Media Assets
  ↓
Timeline
  ↓
Render Plan
  ↓
Preview Render
  ↓
User Review
  ↓
Final Render
```

## Regeneration

Regenerating one beat invalidates only affected downstream nodes.

Approved or locked unrelated work must remain intact.
