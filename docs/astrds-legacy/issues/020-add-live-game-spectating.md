# Issue #20: Add live game spectating

- Source: https://github.com/nothingdao/astrds/issues/20
- State: OPEN
- Labels: area:game-server, area:frontend, area:social, type:implementation, priority:medium
- Assignees: none
- Created: 2026-04-29T21:31:28Z
- Updated: 2026-04-30T01:39:12Z

## Body

## Summary

Add live game spectating so users can watch another player’s active run in real time.

The architecture is already close: gameplay is server-authoritative, the browser sends input to the game server, and the client renderer can draw the game from serialized `GameSnapshot`s. A spectator should be able to subscribe to those snapshots without sending input.

## Current state

- Convex tracks persistent paid game sessions in `gameSessions`.
- The WebSocket game server owns live `GameSession` instances in memory.
- `SessionHandler` binds a WebSocket player connection to a Convex `gameSessionId` after `hello`.
- The browser already renders snapshots via `renderServerSnapshot(ctx, snapshot, ratio)`.

Missing piece: the game server does not yet expose a shared live-session registry or spectator subscription path.

## Proposed approach

### Server

- Add a live session registry keyed by Convex `gameSessionId`.
  - Example: `Map<string, SessionHandler | GameSession>`.
- Add spectator tracking.
  - Example: `Map<string, Set<WebSocket>>`.
- Add a spectator WebSocket message type, e.g.

```ts
{ type: 'watch'; gameSessionId: string }
```

- Player connections remain authoritative for input.
- Spectator connections are read-only:
  - receive snapshots
  - cannot send input
  - cannot pause/resume/reset
  - cannot mutate score/session/token state
- On each authoritative tick, broadcast the latest `GameSnapshot` to:
  - the active player socket
  - all sockets watching that session
- Clean up spectators on socket close.
- Remove live session from registry on game over / disconnect.

### Convex / discovery

Add a way to list currently watchable sessions, likely using existing `gameSessions` plus recent `lastUpdated` / `status` data.

Potential query:

```ts
listLiveSessions(): Array<{
  gameSessionId: Id<'gameSessions'>
  walletAddress: string
  score: number
  levelReached: number
  pillsCollected?: number
  sessionStart: string
  lastUpdated: string
}>
```

May need the game server to periodically patch live score/level during play, not only at game over, so the live games list is useful.

### Frontend

- Add a “Live Games” / “Watch” UI.
- Show active sessions with player wallet/avatar, score, level, elapsed time.
- Add a `SpectatorGameScreen` that:
  - opens WebSocket
  - sends `{ type: 'watch', gameSessionId }`
  - receives `GameSnapshot`s
  - calls existing `renderServerSnapshot`
  - does not attach gameplay keyboard input or wallet/payment flows
- Display spectator-only HUD state/read-only label.

## Acceptance criteria

- A user can see a list of live active games.
- A user can click “Watch” and view that game’s canvas in near real time.
- Spectators cannot control the player ship or mutate session state.
- Multiple spectators can watch the same game.
- Spectators are disconnected/returned gracefully when the game ends.
- Existing player gameplay remains unaffected.

## Notes

This could also become the foundation for replay support later by recording snapshots or compact simulation events.


## Comments

### whaleen — 2026-04-29T21:33:55Z

This should probably be designed alongside #14.

The membership/chat permission layer proposed there could become a broader social visibility model:

- public chat
- private/group chat rooms
- member/patron/founder rooms
- player-created private groups

Live game spectating could use the same permission concepts. A player could choose stream visibility per run or as an account default:

```text
Public
→ anyone can discover/watch the live game

Group-only
→ only wallets in an allowed chat group/room can discover/watch

Members-only / Patrons-only
→ only wallets with required permission tier can watch

Private / hidden
→ not listed and not watchable except perhaps explicit invite
```

This would make live streams and chat rooms feel like one social layer instead of separate systems.

Possible shared primitives:

```ts
groups: defineTable({
  ownerWalletAddress: v.string(),
  name: v.string(),
  visibility: v.union(v.literal('private'), v.literal('public')),
  createdAt: v.number(),
})

groupMembers: defineTable({
  groupId: v.id('groups'),
  walletAddress: v.string(),
  role: v.union(v.literal('owner'), v.literal('moderator'), v.literal('member')),
  joinedAt: v.number(),
})
```

And game sessions could eventually carry stream visibility metadata:

```ts
streamVisibility: 'public' | 'group' | 'members' | 'private'
streamGroupId?: Id<'groups'>
```

The spectator server path should enforce those permissions before accepting `{ type: 'watch', gameSessionId }`, not just rely on frontend hiding.

