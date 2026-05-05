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

## Current known gaps / do not get confused

- `server/earth-npc-engine` is intentionally legacy-pending-migration. It still contains old Supabase/Netlify assumptions because it was moved mechanically for future Railway deployment. Do not treat it as production-ready.
- Some Earth admin actions in `apps/earth/src/lib/admin/adminTools.ts` are explicit stubs pending real Convex admin mutations. They exist to keep the build coherent, not because those mutations are complete.
- Earth reservation confirmation is incomplete: `apps/earth/src/lib/reservations.ts` lacks a proper Convex query/mutation by transaction signature.
- `apps/earth/src/components/LocalRadio.tsx` calls `/earth/local-radio`, but `server/earth` does not currently expose that route.
- R2 bucket wiring is still in progress. `earth-characters` upload path exists server-side; `astrds-audio` is planned but static audio assets still exist.
- Public technical docs were removed/disabled from the Earth app because they described the old Supabase/Netlify architecture. Use root `docs/` instead.
- `server/earth` is the unified runtime for now. It may split later, but do not split unless explicitly asked.

## Docs to read first

- `docs/current-status.md` — session handoff and exact refactor status
- `docs/vision.md` — product/identity/economy principles
- `docs/architecture.md` — authority model and services
- `docs/deployment.md` — deployment assumptions
- `docs/storage.md` — R2 model
- `docs/open-issues.md` — prioritized remaining work
