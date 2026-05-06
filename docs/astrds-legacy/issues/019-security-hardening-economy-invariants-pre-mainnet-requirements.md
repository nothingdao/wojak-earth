# Issue #19: Security hardening + economy invariants: pre-mainnet requirements

- Source: https://github.com/nothingdao/astrds/issues/19
- State: CLOSED
- Labels: none
- Assignees: none
- Created: 2026-04-28T04:55:44Z
- Updated: 2026-04-28T06:21:19Z
- Closed: 2026-04-28T06:21:19Z

## Body

## Context

The core game loop, authoritative server, on-chain minting, and buyback/LP flywheel are all working on devnet. This issue captures the remaining security vulnerabilities and economy invariants that must be fixed before mainnet. It supersedes the raw AI audit files which have been consolidated into \`docs/security.md\`.

**Read before starting:**
- \`docs/security.md\` — full findings with severity and context
- \`docs/chain.md\` — on-chain addresses, PDAs, flow diagrams
- \`AGENTS.md\` — repo structure, stack, key files

---

## Security Fixes (implement in this order)

### 1. verifyPayment — add real on-chain verification
**File:** \`app/convex/verifyPayment.ts\`
**Severity:** HIGH — currently anyone can pass any string as txSignature and get a free verifiedSession

The action must:
- Fetch the transaction by signature using Solana RPC (\`connection.getTransaction(txSignature, { commitment: 'confirmed' })\`)
- Confirm it succeeded (not null, no err)
- Confirm the fee payer / signer matches \`walletAddress\`
- Confirm the transaction called the Space Vault program (\`4bRZK8XfziVhLCgvtRdFJyTgN6tXGSPJT8xfbtt1AxBB\`)
- Confirm the instruction was \`game_payment\` (check discriminator)
- Confirm lamports paid meet the current quarter price (read from \`gameConfig.quarterUsd\` + live SOL/USD)
- Check \`txSignature\` is not already stored in \`verifiedSessions\` (deduplicate)

The \`SOLANA_RPC_ENDPOINT\` env var is already available in Convex. The file is already \`"use node"\` so RPC calls work.

---

### 2. SessionHandler fail-open — reject on Convex error
**File:** \`server/src/ws/SessionHandler.ts\` lines ~146–156
**Severity:** HIGH — Convex timeout/outage currently admits unverified players for free

Change:
\`\`\`ts
// BEFORE — fail open
let isVerified = true
try {
  isVerified = await this.convex.isVerifiedSession({ walletAddress })
} catch {
  isVerified = true  // ← wrong
}

// AFTER — fail closed
let isVerified = false
try {
  isVerified = await this.convex.isVerifiedSession({ walletAddress })
} catch (error) {
  console.error('Session verification failed; rejecting connection', { error })
  // isVerified stays false — connection will be closed below
}
\`\`\`

---

### 3. clearSession — prevent griefing via unowned session deletion
**File:** \`app/convex/sessions.ts\`
**Severity:** MEDIUM — public mutation, anyone can delete any wallet's paid session

\`clearSession\` is currently a public mutation that accepts \`walletAddress: v.string()\` with no ownership check. A player can invalidate another player's paid quarter by calling it from the browser console.

Options (pick one):
- **Preferred:** Convert to \`internalMutation\` and call it only from server-side flows (the game server can POST to a new HTTP endpoint similar to \`/game-server/set-astrds-earned\`)
- **Alternative:** Add a \`clearSession\` HTTP endpoint gated by \`ADMIN_API_KEY\`, remove the public mutation

Update \`app/src/auth/AuthService.ts\` and \`app/src/hooks/useAuth.ts\` which currently call \`api.sessions.clearSession\` directly — route them through the new endpoint.

---

### 4. prepareClaims — prevent double-signing window
**File:** \`app/convex/spaceDepositsActions.ts\`
**Severity:** MEDIUM — two rapid calls before finalizeClaim yields two valid signatures for the same tokens

Before generating any signature, mark the relevant collections as \`status: 'claiming'\`. Only process collections with \`status: 'pending'\`. This closes the window between signing and finalization.

\`\`\`ts
// Before signing each deposit's collections:
for (const col of cols) {
  await ctx.runMutation(internal.spaceDeposits.markCollectionClaiming, { id: col._id })
}
// If tx fails on-chain, client should call a revert mutation to reset status back to 'pending'
\`\`\`

Add:
- \`markCollectionClaiming\` internalMutation in \`spaceDeposits.ts\`
- \`revertClaimingCollections(collectionIds)\` public mutation for client to call on failed tx
- Update schema if \`'claiming'\` is not already a valid status value

---

### 5. Session consumption — enforce 1 quarter = 1 game
**File:** \`app/convex/sessions.ts\`, \`server/src/ws/SessionHandler.ts\`
**Severity:** MEDIUM — 30-minute window currently allows multiple games per payment

When the game server admits a connection (after \`isVerified = true\`), immediately consume the verifiedSession so it cannot be reused.

Add an HTTP endpoint \`POST /game-server/consume-session\` (same pattern as \`/game-server/set-astrds-earned\`):
- Convex httpAction validates \`ADMIN_API_KEY\`
- Calls \`internalMutation\` that sets \`verifiedSessions.consumed = true\` or deletes the record
- \`isVerified\` query must also check \`!session.consumed\`

Game server calls this immediately after session verification succeeds.

---

## Economy Fixes

### 6. Enforce 21M ASTRDS hard cap in on-chain program
**File:** \`programs/space-vault-program/src/lib.rs\`
**Severity:** HIGH for mainnet — cap is currently frontend-only

Inside the \`mint_astrds\` instruction handler, after signature verification and before the CPI mintTo:

\`\`\`rust
const ASTRDS_SUPPLY_CAP_RAW: u64 = 21_000_000_000_000_000; // 21M with 9 decimals

require!(
    ctx.accounts.astrds_mint.supply
        .checked_add(amount)
        .ok_or(SpaceVaultError::MathOverflow)?
        <= ASTRDS_SUPPLY_CAP_RAW,
    SpaceVaultError::SupplyCapExceeded
);
\`\`\`

Add \`SupplyCapExceeded\` and \`MathOverflow\` error variants if not present.

Add Anchor tests in \`tests/space-vault-program.ts\`:
- mint below cap succeeds
- mint at exactly the cap succeeds  
- mint 1 lamport over cap fails with \`SupplyCapExceeded\`

---

### 7. Fix fractional tier-5 emission (Math.floor rounds down 0.5 ASTRDS/pill)
**Files:** \`server/src/ws/SessionHandler.ts\`, \`app/convex/tokens.ts\`, \`app/convex/gameSessions.ts\`, \`shared/game/protocol.ts\`

At tier 5, \`astrdsPerPill = 0.5\`. The current path uses \`Math.floor\`, so a player collecting 99 pills earns 49 ASTRDS instead of 49.5. ASTRDS has 9 decimals so fractional amounts are supported by the mint.

Migration path:
- In \`SessionHandler.ts\`, compute raw lamport-scale amount: \`BigInt(pillsCollected) * BigInt(astrdsPerPillRaw)\` where \`astrdsPerPillRaw\` is the tier value × 10^9 as a bigint
- Store as a string in Convex: add \`astrdsEarnedRaw: v.optional(v.string())\` to \`gameSessions\` schema alongside existing \`astrdsEarned\`
- In \`prepareMint\`, use \`astrdsEarnedRaw\` when present (fall back to \`astrdsEarned * 10^9\` for old sessions)
- Remove the \`Number.isInteger(tokenCount)\` check; accept a raw bigint string instead of an integer count
- Display layer: divide raw amount by 10^9 for UI display

---

### 8. Remove legacy mintTokens action
**File:** \`app/convex/tokens.ts\`

The old direct-mint action bypasses the on-chain \`mint_astrds\` path. It fails today because mint authority transferred to the VaultConfig PDA, but it's dead API surface.

Replace with a stub that throws:
\`\`\`ts
export const mintTokens = action({
  args: {},
  handler: async () => {
    throw new Error('Disabled — use prepareMint + mint_astrds on-chain instruction')
  },
})
\`\`\`

Or delete entirely and remove any stale references.

---

### 9. Align game server SOL/USD source with Convex price feed
**File:** \`server/src/game/emissionTiers.ts\`
**Current:** calls \`api.jup.ag\` directly
**Should use:** same Coinbase → Binance → CoinGecko fallback chain as \`app/convex/prices.ts\`

Add a \`GET /prices/sol-usd\` HTTP endpoint to Convex (same pattern as other HTTP routes) that proxies the cached Convex price to callers. Game server calls this instead of Jupiter. This also decouples the server from an external API dependency.

---

### 10. Burn accounting per game session
**Files:** \`app/convex/schema.ts\`, \`app/convex/gameSessions.ts\`, \`server/src/ws/SessionHandler.ts\`, \`server/src/convex/client.ts\`

The stated model is "50 ASTRDS reserved per game; uncollected amount burned." Currently uncollected allocation is simply never minted — no reservation or burn record exists. \`BURNED_ASTRDS_STUB = 0\` in the frontend.

At game over, the server should write:
\`\`\`ts
astrdsAllocated: 50,           // always 50
astrdsEarned: <actual>,        // what player collected
astrdsBurned: 50 - earned,     // accounting burn (not a real on-chain burn tx)
\`\`\`

Add these fields to the \`gameSessions\` schema. Expose cumulative \`totalAstrdsBurned\` in \`getEconomyStats\`. Use it in the Tokenomics overlay instead of the stub.

---

## Out of Scope for This Issue

- Leaderboard score inflation via \`gameSessions.update\` — cosmetic only, no token impact
- \`gameSessions.create\` spam — DB pollution with no financial impact
- 420,000 game cap enforcement — design decision, not a security issue
- Pricing formula alignment (AMM spot vs burn-adjusted) — needs a separate design decision first
- Anchor test suite expansion beyond supply cap — tracked elsewhere

---

## Reference

- \`docs/security.md\` — full findings with severity ratings
- \`docs/chain.md\` — on-chain addresses, PDAs
- \`AGENTS.md\` — repo structure, key files, stack
- Space Vault Program ID: \`4bRZK8XfziVhLCgvtRdFJyTgN6tXGSPJT8xfbtt1AxBB\`
- ASTRDS Mint: \`5sqKSHDKZr4KbNzj972PSfmEhtR9eLeBvv1nBRbeQAnB\`
- VaultConfig PDA: \`6zsWYibNCYYQJikHv8BHXRNynEACgFKsZPNXqWqBPbvv\`
- Convex authority keypair: \`CNhWD1cXNaCMcjJmFcK25aFgV3ZTAFtyFDBvGfKZcpzF\` (signs ed25519 auth, does NOT hold mint authority)


## Comments

### whaleen — 2026-04-28T06:21:17Z

Resolved in commits:\n- 08d4ae4 Harden payment sessions and ASTRDS minting\n- 0435900 Repair app TypeScript checks\n- fc624dc Update project docs and agent config\n\nValidation passed:\n- cd app && pnpm exec tsc --noEmit\n- cd app && pnpm exec convex dev --once\n- cd server && pnpm exec tsc --noEmit\n- cargo check -p space-vault-program\n- Type-check of tests/space-vault-program.ts\n\nNote on failed/non-applicable test: a root-level `npx tsc --noEmit -p tsconfig.json` run failed because the root tsconfig is not configured for the app workspace (no JSX/DOM/path settings and it scans unrelated app/server/node_modules/scripts). The canonical app check `cd app && pnpm exec tsc --noEmit` passes after the fixes.\n\nSupply-cap Anchor tests were added, but the destructive devnet cap-fill cases are gated behind `RUN_ASTRDS_SUPPLY_CAP_TESTS=1` so normal test runs do not accidentally mint the live devnet ASTRDS supply to the 21M cap.

### whaleen — 2026-04-28T06:21:19Z

Closing as resolved by the commits above. See validation note for the root TypeScript test caveat and gated supply-cap tests.
