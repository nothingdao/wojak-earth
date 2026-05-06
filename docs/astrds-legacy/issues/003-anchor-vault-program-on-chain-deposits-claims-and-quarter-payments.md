# Issue #3: Anchor vault program: on-chain deposits, claims, and quarter payments

- Source: https://github.com/nothingdao/astrds/issues/3
- State: CLOSED
- Labels: none
- Assignees: none
- Created: 2026-04-17T21:28:46Z
- Updated: 2026-04-19T21:59:58Z
- Closed: 2026-04-19T21:59:58Z

## Body

## Overview

Move the token custody, deposit verification, claim execution, and quarter payment verification fully on-chain into a dedicated Anchor program. Convex scope narrows to: game state, spawn tickets (reservation system), and collection tracking. No more off-chain SPL transfers.

## Motivation

- Claims and deposits currently require Convex to stay in sync with chain state — fragile, requires reconciliation cron, drain detection, and trust in off-chain computation
- Quarter payment verification is off-chain (Convex action calling web3.js) — moves into the program
- On-chain claims are verifiable and trustless; off-chain SPL transfers from a hot key are not
- Revenue partitioning (operational / operator cut / buyback) should be transparent and admin-adjustable on-chain

## Architecture

### Separate Repo

The Anchor program lives in its own repo. Deployed to devnet first, then mainnet when stable.

### PDA Structure

```
VaultConfig (singleton PDA)
  - authority: Pubkey           // admin
  - payment_weights: Weights    // operational_bps, operator_bps, buyback_bps (sum = 10000)
  - buyback_rate: u64           // manual until auto-modifier added
  - operational_wallet: Pubkey
  - operator_wallet: Pubkey
  - buyback_wallet: Pubkey

DepositPool (PDA per depositor + mint)
  - depositor: Pubkey
  - mint: Pubkey
  - total_deposited: u64
  - remaining: u64              // decremented as players collect
  - active: bool

ClaimRecord (PDA per claim_id)
  - claim_id: [u8; 32]          // replay protection
  - claimed_at: i64
```

### Instructions

| Instruction | Caller | Description |
|---|---|---|
| `initialize` | admin | Create VaultConfig, set initial weights |
| `set_weights` | admin | Update payment_weights + buyback_rate |
| `register_pool` | depositor | Create DepositPool PDA + vault ATA |
| `deposit` | depositor | Transfer SPL tokens into vault ATA, increment pool totals |
| `claim` | player | Verify Convex authority signature, decrement pool, transfer to player, write ClaimRecord |
| `game_payment` | player | Accept ~0.25 SOL quarter payment, split per VaultConfig weights |

### Revenue Partitioning

Quarter payments (~0.25 SOL) split on-chain at `game_payment` execution:

- **operational_bps** → operational wallet (server costs, etc.)
- **operator_bps** → operator wallet (revenue)
- **buyback_bps** → buyback wallet (manual $ASTRDS buyback pressure initially)

Weights are basis points, must sum to 10000. Admin-adjustable via `set_weights`.

No depositor earnings. No prize pool. Depositors are sponsors — tokens go to players.

### Claim Authorization

Convex remains the reservation system:
1. Player collects space tokens in-game → Convex records collection, decrements pool balance (serialized mutation, race-safe)
2. On game over, Convex authority keypair signs `{player, pool_id, amount, claim_id, expiry}`
3. Player submits signed message + `claim` instruction to program
4. Program verifies signature against known Convex authority pubkey, checks ClaimRecord PDA for replay, transfers tokens, writes ClaimRecord

Convex pool balance is always ≤ vault balance. Convex never holds or transfers tokens.

### Quarter Payment Verification

Currently: Convex action calls RPC to verify tx, then grants session.

After: `game_payment` instruction IS the quarter payment. Frontend submits the instruction, gets a tx signature, session is granted on confirmation. No off-chain verification step needed.

## What Convex Keeps

| Responsibility | Stays in Convex |
|---|---|
| Game state (scores, sessions, chat) | Yes |
| Spawn ticket issuance (which tokens appear in which game) | Yes |
| Collection recording (player collected X from pool Y) | Yes |
| Claim authorization (sign claim messages) | Yes |
| Pool display data (what's available in space) | Yes |

## What Moves On-Chain / Gets Removed from Convex

| Current Convex Responsibility | Fate |
|---|---|
| `registerDepositIntent` | → `register_pool` instruction |
| `submitDepositTransaction` | → `deposit` instruction |
| `verifyAndConfirmDeposit` action | Removed — vault ATA is the source of truth |
| `reconcileAllPools` cron | Removed — program state is authoritative |
| Drain detection (webhook outbound tx check) | Removed — no outbound from Convex |
| Raw SPL transfers from authority keypair | Removed — program handles all token movement |
| Quarter payment verification action | Removed — `game_payment` instruction replaces it |

## Migration

Existing `spaceDeposits` pools in Convex need migration:
- Export current pool state (depositor, mint, remaining)
- Admin calls `register_pool` + `deposit` for each to recreate on-chain
- Convex pool records updated to reference on-chain DepositPool PDAs
- Existing dev-seed deposits (txSignature starts with `dev-seed-`) are test data — can be dropped

## Out of Scope (this issue)

- Auto-modifier for buyback rate
- Additional revenue pools beyond operational + operator + buyback
- Mainnet deployment
- $ASTRDS token mint authority moving into the vault (separate issue if desired)

## References

- Current off-chain claim flow: `convex/spaceDepositsActions.ts`
- Current deposit flow: `src/components/space/SendToSpaceOverlay.tsx` + `src/lib/tokenTransfer.ts`
- Current payment verification: `convex/verifyPayment.ts`
- Convex reservation pattern: `collectFromDeposit` mutation in `convex/spaceDeposits.ts`

## Comments

### whaleen — 2026-04-19T21:59:52Z

## Shipped

The on-chain vault program (`programs/space-vault-program`) is deployed to devnet at `4bRZK8XfziVhLCgvtRdFJyTgN6tXGSPJT8xfbtt1AxBB`. All instructions from this spec are live.

### What shipped as described

- `VaultConfig`, `DepositPool`, `ClaimRecord` PDA structure — exact match
- All six instructions: `initialize`, `set_weights`, `register_pool`, `deposit`, `claim`, `game_payment`
- Revenue partitioning in `game_payment` — operational / operator / buyback split on-chain
- ed25519 claim authorization: Convex signs `{player, pool_id, amount, claim_id, expiry}`, program verifies against `VaultConfig.convexAuthority`, writes `ClaimRecord` for replay protection
- Convex responsibilities unchanged: spawn ticket issuance, collection recording, claim signing, pool display data
- Deposit flow: `register_pool` + `deposit` instructions on-chain; tokens go to DepositPool PDA's vault ATA (not treasury wallet)
- Program lives in this monorepo under `programs/` rather than a separate repo

### What changed from the spec

- **`verifyAndConfirmDeposit` action kept** — reads `tx.meta` to set the authoritative on-chain amount in Convex. Needed because `confirmDepositFromChain` mutation accepts client-supplied amounts that get overridden by this action. Useful, not fragile.
- **`reconcileAllPools` cron kept** — now reconciles Convex `remainingAmount` against the on-chain DepositPool PDA's `remaining` field (not treasury ATA balance). Still valuable on devnet where Helius webhooks are unreliable.
- **Drain detection kept** — webhook outbound check against `claims` table still useful for catching unexpected outbound transfers.
- **`registerDepositIntent` kept in Convex** — creates the pending Convex record before the on-chain tx; `buildSendToSpaceTransaction` includes `register_pool` automatically when the PDA doesn't exist.
- **Quarter payment verification (`verifyPayment.ts`) kept** — `game_payment` instruction is the payment, but Convex still verifies the tx on-chain to grant the session. The "no off-chain verification needed" simplification wasn't pursued.
- **`vaultHealth.ts` added** — enumerate all DepositPool PDAs via `getProgramAccounts`, cross-reference Convex records, sync missing/mismatched pools back. Became necessary after a dev incident that cleared Convex records while on-chain PDAs still held tokens.

Closing as shipped.
