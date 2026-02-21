# Repo Recon: Earth Harmony (local state)

## 1) Directory Deep-Dive

### `src/components/` / `src/pages/`
- `src/pages/` does not exist in this repo.
- Keyword hits in `src/components/`:
  - `src/components/views/AdminView.tsx`
  - `src/components/views/ProfileView.tsx`
  - `src/components/screens/RegistryDashboard.tsx`
  - `src/components/ui/story-dialog.tsx`
  - `src/components/ui/story-toast.tsx`
  - `src/components/admin/AdminDashboard.tsx`
  - `src/components/admin/StoryEditor.tsx`
  - `src/components/admin/ActivityMonitor.tsx`
  - `src/components/admin/index.ts`
  - `src/components/admin/tabs/OverviewTab.tsx`
  - `src/components/admin/tabs/SettingsTab.tsx`
  - `src/components/admin/tabs/CharactersTab.tsx`
  - `src/components/admin/tabs/LocationsTab.tsx`
  - `src/components/admin/tabs/ItemsTab.tsx`
  - `src/components/admin/tabs/EconomyTab.tsx`
  - `src/components/admin/modals/*` (create/edit item/location/market listing/character)
  - `src/components/admin/types.ts`, `src/components/admin/SearchBar.tsx`, `src/components/admin/StatCard.tsx`

### `npc-engine/`
- `npc-engine/npc-engine.ts`
- `npc-engine/gameConfig.ts`
- `npc-engine/supabase.ts`
- `npc-engine/wallet-manager.js`
- `npc-engine/wallet-manager.d.ts`
- `npc-engine/chat-messages.js`
- `npc-engine/chat-messages.d.ts`
- `npc-engine/npc-config.json`
- `npc-engine/README.md`

Note: no `index.ts`, `main.ts`, `decision.ts`, `behavior.ts`, `sim.ts` files.

### `netlify/functions/` NPC/story/admin-sounding
- Direct name matches:
  - `netlify/functions/mint-npc-nft.js`
  - `netlify/functions/mine-action.js`
  - `netlify/functions/npc-exchange.js`
  - `netlify/functions/get-chat.js`
- Also used by NPC engine flow:
  - `netlify/functions/travel-action.js`
  - `netlify/functions/send-message.js`
  - `netlify/functions/get-locations.js`
  - `netlify/functions/get-player-character.js`
  - `netlify/functions/generate-character-image.js`
- No `story*`, `admin*`, or `config*` function files in `netlify/functions/`.

---

## 2) Key File Summaries

### Admin surface
- `src/components/views/AdminView.tsx`: wallet-gates admin access via `isAdmin(wallet)`, renders full-screen admin dashboard.
- `src/components/admin/AdminDashboard.tsx`: central control panel with tabs for overview/players/locations/items/stories/economy/settings, plus CRUD modals and world ops (`validateWorldData`, reset world day, ban character).
- `src/components/admin/StoryEditor.tsx`: full story graph editor against Supabase tables (`stories`, `chapters`, `events`, `choices`, `consequences`), with consequence builder JSON, chapter/event test playback, archive/restore/permanent delete + JSON backup on delete.
- `src/components/screens/RegistryDashboard.tsx`: player onboarding/status dashboard (character + reservation), not NPC-admin specific.
- `src/components/views/ProfileView.tsx`: player dossier view; reads story flag stats via `story_flags` utilities.

Snippet (`AdminDashboard` story tab + admin tabs):

```tsx
// src/components/admin/AdminDashboard.tsx:103
const tabs = [
  { id: 'overview', label: 'OVERVIEW', icon: Activity },
  { id: 'characters', label: 'PLAYERS', icon: Users },
  { id: 'locations', label: 'LOCATIONS', icon: MapPin },
  { id: 'items', label: 'ITEMS', icon: Package },
  { id: 'stories', label: 'STORIES', icon: BookOpen },
  { id: 'mining', label: 'MINING', icon: Pickaxe },
  { id: 'economy', label: 'ECONOMY', icon: TrendingUp },
  { id: 'settings', label: 'SETTINGS', icon: Settings },
]
...
case 'stories':
  return (
    <div className="bg-background border border-primary/30 rounded-lg">
      <StoryEditor character={character} />
    </div>
  )
```

### NPC engine start/run/config/load behavior
- Main runtime is `npc-engine/npc-engine.ts`.
- Startup:
  - validates env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `TREASURY_KEYPAIR_SECRET`)
  - prompts interactive activity mode
  - loads locations from local Netlify functions API
  - resumes existing NPCs from DB wallets (`npc_wallets` + `characters`)
  - spawns missing NPCs (wallet funding + image generation + mint)
  - starts per-NPC scheduled loop.
- Config source:
  - hardcoded override object in `npc-engine/npc-engine.ts`
  - default config in `npc-engine/gameConfig.ts`
  - `npc-engine/npc-config.json` exists but appears unused.
- Data sources:
  - uses env for Supabase and treasury keypair (`npc-engine/supabase.ts` + engine constructor)
  - runtime actions call Netlify endpoints (`mine-action`, `travel-action`, `send-message`)
  - some swarm paths write directly to Supabase (`characters`, `chat_messages`).

Snippet (`start()` + load/resume/spawn):

```ts
// npc-engine/npc-engine.ts:215
this.currentActivityMode = await selectActivityMode()
console.log('[START] Starting NPC Engine...')
await this.loadLocations()

let resumedCount = 0
if (this.config.RESUME_EXISTING) {
  resumedCount = await this.resumeExistingNPCs()
}
const needed = this.config.DEFAULT_NPC_COUNT - resumedCount
if (needed > 0) {
  await this.spawnNPCs(needed)
}
this.runLoop()
```

Snippet (action loop -> API calls):

```ts
// npc-engine/npc-engine.ts:719
const response = await this.callAPI('mine-action', {
  wallet_address: npc.wallet.publicKey.toString(),
  location_id: npc.location
})
...
const response = await this.callAPI('travel-action', {
  wallet_address: npc.wallet.publicKey.toString(),
  destinationId: location.id
})
...
await this.callAPI('send-message', {
  wallet_address: npc.wallet.publicKey.toString(),
  location_id: npc.location,
  content: message,
  message_type: 'CHAT'
})
```

### `db-api.js`
- Supabase client with hardcoded URL + hardcoded service-role key.
- CRUD/read helpers for:
  - `locations`
  - `characters`
  - `items`
  - `market_listings`
  - `transactions`
  - `chat_messages`
  - `location_resources`
- Plus RPC SQL helper `exec_sql`.
- No explicit methods for NPC behavior/schedule/profile tables.
- No story tables (`stories`, `chapters`, `events`, `choices`, `consequences`) in this file.

Snippet:

```js
// db-api.js:62
async characters(query = {}) {
  let q = supabase.from('characters').select('*')
  Object.entries(query).forEach(([key, value]) => {
    q = q.eq(key, value)
  })
  const { data, error } = await q
  return { data, error, count: data?.length || 0 }
}
...
async chatMessages(query = {}) {
  let q = supabase.from('chat_messages').select('*')
```

### `package.json` scripts + NPC/admin deps
- Full scripts:
  - `dev`, `dev:frontend-only`, `build`, `lint`, `preview`
  - `start`, `functions:dev`, `functions:build`
  - `npc:start`, `npc:dev`
  - `types`, `extract-locations`
- NPC/admin relevant deps include:
  - `@supabase/supabase-js`
  - `@solana/web3.js`, `@solana/spl-token`
  - `@metaplex-foundation/js`
  - `dotenv`
  - `tsx`, `ts-node`
  - admin UI stack (`lucide-react`, Radix packages, etc.)

Potential issue: scripts point at `.js` NPC entry (`npc-engine.js`, `npc-engine/npc-engine.js`) while repo contains `npc-engine/npc-engine.ts`.

---

## 3) Code Patterns & Gaps

### Duplication check (requested keywords)
- Searched for `mineResource|executeTrade|moveToZone|generateChat|applyDamage|checkDeath`.
- Result:
  - Only `generateChatMessage` found, and only in `npc-engine/npc-engine.ts`.
  - Other requested keywords not found in `npc-engine/` or `netlify/functions/`.

### Additional duplication worth calling out
- Mining formulas duplicated between frontend and backend:
  - `src/components/views/MiningView.tsx:25`
  - `netlify/functions/mine-action.js:6`
- Same conceptual formulas (`getMiningEnergyCost`, `getPowerCoreCapacity`) implemented twice.

### Story/NPC config flow
- Story content is DB-driven in admin editor (`stories/chapters/events/choices/consequences`).
- `consequence_data` supports arbitrary JSON (plus explicit fields like `story_flag`, `next_event_id`) but no formal JSON schema validation layer.
- Local story manager (`src/utils/story-manager.ts`) has JSON export/import (localStorage-oriented), separate from DB story editor.
- No NPC behavior/schedule schema discovered; no `behavior*`/`schedule*` table usage in `db-api.js`.
- `npc-engine/npc-config.json` appears orphaned/unread.

### Supabase real-time usage
- In NPC engine: no Supabase realtime channel subscription found.
- In admin:
  - `src/components/admin/ActivityMonitor.tsx` subscribes to `transactions` INSERT.
- In game hooks (non-admin but relevant):
  - `src/hooks/useGameData.ts` realtime for `chat_messages` and location players.
  - `src/hooks/usePlayerCharacter.ts` realtime for `characters` updates and `character_inventory`.

---

## 4) Prioritized First Steps (Harmony Tightening)

1. Create shared game-logic module for mining calculations and reuse in both backend and frontend.
- Extract `getMiningEnergyCost/getPowerCoreCapacity` to `src/lib/game-logic/mining.ts`.
- Import into `src/components/views/MiningView.tsx` and `netlify/functions/mine-action.js`.

2. Standardize NPC runtime config source and remove dead config path.
- Either wire `npc-engine/npc-config.json` into `npc-engine/npc-engine.ts`, or delete it.
- Keep one source of truth (`npc-engine/gameConfig.ts` + env overrides).

3. Fix NPC run scripts to existing TS entrypoint.
- Update `package.json`:
  - `npc:start`: `npx tsx ./npc-engine/npc-engine.ts`
  - `npc:dev`: `NODE_ENV=development npx tsx ./npc-engine/npc-engine.ts`

4. Add API-facing story CRUD/read endpoints if admin/editor needs backend boundary.
- Create `netlify/functions/story-*` wrappers for `stories/chapters/events/choices/consequences`.
- Reduces direct DB writes from large client editor and enables permission/validation.

5. Add typed validation for `consequence_data` payloads.
- Define schema (zod or TS runtime checks) for allowed keys (`health`, `energy`, `experience`, `credits`, `item`, `story_flag`, `next_event_id`, etc.).
- Enforce at save time in `StoryEditor` and at playback entry points.

### Low-risk small diffs
- Rename `mininglocation_id` -> `miningLocationId` in `netlify/functions/mine-action.js`.
- Add one comment in NPC engine where `npc-config.json` is intentionally unused or replace with actual load.
- Replace hardcoded service key in `db-api.js` with env lookup to avoid accidental key exposure.
