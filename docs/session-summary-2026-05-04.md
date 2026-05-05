# Session Summary — 2026-05-04

## Goal

The repo had just undergone a major refactor combining Earth and ASTRDS into one monorepo, moving away from Netlify Functions/Supabase toward shared Convex, and preparing deployment pipeline fixes for new base directories. The goal was to use the `grill-me` skill to clarify the product/architecture vision, then align docs/code enough that future agents can start with minimal confusion.

## Grill-me decisions captured

- Earth is the parent world/hub.
- ASTRDS is standalone-accessible at its own URL, while sharing wallet identity and infrastructure.
- Wallet identity is the cross-game anchor.
- Shared profile should be pragmatic: what both games currently require, extended later.
- On-chain data is canonical. Convex is not the source of truth for wallet token/NFT ownership.
- Earth gameplay requires a minted Earth character NFT.
- ASTRDS does not require an Earth character.
- Earth-character benefits in ASTRDS are future-compatible but not launch-critical.
- ASTRDS must be server-authoritative for anti-cheat/security.
- Earth must be authoritative wherever cheating/economy/progression matters.
- NPCs are first-class wallet-backed, minted Earth characters controlled by automation.
- NPC engine is long-term important but not current launch-path.
- NPC engine should eventually run on Railway and use the same authoritative action validation as human players.
- The unified Railway runtime should be `server/earth`, package `earth-server`.
- Netlify sites should use per-app base dirs: `apps/earth` and `apps/astrds`.
- Both frontends should use Vite+.
- Supabase and Netlify Functions are deprecated.
- Cloudflare R2 is the storage layer; current buckets are `earth-characters` and `astrds-audio`.

## Implementation completed

- Installed and used `mattpocock/skills@grill-me`.
- Renamed unified server from `server/astrds` to `server/earth`.
- Renamed package to `earth-server`.
- Moved NPC engine from `apps/earth/npc-engine` to `server/earth-npc-engine`.
- Added `server/earth-npc-engine/README.md` warning that it is pending migration.
- Migrated Earth app to Vite+.
- Standardized ASTRDS app scripts to Vite+.
- Added app-local Netlify configs.
- Removed ASTRDS `/.netlify/functions` proxy.
- Disabled stale Earth public docs UI and removed stale public docs.
- Added canonical docs under root `docs/`.
- Added root `AGENTS.md`.
- Added missing dependencies found by build checks.
- Patched ASTRDS shared imports after monorepo move.
- Patched server typecheck to avoid pulling Convex source directly into server compilation.
- Removed stale Deno/Supabase lock file from Earth app.

## Validation

The following passed:

```bash
pnpm --filter earth-2089 build
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
```

## Main remaining work

See `docs/open-issues.md` for details. Highest priority issues:

1. Confirm Netlify base dir settings in Netlify UI.
2. Confirm Railway service settings/domain after server rename.
3. Update ASTRDS production WS URL to the real renamed Railway domain.
4. Implement missing Earth admin Convex mutations.
5. Finish reservation confirmation by transaction signature.
6. Add or remove `/earth/local-radio` route.
7. Persist Earth NFT mint address to Convex.
8. Audit minimal shared wallet profile shape.
9. Finish R2 wiring.
10. Migrate NPC engine later.
