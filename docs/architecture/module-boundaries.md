# Module Boundaries

## Rule

Each business module owns its concepts and exposes explicit application contracts.

A module must not access another module's concrete infrastructure.

## Ownership

### story

Owns:

- Project story structure
- Chapter
- Scene
- VisualBeat
- StoryBible
- EventLedger
- OpenPlotThread

### characters

Owns:

- CharacterProfile
- CharacterState
- CharacterEvolution
- RelationshipGraph
- character reference metadata

### generation

Owns:

- provider-neutral generation request
- generation lifecycle
- generation phase/state
- generation orchestration contracts

### audio

Owns:

- VoiceProfile
- spoken-text preparation
- TTS request semantics
- pronunciation dictionary
- audio segment metadata

### timing

Owns:

- aligned timestamp model
- TimingPlan
- duration reconciliation policy

### timeline

Owns:

- Timeline
- tracks
- TimelineClip
- editing state
- render-plan compilation inputs

### jobs

Owns:

- durable Job
- queue/claim semantics
- retry/recovery
- dependencies
- idempotency/replay metadata

### media

Owns:

- MediaAsset
- download/validation contracts
- probing/transcoding/thumbnail contracts
- media lineage metadata

### credentials

Owns:

- ProviderCredential metadata
- `secret_ref`
- eligibility/cooldown/auth-expired state

## Cross-Module Rule

Prefer an explicit application contract or query port.

Avoid:

```text
story -> characters SQLAlchemy model
generation -> credentials repository implementation
timeline -> media persistence table
```

## Shared Code

Keep shared/common code very small.

Good shared primitives:

- typed IDs
- Clock protocol
- pagination
- generic Result type

Do not put business concepts in `shared/` merely to avoid deciding ownership.

## Circular Dependencies

Circular imports between business modules mean ownership is unclear.

Fix ownership or introduce a contract. Do not normalize circular imports as acceptable architecture.
