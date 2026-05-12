// src/types/index.ts - Convex-native types with snake_case aliases for UI compatibility
import type { Rarity } from '@/config/gameConfig'

// =============================================================================
// ENUM TYPES
// =============================================================================

export type Gender = 'MALE' | 'FEMALE'
export type CharacterType = 'HUMAN' | 'CREATURE' | 'NPC'
export type ItemCategory = 'CLOTHING' | 'HAT' | 'ACCESSORY' | 'TOOL' | 'CONSUMABLE' | 'MATERIAL'
export type LocationType = string
export type ChatMessageType = 'CHAT' | 'EMOTE' | 'SYSTEM' | 'WHISPER'

// Kept for files that still use the old Enums<'X'> pattern (will be cleaned up)
export type Enums<T extends string> = T extends 'ChatMessageType' ? ChatMessageType
  : T extends 'Gender' ? Gender
  : T extends 'CharacterType' ? CharacterType
  : T extends 'ItemCategory' ? ItemCategory
  : string

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// =============================================================================
// CORE ENTITY TYPES (camelCase + snake_case aliases for backward compat)
// =============================================================================

export interface Item {
  _id: string
  id: string
  name: string
  description: string
  category: ItemCategory
  rarity: Rarity
  // camelCase (Convex)
  layerFile?: string | null
  layerType?: string | null
  layerGender?: string | null
  layerOrder?: number | null
  baseLayerFile?: string | null
  imageUrl?: string | null
  isVisual?: boolean | null
  hasGenderVariants?: boolean | null
  healthEffect?: number | null
  energyEffect?: number | null
  durability?: number | null
  compatibilityRules?: any
  // snake_case (legacy UI compat)
  layer_file?: string | null
  layer_type?: string | null
  layer_gender?: string | null
  base_layer_file?: string | null
  image_url?: string | null
  is_visual?: boolean | null
  has_gender_variants?: boolean | null
  health_effect?: number | null
  energy_effect?: number | null
  created_at?: string
  updated_at?: string
}

export interface Location {
  _id: string
  id: string
  slug?: string | null
  name: string
  description: string
  // camelCase (Convex)
  locationType: string
  chatScope: 'LOCAL' | 'REGIONAL' | 'GLOBAL'
  difficulty: number
  hasChat: boolean
  hasMarket: boolean
  hasMining: boolean
  hasTravel: boolean
  hasExchange: boolean
  isPrivate: boolean
  playerCount: number
  mapRegionId?: string | null
  svgPathId?: string | null
  legacyId?: string | null
  biome?: string | null
  territory?: string | null
  theme?: string | null
  lore?: string | null
  imageUrl?: string | null
  isExplored?: boolean | null
  minLevel?: number | null
  entryCost?: number | null
  mapX?: number | null
  mapY?: number | null
  parentLocationId?: string | null
  // snake_case (legacy UI compat)
  location_type: string
  chat_scope?: string
  has_chat: boolean
  has_market: boolean
  has_mining: boolean
  has_travel: boolean
  has_exchange?: boolean
  is_private: boolean
  player_count: number
  map_region_id?: string | null
  svg_path_id?: string | null
  legacy_id?: string | null
  parent_location_id?: string | null
  image_url?: string | null
  min_level?: number | null
  entry_cost?: number | null
  map_x?: number | null
  map_y?: number | null
  welcome_message?: string | null
  is_explored?: boolean | null
  status?: string | null
  created_at?: string
  updated_at?: string
}

export interface InventoryItem {
  _id: string
  id: string
  // camelCase (Convex)
  characterId: string
  itemId: string
  quantity: number
  isEquipped: boolean
  equippedSlot?: string | null
  isPrimary?: boolean | null
  slotIndex?: number | null
  createdAt?: number
  updatedAt?: number
  // snake_case (legacy UI compat)
  character_id: string
  item_id: string
  is_equipped: boolean
  equipped_slot?: string | null
  is_primary?: boolean
  slot_index?: number | null
  created_at?: string
  updated_at?: string
  // Joined
  item: Item
}

// Alias for backward compat
export type CharacterInventory = InventoryItem

export interface MarketListing {
  _id: string
  id: string
  // camelCase
  locationId: string
  itemId: string
  price: number
  quantity: number
  isSystemItem: boolean
  sellerId?: string | null
  createdAt?: number
  updatedAt?: number
  // snake_case
  location_id: string
  item_id: string
  is_system_item: boolean
  seller_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface MarketItem extends MarketListing {
  item: Item
  seller?: Pick<Character, 'id' | 'name'>
  isLocalSpecialty?: boolean
}

export interface ChatMessage {
  _id: string
  id: string
  // camelCase
  characterId: string
  locationId: string
  message: string
  messageType: ChatMessageType
  isSystem: boolean
  createdAt?: number
  // snake_case
  character_id: string
  location_id: string
  message_type: string
  is_system: boolean
  created_at?: string
  // UI computed
  timeAgo?: string
  // Joined
  character?: {
    id: string
    name: string
    character_type: string
    image_url?: string | null
    currentImageUrl?: string | null
  }
  location?: {
    id: string
    name: string
    location_type: string
  }
}

export interface Transaction {
  _id?: string
  id: string
  // camelCase
  characterId: string
  type: string
  description?: string | null
  itemId?: string | null
  quantity?: number | null
  earthTxn?: string | null
  energyBurn?: number | null
  createdAt?: number
  // snake_case
  character_id: string
  item_id?: string | null
  earth_txn?: string | null
  energy_burn?: number | null
  created_at?: string
  // Bridge/Exchange specific
  from_vault?: string | null
  to_vault?: string | null
  from_units?: number | null
  to_units?: number | null
  // Joined
  character?: {
    id: string
    name: string
    character_type?: string
    current_image_url?: string | null
    currentImageUrl?: string | null
  }
}

export interface Character {
  _id: string
  id: string
  name: string
  level: number
  health: number
  energy: number
  earth: number
  experience: number
  gender: Gender
  status: string | null
  // camelCase (Convex)
  walletAddress: string
  characterType: CharacterType
  currentLocationId: string
  currentImageUrl?: string | null
  birthImageUrl?: string | null
  nftAddress?: string | null
  tokenId?: string | null
  currentVersion?: number
  baseLayerFile?: string | null
  baseGender?: string | null
  paymentSignature?: string | null
  createdAt?: number
  updatedAt?: number
  // snake_case (legacy UI compat)
  wallet_address: string
  character_type: CharacterType
  current_location_id: string
  current_image_url?: string | null
  nft_address?: string | null
  current_version?: number
  created_at?: string
  updated_at?: string
  // Legacy UI compatibility fields (may be empty)
  completed_chapters?: string[]
  story_flags?: Record<string, any>
  // Enriched nested objects
  currentLocation?: Location
  inventory?: InventoryItem[]
}

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

export interface UsePlayerCharacterReturn {
  character: Character | null
  loading: boolean
  hasCharacter: boolean
  error: string | null
  refetchCharacter: () => Promise<void>
}

// =============================================================================
// UI / FRONTEND-SPECIFIC TYPES
// =============================================================================

export type GameView =
  | 'main'
  | 'map'
  | 'location'
  | 'mine'
  | 'market'
  | 'inventory'
  | 'chat'
  | 'characters'
  | 'gamemaster'
  | 'profile'
  | 'character-creation-view'
  | 'admin'
  | 'economy'
  | 'leaderboards'
  | 'earth-market'
  | 'stories'

export type EquipmentSlot = 'head' | 'body' | 'accessory' | 'tool'

export interface EquipmentSlotInfo {
  name: string
  slot: EquipmentSlot
  icon: React.ComponentType<{ className?: string }>
  equipped?: {
    id: string
    name: string
    rarity: Rarity
  }
}

export const SLOT_CONFLICTS: Record<string, EquipmentSlot[]> = {
  HAT: ['head'],
  CLOTHING: ['body'],
  ACCESSORY: ['accessory'],
  TOOL: ['tool'],
}

export interface SlotBonuses {
  energyBonus: number
  healthBonus: number
  miningBonus: number
  luckBonus: number
}

export interface EnhancedCharacter extends Character {
  inventory?: Array<InventoryItem>
  recentActivity?: Array<Transaction>
  equipmentSlots?: {
    [K in EquipmentSlot]?: {
      item_id: string
      itemName: string
      rarity: Rarity
    }
  }
}

export interface Player {
  id: string
  name: string
  gender: Gender
  character_type: CharacterType
  level: number
  energy: number
  health: number
  status: string | null
  current_image_url: string | null
  equippedItems?: Array<{
    name: string
    category: ItemCategory
    rarity: Rarity
  }>
}

// =============================================================================
// MAP/WORLD SYSTEM TYPES
// =============================================================================

export type LandType = 'inhabited' | 'uninhabited' | 'unexplored' | 'ruins' | 'wilderness' | 'sacred'
export type ExplorationState = 'unexplored' | 'rumors' | 'explored' | 'known'
export type BiomeType =
  | 'plains' | 'desert' | 'urban' | 'digital' | 'underground'
  | 'temporal' | 'ossuary' | 'electromagnetic' | 'wilderness' | 'alpine' | 'volcanic'

export interface MapRegion {
  name: string
  description: string
  lore?: string
  landType: LandType
  explorationState: ExplorationState
  hoverColor: string
  baseColor: string
  worldData: {
    difficulty: number
    biome: BiomeType
    has_market: boolean
    has_mining: boolean
    has_chat: boolean
    welcome_message: string
    map_x?: number
    map_y?: number
  }
}

// =============================================================================
// CONVEX CONSTANTS
// =============================================================================

export const ITEM_CATEGORIES: ItemCategory[] = ['CLOTHING', 'HAT', 'ACCESSORY', 'TOOL', 'CONSUMABLE', 'MATERIAL']
export const RARITIES: Rarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']
export const LAYER_TYPES = ['BACKGROUND', 'BASE', 'CLOTHING', 'HAT', 'FACE_COVERING', 'ACCESSORY', 'OUTERWEAR', 'FACE_ACCESSORY', 'HAIR'] as const
export type LayerType = typeof LAYER_TYPES[number]
export const LOCATION_TYPES = ['CITY', 'OUTPOST', 'WILDERNESS', 'DUNGEON', 'SETTLEMENT', 'HUB', 'SAFE_ZONE', 'DANGER_ZONE'] as const
export const CHAT_SCOPES = ['LOCAL', 'REGIONAL', 'GLOBAL'] as const
