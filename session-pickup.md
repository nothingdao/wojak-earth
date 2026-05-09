# Session Pickup Prompt

We are in `/Users/josh/Projects/_nothingdao/earth`.

First read:

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

Important operating rule: GitHub issues are the canonical work queue. Do not create or expand Markdown TODO lists, roadmaps, or issue inventories as substitutes for GitHub issues. Keep persistent docs concise and current.

## Current confirmed state

- Earth and ASTRDS are deployed from the public `nothingdao/earth` repo.
- Netlify:
  - Earth: `https://earth.ndao.computer`, package path `apps/earth`, build `pnpm --filter earth-2089 build`, publish `apps/earth/dist`.
  - ASTRDS: `https://astrds.ndao.computer`, package path `apps/astrds`, build `pnpm --filter solana-asteroids build`, publish `apps/astrds/dist`.
- Railway:
  - Project `earth`, service `astrds-game-server`.
  - Unified runtime is `server/earth`, package `earth-server`.
  - Public URL: `https://astrds-game-server-production.up.railway.app`.
  - `/health` is liveness; `/ready` is readiness and is Railway's healthcheck.
- Convex:
  - Earth and ASTRDS currently use dev deployment `dev:colorful-nightingale-908`.
  - Deploy function changes with `npx convex dev --once`.
  - Do not run `npx convex deploy` unless intentionally moving to the separate prod deployment.
- R2:
  - `earth-characters` bucket is operational and used by the Earth character image flow through `server/earth`.
  - Railway must use R2 S3 credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`), not the `cfat_...` API token.
- ASTRDS production WebSocket endpoint is env-driven via Netlify `VITE_WS_URL`; `/servers.json` is fallback and may be empty.

## Earth Vault direction

Earth Vault v1 is now the active on-chain economy direction (#34, #39–#44):

- EARTH will be a transferable Token-2022 wallet token and the in-game currency.
- Vault-era in-game EARTH must be immediately withdrawable and backed by Earth Vault escrow.
- Legacy pre-vault `character.earth` balances are dev/test migration data, not mainnet liabilities.
- Character mint payments should route through Earth Vault `CharacterMintReceipt` PDAs instead of direct treasury transfers.
- A meaningful part of the SOL character mint fee should return to the player as starter EARTH credited into game escrow/in-game balance.
- Purchased EARTH goes directly into game escrow/in-game balance.
- Wallet signatures should be required for character mint payment, buy EARTH, deposit, and withdraw only; ordinary gameplay spends remain signature-free.
- `server/earth` should continue to own character image/R2/metadata/NFT mint orchestration in v1 after verifying Earth Vault receipts.
- Legacy `SimplePayment`, `EarthBridge`, `/earth/bridge`, and direct treasury-wallet flows remain in code but should not be expanded; replace them through #39–#43.
- Do not use a thin initial Meteora pool as the sole v1 pricing oracle; use explicit configured run pricing until depth/TWAP safeguards exist.

## Recent local work to be aware of

- Map/location migration was repaired toward the long-term model:
  - static visual geometry lives in `apps/earth/src/data/earthMapManifest.ts`;
  - Convex locations bind via `mapRegionId`;
  - `slug` and `mapRegionId` were added to location schema/adapters;
  - parent location refs were normalized to Convex ids in the current dev Convex data;
  - `adminNormalizeMapModel` exists in `convex/earth/locations.ts` for normalization.
- The old Admin Control Panel Locations section was removed. Admin location editing now lives in the map `ZONE_ANALYSIS` panel.
- Admin `ZONE_ANALYSIS` now covers location data fields including slug, parent, type, chat scope, status, difficulty, min level, entry cost, map region, map x/y, private/explored, service flags, theme, image URL, welcome message, and lore.
- A housekeeping commit already landed: `d1db2c7 Remove stale Earth app config files`.

## Start each session by checking issues

```bash
gh issue list --state open --label priority:P1 --json number,title,labels
gh issue list --state open --label priority:P2 --json number,title,labels
```

Current key open priorities include:

### Earth Vault P1

- #39 — Earth Vault Program v1: scaffold accounts, instructions, and tests
- #40 — EARTH Token-2022 mint and authority model
- #41 — Earth escrow-backed in-game EARTH ledger and reconciliation
- #42 — Earth character mint receipts: migrate server mint flow to Earth Vault
- #43 — Earth frontend vault transactions: mint payment, buy, deposit, withdraw

### Other P1

- #37 — Earth map: fix SVG path mapping and location hierarchy after migration
- #35 — Inventory: restore equipment images, loadout controls, and profile image update flow
- #36 — Earth minting: restore starter inventory for new characters
- #27 — Social: design cross-game chat, groups, DMs, permissions, and spectating
- #28 — ASTRDS economy: reconcile pre-mainnet hardening and fixed-supply vault work

### P2

- #44 — EARTH/SOL Meteora seed pool and liquidity policy
- #29 — ASTRDS tests: validate emission vault, claim path, and settlement finalization
- #30 — Storage: complete R2 wiring for Earth legacy image/item/media assets and plan `astrds-audio`
- #31 — NPC engine: migrate legacy Supabase/Netlify assumptions to Convex/Railway
- #32 — ASTRDS audio: finish event coverage/settings UI and align large assets with R2
- #33 — Solana: phase migration from `@solana/web3.js` to `@anza-xyz/kit`
- #34 — Earth chain architecture: Earth Vault v1 design hub; keep open until follow-ups are implemented or superseded
- #38 — Earth characters: support multiple character NFTs per wallet and entry selection

## Useful design briefs

If present in the working tree, subagent research briefs are under `tmp/subagents/`:

- `earth-vault-anchor.md`
- `earth-token-liquidity.md`
- `earth-convex-ledger.md`
- `earth-frontend-vault.md`
- `earth-vault-review.md`

Treat GitHub issues/docs as canonical; the subagent briefs are supporting context.

## Validation commands

```bash
pnpm --filter earth-2089 build
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
npx convex dev --once
```

When work is complete:

1. Push code/docs changes.
2. Verify Netlify/Railway/Convex deployment as appropriate.
3. Comment on the relevant GitHub issue with implementation and validation.
4. Close the issue only after acceptance criteria are verified.
