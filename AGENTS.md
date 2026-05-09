# Earth Monorepo — Agent Context

## Current product model

Earth is the parent world/hub for the nothingdao game universe. ASTRDS is a standalone-accessible game at its own URL, but shares the wallet/account universe, Convex backend, Railway runtime, and Solana asset layer.

Canonical principles:

- On-chain data is king. A wallet is a wallet.
- Convex stores realtime game state, transient/ephemeral accounting, sessions, scores, progression, and cached/indexed convenience data. Do not treat Convex as canonical for token/NFT ownership.
- Earth gameplay requires a minted Earth character NFT.
- ASTRDS can be played standalone with a wallet; it does not require an Earth character.
- ASTRDS gameplay must remain server-authoritative for anti-cheat/security.
- Earth should be authoritative wherever cheating/economy/progression matters.
- Respect existing game UI boundaries. Profile is identity/dossier/wallet/current character presentation; Inventory is the loadout/equipment/equip/update-image hub; Map is world/location navigation; Market/Economy is buying/selling/balances/transactions. Finish existing interfaces before inventing new surfaces.
- Supabase and Netlify Functions are deprecated. Do not add new code depending on either.
- Netlify is static hosting only.
- Cloudflare R2 is the object storage layer; R2 writes go through `server/earth`.

## Current structure

```txt
apps/
  earth/      Earth 2089 frontend, Vite+ static Netlify app
  astrds/     ASTRDS frontend, Vite+ static Netlify app
server/
  earth/      Unified Railway runtime for Earth HTTP routes + ASTRDS WebSocket runtime
  earth-npc-engine/  Future Railway NPC/simulation service, not launch-path yet
convex/       Shared Convex backend for both games
packages/     Shared TypeScript packages
programs/     Anchor/Solana programs
docs/         Canonical internal docs
```

## Deployment assumptions

- Earth Netlify base directory: `apps/earth`; build `pnpm build`; publish `dist`.
- ASTRDS Netlify base directory: `apps/astrds`; build `pnpm build`; publish `dist`.
- Railway service package: `earth-server` from `server/earth`.
- Convex deploys from repo root.
- R2 buckets currently planned: `earth-characters`, `astrds-audio`.

## Important commands

```bash
pnpm install
pnpm run dev:earth
pnpm run dev:astrds
pnpm run dev:server
pnpm run convex:dev

pnpm run build:earth
pnpm run build:astrds
pnpm run build:server
```

These builds passed after the refactor stabilization pass:

```bash
pnpm --filter earth-2089 build
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
```

## Work tracking rule

GitHub issues are the canonical work queue. Do not create or expand Markdown TODO lists, roadmaps, or open-issues inventories as a substitute for issues. When new work is discovered, create/update a GitHub issue, then keep docs concise and current by linking to issue numbers. Persistent docs should explain architecture, decisions, and confirmed operating procedures; they should be actively condensed to reduce noise.

## Current known gaps / do not get confused

- `server/earth-npc-engine` is intentionally legacy-pending-migration. It still contains old Supabase/Netlify assumptions because it was moved mechanically for future Railway deployment. Do not treat it as production-ready.
- Some Earth admin actions in `apps/earth/src/lib/admin/adminTools.ts` are explicit stubs pending real Convex admin mutations. They exist to keep the build coherent, not because those mutations are complete.
- Earth reservation spots are deprecated and removed from active code. Do not reintroduce the reservation flow unless product direction changes.
- Local Radio is parked/removed from active Earth UI. Future radio/audio should be designed as a shared cross-game feature, likely R2-backed with server/admin writes through `server/earth`.
- R2 bucket wiring is still in progress. `earth-characters` upload path exists server-side; `astrds-audio` is planned but static audio assets still exist.
- Earth Vault v1 is the active on-chain economy direction. Legacy `SimplePayment`, `EarthBridge`, `/earth/bridge`, and direct treasury-wallet flows remain in code but should not be expanded; replace them through #39–#43. Legacy pre-vault `character.earth` balances are not mainnet liabilities.
- Public technical docs were removed/disabled from the Earth app because they described the old Supabase/Netlify architecture. Use root `docs/` instead.
- `server/earth` is the unified runtime for now. It may split later, but do not split unless explicitly asked.

## Project skills

Project-specific Pi/Agent skills live in `.agents/skills/`. Use them for repeatable workflows:

- `earth-session-pickup` — session start/resume checklist.
- `earth-issue-workflow` — GitHub issue process and closeout rules.
- `earth-deployment-verify` — Netlify/Railway/Convex deployment verification.
- `earth-convex` — Convex schema/functions/deployment rules.
- `astrds-server-authority` — ASTRDS authoritative gameplay/session/economy rules.
- `earth-profile-social` — wallet profile, identity, chat, social, and spectating rules.
- `earth-storage-r2` — Cloudflare R2 media/storage rules.
- `earth-solana-chain` — Solana/on-chain authority and migration rules.

## Docs to read first

- `docs/vision.md` — product/identity/economy principles
- `docs/architecture.md` — authority model and services
- `docs/deployment.md` — deployment assumptions
- `docs/economy.md` — current Earth + ASTRDS economy model
- `docs/chain.md` — Solana programs, wallets, PDAs, token mints, and on-chain ASTRDS flows
- `docs/storage.md` — R2 model
- `docs/open-issues.md` — compact issue index; GitHub issues are canonical
- `docs/harmonization-roadmap.md` — compact issue-priority harmonization order
