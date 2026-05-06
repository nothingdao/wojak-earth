# Issue #7: Game server phase 2: local Node.js WebSocket server

- Source: https://github.com/nothingdao/astrds/issues/7
- State: CLOSED
- Labels: none
- Assignees: none
- Created: 2026-04-23T21:28:36Z
- Updated: 2026-04-23T21:55:08Z
- Closed: 2026-04-23T21:55:08Z

## Body

## Context

Once entity logic is separated from rendering (issue #6), the `update()` methods can run in Node.js. This phase builds a local game server that runs the authoritative game loop and proves the client-server architecture works before any cloud deployment.

## Prerequisite

Issue #6 must be complete — entities must have clean `update()` / `render()` split.

## Repo structure

```
/
  app/          — frontend (existing)
  server/       — game server (new)
    src/
      game/     — shared entity logic (imported or copied from app/src/game/)
      ws/       — WebSocket session handler
      index.ts  — entry point
    package.json
    tsconfig.json
```

## Responsibilities

- WebSocket server (ws:// on port 3001)
- Accepts player input events (keystrokes) from client
- Runs authoritative game loop: asteroids, bullets, ship, collisions, scoring
- Decides token/pill spawn events, validates collections
- Sends authoritative game state to client each tick
- Client renders what server says — no client-owned physics state

## Local dev setup

```bash
# Terminal 1
cd app && pnpm dev        # frontend + Convex

# Terminal 2
cd server && npm run dev  # game server (nodemon or tsx watch)
```

Frontend connects to `ws://localhost:3001` via `VITE_WS_URL=ws://localhost:3001` in `app/.env.local`.

## Acceptance criteria

- Game plays correctly end-to-end with server driving game state
- Client has no authoritative physics state — it renders server output only
- Score submission goes through server → Convex, not client → Convex
- Pill/token collection events validated server-side before Convex mutation is called

## Notes

- Input latency compensation (client-side prediction) is out of scope for this phase
- Spectator mode is out of scope
- Convex integration (scores, claims) can be stubbed initially — wire it properly in phase 4

## Related

- #6 Phase 1: entity refactor (prerequisite)
- #4 Game server: authoritative server-side game loop (parent)

## Known dependency to resolve

Entity `update()` methods currently read screen dimensions from `useEngineStore.getState().screen` (a Zustand store). This store won't exist in Node. When porting to the server, replace with a `screen: { width, height }` parameter passed into `update(dt, screen)`.

## Comments

### whaleen — 2026-04-23T21:55:07Z

Server scaffold complete. server/ runs authoritative game loop in Node via shared/game/simulation.ts. Client switches to ServerGameScreen when VITE_WS_URL is set. Builds pass. Ready for phase 3 (Railway deployment, issue #8).
