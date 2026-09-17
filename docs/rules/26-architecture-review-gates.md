# 26 — Architecture Review Gates

## Gate 1 — Ownership

Can the owning module be named?

## Gate 2 — Boundary

Does domain/application depend on concrete infrastructure?

## Gate 3 — Source of Truth

Was duplicate mutable state introduced?

## Gate 4 — Replaceability

Can provider/database/renderer be replaced without rewriting domain behavior?

## Gate 5 — Recovery

Can long-running work recover after restart?

## Gate 6 — User Control

Can AI overwrite approved/locked data?

## Gate 7 — Testing

Are the changed rules testable and tested?

## Gate 8 — Complexity

Was unnecessary infrastructure or abstraction introduced?

## Gate 9 — Cleanup

Were obsolete code/docs/config removed?

## Gate 10 — ADR

Did a major architecture decision change?
