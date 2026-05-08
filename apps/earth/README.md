# Earth 2089

Web3 post-apocalyptic survival game. Solana NFT characters, real-time multiplayer, autonomous NPCs, and EARTH token economy.

## Architecture

```
Frontend (Netlify, static)
    ↓ useQuery / useMutation (reactive)
Convex (data layer + realtime)
    ↓ ConvexHttpClient (privileged ops)
Railway server (server/earth)
    ↓ S3 SDK
Cloudflare R2 (character images)
    ↓ web3.js
Solana devnet (NFT minting, token bridge)
```

**No Netlify Functions. No Supabase.**

## Tech stack

| Concern | Solution |
|---------|----------|
| UI | React 19 + TypeScript + Vite+ |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Data / Realtime | Convex (`useQuery`, `useMutation`) |
| Privileged server ops | Railway (`server/earth`) via `VITE_SERVER_URL` |
| Object storage | Cloudflare R2 (`earth-characters` bucket) |
| Blockchain | Solana (wallet adapter + Metaplex) |
| Map | D3.js SVG |
| State | React Context (`GameProvider`) |

## Development

From repo root:
```bash
pnpm run dev:earth        # Vite dev server → https://localhost:5173
pnpm run convex:dev       # Convex dev server (required)
pnpm run dev:server       # Railway server → http://localhost:3001
```

## Environment variables

```
VITE_CONVEX_URL=https://colorful-nightingale-908.convex.cloud
VITE_SERVER_URL=https://<railway-domain>          # http://localhost:3001 in dev
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_EARTH_MINT_ADDRESS=<earth-spl-token-mint>
VITE_TREASURY_WALLET_ADDRESS=<treasury-pubkey>
```

## Key source directories

```
src/
├── components/          — UI components and views
│   ├── views/           — Game screen components (MainView, InventoryView, …)
│   ├── admin/           — StoryEditor, admin tools
│   └── screens/         — Full-screen flows (CharacterCreation, etc.)
├── hooks/               — React hooks (usePlayerCharacter, useCharacterVisual, …)
├── providers/           — GameProvider (central state + actions)
├── lib/                 — convex-singleton, convex-adapters, game-logic
├── utils/               — story-playback, story-flags, asset-loader
├── config/              — gameConfig, constants, functionsBase (SERVER_URL)
└── types/               — index.ts (all types, camelCase + snake_case compat)
```

## Convex modules (convex/earth/)

| Module | Purpose |
|--------|---------|
| `characters.ts` | CRUD + travel + leaderboards + nuke |
| `inventory.ts` | equip / unequip / add |
| `stories.ts` | full story/chapter/event/choice/consequence CRUD |
| `locations.ts` | location data + resources + player counts |
| `market.ts` | buy / sell / listings |
| `economy.ts` | overview + grant experience |
| `transactions.ts` | transaction log + mining |
| `chat.ts` | location-based chat |
| `storyFlags.ts` | chapter completion + player flags |

## Railway server routes (server/earth/src/earth/)

| Route | Purpose |
|-------|---------|
| `POST /earth/mint-player` | Verify payment → create character → upload image → mint NFT |
| `POST /earth/update-appearance` | Upload new character image to R2 |
| `GET  /earth/nft-metadata/:id` | Solana-compatible NFT metadata JSON |
| `GET  /earth/sol-balance` | SOL balance from RPC |
| `GET  /earth/exchange/info` | Exchange rates + treasury info |
| `GET  /earth/exchange/quote` | Buy/sell quote |
| `POST /earth/bridge` | DEPOSIT / WITHDRAW / STATUS |
| `GET  /earth/economy` | Economy overview |
| `POST /earth/grant-experience` | Grant XP to character |

## Game features

- **Character creation** — Visual layer compositor → R2 upload → Metaplex NFT mint (currently 0.05 SOL on devnet)
- **World map** — SVG + D3, zone-based travel with energy/health costs
- **Mining** — Resource extraction with equipment and location bonuses
- **Markets** — Player-driven item trading at each location
- **Story system** — Interactive narrative with choices and consequences
- **EARTH bridge** — Deposit/withdraw SPL tokens ↔ in-game balance
- **Leaderboards** — Wealth and level rankings
- **Real-time chat** — Location-scoped via Convex subscriptions
- **NPC engine** — Future autonomous characters service (see `../../server/earth-npc-engine/`; pending migration)
