# Issue #4: Game server: authoritative server-side game loop for mainnet integrity

- Source: https://github.com/nothingdao/astrds/issues/4
- State: CLOSED
- Labels: none
- Assignees: none
- Created: 2026-04-17T23:02:04Z
- Updated: 2026-04-24T01:34:15Z
- Closed: 2026-04-24T01:34:15Z

## Body

## Problem

The game currently runs entirely client-side. Any player can manipulate browser state (Zustand stores, JS console) to fake scores, fake token collections, or trigger claim flows for tokens never collected in-game. This is acceptable on devnet but is not viable on mainnet where space tokens have real economic value.

**This is also a prerequisite for trustless ASTRDS emission.** The mainnet economy model (see `docs/economy.md`) has Convex signing ed25519 claim authorizations based on pills collected — but Convex currently trusts client-reported collection events. Until the game server exists, the emission curve cannot be enforced without trusting the operator. The game server is what makes the economy self-evident and verifiable.

## Solution

Move to a client-server architecture where the server runs the authoritative game loop and the client is a renderer + input sender. The client cannot lie about outcomes because it never owns them.

## Architecture

```
Browser (client)           Game Server                Convex / Chain
──────────────────         ─────────────────          ──────────────
render only            ←── authoritative state        DB + claims
send inputs            ──→ runs game loop             signs claims
                           validates outcomes
                           issues spawn tickets
                           submits scores
```

### Client responsibilities (after)
- Send player inputs (keystrokes) to server via WebSocket
- Render what the server says exists
- Sign wallet transactions for outcomes the server has authorized

### Game server responsibilities
- Authoritative game loop: asteroids, collisions, bullets, scoring
- Token spawning: server decides what appears on screen and when
- Session lifecycle: start, validate quarter payment, run game, end
- Score submission to Convex (server-side, not client-side)
- Sign off on claim eligibility — Convex only issues ed25519 claim signatures for collections the server confirmed
- Read DAMM v2 pool state to determine current emission tier per game
- Rate limiting and sanity checking per session

### What this closes
- Score manipulation via devtools / Zustand store patching
- Fake token collection events
- Spawn ticket abuse (requesting tokens never on screen)
- Claim replay across sessions
- Untrustworthy emission curve (Convex currently trusts client for pill counts)

## Tech

- **Runtime**: Node.js WebSocket server
- **Transport**: WebSocket (input up, state down)
- **Deploy**: Railway
- **Latency budget**: Asteroids is forgiving — 50–100ms round trip is acceptable for input→server→render

## Integration Points

- Convex: game server replaces client as the authority that triggers score writes and authorizes claims
- Vault program: game server submits `game_payment` verification, gates session start on confirmed payment
- Spawn tickets: server requests spawn tickets from Convex at session start, owns the pool for that session
- Economy: server reads DAMM v2 pool state to derive current emission tier, enforces 50 ASTRDS allocation per game

## Migration

- Client rendering logic can be reused — decouple draw loop from state ownership
- Game entities (Asteroid, Ship, Bullet, etc.) move to shared logic runnable in Node
- Input latency compensation (client-side prediction) can be added later if needed

## Out of Scope (this issue)

- Client-side prediction / lag compensation
- Spectator mode
- Anti-cheat beyond authoritative server state

## Reference

- `docs/economy.md` — emission model the game server must enforce
- `docs/chain.md` — on-chain flows the server participates in

## Comments

### whaleen — 2026-04-23T22:25:01Z

**Progress update (2026-04-23)**

Phases 1 and 2 are complete:
- Entity classes refactored: `update(dt, screen)` (physics) separated from `render(ctx)` (canvas)
- `shared/game/simulation.ts` — authoritative physics with no browser/React deps
- `shared/game/protocol.ts` — shared message and snapshot types
- `server/` — Node.js WebSocket server running at 30 tick/s with pause/resume support
- `ServerGameScreen` — client is now a pure renderer receiving `GameSnapshot` over WebSocket
- `GameScreen` always delegates to `ServerGameScreen` — client-local engine path removed
- Pause/resume wired via message protocol; overlay-driven pause synced to server

Remaining: #8 (Railway deployment) → #9 (Convex + emission tier integration)

### whaleen — 2026-04-24T01:34:15Z

Closed by completion of phases 1–4. All game server work is live on Railway.
