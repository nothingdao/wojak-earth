# Storage

Cloudflare R2 is the object storage layer. Use R2 terminology in docs and code; the S3 SDK is only an implementation detail for the S3-compatible API.

## Buckets

| Bucket | Purpose | Status |
| --- | --- | --- |
| `earth-characters` | Generated/composited Earth character images and NFT image assets | Operational for Earth mint flow |
| `astrds-audio` | ASTRDS sound/music assets when moved out of static public files | Planned; tracked by #30/#32 |

## Earth media migration model

Tracked by #30. Earth media now falls into these classes:

- **Generated character/NFT images** — R2-backed via `earth-characters`; writes go through `server/earth` and URLs are stored on `earth_characters` for display/metadata convenience.
- **Composable character/item layers** — currently static files under `apps/earth/public/layers`; these are source art for character generation/equipment rendering. Keep static for now, but audit before moving to a general Earth media bucket because the renderer depends on manifest paths and layer ordering.
- **Item icons/display images** — many migrated item records point at `/items/*.png`, but the repo currently has no `apps/earth/public/items` directory. These should be restored from legacy assets or moved to an R2-backed Earth media/items path with server/admin writes.
- **World/location art** — locations currently use SVG map paths rather than image URLs. Future location art should be classified as static map art or R2-backed Earth media before adding new paths.
- **On-chain metadata-related media** — future Earth character/item NFT metadata URI ownership belongs in the Earth chain architecture work (#34); Convex/R2 URLs remain display/workflow pointers unless chain-verified.

Avoid ad hoc hard-copies in `public/` when an asset is mutable, admin-managed, large, or metadata-owned. Static committed assets are acceptable for stable source art required at build/runtime.

## Rules

- R2 credentials live only on `server/earth` or trusted server-side tooling.
- Frontends must not write directly to R2.
- `earth-characters` writes go through `server/earth`.
- `astrds-audio` reads may be public/CDN-backed later; writes/admin changes should go through `server/earth`.
- Railway must use the R2 S3 credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`), not the `cfat_...` Cloudflare API token.
- If R2 credentials are rotated or exposed, update Railway and redeploy/restart the service.

## Current verification

`earth-characters` write access was verified from Railway production env with a put/delete smoke test, and the real Earth character mint flow wrote Player #1338's image to R2.
