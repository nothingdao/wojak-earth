// src/types/index.ts

import type { Rarity } from '@/config/gameConfig'

// Re-export Supabase types for convenience
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  Json,
} from './supabase'

// Import the table types from Supabase and create convenient aliases
import type { Tables } from './supabase'

// Export commonly used table types as convenient aliases
export type Character = Tables<'characters'>
export type Location = Tables<'locations'>
export type Item = Tables<'items'>
export type ChatMessage = Tables<'chat_messages'>
export type CharacterInventory = Tables<'character_inventory'>
export type MarketListing = Tables<'market_listings'>
export type Transaction = Tables<'transactions'>

// Export enums from Supabase for convenience
import type { Enums } from './supabase'
export type Gender = Enums<'Gender'>
export type CharacterType = Enums<'CharacterType'>
export type ItemCategory = Enums<'ItemCategory'>
export type LocationType = Enums<'LocationType'>

// =============================================================================
// UI/FRONTEND-SPECIFIC TYPES (Not covered by database schema)
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
  | 'rust-market'

// Equipment/UI specific types (not in database)
export type EquipmentSlot = 'head' | 'body' | 'accessory' | 'tool'

export interface EquipmentSlotInfo {
  name: string
  slot: EquipmentSlot
  icon: any // Lucide icon component
  equipped?: {
    id: string
    name: string
    rarity: Rarity
  }
}

// Equipment slot conflicts - for game logic
export const SLOT_CONFLICTS: Record<string, EquipmentSlot[]> = {
  HAT: ['head'],
  CLOTHING: ['body'],
  ACCESSORY: ['accessory'],
  TOOL: ['tool'],
}

// Equipment bonuses - computed values, not stored in DB
export interface SlotBonuses {
  energyBonus: number
  healthBonus: number
  miningBonus: number
  luckBonus: number
}

// =============================================================================
// ENHANCED TYPES (Extending Supabase types with UI/computed fields)
// =============================================================================

// Enhanced Character with relationships and computed fields
export interface EnhancedCharacter extends Character {
  currentLocation?: Location
  inventory?: Array<
    CharacterInventory & {
      item: Item
    }
  >
  recentActivity?: Array<Transaction>
  equipmentSlots?: {
    [K in EquipmentSlot]?: {
      item_id: string
      itemName: string
      rarity: Rarity
    }
  }
}

// Enhanced Chat Message with relationships and UI fields
export interface EnhancedChatMessage extends ChatMessage {
  character?: Character
  location: Location
  timeAgo: string // UI computed field
}

// Enhanced Market Item with relationships and UI fields
export interface MarketItem extends MarketListing {
  item: Item
  seller?: Character
  isLocalSpecialty?: boolean // UI computed field
}

// Player type for UI lists/displays (subset of Character)
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
// MAP/WORLD SYSTEM TYPES (UI layer, not in database)
// =============================================================================

export type LandType =
  | 'inhabited'
  | 'uninhabited'
  | 'unexplored'
  | 'ruins'
  | 'wilderness'
  | 'sacred'

export type ExplorationState = 'unexplored' | 'rumors' | 'explored' | 'known'

export type BiomeType =
  | 'plains'
  | 'desert'
  | 'urban'
  | 'digital'
  | 'underground'
  | 'temporal'
  | 'ossuary'
  | 'electromagnetic'
  | 'wilderness'
  | 'alpine'
  | 'volcanic'

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
// BACKWARD COMPATIBILITY ALIASES (Remove these gradually)
// =============================================================================

// @deprecated Use Location from Supabase types instead
export type DatabaseLocation = Location
