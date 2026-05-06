# Issue #9: Game server phase 4: wire Convex + emission tiers

- Source: https://github.com/nothingdao/astrds/issues/9
- State: CLOSED
- Labels: none
- Assignees: none
- Created: 2026-04-23T21:29:04Z
- Updated: 2026-04-24T01:34:13Z
- Closed: 2026-04-24T01:34:13Z

## Body

## Context

Final phase — the game server becomes the authoritative source for all economic state. Convex only issues claim signatures for collections the server confirmed. Emission tiers are read from the Meteora pool on-chain.

## Prerequisite

Issue #8 must be complete — Railway server running in production.

## What gets wired

**Convex integration (server-side)**
- Game server uses Convex server-side client (not the browser client)
- Score submission: server calls Convex mutation directly after game ends
- Spawn tickets: server requests tickets from Convex, validates server-side
- Collection events: server calls `collectFromDeposit` mutation after validating collision
- Claims: `prepareClaims` only signs for collections the server submitted — client can no longer fake collection events

**Emission tier integration**
- Game server reads Meteora DAMM v2 pool state at session start
- Derives current price → looks up emission tier
- Allocates 50 ASTRDS per game, determines pills count and denomination for that session
- Pill spawn decisions and ASTRDS denomination enforced server-side

**Quarter verification**
- Session start gated on server confirming quarter payment on-chain before game loop begins

## Acceptance criteria

- Client cannot fake scores, collections, or claim eligibility
- Emission tier is determined by server from on-chain pool state — not by client
- Convex `prepareClaims` only authorizes collections the server submitted
- Quarter payment verified on-chain before game session starts

## Notes

- This phase completes issue #4 (game server parent issue) and unblocks issue #5 (on-chain economy hardening)
- After this phase, the emission curve is trustless — all economic state flows from on-chain → server → Convex → client

## Related

- #8 Phase 3: Railway deployment (prerequisite)
- #4 Game server: authoritative server-side game loop (parent)
- #5 Economy: harden emission model and migrate economic state on-chain (unblocked by this)

## Comments

### whaleen — 2026-04-24T01:07:54Z

**Partial implementation landed (2026-04-23)**

Server → Convex wiring is live on Railway. What's now authoritative:

- **Pill collects**: server emits `pillCollected` event → calls `gameSessions:incrementPillsCollected` in Convex
- **Game over**: server calls `gameSessions:update` with final score, levelReached, pillsCollected, status: 'ended'
- **Space-token collects**: plumbing is wired (`tokenCollected` events with source/spawnId), `collectFromDeposit` call is ready — activates once server-side space-token spawning is added

Client sends `walletAddress` + `gameSessionId` in the WS `hello` message so the server can attribute mutations to the correct session.

Remaining from this issue:
- Quarter verification (session start gated on confirmed on-chain payment)
- Emission tier reading from Meteora pool at session start
- Server-side space-token spawning (currently only standard tokens spawn server-side)

### whaleen — 2026-04-24T01:34:12Z

**Complete (2026-04-23)**

All three pieces landed:

1. **Convex integration** — pill collects, game-over score/level/pills, space-token collections all flow server → Convex. Client can no longer fake any of these.
2. **Emission tiers** — server reads Meteora DAMM v2 pool at session start, derives tier from on-chain price, enforces `pillsPerGameCap` in simulation. Falls back to tier 2 if pool read fails.
3. **Quarter verification** — game loop does not start until `sessions:isVerified` confirms an active paid session for the wallet. Unverified connections receive an error and are closed. Convex infra failure allows session through (devnet policy).

Economic state flow is now: on-chain → server → Convex → client.
