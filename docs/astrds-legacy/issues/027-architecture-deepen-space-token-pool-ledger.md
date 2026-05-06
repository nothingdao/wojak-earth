# Issue #27: Architecture: deepen Space Token pool ledger

- Source: https://github.com/nothingdao/astrds/issues/27
- State: CLOSED
- Labels: proposed, area:onchain, area:frontend, type:design
- Assignees: none
- Created: 2026-04-30T02:00:09Z
- Updated: 2026-04-30T19:47:21Z
- Closed: 2026-04-30T19:47:21Z

## Body

Parent: https://github.com/nothingdao/astrds/issues/23

## Problem

Tokens in Space have a rich lifecycle:

`pending_verification → active → spawned → collected → claiming → claimed/depleted/reconciled`

But those rules are distributed across Convex mutations/actions, frontend claim/deposit UI, server spawn logic, webhook handling, and chain transaction builders.

There is already a real **seam** between Convex and chain, but the Convex-side **interface** is broad: many callers know about deposit IDs, stale deposit fallback, status strings, claim reservation, pool balance reconciliation, and spawn ticket rules.

## Files

- `app/convex/spaceDeposits.ts`
- `app/convex/spaceDepositsActions.ts`
- `app/convex/webhookHandlers.ts`
- `app/convex/vaultHealth.ts`
- `app/src/screens/gameover/SpaceTokenClaim.tsx`
- `app/src/components/space/SendToSpaceOverlay.tsx`
- `app/src/components/account/TokenManager.tsx`
- `app/src/lib/spaceVault.ts`
- `server/src/ws/SessionHandler.ts`

## Proposed direction

Deepen a **Space Token Pool Ledger** module in Convex. It should own pool state transitions, ticket issuance, collection reservation, claim preparation state, and reconciliation semantics. Other modules should ask for domain actions, not patch lifecycle details.

## Benefits

- **Locality**: pool lifecycle bugs concentrate in one module.
- **Leverage**: game server, claim UI, webhook, and vault health tooling reuse the same rules.
- Testability improves because pool lifecycle transitions can be tested without wallet UI or WebSocket simulation.

## Open questions

- What lifecycle transitions should be legal, and which should be impossible?
- Should claim reservation and claim finalization be represented as one ledger operation?
- How should stale deposit fallback be modeled explicitly?


## Comments

### whaleen — 2026-04-30T03:05:56Z

Started implementation with a focused ledger-rules extraction.

Changes:

- Added `app/convex/spaceTokenLedger.ts`
  - centralizes Space Token pool lifecycle/rule helpers:
    - pool status from remaining amount
    - deposit amount validation
    - spawn eligibility by mode (`steady`, `escalating`, `wave`)
    - wave cooldown window calculation
    - spawn ticket ownership/expiry validation
    - pool decrement/next status
    - collection claim reservation/revert transitions
- Updated `app/convex/spaceDeposits.ts` to use ledger helpers for:
  - deposit confirmation amount checks
  - spawn ticket gating
  - token collection ticket validation
  - pool decrement/status transitions
  - reconciliation status transitions
  - claim reservation/revert checks
- Added `app/src/game/spaceTokenLedger.test.ts` covering the ledger interface.

Validation:

- `pnpm --dir app test` ✅
- `pnpm --dir app build` ✅
- `pnpm --dir server build` ✅
- `pnpm --dir server test` ✅
- `cd app && pnpm exec convex codegen` ✅
- `npm run lint` ✅

Pushed to `main`:

- `8e7ba33 refactor: extract space token ledger rules`

This is the first locality/leverage slice: lifecycle decisions are now named and testable. Further work could move claim grouping/reservation from `spaceDepositsActions.ts` behind a deeper ledger interface.


### whaleen — 2026-04-30T19:44:49Z

Continued the ledger extraction into claim preparation.

Changes:

- Extended `app/convex/spaceTokenLedger.ts` with claim grouping helpers:
  - `groupCollectionsByDeposit`
  - `sumCollectionAmounts`
  - `hasClaimableAmount`
- Updated `app/convex/spaceDepositsActions.ts` `prepareClaims` to use the ledger helpers instead of open-coded grouping/summing.
- Added test coverage for collection grouping and claimable amount detection.

Validation:

- `pnpm --dir app test` ✅
- `pnpm --dir app build` ✅
- `cd app && pnpm exec convex codegen` ✅
- `pnpm --dir server test` ✅
- `pnpm --dir server build` ✅
- `npm run lint` ✅

Pushed to `main`:

- `f624f14 refactor: centralize space token claim grouping`


### whaleen — 2026-04-30T19:47:21Z

Closing as implemented for the scoped ledger extraction.

Done-enough criteria met:

- Core Space Token lifecycle rules are centralized in `app/convex/spaceTokenLedger.ts`.
- High-risk Convex paths now use the ledger helpers:
  - deposit amount/status validation
  - spawn ticket gating
  - token collection ticket validation
  - pool decrement/status transitions
  - claim reservation/revert transitions
  - claim grouping/summing
- Ledger rules have focused Vitest coverage.
- All validation passed and changes are on `main`.

Follow-up work, if needed, should be separate issues:

- webhook/vault-health reconciliation module
- frontend claim/deposit presenter modules
- vault transaction kit split (#29)
