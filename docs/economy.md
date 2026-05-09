# Economy

Canonical current economy model for Earth + ASTRDS. GitHub issues remain the work queue for changes; this file describes the current design.

## Principles

- On-chain data is canonical for tokens, NFTs, custody, settlement, and ownership.
- Convex stores realtime/session state, cached views, authorization prep, and indexed convenience data.
- ASTRDS gameplay is server-authoritative; clients render snapshots and submit wallet transactions.
- Earth and ASTRDS share the wallet universe, but ASTRDS does not require an Earth character.

## ASTRDS token model

- Token: ASTRDS, Token-2022, 9 decimals.
- Fixed cap: 21,000,000 ASTRDS.
- No circulating premine as product model: supply starts in a program-owned emission vault.
- Per game allocation cap: 50 ASTRDS.
- Earned ASTRDS is based on server-authoritative pill collection and session settlement.
- Unearned allocation is burned from the emission vault during on-chain settlement.
- Earned allocation accumulates in the player's on-chain `PlayerEmission` claimable balance until claimed.

## Liquidity layer

ASTRDS uses a Meteora DAMM v2 ASTRDS/SOL pool.

- Quarter payments route a configured `buyback_bps` SOL slice into the `BuybackVault` PDA.
- `crank_liquidity` is permissionless and flushes accumulated SOL:
  1. wraps SOL,
  2. swaps half into ASTRDS through Meteora CPI,
  3. adds two-sided liquidity,
  4. permanently locks the program-owned Meteora position.
- Price is read from pool reserve ratio: `price_sol = sol_reserve / astrds_reserve`.
- USD views multiply pool price by a Convex-fetched SOL/USD price.

## Emission tiers

The server locks an emission tier at session start from current game config and pool pricing. The tier controls pills per game and ASTRDS per pill while preserving the max 50 ASTRDS allocation.

Typical tier shape:

| Tier | Pills | ASTRDS / pill | Max allocation |
|---:|---:|---:|---:|
| 1 | 5 | 10 | 50 |
| 2 | 10 | 5 | 50 |
| 3 | 25 | 2 | 50 |
| 4 | 50 | 1 | 50 |
| 5 | 100 | 0.5 | 50 |

Config is stored in Convex `gameConfig` and consumed by `server/earth` for authoritative gameplay.

## Insert Quarter

```txt
Player signs game_payment
  -> Space Vault Program splits SOL by VaultConfig weights
  -> operational wallet / operator wallet / BuybackVault PDA
  -> Convex verifies payment and creates session state
  -> server/earth admits a game only for a valid active session
```

ASTRDS payment for Insert Quarter is disabled in current code; SOL is the active payment path.

## Tokens in Space

Any supported SPL token can be deposited into the Space Vault Program as gameplay loot.

- Deposits go to `DepositPool` PDA vault ATAs, not treasury wallets.
- Convex tracks deposit metadata, spawn tickets, collections, and claims.
- On-chain balances remain authoritative; Convex reconciliation caps cached balances to chain reality.
- The server injects collectible token entities only after Convex issues valid spawn tickets.
- Claims are authorized by Convex ed25519 signatures and executed on-chain by the Space Vault Program.

## Earth economy

EARTH is intended to be a transferable Token-2022 SPL token and also the fast in-game currency. The target model is program escrow plus a server-authoritative in-game ledger:

```txt
wallet EARTH -> Earth Vault escrow -> Convex/server credits in-game EARTH
Convex/server debits in-game EARTH -> Earth Vault releases EARTH -> wallet
```

In-game EARTH should be immediately withdrawable and must be fully backed by EARTH held in Earth Vault escrow. This backing invariant applies to vault-era credits created through Earth Vault character receipts, purchases, deposits, and withdrawals. Legacy pre-vault `character.earth` balances are dev/test migration data, not mainnet liabilities, and should not block Earth Vault v1. The bridge should be a first-class, clean, encouraged flow rather than a discouraged or lossy conversion. Player-to-player game transactions should initially spend in-game EARTH only so normal gameplay does not require wallet signatures.

Character creation uses SOL. The planned Earth Vault Program should split each character mint payment between DAO treasury, operations/revenue, and EARTH liquidity/reserve. A meaningful portion of the mint fee should return to the player as starter EARTH credited directly into game escrow/in-game balance, so a new player discovers that part of the NFT mint fee remains theirs as a value-backed EARTH asset.

EARTH supply is not fixed-capped. Issuance should be governed by mint-run capacity, SOL inflows, configured run price/liquidity policy, and locked liquidity growth. The initial Meteora EARTH/SOL pool should be seeded primarily to establish price, with later program-managed liquidity growing from mint and purchase flows. Do not use a thin initial pool as the sole buy/starter pricing oracle for v1; use explicit configured run pricing until pool depth/TWAP safeguards exist.

Earth privileged operations route through `server/earth`, including character NFT/media production, R2 writes, receipt verification, bridge authorization, Solana balance reads, and any future server-owned economy-critical actions.

## References

- `docs/chain.md` — program IDs, wallets, PDAs, and on-chain flow reference.
- #28 — ASTRDS pre-mainnet economy/security reconciliation work queue.
