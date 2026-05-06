# Issue #28: Architecture: create shared game config contract

- Source: https://github.com/nothingdao/astrds/issues/28
- State: CLOSED
- Labels: proposed, area:game-server, area:frontend, type:design
- Assignees: none
- Created: 2026-04-30T02:00:10Z
- Updated: 2026-04-30T02:34:01Z
- Closed: 2026-04-30T02:34:01Z

## Body

Parent: https://github.com/nothingdao/astrds/issues/23

## Problem

Game config is a critical **interface** between admin UI, Convex persistence, game server, and simulation. Defaults and validation are spread across several modules:

- `DEFAULT_SIMULATION_CONFIG`
- `DEFAULT_GAME_CONFIG`
- `DEFAULT_CONFIG`
- Convex `CONFIG_ARGS`
- HTTP validation arrays
- client editor assumptions
- server fallback parsing

`progressionBands` is especially loose: stored as `v.any()` and cast on the server.

This is a **shallow** config interface: callers need to understand field-by-field shape and fallback behavior.

## Files

- `shared/game/simulation.ts`
- `shared/game/progression.ts`
- `server/src/game/gameConfig.ts`
- `app/convex/admin.ts`
- `app/src/screens/admin/AdminScreen.tsx`
- `app/src/screens/admin/LevelBandEditor.tsx`

## Proposed direction

Deepen a shared **Game Config Contract** module. It should own defaults, parsing, validation, migration/fallback behavior, and conversion into `SimulationConfig`.

## Benefits

- **Locality**: config drift is fixed once.
- **Leverage**: admin UI, Convex, server, and simulation consume the same validated shape.
- Testability improves with focused tests for malformed config, old docs, missing fields, and progression band resolution.

## Open questions

- Should validation live in `shared/` so Convex/server/frontend all use the same contract?
- Should `progressionBands` have strict runtime validation before persistence?
- Is a versioned migration path needed for old config documents?


## Comments

### whaleen — 2026-04-30T02:16:49Z

Started implementation.

First slice creates a shared **Game Config Contract** module and routes frontend/server/Convex through it.

Changes:

- Added `shared/game/gameConfigContract.ts`
  - owns `GameConfig` type
  - owns shared defaults for simulation + economy config
  - owns normalization/fallback behavior for persisted config docs
  - owns runtime validation for admin config payloads
  - validates `progressionBands` shape instead of blindly accepting arbitrary arrays
- Updated `server/src/game/gameConfig.ts` to re-export the shared contract.
- Updated `server/src/convex/client.ts` to use `normalizeGameConfig()` instead of local fallback parsing.
- Updated `app/convex/admin.ts` to use the shared defaults/parser for `getGameConfig` and `/admin/config` validation.
- Updated `app/src/screens/admin/AdminScreen.tsx` to use the shared contract instead of importing defaults from Convex.
- Added `app/src/game/gameConfigContract.test.ts` covering:
  - partial persisted config normalization
  - complete admin payload acceptance
  - malformed emission arrays/progression bands rejection
  - required numeric field validation

Validation:

- `pnpm --dir app test` ✅
- `pnpm --dir app build` ✅
- `pnpm --dir server build` ✅
- `cd app && pnpm exec convex codegen` ✅

Notes:

- The Convex schema still stores `progressionBands` as `v.any()` for compatibility with existing documents, but the write path now validates the shape before persistence.
- This does not close every possible config-contract task, but it removes the biggest drift points and gives us a tested shared interface.


### whaleen — 2026-04-30T02:33:59Z

Completed the main Game Config Contract work.

Additional follow-up:

- Added `app/convex/gameConfigValidators.ts` so Convex schema and admin mutation args share the same validators.
- Replaced `progressionBands: v.any()` with a structured `progressionBandsValidator` in both the table schema and the config write path.
- Removed stale client-side dev-wallet mutation comments/imports from `admin.ts`; the authenticated HTTP path remains the write path.

Validation:

- `pnpm --dir app test` ✅
- `pnpm --dir app build` ✅
- `pnpm --dir server build` ✅
- `cd app && pnpm exec convex codegen` ✅
- `npm run lint` ✅

Pushed to `main`:

- `3219608 refactor: share convex game config validators`


### whaleen — 2026-04-30T02:34:00Z

Closing as implemented on main.
