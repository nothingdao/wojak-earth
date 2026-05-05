# Storage

Cloudflare R2 is the object storage layer. Use R2 terminology in docs and code; the S3 SDK is only an implementation detail for the S3-compatible API.

## Buckets

| Bucket | Purpose | Status |
| --- | --- | --- |
| `earth-characters` | Generated/composited Earth character images and NFT image assets | In progress |
| `astrds-audio` | ASTRDS sound/music assets when moved out of static public files | In progress |

## Rules

- R2 credentials live only on `server/earth` or trusted server-side tooling.
- Frontends must not write directly to R2.
- `earth-characters` writes go through `server/earth`.
- `astrds-audio` reads may be public/CDN-backed later; writes/admin changes should go through `server/earth`.
