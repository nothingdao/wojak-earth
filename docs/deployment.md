# Deployment

## Netlify frontends

Each frontend is a static Vite+ app with its own Netlify site and base directory.

| Site | Netlify base directory | Build command | Publish directory |
| --- | --- | --- | --- |
| Earth | `apps/earth` | `pnpm build` | `dist` |
| ASTRDS | `apps/astrds` | `pnpm build` | `dist` |

Both apps should use pnpm and Node 22. Netlify Functions are deprecated and should not be used.

## Railway runtime

`server/earth` is the unified Railway runtime for now. It serves Earth privileged HTTP routes and ASTRDS WebSocket/game-session runtime. It may be split later if scale or operations require it.

Package: `earth-server`

```bash
pnpm --filter earth-server dev
pnpm --filter earth-server build
pnpm --filter earth-server start
```

## Convex

Convex is shared by both games.

```bash
pnpm run convex:dev
pnpm run convex:deploy
```

Convex deployment currently remains manual unless/until CI is added.

## Current stabilization note

Builds should be verified before deployment changes are trusted:

```bash
pnpm --filter earth-2089 build
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
```
