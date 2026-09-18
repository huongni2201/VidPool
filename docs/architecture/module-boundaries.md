# Module Boundaries

## project

Owns:

- Project
- project settings
- project manifest
- snapshots
- project lifecycle

## story

Owns:

- Chapter
- Scene
- VisualBeat
- StoryBible
- GlobalStorySummary
- EventLedger
- OpenPlotThread
- WorldState
- ItemState
- StyleBible

## characters

Owns:

- CharacterProfile
- CharacterState
- CharacterEvolution
- RelationshipGraph
- character master references

## generation

Owns:

- provider-neutral generation request
- generation phase
- generation orchestration contracts
- generation lineage inputs

## audio

Owns:

- VoiceProfile
- PronunciationDictionary
- spoken text
- TTS request semantics
- AudioSegment

## timing

Owns:

- alignment output
- TimingPlan
- duration reconciliation
- subtitle timing source

## timeline

Owns:

- Timeline
- tracks
- TimelineClip
- editing state
- RenderPlan compilation inputs

## jobs

Owns:

- Job
- JobStatus
- queue/claim
- retries
- leases
- dependencies
- recovery
- idempotency metadata

## media

Owns:

- MediaAsset
- download
- probing
- transcoding
- thumbnailing
- media validation
- artifact lineage metadata

## accounts

Owns:

- ProviderAccount
- AccountStatus
- AccountLease
- provider identity
- authentication/session state
- persistent browser profile reference
- account eligibility
- cooldown
- login/relogin lifecycle
- provider auth registry

## credentials

Only introduce/retain this module for non-browser secrets such as:
- API key references
- OS-keyring secret references
- secret rotation metadata

Browser-authenticated provider accounts belong to `accounts`, not `credentials`.

## Cross-Module Rule

Modules interact through explicit application contracts or ports.

Forbidden examples:

```text
story -> characters SQLAlchemy model
generation -> credentials repository implementation
timeline -> media ORM table
```

## Shared Code

Keep shared code minimal.

Good shared primitives:

- typed IDs
- Clock protocol
- pagination
- generic Result

Do not move business concepts to `shared/` to avoid choosing an owner.
