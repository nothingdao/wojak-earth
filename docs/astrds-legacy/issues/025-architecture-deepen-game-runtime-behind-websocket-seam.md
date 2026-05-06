# Issue #25: Architecture: deepen game runtime behind WebSocket seam

- Source: https://github.com/nothingdao/astrds/issues/25
- State: CLOSED
- Labels: proposed, area:game-server, type:design
- Assignees: none
- Created: 2026-04-30T02:00:05Z
- Updated: 2026-04-30T02:57:07Z
- Closed: 2026-04-30T02:57:07Z

## Body

Parent: https://github.com/nothingdao/astrds/issues/23

## Problem

`SessionHandler` owns WebSocket parsing, paid-session verification, tick loop timing, config refresh, emission tier locking, Space Token pool refresh, spawn ticket requests, collection writes, pill accounting, and game-over settlement.

This makes it a **shallow** orchestration module: the **interface** is “handle raw WebSocket messages,” but the **implementation** contains much of the domain runtime.

## Files

- `server/src/ws/SessionHandler.ts`
- `server/src/game/GameSession.ts`
- `server/src/convex/client.ts`
- `server/src/game/emissionTiers.ts`
- `shared/game/simulation.ts`

## Proposed direction

Deepen a **Game Runtime** module behind the WebSocket **seam**. `SessionHandler` should mostly translate protocol messages into runtime calls and send snapshots/events back.

## Benefits

- **Locality**: game lifecycle rules concentrate outside raw socket handling.
- **Leverage**: tests can drive the runtime without a real WebSocket.
- Testability improves around config refresh, Space Token spawning, and game-over settlement.

## Open questions

- Which responsibilities stay in `SessionHandler`, and which move behind the runtime **interface**?
- Should config refresh, pool refresh, and game-over settlement be internal runtime policies?
- What adapters are needed for Convex access and emission tier fetching?


## Comments

### whaleen — 2026-04-30T02:42:29Z

Started implementation and landed the first runtime extraction on `main`.

Changes:

- Added `server/src/game/GameRuntime.ts`
  - owns the game lifecycle/runtime policies previously embedded in WebSocket handling:
    - paid-session verification/consumption during hello
    - config refresh/application
    - emission tier locking/fallback
    - Space Token pool refresh
    - spawn ticket request and authorized token injection
    - pill accounting
    - authoritative game-over settlement
- Simplified `server/src/ws/SessionHandler.ts`
  - now mostly handles WebSocket concerns:
    - JSON parsing
    - protocol message dispatch
    - tick interval/pause/resume
    - socket send/close
  - delegates gameplay/runtime behavior to `GameRuntime`

Validation:

- `pnpm --dir server build` ✅
- `pnpm --dir app test` ✅
- `npm run lint` ✅

Pushed to `main`:

- `a20858c refactor: move game runtime behind websocket seam`

This is the main seam extraction. Follow-up could add a server Vitest harness around `GameRuntime`, but I held off to keep the first slice behavior-preserving.


### whaleen — 2026-04-30T02:48:01Z

Added server Vitest coverage for the new `GameRuntime` interface.

Changes:

- Added `vitest` to `server/`.
- Added scripts:
  - `pnpm --dir server test`
  - `pnpm --dir server test:watch`
- Added `server/src/game/GameRuntime.test.ts` covering:
  - hello rejects missing wallet
  - hello rejects unverified paid session
  - hello consumes verified session and returns initialized snapshot
  - hello is idempotent after the runtime is ready and does not consume twice
  - tick advances simulation and returns a snapshot

The emission tier fetch is mocked so tests do not hit Solana/RPC.

Validation:

- `pnpm --dir server test` ✅
- `pnpm --dir server build` ✅
- `pnpm --dir app test` ✅
- `pnpm --dir app build` ✅
- `npm run lint` ✅

Pushed to `main`:

- `ebc8119 test: add server runtime harness`


### whaleen — 2026-04-30T02:57:06Z

Closing as implemented and tested on main. Runtime behavior is now behind GameRuntime, with SessionHandler acting as the WebSocket seam adapter.
