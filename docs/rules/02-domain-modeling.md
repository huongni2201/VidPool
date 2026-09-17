# 02 — Domain Modeling

## Core Concepts

```text
Project
Chapter
Scene
VisualBeat
StoryBible
CharacterProfile
CharacterState
CharacterEvolution
RelationshipGraph
LocationProfile
WorldState
EventLedger
OpenPlotThread
StyleBible
MediaAsset
Job
Timeline
RenderPlan
```

## Identity vs State

Never mix stable character identity with temporary scene state.

## Candidate vs Canonical

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

AI never overwrites canonical state directly.

## Stable IDs

Use stable internal IDs.

Do not use names as foreign keys.

## Locks

Lock state must be explicit.
