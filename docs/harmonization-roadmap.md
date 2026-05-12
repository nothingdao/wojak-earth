# Earth + ASTRDS Harmonization Roadmap

GitHub issues are the canonical work queue. This roadmap is intentionally compact and ordered by issue priority; update the linked issues, not this file, when scope changes.

## Canonical assumptions

- Earth is the parent world/hub.
- ASTRDS remains standalone-accessible, but shares wallet identity, Convex, `server/earth`, and Solana programs/assets.
- ASTRDS does not require an Earth character.
- Earth gameplay requires a minted Earth character NFT.
- On-chain ownership/state is canonical for tokens and NFTs.
- Convex is for realtime game state, sessions, scores, progression, cached views, and transient accounting.
- Netlify is static hosting only. Supabase and Netlify Functions are deprecated.
- R2 writes go through `server/earth`.

## Completed stabilization

- #21 — Deployment settings confirmed for Earth, ASTRDS, and Railway.
- #22 — ASTRDS production WebSocket endpoint is env-driven.
- #23 — `server/earth` exposes `/health` liveness and `/ready` readiness; Railway checks `/ready`.
- #24 — Earth character NFT mint address persists to Convex after mint.
- #25 — Reachable Earth admin actions are wired to Convex or explicitly disabled.
- #26 — Minimal shared wallet profile for Earth + ASTRDS implemented and deployed.

Completed process setup: #20 established GitHub issues as the canonical work queue.

Completed Earth Vault setup:

- #39 — Earth Vault Program v1 scaffold, accounts, instructions, and tests.
- #40 — EARTH Token-2022 mint and authority model.
- #41 — Escrow-backed in-game EARTH ledger and reconciliation.
- #42 — Earth character mint receipt verification in `server/earth`.

## Current priority order

### P1 — Earth Vault v1 + visible Earth restoration

1. #43 — Earth frontend vault transactions: mint payment, buy, deposit, withdraw
2. #37 — Earth map: fix SVG path mapping and location hierarchy after migration
3. #35 — Inventory: restore equipment images, loadout controls, and profile image update flow
4. #36 — Earth minting: restore starter inventory for new characters
5. #27 — Social: design cross-game chat, groups, DMs, permissions, and spectating
6. #28 — ASTRDS economy: reconcile pre-mainnet hardening and fixed-supply vault work

### P2 — validation, storage, parked systems, polish

11. #44 — EARTH/SOL Meteora seed pool and liquidity policy
12. #29 — ASTRDS tests: validate emission vault, claim path, and settlement finalization
13. #30 — Storage: complete R2 wiring for Earth legacy image/item/media assets and plan `astrds-audio`
14. #31 — NPC engine: migrate legacy Supabase/Netlify assumptions to Convex/Railway
15. #32 — ASTRDS audio: finish event coverage/settings UI and align large assets with R2
16. #33 — Solana: phase migration from `@solana/web3.js` to `@anza-xyz/kit`
17. #34 — Earth chain architecture: Earth Vault v1 design hub; keep open until follow-ups are implemented or superseded
18. #38 — Earth characters: support multiple character NFTs per wallet and entry selection

## Scope rule

Preserve ASTRDS server-authoritative gameplay requirements. Promote shared social/account/media concepts to Earth-wide primitives where they naturally span both games. Keep ASTRDS-only UX/audio/gameplay scoped to `apps/astrds` unless it creates reusable infrastructure.

## Parked / explicitly not launch-path

- Earth reservation spots.
- Earth-only Local Radio route.
- `server/earth-npc-engine` until #31 is complete.
- Mainnet ASTRDS economy claims until #28 is resolved.
