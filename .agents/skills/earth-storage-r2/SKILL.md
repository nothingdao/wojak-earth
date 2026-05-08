---
name: earth-storage-r2
description: Work on Cloudflare R2 storage for Earth character images, NFT image assets, or future ASTRDS audio. Use when touching uploads, object storage, media serving, or R2 environment variables.
---

# Earth R2 Storage

Cloudflare R2 is the object storage layer. Use R2 terminology in docs/code; the S3 SDK is only the implementation detail for R2's S3-compatible API.

## Buckets

| Bucket | Purpose | Status |
| --- | --- | --- |
| `earth-characters` | Generated/composited Earth character images and NFT image assets | Operational |
| `astrds-audio` | Future ASTRDS sound/music assets moved out of static public files | Planned |

## Rules

- R2 credentials live only on `server/earth` or trusted server-side tooling.
- Frontends must not write directly to R2.
- `earth-characters` writes go through `server/earth`.
- Future `astrds-audio` writes/admin changes should go through `server/earth`.
- Public/CDN-backed reads are acceptable when intentionally designed.
- Railway must use R2 S3 credentials:
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
- Do not use the `cfat_...` Cloudflare API token as an R2 S3 credential.

## Environment variables

Inspect `docs/env-vars.md` and `docs/storage.md` before changing storage code.

Railway `server/earth` storage vars:

```txt
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_PUBLIC_URL
```

## Files to inspect

```txt
docs/storage.md
docs/env-vars.md
server/earth/src/
apps/earth/src/components/views/CharacterCreationView.tsx
apps/earth/src/components/views/InventoryView.tsx
```

## Verification

- Build relevant packages.
- If deployed, use `earth-deployment-verify` and confirm `/ready` includes `r2-storage` with `ok: true`.
- For write-path work, prefer a safe put/delete smoke test through server-side tooling, never from frontend credentials.

```bash
pnpm --filter earth-server build
pnpm --filter earth-2089 build
curl -sS https://astrds-game-server-production.up.railway.app/ready | python3 -m json.tool
```
