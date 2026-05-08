# Session Pickup Prompt

We are in `/Users/josh/Projects/_nothingdao/earth`.

First, read:

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

Current confirmed state:

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
  - `earth-characters` bucket is operational and used by the Earth character mint flow through `server/earth`.
  - Railway must use R2 S3 credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`), not the `cfat_...` API token.
- ASTRDS production WebSocket endpoint is env-driven via Netlify `VITE_WS_URL`; `/servers.json` is fallback and may be empty.
- Earth character mint flow was tested successfully with Player #1338; Convex persisted `nftAddress`/`tokenId`.
- Earth admin stubs were addressed: reachable actions now call Convex mutations or throw explicit disabled errors.

Recently completed and closed:

- #21 — Deployment settings confirmed after monorepo rename.
- #22 — ASTRDS production WebSocket endpoint env-driven.
- #23 — `server/earth` readiness hardened.
- #24 — Earth character NFT mint address persists to Convex.
- #25 — Earth admin mutations wired or explicitly disabled.

Start by running:

```bash
gh issue list --state open --label priority:P1 --json number,title,labels
gh issue list --state open --label priority:P2 --json number,title,labels
```

Expected current open priorities:

## P1

1. #26 — Profile: define minimal shared wallet profile for Earth + ASTRDS
2. #27 — Social: design cross-game chat, groups, DMs, permissions, and spectating
3. #28 — ASTRDS economy: reconcile pre-mainnet hardening and fixed-supply vault work

## P2

4. #29 — ASTRDS tests: validate emission vault, claim path, and settlement finalization
5. #30 — Storage: complete R2 wiring for `earth-characters` and plan `astrds-audio`
6. #31 — NPC engine: migrate legacy Supabase/Netlify assumptions to Convex/Railway
7. #32 — ASTRDS audio: finish event coverage/settings UI and align large assets with R2
8. #33 — Solana: phase migration from `@solana/web3.js` to `@anza-xyz/kit`

Recommended next issue: #26.

Before editing code, inspect #26:

```bash
gh issue view 26 --json number,title,body,comments,labels
```

Then inspect existing profile/account/wallet code in Earth, ASTRDS, and Convex. The goal is to define and implement the minimal shared wallet profile primitive that both Earth and ASTRDS can use without making Convex canonical for on-chain ownership. Remember:

- On-chain data is king.
- A wallet is a wallet.
- Earth gameplay requires a minted Earth character NFT.
- ASTRDS remains standalone-accessible and does not require an Earth character.
- Convex stores profile/session/progression/cached convenience data, not canonical token/NFT ownership.
- ASTRDS gameplay must remain server-authoritative.
- Supabase and Netlify Functions are deprecated; do not add dependencies on either.
- Netlify is static hosting only.
- R2 writes go through `server/earth`.

Validation commands to run as relevant:

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
