# 02 — Domain Modeling

## Core Aggregate Model

```text
Project
├── Chapter
│   ├── Scene
│   │   └── VisualBeat
│   └── AudioSegment
├── StoryBible
├── CharacterProfile
├── CharacterState
├── CharacterEvolution
├── RelationshipGraph
├── LocationProfile
├── WorldState
├── EventLedger
├── OpenPlotThread
├── StyleBible
├── PromptVersion
├── MediaAsset
├── GenerationJob
├── Timeline
├── RenderPlan
└── ExportJob
```

## Character Identity vs State

Never combine stable identity and temporary state.

### CharacterProfile

Stable identity:

- canonical name
- aliases
- face
- hair baseline
- eyes
- body type
- stable visual identity
- master references
- base voice identity

### CharacterState

Mutable context:

- current outfit
- injuries
- weapon currently held
- emotion
- location
- cultivation/power state
- temporary accessories

## Character Evolution

Intentional long-term changes belong in an evolution timeline.

Example:

```text
Chapter 1: novice robe
Chapter 20: scar introduced
Chapter 35: advanced robe
Chapter 60: new weapon
```

This lets the system distinguish intentional evolution from generation drift.

## VisualBeat

A beat is structured intent, not just a prompt string.

Recommended fields:

```text
id
scene_id
source_text
narration_text
dialogue
characters
location_id
action
emotion
camera_shot
camera_angle
camera_movement
composition
lighting
weather
visual_priority
desired_duration
minimum_duration
maximum_duration
transition_in
transition_out
continuity_constraints
generation_strategy
status
```

## Generation Strategy

Supported semantic strategies:

- `TEXT_TO_VIDEO`
- `IMAGE_TO_VIDEO`
- `STILL_IMAGE`
- `REUSE_ASSET`
- `BROLL`

The domain must not store provider-specific strategy codes.

## Entity Identity

Use stable internal IDs.

Do not use names as foreign keys.

Names and aliases may change.

## User Locks

Lockable data must expose lock state explicitly.

Do not infer a lock from absence of changes.

## Candidate vs Canonical Data

AI output is candidate data.

Use:

```text
AI Output
  ↓
Validation
  ↓
Candidate Update
  ↓
Merge Policy
  ↓
Canonical State
```

Never allow an LLM response to overwrite canonical state directly.
