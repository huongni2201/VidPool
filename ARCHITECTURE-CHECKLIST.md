# Architecture Checklist

Run this checklist before merging backend changes.

## Ownership

- [ ] The change has one clear primary owning module.
- [ ] No new global business `services/` dumping ground was introduced.
- [ ] Cross-module access uses explicit contracts.

## Dependencies

- [ ] Domain does not import API or infrastructure.
- [ ] Application does not import concrete providers/repositories/renderers.
- [ ] Infrastructure implements application-owned ports.
- [ ] ORM models stay in infrastructure.
- [ ] Composition root owns concrete wiring.

## Durable Work

- [ ] Long-running work is represented by a durable job.
- [ ] Durable state exists before an external operation when recovery requires it.
- [ ] Job claim is atomic.
- [ ] Retry/recovery behavior is explicit.
- [ ] Ambiguous remote submission does not cause blind resubmission.

## Source of Truth

- [ ] No duplicate mutable source of truth was introduced.
- [ ] AI output remains candidate data until validation/merge.
- [ ] User locks are preserved.
- [ ] Aligned audio remains master timing source.
- [ ] Timeline remains editing source of truth.

## Provider Boundaries

- [ ] Provider-specific payloads remain inside adapters.
- [ ] Internal provider/model keys remain stable.
- [ ] Provider errors are normalized.
- [ ] Provider credentials are not exposed to frontend.

## Persistence

- [ ] SQLAlchemy entities are not used as domain entities.
- [ ] Multi-write operations have a transaction boundary.
- [ ] Media binaries remain on filesystem.
- [ ] Secrets remain in OS credential storage.

## Testing

- [ ] Business invariants have unit tests.
- [ ] Application handlers are tested with fake ports.
- [ ] Repository behavior has persistence tests where applicable.
- [ ] Provider mapping/error behavior has contract tests.
- [ ] Architecture import rules are tested.
- [ ] Bug fixes include regression tests when feasible.

## Documentation

- [ ] `docs/CURRENT_STATUS.md` matches implementation reality.
- [ ] No removed behavior remains described as current.
- [ ] An ADR was added/superseded if a major architecture decision changed.
