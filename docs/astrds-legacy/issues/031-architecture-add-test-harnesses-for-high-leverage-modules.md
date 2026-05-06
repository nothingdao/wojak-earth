# Issue #31: Architecture: add test harnesses for high-leverage modules

- Source: https://github.com/nothingdao/astrds/issues/31
- State: CLOSED
- Labels: proposed, area:infra, type:design, type:implementation
- Assignees: none
- Created: 2026-04-30T02:00:15Z
- Updated: 2026-04-30T19:57:45Z
- Closed: 2026-04-30T19:57:45Z

## Body

Parent: https://github.com/nothingdao/astrds/issues/23

## Problem

The repo has Anchor tests, but little visible test coverage for shared simulation, game server orchestration, Convex lifecycle rules, or client snapshot effects.

This matters architecturally because the **interface** is the test surface. Some modules already have promising interfaces, but there is no test harness exercising them.

## Files

- `shared/game/simulation.ts`
- `shared/game/progression.ts`
- `server/src/ws/SessionHandler.ts`
- `server/src/game/GameSession.ts`
- `app/convex/spaceDeposits.ts`
- `app/convex/gameSessions.ts`
- `app/convex/tokens.ts`
- `app/convex/verifyPayment.ts`

## Proposed direction

Deepen around testable modules first, not arbitrary small functions:

- simulation interface tests
- progression contract tests
- paid-game intake tests
- Space Token pool lifecycle tests
- snapshot effects tests

## Benefits

- **Locality**: bugs are verified where rules live.
- **Leverage**: tests survive refactors because they target domain interfaces.
- Makes the codebase more AI-navigable because intended behavior becomes executable documentation.

## Open questions

- Which test runner should cover shared/server TypeScript?
- How should Convex mutations/actions be tested: direct function extraction, Convex test harness, or adapter-level tests?
- Which issue above should be paired with tests first?


## Comments

### whaleen — 2026-04-30T02:12:59Z

Started a narrow first slice for the TS test harness so #26 can be tested without creating an ad-hoc setup.

Changes:

- Added `vitest` to `app` dev dependencies.
- Added scripts:
  - `pnpm --dir app test`
  - `pnpm --dir app test:watch`
- Confirmed existing Vite aliases work for app/shared imports in tests.

Validation:

- `pnpm --dir app test` ✅
- `pnpm --dir app build` ✅

This does not close #31; it establishes the first app-level harness slice. Convex/server/shared harness decisions are still open.


### whaleen — 2026-04-30T02:39:48Z

Testing posture after the first harness slice:

- Use the app Vitest harness as the default for app code and pure shared modules. It already supports `@/*` and `@shared/*` imports.
- Keep shared tests near the harness for now instead of adding a separate `shared/` package test runner.
- Do not add a Convex runtime test setup yet. Prefer extracting pure logic into shared/testable modules, then test those with Vitest.
- Add a server Vitest harness only when a server refactor creates a clean server-side **interface** worth testing, likely during #25.

Leaving this issue open because server runtime, Convex lifecycle, and simulation harness coverage are still broader future slices.


### whaleen — 2026-04-30T02:48:02Z

Added the first server-side test harness slice.

- `server` now has Vitest scripts.
- `GameRuntime` has focused interface tests.
- This validates the testing posture from the earlier comment: add server Vitest when #25 creates a clean server-side interface worth testing.

Still open for future #31 slices:

- shared simulation/progression coverage
- Convex lifecycle testing strategy, likely via extracted pure modules or adapter-level tests


### whaleen — 2026-04-30T19:57:45Z

Closing as the high-leverage test harness work is now done-enough.

What landed:

- App Vitest harness
  - `clientSnapshotPresenter` tests
  - `gameConfigContract` tests
  - `spaceTokenLedger` tests
  - `vaultMessages` golden byte layout tests
  - `simulationCollision` tests
- Server Vitest harness
  - `GameRuntime` tests
  - `PaidGameIntake` tests
- Convex testing posture implemented via extracted pure modules
  - Rather than standing up a Convex runtime test harness, high-risk Convex lifecycle rules were extracted into testable modules and covered with Vitest.

Validation is now routinely passing with:

- `pnpm --dir app test`
- `pnpm --dir server test`
- app/server builds
- `npm run lint`

Future tests can be added under these harnesses as new seams are extracted.
