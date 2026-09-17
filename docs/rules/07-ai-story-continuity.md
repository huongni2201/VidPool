# 07 — AI Story Continuity Rules

## Primary Rule

The LLM is not project memory.

The database is project memory.

## Persist

- StoryBible
- GlobalStorySummary
- CharacterProfile
- CharacterState
- CharacterEvolution
- RelationshipGraph
- LocationProfile
- WorldState
- EventLedger
- OpenPlotThread
- ItemState
- StyleBible

## ContextResolver

Send relevant context, not the entire project by default.

## Multi-Pass Analysis

```text
1 Chapter Understanding
2 Scene Segmentation
3 Entity / State Extraction
4 Visual Beat Generation
5 Continuity Validation
```

## Original Text

Never overwrite source story text.

Store spoken/adapted narration separately.

Summaries aid retrieval; they do not replace canonical event/state records.
