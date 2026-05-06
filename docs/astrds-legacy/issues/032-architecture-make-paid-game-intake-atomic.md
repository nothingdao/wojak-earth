# Issue #32: Architecture: make paid game intake atomic

- Source: https://github.com/nothingdao/astrds/issues/32
- State: CLOSED
- Labels: proposed, area:game-server, area:frontend, type:design
- Assignees: none
- Created: 2026-04-30T03:02:59Z
- Updated: 2026-04-30T19:57:26Z
- Closed: 2026-04-30T19:57:26Z

## Body

Parent: #24\n\n## Problem\n\nThe first #24 slice localized trusted server-side paid-session verification and consumption behind `PaidGameIntake`, but the browser still creates `gameSessions` before WebSocket hello. Paid-session consumption and game-session creation/binding are therefore not atomic.\n\n## Proposed direction\n\nMove authoritative game-session creation/binding into the trusted intake path. The browser should not need to create a game session before connecting to the game server.\n\n## Open questions\n\n- Should the game server call an authenticated Convex HTTP endpoint that consumes the paid session and creates the game session in one operation?\n- What should the minimal WebSocket hello binding contain?\n- How should the created `gameSessionId` be surfaced back to the client for ASTRDS minting/game-over UI?\n\n## Notes\n\nThis is intentionally split from #24 because it changes cross-runtime ownership and protocol semantics.

## Comments

### whaleen — 2026-04-30T19:57:24Z

Implemented the atomic paid intake follow-up with a scoped ownership change.

Done-enough scope:

- Make paid-session consumption and game-session creation atomic in Convex.
- Keep the existing browser/game-server protocol shape for now to avoid adding snapshot/session-id plumbing.
- Make the game server validate the active game-session binding instead of consuming the paid session itself.

Changes:

- Updated `app/convex/gameSessions.ts`
  - `create` now requires an unconsumed, unexpired verified session for the wallet
  - patches that verified session as `consumed: true`
  - inserts the `gameSessions` document in the same Convex mutation
  - added `isActiveForWallet` query for trusted server validation
- Updated `server/src/convex/client.ts`
  - added `isActiveGameSession`
- Updated `server/src/game/PaidGameIntake.ts`
  - validates `{ walletAddress, gameSessionId }` against active Convex game session
  - no longer consumes the verified session on WebSocket hello
- Updated server tests for the new intake semantics.

Validation:

- `pnpm --dir server test` ✅
- `pnpm --dir server build` ✅
- `pnpm --dir app test` ✅
- `pnpm --dir app build` ✅
- `cd app && pnpm exec convex codegen` ✅
- `npm run lint` ✅

Pushed to `main`:

- `cfa6f7a refactor: make game session creation consume paid session`

Not included:

- Removing `gameSessionId` from WebSocket hello
- Having the game server create the session directly

Those would require protocol/UI plumbing for returning the created game session ID to the client. The key atomicity problem is addressed at the Convex mutation seam.


### whaleen — 2026-04-30T19:57:25Z

Closing as paid-session consumption and game-session creation are now atomic in Convex, with server-side active game-session validation.
