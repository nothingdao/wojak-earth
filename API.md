# API Documentation

## Character Management

### Core Actions

- `get-player-character` - Fetch character by wallet address
- `mint-nft` - Create new character with payment verification (0.01 SOL)
- `nuke-character` - Permanently delete character and all data
- `metadata/{characterId}` - Generate NFT metadata for character

### Game Actions

- `mine-action` - Mine for items at current location (-10 energy)
- `travel-action` - Move character between locations
- `buy-item` - Purchase from market listings
- `use-item` - Consume items for health/energy effects
- `equip-item` - Manage character equipment with multi-slot system
- `send-message` - Send chat messages to location channels

## World & Content

### Locations & Market

- `get-locations` - Fetch all locations with player counts and sub-locations
- `get-market` - Get market listings for specific location
- `get-market-preview` - Quick market stats overview
- `get-location-resources` - Available mining resources by location

### Social & Activity

- `get-chat` - Location-based chat messages with regional scope
- `get-players-at-location` - List players at specific location
- `get-global-activity` - Recent player actions across the world
- `get-local-radio` - Location-specific music playlists from Supabase storage

### Admin Tools

- `generate-npc-activity` - Create AI-driven NPC behaviors and actions
- `collection-metadata` - NFT collection information
- `create-collection` - Initialize Solana NFT collection

## Database Operations

### Real-time Features

- Character stats updates (energy, health, coins, level)
- Inventory changes and equipment updates
- Chat message broadcasting
- Player location tracking

### Key Tables

- `characters` - Player data, stats, wallet linking
- `character_inventory` - Items with multi-slot equipment system
- `locations` - World regions with SVG path mapping
- `market_listings` - Player and system item sales
- `chat_messages` - Location-based messaging
- `transactions` - Action logging for all player activities

### Multi-slot Equipment

- Primary/secondary slots per category (head, clothing, tools, etc.)
- Level-based slot unlocking (1 + level/5, max 4 slots)
- Equipment conflicts and replacement logic

All endpoints require wallet address authentication and return structured JSON responses with error handling.
