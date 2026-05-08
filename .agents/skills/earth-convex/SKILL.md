---
name: earth-convex
description: Work on the shared Earth/ASTRDS Convex backend. Use when editing convex schema, queries, mutations, actions, generated API types, or Convex deployment state.
---

# Earth Convex

Convex is the shared backend for Earth and ASTRDS.

## Deployment rule

Earth and ASTRDS currently use the shared dev deployment:

- Deployment: `dev:colorful-nightingale-908`
- Cloud URL: `https://colorful-nightingale-908.convex.cloud`
- Site URL: `https://colorful-nightingale-908.convex.site`

Deploy function/schema changes with:

```bash
npx convex dev --once
```

Do **not** run `npx convex deploy` unless the user explicitly says to move to the separate production Convex deployment.

## Authority model

- Convex is not canonical for token/NFT ownership.
- On-chain Solana data is canonical for wallet assets, NFTs, token balances, custody, and settlement.
- Convex stores realtime state, sessions, profile metadata, scores, progression, transient accounting, cached/indexed convenience data, and server-prepared authorization records.
- Any Convex NFT/token fields should be treated as cached display or workflow pointers unless an issue explicitly defines verified ownership semantics.

## Schema/index guidance

When editing `convex/schema.ts`:

- Add indexes for every wallet/session/status lookup used by queries.
- Prefer wallet-keyed indexes for cross-game identity patterns.
- Keep tables narrowly scoped; avoid duplicating canonical chain state.
- After schema/function changes, run `npx convex dev --once` to update generated API files and the dev deployment.

## Function guidance

- Queries should assemble convenience views and derived stats from canonical Convex tables.
- Mutations should validate wallet/session/character ownership based on existing records, but not claim on-chain ownership without chain verification.
- Actions may call external services/RPCs, but keep secrets in Convex env vars.
- Privileged HTTP/server paths must be gated by `ADMIN_API_KEY` where appropriate.

## Generated files

Convex generated files under `convex/_generated/` may change after `npx convex dev --once`. Include generated API/type changes when they are required by app builds.

## Validation

Run as relevant:

```bash
npx convex dev --once
pnpm --filter earth-2089 build
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
```
