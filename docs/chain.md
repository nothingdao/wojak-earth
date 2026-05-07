# Chain Reference

Canonical on-chain reference for the current Earth monorepo. Addresses are Solana devnet unless noted.

## Programs

| Name | Address | Notes |
|---|---|---|
| Space Vault Program | `4bRZK8XfziVhLCgvtRdFJyTgN6tXGSPJT8xfbtt1AxBB` | Anchor program for ASTRDS game payments, emission settlement/claims, space-token deposits/claims, and liquidity crank. |
| IDL Account | `4SQth9AnyuDe636K91kzBQVCz3mEFrEm6jmdJWJhVFZu` | Program IDL account. |

## Wallets / authorities

| Role | Address | Key location / owner |
|---|---|---|
| Deployer / upgrade authority | `jrXCZwP8bxDnGs7ChD4F77We1K4J89R53SAVk5HsSoE` | Local deployer keypair, usually `~/.config/solana/id.json`. |
| Convex authority / treasury | `CNhWD1cXNaCMcjJmFcK25aFgV3ZTAFtyFDBvGfKZcpzF` | Convex env `PROGRAM_AUTHORITY_PRIVATE_KEY`. Signs ed25519 mint/claim/settlement authorizations. |

The on-chain program verifies Convex-signed authorizations against `VaultConfig.convexAuthority`.

## Tokens

| Name | Mint | Standard | Notes |
|---|---|---|---|
| ASTRDS | `5sqKSHDKZr4KbNzj972PSfmEhtR9eLeBvv1nBRbeQAnB` | Token-2022 | 9 decimals. Supply cap enforced by the Space Vault Program. |

ASTRDS mint authority is held by the `VaultConfig` PDA. Direct keypair `mintTo` is not the intended path; gameplay rewards leave the vault/program path through authorized instructions.

## Meteora DAMM v2 pool

| Field | Value |
|---|---|
| Pool address | `EQPzzbREwvEkZeJ7bvcasrz3tAsADtGAJxzTtcxiTCQG` |
| Pair | ASTRDS / SOL |
| Fee tier | 1% fixed, dynamic fee enabled |
| Liquidity | Permanently locked by program-controlled Meteora position flow |
| Owner / initializer | Deployer wallet `jrXCZwP8bxDnGs7ChD4F77We1K4J89R53SAVk5HsSoE` |

Pool price is read as `sol_reserve / astrds_reserve`; SOL/USD comes from Convex price actions for USD-denominated UI/economy views.

## Program-derived accounts

| Account | Seeds | Current address / purpose |
|---|---|---|
| `VaultConfig` | `["vault-config"]` | `6zsWYibNCYYQJikHv8BHXRNynEACgFKsZPNXqWqBPbvv`; singleton config for authorities, payment weights, Meteora pool, and emission vault state. |
| `BuybackVault` | `["buyback-vault"]` | `8wBQd5e9yym7A3xR9wN39Wfv5SymdwmcADxVWCedgf7g`; SOL PDA accumulating the buyback slice from game payments until `crank_liquidity`. |
| `MeteoraPositionNftMint` | `["meteora-position-mint"]` | `FAsVQSWkV8P3j1WsdsWdG7zE45i1tgX346Dm83NPCFj8`; deterministic NFT mint for the program-owned Meteora LP position. |
| `DepositPool` | `["deposit-pool", depositor, mint]` | One pool per depositor + mint. Tracks remaining deposited space-token balance and owns the vault ATA. |
| `ClaimRecord` | `["claim-record", claim_id_bytes]` | Replay protection for space-token claims. |
| `MintRecord` | `["mint-record", session_id_bytes]` | Replay protection for ASTRDS mint/claim path keyed by game session. |
| Game settlement | `["game-settlement", session_id]` | Settlement state for authoritative ASTRDS emission-vault accounting. |

Each `DepositPool` owns an associated token account derived as `ATA(mint, depositPool, allowOwnerOffCurve=true, tokenProgram)`.

## Current VaultConfig values

| Field | Value |
|---|---|
| authority | `jrXCZwP8bx...` |
| convex_authority | `CNhWD1cXNa...` |
| operational_wallet | `jrXCZwP8bx...` devnet placeholder |
| operator_wallet | `jrXCZwP8bx...` devnet placeholder |
| operational_bps | `5000` |
| operator_bps | `3000` |
| buyback_bps | `2000` |
| meteora_pool | `EQPzzbREwvEkZeJ7bvcasrz3tAsADtGAJxzTtcxiTCQG` |

## Runtime architecture

```txt
ASTRDS client (apps/astrds)
  - wallet adapter
  - transaction builders in apps/astrds/src/lib/spaceVault.ts
  - renders snapshots from server/earth

server/earth
  - authoritative ASTRDS WebSocket game loop
  - verifies active Convex game sessions
  - submits server-owned game results and settlement writes

Convex
  - sessions, gameSessions, scores, chat
  - spawn tickets, collections, claims
  - ed25519 authorization actions for mint/claim/settlement
  - Helius webhook + reconciliation logic

Solana
  - Space Vault Program
  - ASTRDS Token-2022 mint
  - DepositPool vault ATAs
  - Meteora DAMM v2 pool / locked position
```

## Core flows

### Insert Quarter

```txt
Player wallet signs game_payment
  -> Space Vault Program reads VaultConfig weights
  -> SOL split to operational wallet, operator wallet, and BuybackVault PDA
  -> Convex verifies payment/session state
  -> server/earth admits gameplay only for valid active session
```

### Crank liquidity

```txt
Anyone calls crank_liquidity
  -> BuybackVault SOL becomes vault-config WSOL
  -> swap half SOL to ASTRDS through Meteora CPI
  -> add both sides as DAMM v2 liquidity
  -> permanently lock the program-owned Meteora position
```

### ASTRDS gameplay emission

```txt
Game session starts
  -> server/earth reads current pool/config and locks emission tier
  -> server-authoritative simulation spawns pills
  -> collected pills determine earned ASTRDS at game over
  -> server submits authoritative result
  -> Convex prepares authorization
  -> player submits on-chain claim/mint transaction
```

ASTRDS allocation per game is capped by the program. Missed/unearned allocation is represented by unclaimed/unreleased vault supply rather than client-created tokens.

### Tokens in Space deposit

```txt
Depositor creates pending Convex intent
  -> client builds registerPool + deposit instructions
  -> depositor signs on-chain deposit
  -> tokens land in DepositPool vault ATA, not treasury wallet
  -> Convex verifies transaction metadata and activates/corrects pool state
```

### Tokens in Space spawn, collect, claim

```txt
server/earth requests spawn ticket from Convex
  -> Convex validates active session + pool/cooldown rules
  -> server injects token entity into authoritative simulation
  -> collision triggers Convex collect mutation
  -> collection decrements pool and creates pending collection
  -> prepareClaims signs authorization
  -> player submits on-chain claim
  -> Convex finalizes collection/claim records
```

## Convex environment variables

| Key | Purpose |
|---|---|
| `PROGRAM_AUTHORITY_PRIVATE_KEY` | Convex authority keypair JSON array. |
| `SOLANA_RPC_ENDPOINT` | RPC used by Convex actions. |
| `HELIUS_WEBHOOK_SECRET` | Shared secret for webhook validation. |
| `ADMIN_API_KEY` | Required for privileged Convex HTTP endpoints used by admin/server paths. |

## Explorer links

- [Space Vault Program](https://orbmarkets.io/address/4bRZK8XfziVhLCgvtRdFJyTgN6tXGSPJT8xfbtt1AxBB?cluster=devnet)
- [ASTRDS Token Mint](https://orbmarkets.io/address/5sqKSHDKZr4KbNzj972PSfmEhtR9eLeBvv1nBRbeQAnB?cluster=devnet)
- [Convex authority wallet](https://orbmarkets.io/address/CNhWD1cXNaCMcjJmFcK25aFgV3ZTAFtyFDBvGfKZcpzF?cluster=devnet)
- [ASTRDS/SOL pool](https://orbmarkets.io/address/EQPzzbREwvEkZeJ7bvcasrz3tAsADtGAJxzTtcxiTCQG?cluster=devnet)
- [Meteora devnet](https://devnet.meteora.ag/)
