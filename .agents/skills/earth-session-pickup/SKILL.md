---
name: earth-session-pickup
description: Start or resume work in the Earth monorepo. Use at the beginning of Earth/ASTRDS sessions to load canonical docs, inspect GitHub issue priorities, and apply project operating rules.
---

# Earth Session Pickup

Use this skill when starting, resuming, or re-orienting work in `/Users/josh/Projects/_nothingdao/earth`.

## Required context reads

Read these files before planning or editing:

```txt
AGENTS.md
docs/open-issues.md
docs/harmonization-roadmap.md
docs/architecture.md
docs/vision.md
docs/deployment.md
docs/env-vars.md
docs/economy.md
docs/chain.md
docs/storage.md
```

If the task is specialized, also load the matching project skill, e.g. `earth-convex`, `astrds-server-authority`, `earth-storage-r2`, or `earth-solana-chain`.

## Issue queue check

GitHub issues are the canonical work queue. Run:

```bash
gh issue list --state open --label priority:P1 --json number,title,labels
gh issue list --state open --label priority:P2 --json number,title,labels
```

Before editing for an issue, inspect it:

```bash
gh issue view <number> --json number,title,body,comments,labels
```

## Operating rules

- Do not create or expand Markdown TODO lists, roadmaps, or issue inventories as substitutes for GitHub issues.
- Keep persistent docs concise and architectural; put work tracking in GitHub issues.
- On-chain data is canonical for token/NFT ownership.
- Convex stores profile/session/progression/realtime/cached convenience data, not canonical ownership.
- Supabase and Netlify Functions are deprecated; do not add new dependencies on either.
- Netlify is static hosting only.
- R2 writes go through `server/earth`.
- Do not run `npx convex deploy` unless explicitly moving to the separate production Convex deployment.

## Common validation commands

Run as relevant:

```bash
pnpm --filter earth-2089 build
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
npx convex dev --once
```
