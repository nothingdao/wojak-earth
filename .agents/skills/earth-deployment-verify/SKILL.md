---
name: earth-deployment-verify
description: Verify Earth/ASTRDS deployments after pushing changes. Use after commits land on main to check Netlify, Railway, readiness endpoints, and prepare GitHub issue follow-up.
---

# Earth Deployment Verification

Use this skill after pushing changes that should deploy to Earth, ASTRDS, Railway, or Convex.

## Confirm local commit

```bash
git status --short
git log -1 --oneline
```

## Netlify verification

Earth and ASTRDS are static Netlify apps:

| Site | URL | Netlify name | Expected package |
| --- | --- | --- | --- |
| Earth | `https://earth.ndao.computer` | `earth-2089` | `apps/earth` |
| ASTRDS | `https://astrds.ndao.computer` | `astrds` | `apps/astrds` |

Prefer the Netlify API via the CLI token if `netlify sites:list` is interactive or unstable:

```bash
netlify status --json
netlify api listSites --data '{}'
```

If needed, read the local Netlify token from `~/Library/Preferences/netlify/config.json` and call the API with Python/`curl`. Do not print tokens.

Check latest deploys for both site IDs and confirm:

- `state` is `ready`
- `branch` is `main`
- `commit_ref` matches the pushed commit
- `error_message` is null

Smoke check:

```bash
curl -sSI https://earth.ndao.computer | sed -n '1,12p'
curl -sSI https://astrds.ndao.computer | sed -n '1,12p'
```

Both should return HTTP 200.

## Railway verification

Railway project/service:

- Project: `earth`
- Service: `astrds-game-server`
- Public URL: `https://astrds-game-server-production.up.railway.app`
- Healthcheck path: `/ready`

Run:

```bash
railway status --json
curl -sS https://astrds-game-server-production.up.railway.app/ready | python3 -m json.tool
```

Confirm latest deployment:

- status is `SUCCESS`
- `commitHash` matches pushed commit
- `/ready` returns `ok: true`
- Convex, Solana, Earth minting/bridge, and R2 checks pass. Optional missing fields are acceptable only if documented as optional.

## Convex verification

If Convex functions/schema changed, confirm `npx convex dev --once` was run successfully against the shared dev deployment. Do not run `npx convex deploy` unless explicitly instructed.

## GitHub issue follow-up

Comment on the relevant issue with:

- commit hash
- Netlify deploy IDs and states
- Railway deployment ID and status
- smoke check results
- validation commands run

Close the issue only when acceptance criteria are implemented, pushed, deployed as relevant, and smoke-verified.
