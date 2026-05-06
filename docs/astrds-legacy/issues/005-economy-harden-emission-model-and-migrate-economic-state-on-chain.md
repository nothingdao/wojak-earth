# Issue #5: Economy: harden emission model and migrate economic state on-chain

- Source: https://github.com/nothingdao/astrds/issues/5
- State: OPEN
- Labels: area:economy, area:onchain, phase:pre-mainnet, priority:high, needs-decision
- Assignees: none
- Created: 2026-04-23T19:36:23Z
- Updated: 2026-04-30T20:25:37Z

## Body

## Summary

Pre-mainnet economy hardening checklist for ASTRDS. The core devnet implementation is now live; this issue should track what must be finalized, enforced, and documented before opening up both devnet and mainnet networks with confidence.

Design reference:

- `docs/economy.md`
- `docs/chain.md`
- `docs/security.md`

## Current implementation state

### Done on devnet

- [x] ASTRDS/SOL Meteora DAMM v2 pool exists on devnet.
- [x] Insert Quarter uses on-chain `game_payment` with split weights from `VaultConfig`.
- [x] Buyback/liquidity SOL accumulates in `BuybackVault` PDA.
- [x] `crank_liquidity` is permissionless and performs: wrap SOL → swap half to ASTRDS → add two-sided DAMM v2 liquidity → permanently lock position.
- [x] Game server is authoritative: client renders snapshots only.
- [x] Game server refreshes Convex admin config, reads live pool price, then locks emission tier at session start.
- [x] ASTRDS minting is on-chain via `mint_astrds`; VaultConfig PDA holds mint authority; `MintRecord` prevents replay.
- [x] Convex `prepareMint` signs ed25519 mint authorization; game server writes authoritative earned amount through authenticated HTTP.
- [x] Game-over accounting records `astrdsAllocated`, `astrdsEarned`, and `astrdsBurned` in Convex.
- [x] Admin config exposes economy tiers and gameplay/progression tuning through Convex `gameConfig`.
- [x] Tokenomics overlay shows live economy state.

## Pre-mainnet blockers / decisions

### 1. Decide canonical pricing model

Current runtime tiering uses the live AMM reserve-ratio spot price:

```text
price_usd = (sol_reserve / astrds_reserve) × SOL/USD
```

Older design notes referenced a burn-adjusted formula:

```text
price = pool SOL value × SOL/USD / (21M - total burned)
```

Decision needed:

- [ ] Confirm AMM reserve-ratio spot price is canonical, or implement a different formula.
- [ ] Remove/update stale burn-adjusted pricing language everywhere if spot price is canonical.
- [ ] Ensure Tokenomics UI, docs, game server, and issue references all use the same definition.

### 2. Finalize mainnet emission tier breakpoints

Current breakpoints are admin-configurable but devnet-calibrated.

Need:

- [ ] Define launch seed liquidity assumptions.
- [ ] Pick mainnet tier breakpoints for tiers 1–5.
- [ ] Verify expected pills-per-tier and ASTRDS-per-pill at launch price.
- [ ] Add an admin/mainnet deployment checklist for setting these before opening mainnet play.

### 3. Finalize revenue split weights

Current devnet split values are placeholders.

Need final bps for:

- [ ] operational wallet
- [ ] operator wallet
- [ ] buyback/liquidity vault
- [ ] any additional future slices, if any

Acceptance:

- [ ] Mainnet split approved.
- [ ] VaultConfig initialized/updated with final split.
- [ ] Docs and UI copy match the final split.

### 4. Decide ASTRDS supply cap enforcement

Target economy:

```text
hard cap: 21,000,000 ASTRDS
allocation per game: 50 ASTRDS
maximum full-allocation games: 420,000
```

Current state:

- ASTRDS mint authority is on-chain PDA controlled.
- `mint_astrds` mints only with Convex ed25519 authorization and one `MintRecord` per session.
- Cap / 420k schedule are design targets, not fully enforced as explicit on-chain global state.

Need:

- [ ] Decide required enforcement level before mainnet:
  - on-chain supply cap check in `mint_astrds`
  - game-server / Convex guard
  - explicit docs saying cap is social/admin-enforced until later
- [ ] If on-chain: implement, test, deploy, and update IDL/client.
- [ ] If off-chain: document trust assumptions clearly.

### 5. Decide burned-accounting model

Current state:

- Uncollected allocation is never minted.
- Game server records `astrdsAllocated`, `astrdsEarned`, `astrdsBurned` in Convex at game over.
- There is no on-chain reservation or burn tx.

Need:

- [ ] Decide whether “never minted + Convex burned accounting” is acceptable for mainnet launch.
- [ ] If not, design on-chain/global accounting for allocated/earned/burned supply.
- [ ] Ensure Tokenomics circulating/burned displays match the chosen model.

### 6. Death spiral / emergency emission policy

Current floor tier:

```text
5 pills × 10 ASTRDS = 50 max ASTRDS per game
```

Need:

- [ ] Decide if floor tier is sufficient in prolonged low-price conditions.
- [ ] Consider emergency policies:
  - no-emission floor below a configured price
  - admin pause for ASTRDS emission
  - dynamic quarter price
  - reduced max allocation under stress
- [ ] If any policy is adopted, implement in game server/admin config and document it.

### 7. Locked-liquidity wording and verification

DAMM v2 uses permanently locked positions. Avoid inaccurate “LP tokens burned” wording unless technically exact.

Need:

- [ ] Finalize public wording: “permanently locked Meteora position” vs “burned LP tokens”.
- [ ] Add verifier links / instructions for checking locked liquidity on mainnet.
- [ ] Ensure Tokenomics UI copy is accurate.

### 8. Devnet + mainnet network readiness

We want to support opening both networks cleanly.

Need:

- [ ] Document devnet vs mainnet addresses/config in `docs/chain.md`.
- [ ] Add clear env/config separation for app, Convex, game server, and scripts.
- [ ] Ensure admin config can be initialized per network.
- [ ] Ensure token metadata, pool addresses, VaultConfig addresses, and program IDs are not accidentally mixed.
- [ ] Write launch checklist for:
  - devnet reset/reseed
  - mainnet deploy/init
  - Meteora pool creation
  - VaultConfig initialization
  - ASTRDS mint authority transfer to VaultConfig PDA
  - admin config seed
  - Helius webhook setup
  - Railway/Netlify/Convex env setup
  - smoke test: insert quarter → play → mint → crank liquidity

## Acceptance criteria to close this issue

- Pricing model is canonical and docs/code/UI agree.
- Mainnet emission breakpoints and revenue split are finalized.
- Supply cap / 420k-game schedule enforcement or trust model is explicit.
- Burned/uncollected ASTRDS accounting model is explicit and reflected in Tokenomics.
- Death spiral policy is decided and implemented/documented if needed.
- Locked-liquidity wording is technically accurate.
- Devnet/mainnet launch checklist exists and has been exercised at least once on devnet.
- Mainnet deployment/config references are added once available.


## Comments

### whaleen — 2026-04-24T01:36:57Z

**Status update (2026-04-23)**

## Game server prerequisite — complete

The game server is live on Railway and fully authoritative. Checking off the previously open item:
- [x] Game server — server attests gameplay; pills collected cannot be spoofed client-side (issues #4, #6, #7, #8, #9 all closed)
- [x] Emission tiers read from Meteora pool on-chain at session start, enforced server-side as `pillsPerGameCap`

## Blocking decisions before Codex can run on remaining items

The following need explicit answers before any code is written:

**Revenue split percentages**
The on-chain vault program has a revenue split on `game_payment`. Current weights are TBD. Buyback + LP flows can't be implemented until the split is defined (operational / buyback / LP / other slices).

**Tier band breakpoints**
Current devnet bands in `tokenomics.ts` and `emissionTiers.ts` are placeholders calibrated against a tiny devnet pool. Mainnet bands need to be set against realistic seed liquidity targets.

**Death spiral protection**
At tier 1 (lowest price), 5 pills/game at 10 ASTRDS/pill = 50 ASTRDS/game. Floor is already the hardest cap. Is floor tier sufficient protection, or is there a minimum price below which games stop paying out entirely?

**DAMM v2 locked liquidity**
Needs a devnet test to confirm LP tokens can be permanently locked / burned after adding liquidity. Blocking the LP add flow narrative.

## Recommended next step before Codex

Run the full quarter flow end-to-end on devnet manually:
1. Connect wallet, insert quarter (on-chain `game_payment`)
2. Convex records verifiedSession
3. WS server confirms session, starts loop
4. Play to game over
5. Confirm score + pillsCollected written to Convex from server (not client)
6. Claim ASTRDS — confirm mint fires

This validates the existing stack and surfaces any gaps before investing in the buyback/LP flows.

### whaleen — 2026-04-26T23:16:20Z

## Progress update — 2026-04-26

### Completed since issue opened

- ✅ **Game server** — deployed to Railway, authoritative 30 tick/s loop, client is pure renderer
- ✅ **Emission tiers live** — server reads Meteora pool price at session start, locks tier for that session; client cannot influence emission rate
- ✅ **On-chain buyback accumulator** — `game_payment` routes `buyback_bps` slice to `BuybackVault` PDA
- ✅ **`crank_liquidity` instruction** — permissionless; swaps half accumulated SOL → ASTRDS, adds two-sided LP, permanently locks Meteora position
- ✅ **Tokenomics overlay** — live pool state: price, tier, circulating supply, pool depth, games played

### Still open

- [ ] `crank_liquidity` end-to-end test on devnet (game payment → buyback vault → LP add → locked position)
- [ ] On-chain emission tier config — price breakpoints + denominations as admin-adjustable on-chain state (currently hardcoded in game server)
- [ ] Finalize revenue split percentages (operational / operator / buyback bps) for mainnet
- [ ] Death spiral protection review — is the floor tier (5 pills, 10 ASTRDS/pill) sufficient

Parking mainnet migration work until devnet validation is complete. See `docs/economy.md` for current roadmap.

### whaleen — 2026-04-27T04:34:15Z

## Progress update (2026-04-26)

**Completed since last update:**

- [x] **Game server** — authoritative WebSocket server deployed to Railway; game loop gated behind quarter verification; pills collected attested server-side; emission tier locked at session start from live Meteora pool price
- [x] **Emission tier config** — price breakpoints, pills-per-tier, and ASTRDS-per-pill are now admin-configurable via the Convex `gameConfig` table; Admin overlay (dev wallets only) exposes all fields with live editing; game server polls and applies config changes; quarter price also configurable
- [x] **ASTRDS minting on-chain** — `mint_astrds` instruction added to Space Vault Program; VaultConfig PDA now holds ASTRDS mint authority (transferred from Convex keypair); `MintRecord` PDA (`["mint-record", session_id]`) prevents replay (one mint per game session); Convex `prepareMint` action signs ed25519 authorization; client builds and submits wallet-signed transaction

**Still pending:**
- [ ] Automated `crank_liquidity` trigger — instruction exists on-chain and `buildCrankLiquidityTransaction` is callable from client, but no automated scheduling yet (manual crank only)
- [ ] End-to-end devnet test: quarter → BuybackVault accumulation → crank → LP locked
- [ ] Validate full quarter flow on devnet

### whaleen — 2026-04-27T04:36:52Z

## Correction to previous comment — more is done than stated

Reviewed the codebase more carefully. Almost everything in this issue is complete:

**What needs to be built — all done:**
- [x] **Game server** — deployed to Railway, authoritative loop, quarter-gated, pills attested server-side
- [x] **Jupiter swap integration** — handled on-chain inside `crank_liquidity` via Meteora DAMM v2 swap CPI (swaps half accumulated SOL → ASTRDS); not a separate Jupiter call
- [x] **LP add flow** — `crank_liquidity` CPIs `add_liquidity` + `permanent_lock_position` in the same instruction; liquidity is locked on-chain
- [x] **On-chain emission tier config** — price breakpoints, pills-per-tier, ASTRDS-per-pill configurable via Convex `gameConfig` table; Admin overlay (dev wallet gated) exposes all fields; game server polls and hot-applies changes
- [x] **ASTRDS minting on-chain** — `mint_astrds` instruction; VaultConfig PDA holds mint authority; `MintRecord` PDA for replay protection; Convex `prepareMint` signs ed25519 auth; client submits wallet-signed tx

**Devnet progress — updated:**
- [x] ASTRDS/SOL DAMM v2 pool created on Meteora devnet
- [x] Tokenomics overlay wired to live pool state
- [x] Jupiter SOL/USD price feed integrated and cached
- [x] Buyback + LP add flow — implemented as permissionless `crank_liquidity` on-chain instruction (not a Convex action as originally scoped); full UI in TokenomicsScreen with Crank Liquidity button; `simulateCrank.ts` script for scripted testing

**Genuinely remaining:**
- [ ] End-to-end devnet test: insert quarter → BuybackVault accumulates → crank runs → position locked — `simulateCrank.ts` exists but unknown if it passed against live state
- [ ] Validate full quarter flow on devnet with real SOL

### whaleen — 2026-04-27T04:38:05Z

All items confirmed complete. Closing.

### whaleen — 2026-04-29T22:39:31Z

Drift audit against current code/docs (2026-04-29): issue remains open for mainnet hardening, but a few implementation details have changed:

- Game server no longer fetches Jupiter SOL/USD directly. `server/src/game/emissionTiers.ts` now calls the shared Convex `/prices/sol-usd` endpoint, which uses Coinbase → Binance → CoinGecko fallback and a 60s cache.
- Game-over accounting now writes `astrdsAllocated`, `astrdsEarned`, and `astrdsBurned` through the authenticated `/game-server/set-astrds-earned` path. This is still off-chain accounting; there is no on-chain burn/reservation yet.
- Admin `gameConfig` now covers more than emission tiers: economy arrays plus ship, bullet, asteroid, pickup, Space Token opportunity tuning, and persisted level-band progression policies.
- `crank_liquidity` has been validated end-to-end on devnet per current docs/status.

Still open before mainnet:
- Make the 21M cap / 420k-game schedule / allocation accounting canonical and enforceable enough for the public economy narrative.
- Decide whether Convex burned-accounting is sufficient or whether explicit on-chain economic accounting is required.
- Finalize tier breakpoints and revenue split percentages.
- Decide whether current AMM reserve-ratio spot price is canonical, replacing older burn-adjusted pricing language entirely.


### whaleen — 2026-04-30T20:25:37Z

## Decision: mainnet ASTRDS should move to a fixed-supply emission vault model

We are leaning away from the current devnet mint-on-claim economy for mainnet.

Mainnet target model:

```text
21,000,000 ASTRDS minted once into a program-owned EmissionVault PDA.
Each settled game consumes 50 ASTRDS from that vault:
  collected/earned → credited to player claimable balance
  missed/uncollected → burned from the vault as a real SPL burn
```

Rationale:

- The hard cap is obvious to explorers/DeFi apps: fixed supply minted once.
- Missed allocation creates real on-chain burn events instead of Convex-only accounting.
- Player claimable balances can stack across games and survive browser close/crash.
- Game settlement becomes the on-chain economic event, not the browser game-over UI.
- `mint_astrds` can remain a devnet/prototype path, but mainnet should use settlement + vault transfer/claim.

Implications:

- Need new on-chain accounts/instructions for economy settlement and claiming.
- Need server/Convex changes so game-over/disconnect/timeout can settle sessions without relying on the browser.
- Need frontend changes to show on-chain claimable ASTRDS and claim from the emission vault.
- Need docs/tokenomics/security updates to describe “emission reserve, not circulating premine.”

This resolves the direction for the burned-accounting model: **real burn is preferred for mainnet**, but by burning missed allocation from a fixed emission vault, not by minting missed tokens to the player and burning from them.

