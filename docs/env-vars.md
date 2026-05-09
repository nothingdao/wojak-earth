# Environment Variables

All env vars required across every deployment target. Keep this doc updated when variables are added or removed.

---

## Railway — `server/earth`

Unified runtime for Earth HTTP routes and ASTRDS WebSocket game sessions.  
Set under **Service → Variables** in the Railway dashboard.

### Convex

| Variable | Description |
|---|---|
| `CONVEX_URL` | Convex deployment URL — `https://colorful-nightingale-908.convex.cloud` |
| `CONVEX_SITE_URL` | Convex HTTP actions site URL — `https://colorful-nightingale-908.convex.site` |

### Solana / RPC

| Variable | Description |
|---|---|
| `SOLANA_RPC_URL` | RPC endpoint used by server (Helius recommended). Falls back to public devnet if unset. |

### Wallets (secrets — never commit)

| Variable | Description |
|---|---|
| `TREASURY_WALLET_ADDRESS` | Treasury wallet public key. Receives payments, funds NPCs. `6cfjMdM6yNJQfZRDx25hLUsR8PFFhh4Xb5bdxHPBtoa4` |
| `TREASURY_KEYPAIR_SECRET` | Legacy bridge treasury keypair as a JSON array of bytes `[1,2,3,...]`. Do not build new flows around this; Earth Vault v1 replaces hot-wallet bridge withdrawals (#39–#43). |
| `SERVER_KEYPAIR_SECRET` | Server wallet keypair as a JSON array of bytes `[1,2,3,...]`. NFT mint authority (`GKFkHgfSc3WLDLA1jRxZvsjV7rNZUvDdr98wRmLRn9Vz`). Used by `mint-player` while server/earth remains responsible for v1 character NFT/media production after Earth Vault receipt verification. |

### NFT / Token

| Variable | Description |
|---|---|
| `VITE_EARTH_MINT_ADDRESS` | Legacy/current EARTH SPL token mint address. Earth Vault v1 will replace this with the new EARTH Token-2022 mint once #40 lands. `Cqizw9BZPvecsXDwQoP1UBmA3BcyAgdYHGCtApVbkUjc` |
| `VITE_TREASURY_WALLET_ADDRESS` | Legacy direct-payment/bridge treasury public key. Do not use for new Earth Vault flows except during migration support. |
| `PLAYER_COLLECTION_ADDRESS` | Metaplex NFT collection address. `ApxsHPsUqCPQ1rLt11xXmZv8ur5ymCCy14CJd91nh3d8` |
| `SERVER_URL` | The server's own public URL — used when constructing NFT metadata URIs. Current Railway URL: `https://astrds-game-server-production.up.railway.app` |

### Cloudflare R2

| Variable | Description |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 S3 access key ID with Object Read & Write access. Do not use the `cfat_...` Cloudflare API token here. |
| `R2_SECRET_ACCESS_KEY` | R2 S3 secret access key. Rotate if exposed. |
| `R2_PUBLIC_URL` | Public base URL for the R2 bucket. Custom domain or `https://pub-xxx.r2.dev` |

Buckets: `earth-characters` (character images), `astrds-audio` (audio assets).

### Admin

| Variable | Description |
|---|---|
| `ADMIN_API_KEY` | Secret key that gates privileged Convex calls from the server. Must match the value set in Convex. |

---

## Netlify — Earth 2089 (`apps/earth`)

Static Vite frontend. Set under **Site configuration → Environment variables**.  
All must be prefixed `VITE_` to be visible at build time.

| Variable | Description |
|---|---|
| `VITE_CONVEX_URL` | `https://colorful-nightingale-908.convex.cloud` |
| `VITE_SERVER_URL` | Railway server base URL. **Required for production** — without this, Earth mint/bridge/exchange server calls fail. Current URL: `https://astrds-game-server-production.up.railway.app` |
| `VITE_EARTH_MINT_ADDRESS` | Legacy/current EARTH SPL token mint address until #40 creates the Earth Vault Token-2022 mint. `Cqizw9BZPvecsXDwQoP1UBmA3BcyAgdYHGCtApVbkUjc` |
| `VITE_TREASURY_WALLET_ADDRESS` | Legacy treasury public key used by old `SimplePayment`/`EarthBridge`. Do not use for new #39–#43 Earth Vault flows. `6cfjMdM6yNJQfZRDx25hLUsR8PFFhh4Xb5bdxHPBtoa4` |
| `VITE_MAINNET_RPC_URL` | Mainnet RPC endpoint. `https://mainnet.helius-rpc.com/?api-key=<key>` |
| `VITE_DEVNET_RPC_URL` | Devnet RPC endpoint. `https://devnet.helius-rpc.com/?api-key=<key>` |
| `VITE_SOLANA_RPC_URL` | General RPC fallback used by EarthBridge and GameProvider directly. |

---

## Netlify — ASTRDS (`apps/astrds`)

Static Vite frontend. Set under **Site configuration → Environment variables**.

| Variable | Description |
|---|---|
| `VITE_CONVEX_URL` | `https://colorful-nightingale-908.convex.cloud` |
| `VITE_HELIUS_API_KEY` | Helius API key for wallet token lookups. |
| `VITE_SOLANA_RPC_ENDPOINT` | RPC endpoint. `https://devnet.helius-rpc.com/?api-key=<key>` |
| `VITE_WS_URL` | Production WebSocket URL for the unified `server/earth` Railway runtime. Current URL: `wss://astrds-game-server-production.up.railway.app`. |
| `VITE_WS_LABEL` | Optional display label for `VITE_WS_URL`; defaults to `Production`. |

### ASTRDS server selection

ASTRDS connects to the authoritative game server via WebSocket. Production should use `VITE_WS_URL` so endpoint changes are handled through Netlify env vars and redeploys, not static JSON edits. `apps/astrds/public/servers.json` remains a fallback multi-server list and may be empty. In `DEV` mode, `ws://localhost:3001` is automatically prepended.

---

## Convex

Earth and ASTRDS currently use the shared dev deployment `dev:colorful-nightingale-908`. Set variables under **Settings → Environment Variables** at [dashboard.convex.dev](https://dashboard.convex.dev). Deploy function changes with `npx convex dev --once`; do not use `npx convex deploy` unless intentionally targeting the separate production deployment.

| Variable | Description |
|---|---|
| `SOLANA_RPC_ENDPOINT` | RPC endpoint used by Convex functions. |
| `ADMIN_API_KEY` | Must match the value set on Railway. |
| `HELIUS_WEBHOOK_SECRET` | Validates incoming Helius webhook payloads. |
| `PROGRAM_AUTHORITY_PRIVATE_KEY` | Keypair JSON array for Solana program calls from Convex actions. |
| `SETTLEMENT_PAYER_PRIVATE_KEY` | Keypair JSON array for settlement payout operations. |

---

## Notes

- Private keys are always stored as JSON byte arrays `[1,2,3,...]`, never as base58 strings.
- Netlify `VITE_*` vars are baked into the JS bundle at build time — changing them requires a redeploy.
- Railway vars take effect on the next deploy or restart.
- Convex vars take effect immediately for new function invocations.
- The `VITE_EARTH_MINT_ADDRESS` and `VITE_TREASURY_WALLET_ADDRESS` vars appear on both Railway and Netlify (Earth) because the legacy bridge route on the server reads them directly as `process.env.VITE_*`. This is intentional for the current legacy code only. Earth Vault v1 (#39–#43) should introduce explicit vault/program/mint config and stop routing new payments through direct treasury-wallet flows.
