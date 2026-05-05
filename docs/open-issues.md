# Open Issues / Remaining Alignment Work

Prioritized list after the Earth + ASTRDS monorepo stabilization pass.

## P0 — deployment/runtime correctness

### 1. Confirm Netlify site settings

Expected settings:

- Earth site base directory: `apps/earth`
- ASTRDS site base directory: `apps/astrds`
- Build command: `pnpm build`
- Publish directory: `dist`
- Node: 22
- pnpm: 9.x

Each app has a local `netlify.toml`, but Netlify UI settings should be checked.

### 2. Confirm Railway service settings after server rename

`server/earth` replaced the old `server/astrds` runtime.

Confirm Railway uses:

- root/base directory: `server/earth` or equivalent monorepo service config
- package: `earth-server`
- start: `pnpm start` or `pnpm --filter earth-server start`
- required env vars set

Important env vars include at least:

```txt
CONVEX_URL
CONVEX_SITE_URL
ADMIN_API_KEY
SOLANA_RPC_URL
SERVER_URL
TREASURY_WALLET_ADDRESS
SERVER_KEYPAIR_SECRET
PLAYER_COLLECTION_ADDRESS
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_PUBLIC_URL
PORT
```

### 3. Confirm ASTRDS production WebSocket URL

`apps/astrds/public/servers.json` was updated to a placeholder-style renamed Railway URL:

```txt
wss://earth-server-production.up.railway.app
```

Confirm the real Railway domain and update this file and/or env-driven WS config.

## P1 — Earth backend gaps from Convex migration

### 4. Earth admin mutations are incomplete

`apps/earth/src/lib/admin/adminTools.ts` contains explicit stubs for admin actions that need real Convex mutations:

- `updateCharacterStats`
- `banCharacter`
- `updateLocation`
- `updateItem`
- `updateMarketListing`
- `createMarketListing`
- `deleteItem`
- `deleteLocation`
- `deleteMarketListing`
- `resetWorldDay`

Builds pass, but these actions throw runtime errors until implemented.

### 5. Reservation confirmation by transaction signature is incomplete

`apps/earth/src/lib/reservations.ts` has `updateReservationStatus()` as a stub because Convex lacks direct lookup/mutation by transaction signature.

Likely needed:

- add `earth_reservations.by_tx` index in `convex/schema.ts`
- add `getByTransactionSignature` query
- add confirm/fail mutation by transaction signature
- update `ReservationScreen` flow

### 6. Missing `/earth/local-radio` server route

`apps/earth/src/components/LocalRadio.tsx` calls:

```txt
GET /earth/local-radio?location_id=...
```

`server/earth` does not currently expose this route. Decide whether to:

- add the route, or
- remove/disable the LocalRadio feature until designed.

### 7. NFT address persistence is incomplete

`server/earth/src/earth/routes/mint-player.ts` mints the NFT but has a TODO for persisting NFT address:

```txt
TODO: add setNftAddress mutation to Convex
```

Add a dedicated Convex mutation and use it after minting.

## P1 — shared profile/account alignment

### 8. Audit current wallet profile usage

Do not overdesign a new profile system. Audit current usage first:

- `convex/schema.ts` `players` table
- ASTRDS profile/session usage
- Earth `earth_characters` wallet lookup usage
- frontend hooks that depend on wallet/profile fields

Goal: define the minimal shared wallet profile shape that combines what both games already require.

## P2 — R2 wiring

### 9. Complete `earth-characters` production wiring

Server upload helper exists in `server/earth/src/earth/lib/r2.ts`. Confirm:

- bucket exists
- public URL/domain is correct
- CORS/public reads work
- image URLs are stable for NFT metadata

### 10. Plan `astrds-audio` migration

`astrds-audio` bucket is planned. Current audio can stay static until migration. Future model:

- public/CDN reads
- server/admin writes through `server/earth`
- no client-side R2 credentials

## P2 — NPC engine migration

### 11. Migrate `server/earth-npc-engine`

The NPC engine was moved mechanically. It still contains old assumptions and should not be production-deployed until migrated.

Target model:

- Railway continuous service
- wallet-backed NPCs
- minted Earth characters
- same authoritative action validation as players
- no separate non-wallet NPC actor type
- Convex/Railway APIs instead of old Supabase/Netlify paths

## P2 — docs cleanup / polish

### 12. Review remaining comments that mention old Supabase concepts

Some source comments still mention migration from Supabase or old schema compatibility. These are mostly harmless, but future cleanup can reword them to reduce confusion.

Do not reintroduce Supabase or Netlify Functions as current architecture.

### 13. Consider code splitting / bundle optimization

Both frontend builds pass but have large chunk warnings. This is not a deployment blocker, but should be optimized later.

## Known good validation commands

```bash
pnpm --filter earth-2089 build
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
```
