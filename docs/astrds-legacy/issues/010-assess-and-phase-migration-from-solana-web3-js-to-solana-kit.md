# Issue #10: Assess and phase migration from @solana/web3.js to @solana/kit

- Source: https://github.com/nothingdao/astrds/issues/10
- State: OPEN
- Labels: area:onchain, area:infra, type:audit, priority:low
- Assignees: none
- Created: 2026-04-24T20:25:49Z
- Updated: 2026-04-30T01:38:59Z

## Body

## Summary

This repo is still built around `@solana/web3.js` 1.x across the frontend, server, Convex actions, scripts, and tests. `@solana/kit` is not a drop-in replacement here. The migration is feasible, but only as a phased refactor with a clear compatibility boundary around wallet integration and Anchor.

Official context: `@solana/kit` is the renamed 2.x line of `@solana/web3.js`, with a new modular API surface: https://github.com/anza-xyz/kit

## Current State Audit

### Direct `@solana/web3.js` usage in runtime code
- Frontend RPC/client utilities: `app/src/lib/solana.ts`, `app/src/lib/tokenomics.ts`, `app/src/lib/tokenTransfer.ts`, `app/src/utils/tokenBalances.ts`, `app/src/utils/walletTokens.ts`, `app/src/screens/tokenomics/TokenomicsScreen.tsx`, `app/src/components/space/SendToSpaceOverlay.tsx`, `app/src/screens/gameover/SpaceTokenClaim.tsx`, `app/src/components/account/TokenBurnPanel.tsx`, `app/src/auth/AuthService.ts`
- Frontend wallet/provider types: `app/src/App.tsx`, `app/src/types/wallet.ts`
- Anchor program client / transaction construction: `app/src/lib/spaceVault.ts`
- Server RPC reads: `server/src/game/emissionTiers.ts`
- Convex Node actions: `app/convex/vaultHealth.ts`, `app/convex/tokens.ts`, `app/convex/spaceDepositsActions.ts`, `app/convex/devTools.ts`
- Scripts/tests: `scripts/initialize-vault.ts`, `scripts/initialize-vault.js`, `tests/space-vault-program.ts`

### Compatibility hotspots
- The frontend currently uses `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`, and `@solana/wallet-adapter-wallets` in `app/src/App.tsx`. Those APIs are still built around web3.js-era connection and transaction types.
- Program interactions in `app/src/lib/spaceVault.ts` depend on `@coral-xyz/anchor` plus web3.js transaction primitives (`Connection`, `PublicKey`, `Transaction`, `SystemProgram`, `Ed25519Program`, PDA derivation).
- Convex/server code mostly uses web3.js for read-only RPC/account work, which is the easiest migration surface.

## Recommendation

Do **not** try to replace every `@solana/web3.js` import in one pass.

Instead, treat this as:
1. A **read-only RPC/account-access migration** that can move to `@solana/kit` first.
2. A **wallet + transaction-signing boundary decision** that may need to remain on web3.js temporarily.
3. An **Anchor compatibility decision** that likely determines whether some runtime paths keep web3.js for now.

## Proposed Implementation Plan

### Phase 0: Decide the migration target
Define what “implement Kit” means for this repo:
- Option A: `@solana/kit` becomes the default RPC/account library, while web3.js stays only where wallet-adapter or Anchor requires it.
- Option B: eliminate all direct runtime `@solana/web3.js` imports from app/server code, while allowing tooling/tests to lag.
- Option C: full end-to-end migration including wallet flows, Anchor client code, Convex actions, scripts, and tests.

Recommendation: start with **Option A**, then reevaluate.

### Phase 1: Introduce a Solana client boundary
Create a small internal abstraction instead of importing SDK types everywhere.

Suggested targets:
- Frontend: replace ad hoc `Connection` creation and direct RPC calls behind a single client module.
- Server: do the same for `server/src/game/emissionTiers.ts` and any future RPC reads.
- Convex actions: isolate account fetch / balance / signature lookup helpers behind a server-side Solana client module.

Minimum boundary should cover:
- RPC transport/client creation
- address/public key parsing
- account fetches
- token account balance reads
- SOL balance reads
- signature / transaction lookups where needed

The point of this step is to shrink the blast radius before swapping SDKs.

### Phase 2: Migrate read-only RPC code to `@solana/kit`
Best first-wave candidates:
- `app/src/lib/solana.ts`
- `app/src/lib/tokenomics.ts`
- `server/src/game/emissionTiers.ts`
- `app/src/utils/tokenBalances.ts`
- `app/src/utils/walletTokens.ts`
- Convex read-only actions in `app/convex/*` that do not build/sign transactions

Acceptance criteria for this phase:
- No direct `Connection` usage in the migrated modules
- Same devnet/mainnet behavior as today
- No browser-specific regressions in tokenomics, balance lookups, or server-side emission-tier reads

### Phase 3: Decide the wallet boundary
The frontend currently depends on wallet-adapter. Before migrating transaction flows, confirm the intended wallet strategy:
- Keep `@solana/wallet-adapter-*` and add conversion shims at the boundary
- Move toward Wallet Standard / Kit-native signing where possible
- Use a bridge layer that can consume wallet-adapter output and produce Kit-compatible signers/messages

This decision affects:
- `app/src/App.tsx`
- `app/src/types/wallet.ts`
- `app/src/auth/AuthService.ts`
- any screen/component that calls `wallet.signTransaction(...)`

### Phase 4: Rework transaction builders and Anchor-facing code
Hardest migration surface:
- `app/src/lib/spaceVault.ts`
- payment flow in `app/src/auth/AuthService.ts`
- burn/claim/deposit flows

Open question here is whether current Anchor client usage should:
- remain on web3.js behind a compatibility module, or
- be rewritten against whatever Anchor officially supports once the wallet boundary is solved

If Anchor still expects web3.js-era types, isolate that code instead of forcing a partial rewrite across the app.

### Phase 5: Migrate tooling and tests
After runtime paths are stable:
- `scripts/initialize-vault.ts`
- `tests/space-vault-program.ts`
- any local maintenance scripts

This should be last, not first.

## Deliverables
- Dependency and API migration plan approved
- Shared internal Solana client boundary introduced
- Read-only RPC/account modules migrated to Kit
- Explicit decision documented for wallet-adapter compatibility
- Explicit decision documented for Anchor compatibility
- Follow-up issues created for transaction-flow migration and tooling/test migration if those remain separate

## Risks / Notes
- This is **not** a package rename. Kit’s API model is different from web3.js 1.x.
- Wallet adapter and Anchor are the real blockers, not raw RPC reads.
- SPL helper usage may also need review because some current helpers assume web3.js key/transaction types.
- The server is the easiest place to adopt Kit first because it has no browser wallet integration.

## Clarifying Questions
- Is the goal to remove `@solana/web3.js` from all runtime code, or just make `@solana/kit` the primary library for new work?
- Are we willing to keep web3.js at the wallet/Anchor boundary temporarily if that materially lowers migration risk?
- Do we want to keep `@solana/wallet-adapter-*`, or is switching to a Wallet Standard / Kit-first wallet flow in scope?
- Should Convex actions be migrated in the first pass, or should the first implementation stop at frontend/server read-only RPC usage?
- Is Anchor program-client code (`app/src/lib/spaceVault.ts`) in scope for the initial migration, or should that be explicitly deferred to a follow-up issue?

## Suggested Follow-up Breakdown
If this issue is accepted, split implementation into at least these tasks:
1. Introduce internal Solana client abstraction.
2. Migrate frontend/server read-only RPC utilities to Kit.
3. Decide and implement wallet boundary strategy.
4. Decide and implement Anchor/program-client strategy.
5. Migrate scripts/tests.

