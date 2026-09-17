# 07 — AI Story Continuity Rules

## Primary Rule

The LLM is not project memory.

The database is project memory.

## Canonical Story Memory

Persist:

- Story Bible
- Global Story Summary
- Character Profiles
- Character States
- Character Evolution Timeline
- Relationship Graph
- Location Profiles
- World State
- Event Ledger
- Open Plot Threads
- Item State
- Style Bible

## Context Resolver

Do not send the entire project to the LLM by default.

For each task, resolve only relevant context.

Example:

```text
Current Scene
+ involved characters
+ current character states
+ location
+ relevant prior events
+ relevant open plot threads
+ world constraints
+ style bible
```

## Multi-Pass Analysis

Prefer:

```text
Pass 1: chapter understanding
Pass 2: scene segmentation
Pass 3: entity/state extraction
Pass 4: visual beat generation
Pass 5: continuity validation
```

over one giant "generate everything" prompt.

## Event Ledger

Persist meaningful events with:

- chapter
- scene
- entities
- event type
- canonical description
- resulting state changes

## Open Plot Threads

Track unresolved narrative threads explicitly.

## Continuity Validation

Before committing AI state updates, validate against canonical state.

Flag conflicts such as:

- dead character appears alive without explanation
- destroyed weapon becomes intact
- wrong outfit evolution
- impossible location transition
- relationship contradiction
- world-rule violation

## AI Mutation Rule

AI may propose state changes.

AI may not silently overwrite canonical data.

## Original Text

Never overwrite source novel text.

Store transformed narration separately.

## Story Summary

Summaries are retrieval aids, not authoritative replacements for the Event Ledger and state model.
