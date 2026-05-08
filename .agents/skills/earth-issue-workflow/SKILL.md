---
name: earth-issue-workflow
description: Work GitHub issues in the Earth monorepo. Use when starting, updating, validating, commenting on, or closing Earth/ASTRDS GitHub issues.
---

# Earth Issue Workflow

GitHub issues are the canonical work queue for Earth. Do not replace them with Markdown TODO lists, roadmaps, or expanded issue inventories.

## Start work

1. Inspect priorities:

```bash
gh issue list --state open --label priority:P1 --json number,title,labels
gh issue list --state open --label priority:P2 --json number,title,labels
```

2. Inspect the target issue:

```bash
gh issue view <number> --json number,title,body,comments,labels
```

3. Identify acceptance criteria before editing.

4. If new work is discovered, create or update a GitHub issue instead of adding persistent TODO text to docs.

## During implementation

- Keep scope tied to the issue.
- Update docs only when they describe durable architecture, decisions, or confirmed operating procedures.
- Keep docs compact and link issue numbers rather than duplicating issue bodies.
- Respect authority boundaries:
  - Solana/on-chain is canonical for tokens/NFT ownership.
  - Convex is for realtime/session/profile/progression/cache convenience state.
  - ASTRDS gameplay remains server-authoritative.
  - R2 writes go through `server/earth`.
  - Netlify is static hosting only.

## Validation

Run relevant commands and save exact results for the issue comment:

```bash
pnpm --filter earth-2089 build
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
npx convex dev --once
```

Use `earth-deployment-verify` after pushing if the issue requires deployed verification.

## Issue comments

Use this structure:

```md
Implemented in <commit>.

Summary:
- ...

Validation:
- `...`

Deployment/smoke checks:
- ...

Notes:
- ...
```

## Closing

Close only after:

- acceptance criteria are met,
- code/docs are pushed,
- relevant deployment is verified,
- smoke checks pass or skipped with a clear reason.

Example:

```bash
gh issue comment <number> --body "..."
gh issue close <number> --comment "Closed after validation and deployment verification for <commit>."
```
