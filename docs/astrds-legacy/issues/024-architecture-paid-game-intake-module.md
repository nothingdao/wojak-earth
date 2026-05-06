# Issue #24: Architecture: paid game intake module

- Source: https://github.com/nothingdao/astrds/issues/24
- State: CLOSED
- Labels: proposed, area:game-server, area:frontend, type:design
- Assignees: none
- Created: 2026-04-30T02:00:03Z
- Updated: 2026-04-30T03:02:58Z
- Closed: 2026-04-30T03:02:58Z

## Body

Parent: https://github.com/nothingdao/astrds/issues/23

## Problem

The “insert quarter → verified session → game session → WebSocket hello → consumed session” flow is a single domain concept, but its invariants are spread across frontend, Convex, and game server.

Callers currently need to know too much ordering:

1. pay on-chain
2. call `verifyPayment`
3. transition to ready
4. create `gameSessions` from the browser
5. open WebSocket
6. send wallet + game session binding
7. server checks/consumes verified session

That is a **shallow** set of modules: the **interface** for “start a paid game” is basically the implementation choreography.

## Files

- `app/src/auth/AuthService.ts`
- `app/src/screens/title/TitleScreen.tsx`
- `app/src/screens/ready/ReadyScreen.tsx`
- `app/src/stores/gameData.ts`
- `server/src/ws/SessionHandler.ts`
- `server/src/convex/client.ts`
- `app/convex/verifyPayment.ts`
- `app/convex/sessions.ts`
- `app/convex/gameSessions.ts`

## Proposed direction

Deepen this into a **Paid Game Intake** module. One trusted intake path should own payment verification, paid-session consumption, game-session creation/binding, and the server’s right to start simulation.

The **seam** likely belongs between the game server and Convex, not spread across browser + Convex + WebSocket message handling.

## Benefits

- **Locality**: paid-play rules live in one place instead of `AuthService`, `ReadyScreen`, `gameData`, `SessionHandler`, and Convex mutations.
- **Leverage**: callers get “start this paid game” rather than managing session state manually.
- Testability improves because the **interface** can be tested as the paid-game intake surface, not through a browser countdown + WebSocket + Convex sequence.

## Open questions

- Should the browser create `gameSessions`, or should the trusted game server/Convex intake create them?
- What is the minimal session binding the WebSocket should receive?
- Should paid-session consumption and game-session creation become atomic?


## Comments

### whaleen — 2026-04-30T02:58:54Z

Started implementation with a focused server-side intake seam.

Changes:

- Added `server/src/game/PaidGameIntake.ts`
  - owns paid-session verification + consumption
  - normalizes the accepted `SessionBinding`
  - returns a small result object instead of mixing intake rules into runtime startup
- Updated `server/src/game/GameRuntime.ts`
  - delegates paid-game intake to `PaidGameIntake`
  - keeps simulation/config/emission startup in runtime
- Added `server/src/game/PaidGameIntake.test.ts`
  - missing wallet rejects without touching Convex
  - unverified session rejects without consuming
  - failed consumption rejects
  - verified + consumed session returns normalized binding

Validation:

- `pnpm --dir server test` ✅
- `pnpm --dir server build` ✅
- `pnpm --dir app test` ✅
- `npm run lint` ✅

Pushed to `main`:

- `67c8c92 refactor: extract paid game intake`

This does not yet make browser game-session creation atomic with paid-session consumption. It does localize the trusted server-side paid intake seam so that larger intake changes can happen behind a smaller interface.


### whaleen — 2026-04-30T03:02:57Z

Closing as first server-side intake seam implemented and tested on main. Follow-up atomic intake/session-creation ownership should be handled as a separate, more specific issue.
