# Data Model

## Main Entities

```text
Project
Chapter
Scene
VisualBeat
StoryBible
CharacterProfile
CharacterState
CharacterEvolution
Relationship
LocationProfile
WorldState
EventLedgerEntry
OpenPlotThread
StyleBible
PromptVersion
VoiceProfile
AudioSegment
TimingPlan
MediaAsset
GenerationJob
Timeline
TimelineClip
RenderPlan
ExportJob
ProjectSnapshot
```

## Relationships

```text
Project
  ├── Chapters
  ├── Characters
  ├── Locations
  ├── StoryBible
  ├── StyleBible
  ├── Assets
  └── Timeline

Chapter
  └── Scenes

Scene
  └── VisualBeats

VisualBeat
  ├── PromptVersions
  ├── AudioSegments
  ├── MediaAssets
  └── GenerationJobs
```

## Lineage

Every generated media asset should be traceable to:

- beat/version
- provider
- model
- prompt version
- input references
- generation parameters
- job ID
- timestamp

## Snapshot

Project snapshots capture structured state references.

Snapshots do not duplicate large media by default.
