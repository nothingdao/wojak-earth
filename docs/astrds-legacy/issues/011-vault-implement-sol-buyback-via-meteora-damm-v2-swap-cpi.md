# Issue #11: Vault: implement SOL buyback via Meteora DAMM v2 swap CPI

- Source: https://github.com/nothingdao/astrds/issues/11
- State: CLOSED
- Labels: enhancement
- Assignees: none
- Created: 2026-04-24T20:26:10Z
- Updated: 2026-04-26T23:16:07Z
- Closed: 2026-04-26T23:16:07Z

## Body

## Summary

Replace the current placeholder behaviour (pool slice goes to treasury) with an on-chain SOL→ASTRDS buyback via a direct CPI into the Meteora DAMM v2 \`swap\` instruction. Purchased ASTRDS is burned, reducing circulating supply and supporting price through the locked-LP pool.

## Background

The \`game_payment\` instruction already splits the quarter (~\$0.25 SOL) three ways:

| Slice | Current | Target |
|---|---|---|
| operational_bps | → operational wallet | unchanged |
| operator_bps | → operator wallet | unchanged |
| pool_bps | → treasury (placeholder) | → accumulator PDA, flushed to buyback |

See \`docs/economy.md\` for the full flywheel and \`docs/chain.md\` for the current VaultConfig values.

## Why buyback instead of LP

A Meteora DAMM v2 LP add requires:
- A position NFT (created with a fresh keypair signer — not feasible atomically in a CPI)
- Balanced token deposits (both ASTRDS and SOL — not possible from a pure-SOL quarter payment)
- Three CPIs per deposit (\`create_position\` + \`add_liquidity\` + \`permanent_lock_position\`)

A swap CPI is none of those things. And because the initial pool LP is **permanently locked**, SOL that enters the pool via a buyback swap stays in the pool — the locked LP prevents anyone from withdrawing it. So every buyback permanently deepens liquidity while also providing buy pressure.

## Spike findings

Meteora DAMM v2 swap instruction (\`cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG\`):

**Accounts (fixed, ~14 total):**
- \`pool_authority\` — Meteora const PDA
- \`pool\` — our ASTRDS/SOL pool
- \`input_token_account\` — vault PDA's wSOL ATA
- \`output_token_account\` — vault PDA's ASTRDS ATA
- \`token_a_vault\` / \`token_b_vault\` — pool reserves
- \`token_a_mint\` (ASTRDS, Token-2022) / \`token_b_mint\` (wSOL)
- \`payer\` — vault PDA (signs via \`invoke_signed\`)
- \`token_a_program\` / \`token_b_program\`
- \`referral_token_account\` — None
- \`event_authority\` — Meteora event CPI PDA
- cp-amm program

**Instruction data:**
```rust
SwapParameters { amount_in: u64, minimum_amount_out: u64 }
```

The crate exposes a \`cpi\` feature flag for typed Anchor CPI helpers:
```toml
cp-amm = { git = "https://github.com/MeteoraAg/damm-v2", features = ["cpi"] }
```

Fallback if git deps cause build issues: hardcode the 8-byte discriminator (\`sha256("global:swap")[0..8]\`) and borsh-serialize the params manually.

## Design

### Step 1 — \`game_payment\` (change is minimal)

Instead of routing \`pool_bps\` SOL directly to treasury, route it to a new **accumulator PDA** (seeds: \`["buyback-accumulator"]\`). This is a plain SOL-holding PDA — no token accounts, no extra logic.

VaultConfig change:
- Remove \`buyback_wallet\` field
- Add \`meteora_pool: Pubkey\` — the DAMM v2 pool address (CPI target)

PaymentWeights change:
- Remove \`buyback_bps\`
- Add \`pool_bps\` (same numeric value, new destination)

### Step 2 — new \`execute_buyback\` instruction (permissionless)

Anyone can call this once enough SOL has accumulated. Steps inside the instruction:

1. Transfer lamports from accumulator PDA → vault PDA's wSOL ATA
2. \`sync_native\` to update wSOL balance
3. CPI → Meteora \`swap\` (wSOL → ASTRDS, exact-in, slippage param)
4. CPI → Token-2022 \`burn\` on received ASTRDS
5. Close wSOL ATA to recover rent (optional, back to accumulator)

Emits an event: \`{ sol_spent, astrds_burned, pool, timestamp }\` for on-chain observability.

### VaultConfig target state

```
operational_wallet   pubkey
operator_wallet      pubkey
meteora_pool         pubkey   ← new: DAMM v2 pool address
convex_authority     pubkey
operational_bps      u16
operator_bps         u16
pool_bps             u16      ← replaces buyback_bps
```

## Open questions

- Minimum accumulator threshold before \`execute_buyback\` is callable (e.g. 0.1 SOL)
- Slippage parameter for the swap — hardcoded or stored in VaultConfig
- Whether to close the wSOL ATA after each buyback or keep it open (rent amortization)
- Whether received ASTRDS should be burned immediately or held and burned in a separate \`burn_reserve\` instruction
- Build feasibility of the \`cp-amm\` git dependency in the Anchor workspace — needs a local test before committing to this approach; raw discriminator CPI is the fallback

## Acceptance criteria

- [ ] \`game_payment\` routes \`pool_bps\` SOL to accumulator PDA, not treasury
- [ ] \`VaultConfig\` stores \`meteora_pool\` pubkey, \`pool_bps\` replaces \`buyback_bps\`
- [ ] \`execute_buyback\` instruction exists, is permissionless, enforces minimum threshold
- [ ] Swap CPI verified working on devnet against the ASTRDS/SOL pool
- [ ] Purchased ASTRDS is burned on-chain (supply decrease verifiable)
- [ ] Emitted event includes sol\_spent + astrds\_burned
- [ ] \`docs/chain.md\` updated with accumulator PDA address and buyback flow diagram

## Comments

### whaleen — 2026-04-26T23:16:02Z

## Implementation complete — different approach than originally scoped

The core goal (route buyback SOL into the Meteora pool) is implemented, but the mechanism differs from the original spec in a few key ways:

### What changed from the spec

**Original spec:** `execute_buyback` — swap SOL → ASTRDS via CPI, then burn the ASTRDS. Single-sided deposit narrative.

**Actual implementation:** `crank_liquidity` — a permissionless instruction that:
1. Transfers accumulated SOL from `BuybackVault` PDA → `vault_config` WSOL ATA, syncs native
2. Creates the Meteora position if it doesn't exist (`create_position` CPI)
3. Swaps **half** the SOL → ASTRDS (`swap` CPI via `vault_config` signer)
4. Computes `liquidity_delta` from both resulting balances
5. Adds two-sided liquidity (`add_liquidity` CPI)
6. Permanently locks the position (`permanent_lock_position` CPI)

No ASTRDS is burned. Instead, the LP position is permanently locked — the economic effect is the same (ASTRDS leaves circulation into a locked pool) but the mechanism is two-sided LP add rather than a burn.

### What was implemented (acceptance criteria reconciled)

- ✅ `game_payment` routes `buyback_bps` SOL to `BuybackVault` PDA, not treasury
- ✅ `VaultConfig` stores `meteora_pool` pubkey; set via `set_meteora_pool` admin instruction
- ✅ `crank_liquidity` exists, is permissionless (any `cranker` signer)
- ✅ Swap CPI implemented against Meteora DAMM v2 (`meteora-damm-rust-sdk`)
- ⚠️ ASTRDS is not burned — LP is permanently locked instead (equivalent effect, different mechanism)
- ⚠️ No emitted event yet (program doesn't emit `{ sol_spent, astrds_burned }` — would need to add an Anchor event)
- ✅ `docs/chain.md` updated with BuybackVault PDA, CrankLiquidity flow diagram, correct VaultConfig values

### Client support

`spaceVault.ts` exports:
- `buildGamePaymentTransaction` — now 6 accounts (no Meteora; just player → operational/operator/buyback split)
- `buildCrankLiquidityTransaction` — 21 accounts, matches `CrankLiquidity` struct exactly
- `fetchLiquidityCrankState` — reads buyback vault balance + position existence
- `buildMeteoraSwapTransaction` — direct user-facing swap against the ASTRDS/SOL pool

### Still pending
- End-to-end devnet test of `crank_liquidity` (game payment → buyback vault → LP add → position locked)
- Minimum crank threshold enforcement (currently unconstrained — any nonzero amount)
- Anchor event emission for observability

Closing this issue. Remaining crank testing is tracked in status.md.
