# Earth — nothingdao monorepo

Earth is the parent world/hub for the nothingdao game universe. ASTRDS is a standalone-accessible arcade game at its own URL, but shares the same wallet-based universe, Convex backend, Railway runtime, and on-chain asset layer.

## Structure

```txt
earth/
├── apps/
│   ├── earth/          Earth 2089 frontend (Vite+ → Netlify static)
│   └── astrds/         ASTRDS frontend (Vite+ → Netlify static)
├── server/
│   ├── earth/          Unified Railway runtime: Earth HTTP + ASTRDS WS
│   └── earth-npc-engine/  Future continuous NPC/simulation service
├── packages/
│   └── shared/         Shared ASTRDS/game types and utilities
├── convex/             Shared Convex backend for both games
├── programs/           Solana/Anchor programs
└── docs/               Canonical internal documentation
```

## Core principles

- Earth gameplay requires a minted Earth character NFT.
- ASTRDS can be played standalone with a wallet; an Earth character is not required.
- On-chain data is king. Convex is for realtime game state, sessions, scores, and transient accounting.
- ASTRDS gameplay is server-authoritative for anti-cheat/security.
- Netlify is static hosting only. No Netlify Functions.
- Supabase is deprecated.
- Cloudflare R2 is used for object storage; R2 writes go through `server/earth`.

## Development

```bash
pnpm install
pnpm run dev:earth
pnpm run dev:astrds
pnpm run dev:server
pnpm run convex:dev
```

## Builds

```bash
pnpm run build:earth
pnpm run build:astrds
pnpm run build:server
```

## Deployment

| Target | Base / package | Notes |
| --- | --- | --- |
| Earth frontend | Netlify base `apps/earth` | `pnpm build`, publish `dist` |
| ASTRDS frontend | Netlify base `apps/astrds` | `pnpm build`, publish `dist` |
| Unified server | Railway service from `server/earth` | package `earth-server` |
| Convex | repo root | `pnpm run convex:deploy` |
| R2 | Cloudflare | buckets `earth-characters`, `astrds-audio` |

See `docs/` for canonical architecture and deployment notes.
