# Issue #33: Economy: migrate ASTRDS to fixed-supply emission vault

- Source: https://github.com/nothingdao/astrds/issues/33
- State: OPEN
- Labels: area:economy, area:onchain, phase:pre-mainnet, type:design, priority:high
- Assignees: none
- Created: 2026-04-30T20:25:38Z
- Updated: 2026-05-01T01:13:00Z

## Body

Parent: #5

## Summary

Move mainnet ASTRDS from the current devnet **mint-on-claim** model to a fixed-supply **EmissionVault** model.

Target economy:

```text
21,000,000 ASTRDS minted once into a program-owned EmissionVault PDA.
Each settled game consumes 50 ASTRDS from that vault:
  earned/collected → credited to player's on-chain claimable balance
  missed/uncollected → burned from the vault via real SPL burn
```

The goal is to make the ASTRDS economy legible to token explorers, DeFi terminals, and players:

- fixed supply is visible
- burns are real SPL burns
- player claimable balances survive browser close/crash
- per-game settlement data is on-chain
- Convex/game server still authorizes gameplay results, but economic state lives on-chain

## Current devnet model

Current flow:

- game server computes `astrdsEarned`
- Convex records `astrdsAllocated`, `astrdsEarned`, `astrdsBurned`
- Convex `prepareMint` signs ed25519 authorization
- client submits `mint_astrds`
- `MintRecord` prevents replay
- 21M cap is enforced by mint supply check

Problem:

- missed/burned allocation is Convex-only accounting
- no real SPL burn event for missed ASTRDS
- player claimability depends on post-game mint flow
- token explorers cannot see full economic state

## Proposed on-chain accounts

### `EconomyStats` PDA

Seeds:

```text
["economy-stats"]
```

Fields:

```rust
total_allocated_raw: u64
total_earned_raw: u64
total_burned_raw: u64
total_claimed_raw: u64
games_settled: u64
bump: u8
```

### `PlayerEmission` PDA

Seeds:

```text
["player-emission", player]
```

Fields:

```rust
player: Pubkey
claimable_raw: u64
lifetime_earned_raw: u64
lifetime_claimed_raw: u64
lifetime_burned_raw: u64
games_settled: u64
bump: u8
```

### `GameSettlement` PDA

Seeds:

```text
["game-settlement", session_id]
```

Fields:

```rust
session_id: [u8; 32]
player: Pubkey
allocated_raw: u64
earned_raw: u64
burned_raw: u64
score: u64
level: u32
pills_collected: u16
settled_at: i64
bump: u8
```

### Emission vault token account

Likely ATA:

```text
ATA(ASTRDS_MINT, VaultConfig PDA, allowOwnerOffCurve=true)
```

This token account holds the fixed 21M ASTRDS emission reserve.

## Proposed instructions

### `initialize_emission_vault`

One-time/admin or migration instruction.

Responsibilities:

- create/init emission vault ATA if needed
- ensure it is owned by `VaultConfig` PDA
- fund it with the fixed emission reserve
- initialize `EconomyStats`

Open design choice:

- mint 21M directly into vault during init, or transfer from an externally minted setup account during migration

### `settle_game`

Server/Convex-authorized instruction.

Inputs:

```text
player
session_id
allocated_raw
earned_raw
score
level
pills_collected
expiry
signature
```

Program computes:

```text
burned_raw = allocated_raw - earned_raw
```

Rules:

- verify ed25519 signature against `VaultConfig.convexAuthority`
- require `allocated_raw <= 50 ASTRDS raw`
- require `earned_raw <= allocated_raw`
- require emission vault has enough balance for `allocated_raw`
- create `GameSettlement` PDA to prevent replay
- create/init `PlayerEmission` PDA if needed
- increment `PlayerEmission.claimable_raw += earned_raw`
- increment player lifetime stats
- increment `EconomyStats`
- burn `burned_raw` from emission vault ATA using Token-2022 burn CPI

Important:

- Settlement must not depend on the browser surviving game over.
- Game server/Convex should be able to produce or submit settlement after death/disconnect/timeout.

### `claim_astrds`

Player-called instruction.

Inputs:

```text
amount_raw
```

Rules:

- require `PlayerEmission.claimable_raw >= amount_raw`
- decrement claimable
- increment `lifetime_claimed_raw`
- increment `EconomyStats.total_claimed_raw`
- transfer `amount_raw` from emission vault ATA to player's ASTRDS ATA
- no Convex signature needed because settlement already authorized the earned amount

## Message/signature changes

Add a new shared authorization message for settlement, similar to existing vault message helpers:

```text
player(32)
session_id(32)
allocated_raw(8)
earned_raw(8)
score(8)
level(4)
pills_collected(2)
expiry(8)
```

Exact byte layout should live in `shared/vault/messages.ts` and have golden tests.

Rust should verify the exact same layout.

## Server/Convex changes

- Game server should settle sessions on game over, disconnect, or timeout.
- Convex should prepare/sign settlement authorizations from authoritative server-submitted game results.
- Current `/game-server/set-astrds-earned` may become `/game-server/settle-astrds` or similar.
- Convex can still mirror settlement state for UI speed, but on-chain state is truth.
- Existing `prepareMint` / `mint_astrds` can remain devnet-only or be deprecated for mainnet.

## Frontend changes

- Replace `ASTRDSMinting` mint-on-claim UX for mainnet with emission-vault claim UX.
- Query on-chain `PlayerEmission` for claimable balance.
- Claim button calls `claim_astrds`.
- Game-over screen can show pending settlement/claimable balance.
- Account screen should show stacked claimable ASTRDS across sessions.

## Docs changes

Update:

- `docs/economy.md`
- `docs/chain.md`
- `docs/security.md`
- `docs/spec.md`

Required wording:

> ASTRDS has no circulating premine. The fixed supply starts in a program-owned emission reserve. Tokens can only leave the reserve through gameplay settlement, and missed allocation is burned from the reserve.

## Tests

Required:

- Anchor tests for `initialize_emission_vault`
- Anchor tests for `settle_game`
  - earned < allocated burns difference
  - earned == allocated burns zero
  - earned > allocated rejected
  - allocated > 50 ASTRDS rejected
  - duplicate settlement rejected
  - invalid signature rejected
  - vault balance decreases by `allocated_raw`
  - player claimable increases by `earned_raw`
  - mint supply decreases by `burned_raw`
- Anchor tests for `claim_astrds`
  - claim full amount
  - partial claim
  - over-claim rejected
  - player ATA init if needed
- TS golden tests for settlement message bytes

## Migration / rollout

Suggested path:

1. Implement new on-chain accounts/instructions alongside existing `mint_astrds`.
2. Add shared TS/Rust message tests.
3. Wire Convex/server settlement path.
4. Wire frontend claim UI.
5. Keep old mint-on-claim path for devnet compatibility until new flow is stable.
6. For mainnet, launch only with emission-vault flow.

## Acceptance criteria

- 21M ASTRDS fixed supply is held in the emission vault.
- A settled game creates on-chain settlement state.
- Earned ASTRDS accumulates as on-chain player claimable balance.
- Missed allocation causes a real SPL burn from the emission vault.
- Player can claim stacked ASTRDS across games.
- Browser close/crash does not prevent eventual settlement.
- Tokenomics reads on-chain economy stats instead of Convex-only burned accounting.
- Existing devnet mint-on-claim path is clearly deprecated or gated away from mainnet.


## Comments

### whaleen — 2026-05-01T01:13:00Z

Implementation note: core emission-vault flow is now implemented and devnet-smoke-tested (initialize emission vault, Convex server-side settle_game submission, browser claim_astrds). Remaining acceptance gap is deterministic test coverage, especially Anchor tests for initialize_emission_vault / settle_game / claim_astrds. See follow-up test issues.
