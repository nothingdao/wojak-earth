# Current Status / Session Handoff

This file bootstraps future agent sessions after the Earth + ASTRDS monorepo refactor stabilization pass.

## What changed in this session

The repo was aligned around the current refactor decisions:

- Earth is the parent world/hub.
- ASTRDS remains standalone at its own URL but participates in the same wallet-based universe.
- Convex is the shared backend for both games.
- Netlify Functions and Supabase are deprecated.
- Netlify is static hosting only.
- `server/earth` is the unified Railway runtime for now.
- Cloudflare R2 is the object storage layer.

Mechanical/code changes completed:

- Renamed `server/astrds` to `server/earth`.
- Renamed server package from `astrds-game-server` to `earth-server`.
- Moved `apps/earth/npc-engine` to `server/earth-npc-engine` and marked it pending migration.
- Migrated Earth frontend to Vite+.
- Standardized ASTRDS frontend scripts to Vite+.
- Added per-app Netlify configs:
  - `apps/earth/netlify.toml`
  - `apps/astrds/netlify.toml`
- Removed ASTRDS old `/.netlify/functions` dev proxy.
- Removed/disabled stale Earth public technical docs UI.
- Removed stale `apps/earth/public/docs` content.
- Added canonical root docs in `docs/`.
- Added root `AGENTS.md` for future agents.
- Added missing Earth deps discovered during build stabilization:
  - `@radix-ui/react-visually-hidden`
  - `vite-plus`
  - `zod`
- Patched ASTRDS shared imports to use `@shared/*`.
- Patched `server/earth` typecheck so it does not compile all Convex source as part of the server build.

## Verified builds

The following commands passed after the stabilization pass:

```bash
pnpm --filter earth-2089 build
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
```

Expected warnings:

- Vite+/React plugin deprecation warnings around `esbuild` / `optimizeDeps.esbuildOptions`.
- ASTRDS CSS warnings from Lightning CSS about Tailwind-style at-rules (`@theme`, `@utility`, etc.). Build still succeeds.
- Large chunk warnings for both frontends.

## Current canonical architecture

```txt
apps/earth              Earth frontend, Vite+ static Netlify app
apps/astrds             ASTRDS frontend, Vite+ static Netlify app
server/earth            Unified Railway runtime: Earth HTTP + ASTRDS WS
server/earth-npc-engine Future NPC/simulation Railway service, pending migration
convex                  Shared Convex backend
packages/shared         Shared game/runtime types and utilities
programs                Anchor/Solana programs
docs                    Canonical internal documentation
```

## Identity / account decisions

- Wallet identity is the cross-game anchor.
- Shared profile should be pragmatic: whatever Earth + ASTRDS currently require, not a comprehensive mirror of on-chain state.
- On-chain ownership is canonical for tokens/NFTs.
- Earth character NFT is required to play Earth.
- ASTRDS requires only wallet/session/payment flow; no Earth character required.
- Earth-character-based ASTRDS perks are future-compatible but not launch-critical.

## Authority model decisions

- ASTRDS must be server-authoritative. Client renders and sends input only.
- Earth should be authoritative anywhere cheating/economy/progression matters.
- Convex validates and persists ordinary game state/progression where appropriate.
- `server/earth` handles privileged operations: payment verification, Earth minting, R2 writes, bridge operations, and ASTRDS runtime.

## Storage decisions

Use **Cloudflare R2** terminology, not S2.

Buckets for now:

- `earth-characters` — generated/composited Earth character and NFT images.
- `astrds-audio` — future ASTRDS audio storage; current static assets may remain until migration.

R2 writes are server-only via `server/earth`.

## NPC engine decisions

NPCs are first-class wallet-backed, minted Earth characters controlled by automation.

`server/earth-npc-engine` is not production-ready yet. It still needs migration away from old endpoint/storage assumptions. It is retained because the long-term plan is to run it continuously on Railway for:

- progression/load testing
- many automated test characters
- autonomous launch-time world population
- in-world NPC interactions

NPCs must use the same authoritative action validation paths as human players.

## Deployment decisions

Netlify per-site base dirs:

| Site | Base dir | Build | Publish |
| --- | --- | --- | --- |
| Earth | `apps/earth` | `pnpm build` | `dist` |
| ASTRDS | `apps/astrds` | `pnpm build` | `dist` |

Railway:

- service package: `earth-server`
- directory: `server/earth`
- short-term: one unified runtime for Earth + ASTRDS

Convex:

- deploy from repo root
- production deployment automation/CI still TBD

## Files future agents should inspect first

- `AGENTS.md`
- `README.md`
- `docs/vision.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/storage.md`
- `docs/open-issues.md`
- `server/earth-npc-engine/README.md`
