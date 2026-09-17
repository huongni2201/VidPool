# Architecture Checklist

Use this checklist before merging backend changes.

## Ownership

- [ ] The change has one clear primary owning module.
- [ ] No global business `services/` dumping ground was introduced.
- [ ] Cross-module access uses explicit contracts.
- [ ] No module imports another module's ORM models.

## Dependencies

- [ ] Domain imports only domain-safe code.
- [ ] Application depends on domain and ports, not concrete infrastructure.
- [ ] Infrastructure implements ports.
- [ ] API calls application use cases only.
- [ ] Worker reuses application use cases instead of duplicating business logic.
- [ ] Composition root owns concrete wiring.

## Durable Work

- [ ] Long-running work is persisted as a durable job.
- [ ] Durable state exists before external execution when recovery requires it.
- [ ] Job claim is atomic.
- [ ] Retry is idempotent where possible.
- [ ] Ambiguous remote submission does not cause blind resubmission.
- [ ] Recovery after restart is defined.

## Source of Truth

- [ ] No duplicate mutable source of truth was introduced.
- [ ] AI output remains candidate data until validated.
- [ ] User locks are preserved.
- [ ] Aligned audio remains the timing source once available.
- [ ] Timeline remains editing source of truth.
- [ ] RenderPlan is derived from Timeline.

## Providers

- [ ] Provider payloads remain inside adapters.
- [ ] Stable internal provider/model keys are used.
- [ ] Provider errors are normalized.
- [ ] Frontend never receives provider secrets.
- [ ] Provider capability differences are represented as metadata.

## Persistence

- [ ] ORM entities are not used as domain entities.
- [ ] Mapping is explicit.
- [ ] Multi-write operations have a transaction boundary.
- [ ] Media binaries remain on filesystem.
- [ ] Secrets remain in OS credential storage.
- [ ] Deletes respect active references.

## Story Continuity

- [ ] CharacterProfile and CharacterState remain separate.
- [ ] Long-term evolution is explicit.
- [ ] EventLedger and open plot threads are preserved.
- [ ] AI cannot silently overwrite canonical story state.

## Audio / Timing

- [ ] Source text and spoken text remain separate.
- [ ] Voice identity is stable.
- [ ] Master reference audio is not replaced by generated output.
- [ ] Subtitle timing comes from aligned speech.
- [ ] Silent video tails do not force subtitle extension.

## Testing

- [ ] Business invariants have unit tests.
- [ ] Application handlers use fake ports in tests.
- [ ] Repository behavior has persistence tests when applicable.
- [ ] Provider mapping/error behavior has contract tests.
- [ ] Architecture import rules are tested.
- [ ] Bug fixes include regression tests when feasible.

## Documentation

- [ ] `docs/CURRENT_STATUS.md` matches implementation reality.
- [ ] Removed behavior is not documented as current.
- [ ] Existing accepted ADRs were not deleted or rewritten.
- [ ] Architecture changes add or supersede an ADR.
