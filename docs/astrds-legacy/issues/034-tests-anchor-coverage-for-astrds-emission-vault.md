# Issue #34: Tests: Anchor coverage for ASTRDS emission vault

- Source: https://github.com/nothingdao/astrds/issues/34
- State: OPEN
- Labels: none
- Assignees: none
- Created: 2026-05-01T01:13:53Z
- Updated: 2026-05-01T09:25:14Z

## Body

Parent: #33, follow-up to #31

## Summary

Add deterministic Anchor/local-validator tests for the new fixed-supply ASTRDS emission vault flow.

## Scope

Cover initialize_emission_vault, settle_game, and claim_astrds:

- initialize stats/vault reserve
- earned < allocated burns difference
- earned == allocated burns zero
- earned > allocated rejected
- allocated > 50 ASTRDS rejected
- duplicate settlement rejected
- invalid signature rejected
- vault balance decreases by allocated_raw
- player claimable increases by earned_raw
- mint supply decreases by burned_raw
- full/partial/over-claim paths
- player ATA init if needed

## Acceptance criteria

- `anchor test` covers the emission-vault instructions above.
- Tests are local-validator deterministic.
- No devnet, Convex, or smoke-script dependency.


## Comments

### whaleen — 2026-05-01T09:25:14Z

Implemented emission-vault Anchor coverage in tests/space-vault-program.ts and added a local ASTRDS mint fixture. Also added an over-allocation guard in settle_game so already-earned-but-unclaimed reserve cannot be allocated again. Validation: anchor test passes (14 passing, 4 pending env/skipped tests). Reviewer subagent found no blockers.
