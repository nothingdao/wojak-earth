# Deployment

## Netlify frontends

Each frontend is a static Vite+ app with its own Netlify site. Netlify Functions are deprecated and should not be used.

| Site | URL | Package path | Build command | Publish directory |
| --- | --- | --- | --- | --- |
| Earth | `https://earth.ndao.computer` | `apps/earth` | `pnpm --filter earth-2089 build` | `apps/earth/dist` |
| ASTRDS | `https://astrds.ndao.computer` | `apps/astrds` | `pnpm --filter solana-asteroids build` | `apps/astrds/dist` |

Netlify currently runs builds from the repo root while loading app-local `netlify.toml` files, so build commands and publish directories are root-relative. Both apps use pnpm and Node 22.

## Railway runtime

`server/earth` is the unified Railway runtime for now. It serves Earth privileged HTTP routes and ASTRDS WebSocket/game-session runtime. It may be split later if scale or operations require it.

- Railway project: `earth`
- Railway service: `astrds-game-server`
- Public runtime URL: `https://astrds-game-server-production.up.railway.app`
- Package: `earth-server`
- Build source: GitHub repo `nothingdao/earth`, branch `main`
- Build config: root `railway.toml` uses the root `Dockerfile`
- Healthcheck: `/ready`

```bash
pnpm --filter earth-server dev
pnpm --filter earth-server build
pnpm --filter earth-server start
```

Runtime endpoints:

- `/health` — liveness only.
- `/ready` — readiness; checks required Convex, Solana, Earth minting/legacy bridge, and R2 environment configuration. Earth Vault v1 (#39–#43) will change the bridge/payment readiness surface once implemented.

## Convex

Earth and ASTRDS currently use the shared dev Convex deployment:

- Deployment: `dev:colorful-nightingale-908`
- Cloud URL: `https://colorful-nightingale-908.convex.cloud`
- Site URL: `https://colorful-nightingale-908.convex.site`

Deploy function changes to the active dev deployment with:

```bash
npx convex dev --once
```

`npx convex deploy` targets the separate production deployment and should not be used until the project intentionally moves off the shared dev deployment.

## Validation commands

```bash
pnpm --filter earth-2089 build
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
npx convex dev --once
```
