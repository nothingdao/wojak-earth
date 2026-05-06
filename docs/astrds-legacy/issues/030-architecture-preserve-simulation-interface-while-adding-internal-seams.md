# Issue #30: Architecture: preserve simulation interface while adding internal seams

- Source: https://github.com/nothingdao/astrds/issues/30
- State: CLOSED
- Labels: proposed, area:game-server, type:design
- Assignees: none
- Created: 2026-04-30T02:00:14Z
- Updated: 2026-04-30T19:54:17Z
- Closed: 2026-04-30T19:54:17Z

## Body

Parent: https://github.com/nothingdao/astrds/issues/23

## Problem

`shared/game/simulation.ts` is already a relatively **deep** module: browser-free gameplay behind snapshot/update functions. But its **implementation** is large and internally coupled: spawning, physics, collision, scoring, pickups, ASTRDS emission, Space Token event emission, level advancement, and powerups all live together.

The external **interface** is good, but internal **locality** for specific rules is weaker.

## Files

- `shared/game/simulation.ts`
- `shared/game/progression.ts`
- `server/src/game/GameSession.ts`
- `app/src/game/renderServerSnapshot.ts`

## Proposed direction

Keep the external simulation **interface** intact, but introduce internal modules/seams for rule clusters: collision, pickups/emission, level progression application, entity spawning, and event emission.

## Benefits

- **Locality**: simulation-rule bugs become easier to isolate.
- **Leverage**: external callers keep using the same deep simulation interface.
- Testability improves with focused internal tests while preserving end-to-end simulation tests at the public interface.

## Open questions

- Which internal seams are real, versus just aesthetic splitting?
- Which tests should target the public simulation interface versus internal rule modules?
- How do we avoid weakening the already useful external simulation interface?


## Comments

### whaleen — 2026-04-30T19:54:15Z

Implemented and closing with scoped done-enough criteria.

Done-enough scope:

- Preserve the external simulation interface.
- Add one real internal seam for a rule cluster that already had meaningful independent behavior.
- Add focused tests at that seam.

Changes:

- Added `shared/game/simulationCollision.ts`
  - `checkCollision`
  - `segmentCircleCollision`
  - `bulletHitsAsteroid`
- Updated `shared/game/simulation.ts`
  - delegates collision rules to the new internal module
  - preserves the existing exported `checkCollision` compatibility surface
- Added `app/src/game/simulationCollision.test.ts`
  - circle overlap tests
  - swept segment/circle tests
  - bullet-vs-asteroid visual radius tests

Validation:

- `pnpm --dir app test` ✅
- `pnpm --dir app build` ✅
- `pnpm --dir server build` ✅
- `pnpm --dir server test` ✅
- `npm run lint` ✅

Pushed to `main`:

- `a8be2c3 refactor: extract simulation collision rules`

Further simulation extraction should be separate and only done when a rule cluster has a similarly clear testable seam.


### whaleen — 2026-04-30T19:54:17Z

Closing as scoped internal simulation seam implemented and tested on main.
