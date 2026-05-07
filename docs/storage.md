# Storage

Cloudflare R2 is the object storage layer. Use R2 terminology in docs and code; the S3 SDK is only an implementation detail for the S3-compatible API.

## Buckets

| Bucket | Purpose | Status |
| --- | --- | --- |
| `earth-characters` | Generated/composited Earth character images and NFT image assets | Operational for Earth mint flow |
| `astrds-audio` | ASTRDS sound/music assets when moved out of static public files | Planned; tracked by #30/#32 |

## Rules

- R2 credentials live only on `server/earth` or trusted server-side tooling.
- Frontends must not write directly to R2.
- `earth-characters` writes go through `server/earth`.
- `astrds-audio` reads may be public/CDN-backed later; writes/admin changes should go through `server/earth`.
- Railway must use the R2 S3 credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`), not the `cfat_...` Cloudflare API token.
- If R2 credentials are rotated or exposed, update Railway and redeploy/restart the service.

## Current verification

`earth-characters` write access was verified from Railway production env with a put/delete smoke test, and the real Earth character mint flow wrote Player #1338's image to R2.
