# Issue #23: Architecture review: deepening opportunities

- Source: https://github.com/nothingdao/astrds/issues/23
- State: CLOSED
- Labels: proposed, type:audit
- Assignees: none
- Created: 2026-04-30T01:59:27Z
- Updated: 2026-04-30T19:57:49Z
- Closed: 2026-04-30T19:57:49Z

## Body

## Summary

Architecture scan surfaced eight **deepening opportunities**: refactors that can turn shallow modules into deeper modules with better **locality**, **leverage**, testability, and AI-navigability.

This is the umbrella issue. Use child issues for design discussion and implementation planning.

## Review vocabulary

- **Module**: anything with an interface and an implementation.
- **Interface**: everything callers must know to use the module correctly: types, invariants, ordering, error modes, config, etc.
- **Depth**: leverage at the interface; deep modules hide a lot of behavior behind a small interface.
- **Seam**: where an interface lives.
- **Adapter**: a concrete thing satisfying an interface at a seam.
- **Locality**: change, bugs, and knowledge concentrated in one place.
- **Leverage**: more capability per unit of interface callers must learn.

## Child issues

- #24 — Architecture: paid game intake module
- #25 — Architecture: deepen game runtime behind WebSocket seam
- #26 — Architecture: extract client snapshot effects presenter
- #27 — Architecture: deepen Space Token pool ledger
- #28 — Architecture: create shared game config contract
- #29 — Architecture: split vault instruction kit
- #30 — Architecture: preserve simulation interface while adding internal seams
- #31 — Architecture: add test harnesses for high-leverage modules

## Candidates

1. Paid game intake module
2. Game runtime behind WebSocket seam
3. Client snapshot effects presenter
4. Space Token pool ledger
5. Shared game config contract
6. Vault instruction kit
7. Simulation internal seams while preserving external interface
8. Test harnesses for high-leverage modules

## Notes

These are design candidates, not pre-approved implementation plans. Each child issue should go through a short design/grilling loop before code changes.


## Comments

### whaleen — 2026-04-30T19:57:47Z

Architecture review complete.

Child issues completed/closed:

- #24 — Paid game intake module
- #25 — Game runtime behind WebSocket seam
- #26 — Client snapshot effects presenter
- #27 — Space Token pool ledger
- #28 — Shared game config contract
- #29 — Vault instruction kit / shared authorization messages
- #30 — Simulation internal collision seam
- #31 — High-leverage app/server test harnesses
- #32 — Atomic paid game intake follow-up

All scoped architecture issues from this review have been worked through, validated, pushed to `main`, and closed.


### whaleen — 2026-04-30T19:57:48Z

Closing umbrella: all architecture review child issues have been completed or split and completed.
