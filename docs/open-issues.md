# Open Issues

GitHub issues are the canonical work queue. This file is only a compact index so agents can find the right issues quickly. Do not add long TODO lists here; create/update GitHub issues instead.

## P1

- #41 — Earth escrow-backed in-game EARTH ledger and reconciliation
- #42 — Earth character mint receipts: migrate server mint flow to Earth Vault
- #43 — Earth frontend vault transactions: mint payment, buy, deposit, withdraw
- #37 — Earth map: fix SVG path mapping and location hierarchy after migration
- #35 — Inventory: restore equipment images, loadout controls, and profile image update flow
- #36 — Earth minting: restore starter inventory for new characters
- #27 — Social: design cross-game chat, groups, DMs, permissions, and spectating
- #28 — ASTRDS economy: reconcile pre-mainnet hardening and fixed-supply vault work

## P2

- #44 — EARTH/SOL Meteora seed pool and liquidity policy
- #29 — ASTRDS tests: validate emission vault, claim path, and settlement finalization
- #30 — Storage: complete R2 wiring for Earth legacy image/item/media assets and plan `astrds-audio`
- #31 — NPC engine: migrate legacy Supabase/Netlify assumptions to Convex/Railway
- #32 — ASTRDS audio: finish event coverage/settings UI and align large assets with R2
- #33 — Solana: phase migration from `@solana/web3.js` to `@anza-xyz/kit`
- #34 — Earth chain architecture: Earth Vault v1 design hub; keep open until follow-ups are implemented or superseded
- #38 — Earth characters: support multiple character NFTs per wallet and entry selection

## Recently closed / historical

- #40 — EARTH Token-2022 mint and authority model implemented; devnet Token-2022 mint documented.
- #39 — Earth Vault Program v1 scaffold, accounts, instructions, and tests implemented.
- #26 — Minimal shared wallet profile for Earth + ASTRDS implemented and deployed.
- #25 — Earth admin mutations no longer return fake success; reachable actions are wired or explicitly disabled.
- #24 — Earth character NFT mint address persists to Convex after mint.
- #23 — Railway readiness uses `/ready`; `/health` is liveness-only.
- #22 — ASTRDS production WebSocket endpoint is env-driven with `/servers.json` fallback.
- #21 — Netlify/Railway deployment settings confirmed after monorepo rename.
- #20 — Process: GitHub issues are the canonical work queue. Implemented in `AGENTS.md`.
- #19 — Migrate from Supabase to shared Convex deployment (with ASTRDS). Closed; remaining work was split into #21–#33.

## Validation commands

```bash
pnpm --filter earth-2089 build
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
npx convex dev --once
```
