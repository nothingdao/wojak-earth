# Issue #16: add support for sol in token launch

- Source: https://github.com/nothingdao/astrds/issues/16
- State: CLOSED
- Labels: enhancement, area:economy, area:onchain, area:frontend, phase:pre-mainnet, type:implementation, priority:high
- Assignees: none
- Created: 2026-04-27T02:38:56Z
- Updated: 2026-04-30T01:48:00Z
- Closed: 2026-04-30T01:48:00Z

## Body

## Goal

Add first-class support for launching **native SOL** into Space, alongside the existing SPL / Token-2022 token launch flow.

Today `SendToSpaceOverlay` and `TokenManager` only list token accounts returned by `getWalletTokens()`. Players should also be able to choose their wallet's SOL balance, configure spawn rules the same way, and "yeet SOL into space" so other players can collect and claim it from gameplay.

## Product behavior

- In token launch UI, show SOL as a launchable asset even though it is not an SPL token account.
- The SOL option should use the same configuration controls as SPL tokens:
  - amount to launch
  - SOL per pill / collectible
  - min/max level
  - spawn mode (`steady`, `escalating`, `wave`) and related cadence settings
- Depositing SOL should move real wallet SOL into the existing on-chain vault architecture.
- Spawn, collection, HUD display, pending claims, claim history, and Account screen should treat SOL like any other space collectible, with a clear `SOL` label and native-SOL-friendly formatting.
- Claiming SOL should be user-friendly. Preferred: recipient ends with native SOL in wallet. Acceptable MVP: recipient receives wrapped SOL (`WSOL`) with clear UI copy and/or an automatic unwrap when safe.

## Recommended implementation approach

Use canonical wrapped SOL so the existing SPL-token vault path can be reused:

- Mint: `So11111111111111111111111111111111111111112`
- Token program: legacy SPL Token (`TOKEN` / `TOKEN_PROGRAM_ID`)
- Internal representation: store SOL deposits in `spaceDeposits` as a normal deposit whose `mintAddress` is the native mint address and whose raw units are lamports (`decimals = 9`).

This keeps the current `DepositPool PDA -> vaultAta` model intact. Do **not** send native SOL directly to the treasury wallet or to a random system account. The deposit destination remains the `DepositPool PDA`'s ATA, exactly like other launched tokens.

## Key technical notes / gotchas

- Native SOL has no mint account in the user's wallet and no token account unless it is wrapped.
- Existing on-chain `deposit` and `claim` instructions use `transfer_checked` on token accounts, so they can support SOL only as WSOL unless the program is extended with separate native-SOL instructions.
- Existing `DepositPool` PDA seeds are `['deposit-pool', depositor, mint]`. For SOL, `mint` should be the native mint (`So111...`).
- Existing `spaceDeposits.programId` should be `TOKEN` for SOL / WSOL.
- Existing balance verification reads the vault ATA balance. This should work for WSOL after `sync_native`.
- Be careful not to close a user's pre-existing WSOL ATA unexpectedly. Only auto-close / unwrap accounts that this flow created or temporary accounts that are known safe to close.
- Amount validation must reserve enough SOL for rent + tx fees + any temporary WSOL ATA creation. Do not allow users to launch their entire balance and strand themselves without fee SOL.

## Implementation checklist

### Frontend asset discovery / selection

- Update wallet token utilities and/or callers so SOL appears as a pseudo-token:
  - symbol/name: `SOL` / `Solana`
  - mintAddress: `So11111111111111111111111111111111111111112`
  - programId: `TOKEN`
  - decimals: `9`
  - uiBalance/raw balance from `connection.getBalance(wallet)`
  - logo can use existing Solana asset if available, otherwise fallback initials/color.
- Update `SendToSpaceOverlay` and `TokenManager` so selecting SOL works like selecting any SPL token.
- Defaults should make sense for SOL (do not default to `100` SOL per pill). Consider tiny devnet-friendly defaults such as `0.001` SOL per pill, but validate against actual deposit amount.
- Update formatting helpers to avoid showing huge raw lamport counts and to display SOL with up to 9 decimals where needed.

### Deposit transaction builder

Add SOL-aware behavior to `buildSendToSpaceTransaction` / wrapper:

- For non-SOL tokens, keep current behavior.
- For SOL:
  1. Derive the same DepositPool PDA using native mint.
  2. Ensure the pool and vault ATA exist (`registerPool` path should still work).
  3. Wrap the user's native SOL into a WSOL token account.
     - Preferred safe pattern: create/use a temporary WSOL token account owned by the depositor, fund with lamports, `sync_native`, use it as `depositorTokenAccount`, then close it back to the depositor after `deposit` if empty.
     - Alternative: use the user's native mint ATA, but only close it if this flow created it and it is empty after deposit.
  4. Call existing `deposit(amount)` with lamports as raw amount.
  5. Confirm and record pool state as today.

### Convex / data model

- Ideally no schema change is required if SOL is represented as WSOL/native mint.
- Ensure `registerDepositIntent`, `confirmDepositFromChain`, `verifyAndConfirmDeposit`, reconcile actions, active pool queries, spawn tickets, collections, and claims handle `mintAddress === So111...` without special failures.
- Add helper constants so all code uses one native mint value and one `isSolDeposit()` predicate instead of string literals everywhere.
- Confirm Helius/webhook/reconcile paths work with native mint vault ATAs.

### Claim transaction builder / UX

- Existing `buildClaimTransaction` will transfer WSOL from vault ATA to the player's WSOL ATA.
- Improve UX for SOL claims:
  - If the player's WSOL ATA did not exist before this claim, append `closeAccount` after the claim transfer to unwrap into native SOL.
  - If the player's WSOL ATA already existed, do not auto-close it unless the user explicitly chooses to unwrap.
  - UI copy should say either "Claim SOL" if it will unwrap, or "Claim WSOL" / "Claim SOL (as WSOL)" if not.
- Ensure finalization (`finalizeClaim`) still records successful tx signatures exactly once.

### Game display

- Ensure token color/icon generation handles native mint consistently.
- HUD and claim screens should display `SOL`, not `WSOL` or the native mint address.
- Amounts must be formatted with 9 decimals and sensible trimming.

### Tests / validation

Please add or run coverage for:

- Building a SOL deposit transaction on devnet/local validator.
- Deposit creates/uses `DepositPool` for native mint and vault ATA contains WSOL lamports.
- Convex verification marks SOL deposit active with correct `totalAmount` / `remainingAmount`.
- Game server can request SOL spawn ticket and collect from SOL pool.
- Claiming SOL succeeds and decrements the on-chain pool.
- If auto-unwrapping is implemented, test both cases:
  - player had no WSOL ATA before claim -> ends with native SOL and no dangling WSOL ATA
  - player had pre-existing WSOL ATA -> no surprise close

## Files likely involved

- `app/src/components/space/SendToSpaceOverlay.tsx`
- `app/src/components/account/TokenManager.tsx`
- `app/src/utils/walletTokens.ts`
- `app/src/lib/tokenTransfer.ts`
- `app/src/lib/spaceVault.ts`
- `app/convex/spaceDeposits.ts`
- `app/convex/spaceDepositsActions.ts`
- `app/convex/webhookHandlers.ts`
- `shared/game/simulation.ts` / display metadata consumers if SOL needs special color/icon handling
- Optional tests under `tests/` and/or frontend/Convex test scripts

## Acceptance criteria

- A connected wallet can choose SOL in the launch UI and deposit it into Space.
- The deposit is verified from chain and becomes an active pool in Convex.
- SOL collectibles can spawn during gameplay using the existing server-authoritative spawn ticket flow.
- Collected SOL appears in pending claims and can be claimed on-chain.
- User-facing labels and amounts are clear and correct (`SOL`, 9 decimals, no raw lamports).
- No existing SPL / Token-2022 launch, spawn, collect, or claim flow regresses.


## Comments

### whaleen — 2026-04-30T01:47:59Z

Implemented native SOL launch support via WSOL/native mint path. Commit: 4ebb754
