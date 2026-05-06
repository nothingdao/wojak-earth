# Issue #36: Tests: server finalize/disconnect settlement coverage

- Source: https://github.com/nothingdao/astrds/issues/36
- State: OPEN
- Labels: none
- Assignees: none
- Created: 2026-05-01T01:14:10Z
- Updated: 2026-05-01T01:14:10Z

## Body

Parent: #31, related: #33

## Summary

Add server Vitest coverage for disconnect/finalize settlement behavior.

## Scope

- Cover `GameRuntime.finalize()` or the server-owned interface that calls it.
- Ensure final game state is submitted once on disconnect/stop.
- Ensure repeated stop/finalize does not duplicate settlement submission.
- Ensure normal game-over path and disconnect path share consistent settlement payload fields.

## Acceptance criteria

- Tests live under `server/src/**/*.test.ts`.
- `pnpm --dir server test` passes.
- No real Convex or Solana dependency; use fake `ConvexServerClient` / injected adapter.

