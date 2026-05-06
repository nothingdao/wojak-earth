# Issue #29: Architecture: split vault instruction kit

- Source: https://github.com/nothingdao/astrds/issues/29
- State: CLOSED
- Labels: proposed, area:onchain, area:frontend, type:design
- Assignees: none
- Created: 2026-04-30T02:00:12Z
- Updated: 2026-04-30T19:51:31Z
- Closed: 2026-04-30T19:51:31Z

## Body

Parent: https://github.com/nothingdao/astrds/issues/23

## Problem

`spaceVault.ts` contains many responsibilities: PDA helpers, IDL provider setup, deposit tx building, claim tx building, ASTRDS mint tx building, game payment, Meteora account parsing, devnet guard, and raw message encoding.

Meanwhile Convex actions separately build ed25519 messages for mint and claim authorization. Those message layouts are part of a critical cross-runtime **interface**, but they are duplicated between frontend/Convex/on-chain expectations.

## Files

- `app/src/lib/spaceVault.ts`
- `app/convex/tokens.ts`
- `app/convex/spaceDepositsActions.ts`
- `programs/space-vault-program/src/lib.rs`
- `tests/space-vault-program.ts`

## Proposed direction

Deepen a **Vault Instruction Kit** module, likely split by domain action: game payment, deposit, claim, ASTRDS mint, liquidity. Also isolate shared message encoding semantics so Convex and frontend cannot drift.

## Benefits

- **Locality**: PDA seeds, discriminators, and ed25519 message layouts stop scattering.
- **Leverage**: claim/mint/deposit callers use smaller action-specific modules.
- Testability improves with golden tests for message bytes and PDA derivations.

## Open questions

- Which parts can safely live in shared TypeScript, given Convex/browser/runtime constraints?
- Should message encoding have golden vectors checked against Rust tests?
- Should Meteora-specific helpers be separate from core vault instructions?


## Comments

### whaleen — 2026-04-30T19:51:29Z

Implemented the scoped Vault Instruction Kit slice: shared authorization message encoding.

Done-enough criteria for this issue were intentionally scoped to the highest-risk drift point: ed25519 message layouts shared across Convex and frontend.

Changes:

- Added `shared/vault/messages.ts`
  - `buildClaimAuthorizationMessage`
  - `buildMintAstrdsAuthorizationMessage`
  - `sessionIdToBytes`
- Updated `app/convex/tokens.ts`
  - uses shared mint authorization message encoding
  - uses shared session ID byte conversion
- Updated `app/convex/spaceDepositsActions.ts`
  - uses shared claim authorization message encoding
- Updated `app/src/lib/spaceVault.ts`
  - browser transaction builders use the same shared encoders
  - existing exported compatibility helpers remain in place
- Added `app/src/game/vaultMessages.test.ts`
  - golden byte layout tests for claim and mint authorization messages
  - zero-padded/truncated session ID behavior test

Validation:

- `pnpm --dir app test` ✅
- `pnpm --dir app build` ✅
- `pnpm --dir server build` ✅
- `pnpm --dir server test` ✅
- `cd app && pnpm exec convex codegen` ✅
- `npm run lint` ✅

Pushed to `main`:

- `b9916dc refactor: centralize vault authorization messages`

Not included in this scoped slice:

- Splitting all transaction builders from `spaceVault.ts`
- Meteora helper extraction
- Rust-side golden tests

Those can be separate follow-ups if needed.


### whaleen — 2026-04-30T19:51:31Z

Closing as the scoped high-risk authorization-message drift has been centralized and tested on main.
