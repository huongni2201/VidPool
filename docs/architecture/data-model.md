# Data Model

## Main Entities

```text
Project
ProjectSnapshot

Chapter
Scene
VisualBeat

StoryBible
GlobalStorySummary
EventLedgerEntry
OpenPlotThread
WorldState
ItemState
StyleBible

CharacterProfile
CharacterState
CharacterEvolution
Relationship

LocationProfile
LocationState

PromptVersion

VoiceProfile
PronunciationEntry
AudioSegment
AlignmentResult
TimingPlan

ProviderCredential
ProviderConfiguration
ModelCapability

Job
JobDependency
GenerationAttempt

MediaAsset
AssetVersion
AssetLineage

Timeline
TimelineTrack
TimelineClip

RenderPlan
ExportJob
```

## Aggregate Guidance

| Entity | Owning module | Notes |
|---|---|---|
| Project | project | aggregate root |
| Chapter | story | story structure |
| Scene | story | child of chapter |
| VisualBeat | story | canonical beat intent |
| CharacterProfile | characters | stable identity root |
| CharacterState | characters | mutable contextual state |
| MediaAsset | media | media root |
| Job | jobs | durable workflow root |
| Timeline | timeline | editing root |
| ProviderCredential | credentials | metadata only; secret stored elsewhere |

## Character Separation

### CharacterProfile

Stable identity:

- canonical name
- aliases
- face
- eyes
- hair baseline
- body
- base outfit identity
- master image references
- base voice identity

### CharacterState

Mutable state:

- current outfit
- injury
- emotion
- current weapon
- current location
- temporary accessories
- current power/cultivation state

### CharacterEvolution

Intentional long-term changes by chapter/event.

This prevents intentional evolution from being treated as generation drift.

## VisualBeat

Recommended semantic fields:

```text
id
scene_id
source_text
narration_text
dialogue
characters[]
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
lock_state
```

## Generation Strategy

Provider-neutral values:

- TEXT_TO_VIDEO
- IMAGE_TO_VIDEO
- STILL_IMAGE
- REUSE_ASSET
- BROLL

## Job vs Generation

`Job` is the generic durable workflow entity.

`GenerationAttempt` contains generation-specific remote state.

Do not create separate queue infrastructure for every job type.

## Credential Metadata

SQLite may store:

```text
id
provider_key
label
secret_ref
status
quota_remaining
quota_reset_at
cooldown_until
last_used_at
failure_count
```

Actual secret material is stored in OS credential storage.

## Lineage

Every generated artifact should be traceable to:

- project
- beat/version
- source asset references
- provider
- model key
- remote model ID if useful for diagnostics
- prompt version
- parameters
- reference assets
- job ID
- attempt ID
- timestamp
- content hash

## Snapshot

Snapshots capture structured state references and version pointers.

Do not duplicate large binary media by default.
