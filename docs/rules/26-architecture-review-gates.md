# 26 — Architecture Review Gates

## Gate 1 — Ownership

Can the reviewer name the domain module that owns this change?

If not, stop and clarify ownership.

## Gate 2 — Boundary

Does any domain/application code depend on a concrete technical implementation?

If yes, introduce or use the correct port.

## Gate 3 — Source of Truth

Did this change create duplicate mutable representations of the same concept?

If yes, choose one canonical owner.

## Gate 4 — Replaceability

Could the current provider/database/renderer be replaced without rewriting domain behavior?

If no, the boundary is leaking.

## Gate 5 — Recovery

Can a long-running operation recover after process restart?

If no, do not merge durable workflow code.

## Gate 6 — User Control

Can AI overwrite user-approved or locked data?

If yes, block the change.

## Gate 7 — Testing

Are the business rule and architecture boundary testable and tested?

If no, improve design before merge.

## Gate 8 — Complexity

Did this change introduce infrastructure or abstraction that the current product does not need?

If yes, simplify.

## Gate 9 — Cleanup

Did the change leave obsolete code/docs/config behind?

If yes, remove them before completion.

## Gate 10 — ADR

Does this alter an accepted architectural decision?

If yes, create/supersede an ADR.
