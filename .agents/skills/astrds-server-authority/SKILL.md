---
name: astrds-server-authority
description: Work on ASTRDS gameplay, WebSocket runtime, sessions, scoring, rewards, or anti-cheat-sensitive systems. Use when touching apps/astrds game flow, server/earth ASTRDS runtime, or Convex session/economy paths.
---

# ASTRDS Server Authority

ASTRDS must remain server-authoritative for anti-cheat and economy safety.

## Core rules

- The client sends inputs and renders snapshots.
- The server owns simulation, session state, scoring, pill collection, and reward authority.
- Convex persists sessions, config, scores, claims, and realtime state.
- Clients must not decide economy-critical outcomes.
- ASTRDS remains standalone-accessible with a wallet and must not require an Earth character.

## Runtime shape

```txt
apps/astrds client
  -> wallet adapter + UI + transaction submission
  -> WebSocket inputs/snapshot rendering

server/earth
  -> authoritative ASTRDS WebSocket runtime
  -> validates active Convex game sessions
  -> submits authoritative game results/settlement writes

Convex
  -> sessions, gameSessions, scores, gameConfig, claims, spawn tickets

Solana
  -> Space Vault Program, ASTRDS Token-2022, emission/claim settlement
```

## Economy/session constraints

- Insert Quarter/payment verification must precede game admission.
- Server locks the emission tier/session config at session start.
- Earned ASTRDS comes from server-authoritative pill collection and settlement.
- Per-game allocation cap is 50 ASTRDS.
- Mainnet/economy-hardening work should align with issue #28 unless superseded.

## What to inspect

For ASTRDS gameplay/server work, inspect relevant files in:

```txt
apps/astrds/src/
server/earth/src/
convex/gameSessions.ts
convex/sessions.ts
convex/scores.ts
convex/spaceDeposits.ts
convex/tokens.ts
docs/economy.md
docs/chain.md
```

## Validation

Run as relevant:

```bash
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
npx convex dev --once
```

For deployed server changes, use `earth-deployment-verify` and confirm `/ready` is healthy.
