# Issue #35: Tests: Vitest coverage for emission claim-path and settlement derivation

- Source: https://github.com/nothingdao/astrds/issues/35
- State: OPEN
- Labels: none
- Assignees: none
- Created: 2026-05-01T01:14:02Z
- Updated: 2026-05-01T01:14:02Z

## Body

Parent: #31, related: #33

## Summary

Add fast Vitest coverage for the TypeScript pieces of the emission-vault claim flow.

## Scope

- Extract claim-path decision logic from `ASTRDSMinting.tsx` into a pure helper.
- Test that claim-only is selected when on-chain `PlayerEmission.claimableRaw` is sufficient.
- Test that settle+claim is selected when no sufficient on-chain claimable balance exists.
- Extract settlement amount/allocation validation/derivation from Convex-adjacent code where practical.
- Test allocation cap, earned <= allocated, raw amount parsing, and fallback defaults.

## Acceptance criteria

- Tests run under Vitest, preferably app harness for shared/client logic.
- `npm run test:ts` passes.
- Component logic becomes thinner and less drift-prone.

