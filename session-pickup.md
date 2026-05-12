# Session Pickup Prompt — Earth Vault Frontend (#43)

We are in `/Users/josh/Projects/_nothingdao/earth`.

## First read

- `AGENTS.md`
- `docs/open-issues.md`
- `docs/harmonization-roadmap.md`
- `docs/architecture.md`
- `docs/vision.md`
- `docs/deployment.md`
- `docs/env-vars.md`
- `docs/economy.md`
- `docs/chain.md`
- `docs/storage.md`

Then inspect the target issue:

```bash
gh issue view 43 --json number,title,body,comments,labels
```

Important operating rule: GitHub issues are the canonical work queue. Do not create or expand Markdown TODO lists, roadmaps, or issue inventories as substitutes for GitHub issues. Keep persistent docs concise and current.

## Current repository state

Latest main includes the Earth Vault groundwork:

- #39 closed — Earth Vault Anchor scaffold exists in `programs/earth-vault-program`.
- #40 closed — devnet EARTH Token-2022 mint exists and is documented.
- #41 closed — Convex escrow-backed EARTH ledger and reconciliation are implemented.
- #42 closed — `server/earth` verifies and finalizes Earth Vault `CharacterMintReceipt` accounts for character minting.
- #37 closed — Earth map/location model is repaired; static map geometry lives in `apps/earth/src/data/earthMapManifest.ts`; location admin editing now lives in map `ZONE_ANALYSIS`.

Working tree should be clean at session start. If not, inspect before editing.

## Target for the next session

Work issue #43: Earth frontend vault transactions — mint payment, buy, deposit, withdraw.

Already done for #43:

- `apps/earth/src/components/SimplePayment.tsx` no longer sends direct SOL to treasury for character creation.
- It builds an Earth Vault `character_payment` instruction, creates a `CharacterMintReceipt` PDA, and passes receipt id/address to `server/earth`.
- `CharacterCreationView` retries character creation with the same receipt.
- `pnpm --filter earth-2089 build` passed for that character-payment slice.

Still to finish for #43:

- Replace legacy `EarthBridge` / `/earth/bridge` UI usage with Earth Vault v1 flows.
- Add buy EARTH flow that creates an Earth Vault `buy_earth` receipt and credits game escrow/in-game balance directly.
- Add deposit flow: wallet EARTH Token-2022 -> Earth Vault escrow -> Convex ledger credit.
- Add withdraw flow: Convex ledger pending withdrawal + server authorization -> Earth Vault releases EARTH to wallet.
- Show receipt/signature/status clearly and make bridge movement feel clean/non-punitive.
- Keep ordinary gameplay spends signature-free.

## Current on-chain/devnet constants

From `docs/chain.md` / `docs/env-vars.md`:

- Earth Vault Program: `J3jkrtAqnr7Vs6evka3wdugjdagwUJhGj3Mzae6wdABB`
- Earth Vault config PDA / EARTH mint authority: `CNmLSq3tNMafpShBQoscMq1XZc9VmExy2e94VRo1Y6Bv`
- EARTH Token-2022 mint: `Efsr6ojnLaV3SyMmNsXjvZDkyv9CXvMnDBHs5oo5Va1d`
- Character mint price default: `50000000` lamports (0.05 SOL)
- Token program: Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

Frontend env vars documented:

- `VITE_EARTH_VAULT_PROGRAM_ID`
- `VITE_EARTH_VAULT_CONFIG_ADDRESS`
- `VITE_EARTH_TOKEN_2022_MINT`

Server env vars documented:

- `EARTH_VAULT_PROGRAM_ID`
- `EARTH_VAULT_CONFIG_ADDRESS`
- `EARTH_TOKEN_2022_MINT`
- `EARTH_CHARACTER_MINT_PRICE_LAMPORTS`

## Relevant implementation files

Frontend:

- `apps/earth/src/components/SimplePayment.tsx` — current character-payment Earth Vault transaction builder.
- `apps/earth/src/components/views/CharacterCreationView.tsx` — passes receipt info to server.
- `apps/earth/src/components/EarthBridge.tsx` — legacy bridge UI; should be replaced/refactored for #43, not expanded as legacy treasury bridge.
- `apps/earth/src/components/views/EarthMarket.tsx` — currently opens `EarthBridge`.

Server:

- `server/earth/src/earth/lib/earthVault.ts` — receipt parsing/PDA/finalization helpers.
- `server/earth/src/earth/routes/mint-player.ts` — verifies `CharacterMintReceipt` and credits starter EARTH.
- `server/earth/src/earth/routes/bridge.ts` — legacy route; do not expand except as a temporary migration reference.

Convex:

- `convex/earth/earthLedger.ts` — ledger credit/spend/withdraw/reconciliation mutations.
- `convex/earth/earthLedgerModel.ts` — ledger helpers.
- `convex/schema.ts` — ledger tables.

Program:

- `programs/earth-vault-program/src/lib.rs` — instruction/account layout for `character_payment`, `buy_earth`, `deposit_earth`, `withdraw_earth`.
- `tests/earth-vault-program.ts` — working Anchor integration examples for buy/deposit/withdraw instruction accounts.

## Deployment assumptions

- Earth Netlify: `https://earth.ndao.computer`, package `apps/earth`, build `pnpm --filter earth-2089 build`, publish `apps/earth/dist`.
- Railway service: `earth-server` from `server/earth`, public URL `https://astrds-game-server-production.up.railway.app`, readiness `/ready`.
- Convex deployment: shared dev `dev:colorful-nightingale-908`. Deploy function/schema changes with `npx convex dev --once`; do not run `npx convex deploy` unless intentionally moving to production Convex.
- R2 writes go through `server/earth`.

## Validation commands

Run as relevant:

```bash
pnpm --filter earth-2089 build
pnpm --filter earth-server build
pnpm --filter earth-server test
npx convex dev --once
anchor test
```

After pushing frontend changes, verify Netlify Earth deployment if the issue is ready to close. After server changes, verify Railway deployment and `/ready`.

## Closeout expectations

For #43, comment with:

- commit hash(es),
- implementation summary,
- exact validation commands,
- deployment/smoke results,
- any remaining gaps.

Close only after character mint, buy, deposit, and withdraw are implemented, pushed, and smoke-verified on devnet.
