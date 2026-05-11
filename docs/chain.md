# Chain Reference

Canonical on-chain reference for the current Earth monorepo. Addresses are Solana devnet unless noted.

## Programs

| Name | Address | Notes |
|---|---|---|
| Space Vault Program | `4bRZK8XfziVhLCgvtRdFJyTgN6tXGSPJT8xfbtt1AxBB` | Anchor program for ASTRDS game payments, emission settlement/claims, space-token deposits/claims, and liquidity crank. |
| Space Vault IDL Account | `4SQth9AnyuDe636K91kzBQVCz3mEFrEm6jmdJWJhVFZu` | Program IDL account. |
| Earth Vault Program | `J3jkrtAqnr7Vs6evka3wdugjdagwUJhGj3Mzae6wdABB` | Anchor program scaffold for Earth character payment receipts, SOL splits, EARTH Token-2022 issuance into escrow, escrow-backed deposits/withdrawals, and reconciliation events. Not yet deployed to devnet. |

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
| EARTH | `Efsr6ojnLaV3SyMmNsXjvZDkyv9CXvMnDBHs5oo5Va1d` | Token-2022 | Devnet mint, 9 decimals, symbol `EARTH`, freeze authority disabled. Transferable wallet token and backing asset for Earth in-game balances. Supply is uncapped but issuance is governed by mint-run capacity, SOL inflows, and configured liquidity/reserve policy. Mint authority is the Earth Vault config PDA `CNmLSq3tNMafpShBQoscMq1XZc9VmExy2e94VRo1Y6Bv`. |

ASTRDS mint authority is held by the `VaultConfig` PDA. Direct keypair `mintTo` is not the intended path; gameplay rewards leave the vault/program path through authorized instructions.

EARTH mint authority is the Earth Vault config PDA derived from `['earth-vault-config', deployer_authority]` for program `J3jkrtAqnr7Vs6evka3wdugjdagwUJhGj3Mzae6wdABB`:

| Field | Value |
|---|---|
| Deployer/config authority | `jrXCZwP8bxDnGs7ChD4F77We1K4J89R53SAVk5HsSoE` |
| Earth Vault config PDA / EARTH mint authority | `CNmLSq3tNMafpShBQoscMq1XZc9VmExy2e94VRo1Y6Bv` |
| PDA bump | `255` |
| Devnet mint creation signature | `rrtJmCWQpuMMoVSQyhR6f5DusnSVFJv1WiTuxPmFKkau2zwa52u2KRXWCRTe4dRP1KyouqQNuGMT5rJQGTMcbJm` |

The devnet EARTH mint currently has supply `0`; supply should be created only through Earth Vault instructions that mint directly into the config-owned escrow ATA after config initialization. Freeze authority is unset for v1. No Token-2022 extensions are enabled in v1 until a specific product/security requirement justifies one.

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

Earth client (apps/earth)
  - wallet adapter
  - character mint, buy EARTH, deposit, and withdraw transaction builders
  - normal gameplay spends in-game EARTH without per-action wallet signatures

server/earth
  - authoritative ASTRDS WebSocket game loop
  - verifies active Convex game sessions
  - submits server-owned game results and settlement writes
  - verifies Earth Vault receipts, mints character NFTs/metadata, writes R2 media, and authorizes EARTH withdrawals

Convex
  - sessions, gameSessions, scores, chat
  - spawn tickets, collections, claims
  - Earth characters, inventory, market state, and fast in-game EARTH ledger
  - ed25519 authorization actions for mint/claim/settlement/withdrawal
  - Helius webhook + reconciliation logic

Solana
  - Space Vault Program
  - Earth Vault Program
  - ASTRDS Token-2022 mint
  - EARTH Token-2022 mint
  - Earth escrow vault ATA(s)
  - DepositPool vault ATAs
  - Meteora DAMM v2 pools
```

## Planned Earth Vault v1

The Earth Vault Program should remain separate from the ASTRDS Space Vault Program. It should own payment, issuance, escrow, and bridge edges for Earth while `server/earth` continues to own character media/NFT production.

Current scaffold:

- Program crate: `programs/earth-vault-program`
- Program ID: `J3jkrtAqnr7Vs6evka3wdugjdagwUJhGj3Mzae6wdABB`
- Anchor config: `Anchor.toml` includes the program for localnet and devnet.
- Build/test before deploy: `anchor build` and `cargo test -p earth-vault-program`.
- Devnet deploy, when ready: `anchor deploy --program-name earth_vault_program --provider.cluster devnet`; then initialize `EarthVaultConfig` using the documented deployer/config authority and create the config-owned EARTH escrow ATA. The devnet EARTH Token-2022 mint already exists with the config PDA as mint authority.

The scaffold is intentionally not coupled to Space Vault accounts.

### EARTH Token-2022 authority model

- Token metadata decision: use name `Earth`, symbol `EARTH`, 9 decimals. In v1, token metadata should be published through the standard Solana token metadata path after final art/URI are selected; the initial mint intentionally does not enable Token-2022 metadata pointer or transfer-hook extensions.
- Extension decision: no transfer fees, no transfer hooks, no confidential transfer, no permanent delegate, and no freeze authority for v1. Keep the token simple and transferable unless a later audited requirement changes this.
- Mint authority: Earth Vault config PDA `CNmLSq3tNMafpShBQoscMq1XZc9VmExy2e94VRo1Y6Bv`; no hot wallet should mint EARTH directly.
- Escrow custody: the config-owned EARTH escrow ATA backs vault-era in-game EARTH balances. Reconciliation invariant remains `escrow balance >= available in-game EARTH + pending withdrawals`.
- Emergency controls: use Earth Vault pause flags to halt character payments, buys, deposits, or withdrawals independently. Authority rotation should be a deliberate config update by the deployer/config authority until a DAO/multisig authority is installed.

Mainnet launch checklist:

1. Deploy/audit the Earth Vault Program and confirm the mainnet program ID.
2. Choose the final config authority, preferably a DAO/multisig rather than a single deployer wallet.
3. Derive and record the mainnet Earth Vault config PDA.
4. Create the mainnet EARTH Token-2022 mint with 9 decimals, no freeze authority, and mint authority set to the config PDA.
5. Publish final token metadata for name `Earth`, symbol `EARTH`, and canonical URI/art.
6. Initialize `EarthVaultConfig` with production split bps, run pricing, wallets, and server/Convex authority.
7. Create the config-owned EARTH escrow ATA and verify the backing reconciliation path before enabling production credits.
8. Keep all pause flags enabled until server, Convex ledger, frontend transactions, and withdrawal authorization paths are smoke-tested.

### Earth Vault v1 accounts

| Account | Purpose |
|---|---|
| `EarthVaultConfig` | Authority/config PDA: EARTH mint, DAO treasury, operations wallet, reserve/liquidity wallet, explicit run pricing, split bps, pause flags, server/Convex authority, and config signer bump. |
| `CharacterMintReceipt` | Replay-protected receipt proving a wallet paid the SOL character mint fee through the vault. Consumed by `server/earth` before NFT mint finalization. |
| `EarthEscrow` | Config-owned Token-2022 vault ATA holding EARTH that backs withdrawable in-game balances. |
| `PurchaseReceipt` | Replay-protected record for SOL -> EARTH buys credited directly to game escrow. |
| `DepositReceipt` | Record of wallet EARTH deposited into game escrow. |
| `WithdrawalRecord` | Replay protection for authorized withdrawal from game escrow back to wallet. |

### Character mint payment

```txt
Player signs Earth Vault character_payment
  -> SOL split to DAO treasury, operations, and EARTH liquidity/reserve path
  -> starter EARTH minted/credited into EarthEscrow for the player/game ledger
  -> CharacterMintReceipt PDA created
  -> server/earth verifies receipt, uploads character media, creates Convex character, mints NFT to player wallet, and consumes/finalizes the receipt
```

The Earth Vault should not mint the character NFT in v1. NFT minting depends on server-side rendered images, R2 metadata, selected visual layers, starter inventory, and collection verification. The program should own the financial truth; `server/earth` should own media/NFT production after receipt verification. Receipt consumption should be on-chain or otherwise replay-protected so one payment receipt cannot mint multiple character NFTs.

### Buy EARTH

```txt
Player signs buy_earth with SOL
  -> SOL follows configured reserve/liquidity/treasury policy
  -> EARTH is minted/transferred into EarthEscrow at the configured run price
  -> PurchaseReceipt PDA/event is created
  -> Convex/server credits immediately withdrawable in-game EARTH
```

Purchased EARTH should go directly to game escrow/in-game balance, not wallet first.

### Deposit / withdraw EARTH

```txt
Deposit: wallet EARTH -> EarthEscrow -> Convex/server credits in-game EARTH
Withdraw: Convex/server debits in-game EARTH -> signed authorization -> Earth Vault releases EARTH to wallet
```

The bridge must be clean and non-punitive. Vault-era in-game EARTH is immediately withdrawable and must be backed by escrow. Withdrawals should use a two-phase ledger lifecycle: available balance becomes pending withdrawal before authorization, then finalizes or returns to available on expiry/cancel. Legacy pre-vault `character.earth` balances are not mainnet liabilities and may be reset, ignored, or migrated as non-production data during cutover. Reconciliation invariant for vault-era credits: `EarthEscrow balance >= available in-game EARTH + pending withdrawals`.

## Current Space Vault flows

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
