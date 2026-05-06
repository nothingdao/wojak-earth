# Issue #8: Game server phase 3: Railway deployment + dev/prod pipeline

- Source: https://github.com/nothingdao/astrds/issues/8
- State: CLOSED
- Labels: none
- Assignees: none
- Created: 2026-04-23T21:28:48Z
- Updated: 2026-04-24T00:42:31Z
- Closed: 2026-04-24T00:42:31Z

## Body

## Context

Once the local game server works (issue #7), this phase wires up Railway deployment and a clean dev/prod pipeline with a single env var swap.

## Prerequisite

Issue #7 must be complete — local game server running and game plays correctly end-to-end.

## Repo structure addition

```
server/
  Dockerfile        — or nixpacks config (Railway auto-detects)
  .railwayignore
```

## Environment variables

| Var | Local | Railway (prod) |
|---|---|---|
| `VITE_WS_URL` | `ws://localhost:3001` | `wss://your-server.railway.app` |

Set in `app/.env.local` for local dev. Set in Netlify environment for production frontend.

## Railway setup

- New Railway service pointing at `server/` directory
- Auto-deploy on push to `main`
- Health check endpoint: `GET /health` returns 200
- Environment variables set in Railway dashboard

## Acceptance criteria

- `VITE_WS_URL` is the only change needed to switch between local and Railway
- Railway service auto-deploys on push to main
- Frontend on Netlify connects to Railway server in production
- Health check endpoint exists and Railway uses it

## Notes

- WSS (secure WebSocket) required for production — Railway handles TLS termination
- Railway pricing: estimate cost per active game session before going live
- Consider Railway sleep/wake behaviour for low-traffic periods — WebSocket servers need to stay alive

## Related

- #7 Phase 2: local game server (prerequisite)
- #4 Game server: authoritative server-side game loop (parent)

## Comments

### whaleen — 2026-04-23T22:25:07Z

**Update (2026-04-23):** `VITE_WS_URL` is no longer needed locally — `ServerGameScreen` defaults to `ws://localhost:3001`. The env var is now only needed in Netlify to point at the Railway server (`wss://your-server.railway.app`). The local dev workflow is just: start `server/` on port 3001, then `pnpm dev` in `app/`.

### whaleen — 2026-04-24T00:42:30Z

**Deployed (2026-04-23)**

Railway service is live: `wss://astrds-game-server-production.up.railway.app`

Health check: `https://astrds-game-server-production.up.railway.app` → `{"ok":true,"service":"astrds-game-server"}`

Auto-deploys on push to `main` via GitHub integration.

To connect the production frontend, set in Netlify:
```
VITE_WS_URL=wss://astrds-game-server-production.up.railway.app
```
