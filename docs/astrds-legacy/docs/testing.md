# Testing Strategy

ASTRDS uses three complementary test layers. The goal is to keep behavior executable as the code changes: every feature should either add/update tests, point to existing coverage, or explicitly document why no test applies.

## 1. Vitest for TypeScript domain interfaces

Use Vitest for app, shared, and server TypeScript. Prefer tests against stable domain interfaces rather than incidental helpers.

Current commands:

```bash
pnpm --dir app test
pnpm --dir server test
npm run test:ts
```

CI runs both Vitest suites plus app/server builds on pull requests and pushes to `main` via `.github/workflows/test.yml`.

Current coverage:

- App/shared Vitest (`app/src/game/*.test.ts`)
  - snapshot presentation
  - game config contract
  - simulation collisions
  - space token ledger behavior
  - vault authorization message golden byte layouts
- Server Vitest (`server/src/game/*.test.ts`)
  - paid-game intake
  - game runtime orchestration

Add new pure/shared tests under the app harness when they depend on `@shared/*` and do not require Node-only server APIs. Add server tests under `server/src` when the interface is server-owned.

## 2. Anchor tests for on-chain invariants

Use Anchor tests for program accounts, instruction constraints, replay protection, SPL transfer/burn behavior, and signer/ed25519 verification.

Commands:

```bash
anchor test
npm run test:anchor
```

Emission-vault areas that should remain Anchor-tested:

- `initialize_emission_vault`
- `settle_game`
  - earned < allocated burns the difference
  - duplicate settlement rejected
  - invalid signature rejected
  - allocation cap enforced
- `claim_astrds`
  - full and partial claims
  - over-claim rejected
  - player ATA init path

## 3. Devnet smoke tests for deployed wiring

Use smoke scripts for end-to-end deployed integration across Solana devnet + Convex HTTP. These are not unit tests and may depend on funded devnet wallets/env vars.

Current smoke script:

```bash
node scripts/smoke-emission-claim.js
```

This verifies:

1. `game_payment`
2. Convex payment verification
3. Convex game session lifecycle
4. server-side `settle_game` submission through `/game-server/set-astrds-earned`
5. on-chain `PlayerEmission.claimableRaw`
6. `claim_astrds` transfer to the player ATA

The smoke script uses the agent devnet wallet documented in `docs/agent-wallet.md`.

## Convex testing posture

Do not stand up a Convex runtime harness by default. For Convex-heavy behavior, prefer one of these seams:

1. Extract pure validation/derivation logic into testable modules and cover with Vitest.
2. Test adapter-level behavior through narrow server/client wrappers.
3. Use devnet smoke tests only for deployed Convex + Solana integration.

This keeps tests fast and avoids brittle Convex runtime fixtures while still covering lifecycle rules.

## Definition of done for future changes

For every issue/feature/bugfix, include one of these in the final note or PR description:

- `No test needed` — docs-only, copy-only, or visual-only change.
- `Covered by existing test` — name the test file.
- `Added/updated test` — name the test file.
- `Smoke tested` — name the script/tx if deployed integration was required.

Bugfix rule:

> If a bug was confusing enough to debug, it should usually get a regression test or smoke assertion.

Run the smallest meaningful test slice while developing:

| Change area | Required local check |
| --- | --- |
| app/shared TS behavior | `pnpm --dir app test` |
| server TS behavior | `pnpm --dir server test` |
| both app + server | `npm run test:ts` |
| Rust/on-chain program | `anchor test` or targeted Anchor test |
| deployed Convex + Solana integration | relevant smoke script, e.g. `node scripts/smoke-emission-claim.js` |
| broad/pre-merge confidence | `npm run test:all` where practical |

Prefer adding tests at stable interfaces:

- good: `paid session can be consumed once`
- good: `duplicate game settlement is rejected`
- good: `claim-only path is used when PlayerEmission already has claimable balance`
- bad: `function X calls function Y`

## CI expectations

The GitHub Actions TypeScript workflow is intentionally fast and should stay green:

```bash
pnpm --dir app test
pnpm --dir server test
pnpm --dir app build
pnpm --dir server build
```

Anchor tests and devnet smoke tests are heavier. Run them locally or in a dedicated workflow when touching on-chain/economy flows.

## Recommended next tests

Highest-leverage gaps:

1. Anchor emission-vault tests for the new fixed-supply flow.
2. Vitest tests for settlement payload derivation and claim-path decision logic.
3. More shared simulation/progression tests around level bands and emission-tier edge cases.
4. Focused Convex pure-module tests for session settlement validation if more logic is extracted from `gameSessions.ts` / `tokens.ts`.
