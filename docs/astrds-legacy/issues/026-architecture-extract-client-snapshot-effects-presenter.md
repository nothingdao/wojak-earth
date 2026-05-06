# Issue #26: Architecture: extract client snapshot effects presenter

- Source: https://github.com/nothingdao/astrds/issues/26
- State: CLOSED
- Labels: proposed, area:frontend, type:design
- Assignees: none
- Created: 2026-04-30T02:00:07Z
- Updated: 2026-04-30T02:34:04Z
- Closed: 2026-04-30T02:34:04Z

## Body

Parent: https://github.com/nothingdao/astrds/issues/23

## Problem

`ServerGameScreen.tsx` receives snapshots, diffs them manually, triggers audio, particles, floating text, level transitions, store hydration, respawn overlay state, and machine transitions.

The **interface** is just `GameSnapshot`, but callers must understand many hidden invariants:

- asteroid disappearance means explosion
- bullet count increase means shot sound
- pill count increase requires diffing vanished pill IDs
- token collection display depends on `spaceTokenStore.activePools`
- `gameOver` snapshot mutates the state machine

This is poor **locality**: visual/audio/store effects are embedded in a React screen.

## Files

- `app/src/screens/game/ServerGameScreen.tsx`
- `app/src/game/renderServerSnapshot.ts`
- `app/src/game/systems/ParticleSystem.ts`
- `app/src/stores/gameData.ts`
- `app/src/stores/inventoryStore.ts`
- `app/src/stores/levelStore.ts`
- `app/src/stores/powerupStore.ts`
- `app/src/stores/spaceTokenStore.ts`

## Proposed direction

Deepen a **Snapshot Effects** or **Client Game Presenter** module that consumes previous/current snapshots and emits client effects: audio cues, particles, floating text, store patches, and state-machine transitions.

## Benefits

- **Locality**: snapshot-diff rules stop living inside a React screen.
- **Leverage**: multiple renderers or tests can reuse the same snapshot interpretation.
- Testability improves because snapshot pairs can be unit-tested without canvas, WebSocket, or React.

## Open questions

- Should the presenter emit declarative effects, or directly call adapters for stores/audio/particles?
- Which effects are purely presentational versus domain-significant?
- Should Space Token collection display depend on active pool state, snapshot metadata, or both?


## Comments

### whaleen — 2026-04-30T02:04:17Z

Started implementation.

First pass extracts snapshot diffing/presentation rules from `ServerGameScreen.tsx` into a new module:

- `app/src/game/clientSnapshotPresenter.ts`
  - consumes previous/current `GameSnapshot`
  - emits declarative presentation effects: sounds, explosions, floating text, collected pools, store patches, level transition, respawn state, game-over transition
- `app/src/screens/game/ServerGameScreen.tsx`
  - now acts as the adapter that applies those effects to audio, particles, Zustand stores, floating text state, and the state machine

Validation:

- `pnpm --dir app build` ✅

Notes:

- This preserves current behavior as closely as possible while moving hidden snapshot invariants behind a dedicated module/interface.
- Next useful step would be adding focused tests for `buildSnapshotPresentation()` once a TS test harness exists, or pairing this with #31.


### whaleen — 2026-04-30T02:13:01Z

Added focused tests for the new snapshot presenter interface.

New test file:

- `app/src/game/clientSnapshotPresenter.test.ts`

Covered cases:

- asteroid removed → explosion + destroy sound
- pill collected → collect sound + `+N ASTRDS` floating text
- Space Token collected → pool recorded + formatted floating text
- powerup activated → correct pickup label
- level transition, respawn state, game-over transition, and thrust stop effect

Validation:

- `pnpm --dir app test` ✅
- `pnpm --dir app build` ✅


### whaleen — 2026-04-30T02:34:02Z

Implemented and tested.

Summary:

- Extracted snapshot diffing/presentation rules to `app/src/game/clientSnapshotPresenter.ts`.
- `ServerGameScreen.tsx` now applies declarative presenter effects as the adapter for audio, particles, stores, floating text, and state machine transitions.
- Added `app/src/game/clientSnapshotPresenter.test.ts` for the presenter interface.

Validation passed and changes are on `main`.


### whaleen — 2026-04-30T02:34:03Z

Closing as implemented and tested on main.
