// src/types/index.ts
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

export interface Character {
  wallet_address: any
  created_at: string | number | Date
  id: string
  name: string
  gender: string
  energy: number
  health: number
  level: number
  status: string
  coins: number
  current_image_url: string
  current_version: number
  nft_address?: string
  character_type: string
  currentLocation: {
    id: string
    name: string
    description: string
    location_type: string
    biome?: string
    welcome_message?: string
  }
  inventory: Array<{
    equipped_slot: string
    id: string
    quantity: number
    is_equipped: boolean
    item: {
      layer_type: any
      id: string
      name: string
      description: string
      category: string
      rarity: string
      image_url?: string
      energy_effect?: number
      health_effect?: number
    }
  }>
  recentActivity: Array<{
    id: string
    type: string
    description: string
    item?: {
      name: string
      rarity: string
    }
  }>
}

// Updated Location interface to match database schema
export interface Location {
  hasScaveging: boolean
  id: string
  name: string
  description: string
  image_url?: string
  parentlocation_id?: string
  location_type: 'REGION' | 'BUILDING' | 'AREA'
  biome: string
  difficulty: number
  map_x?: number
  map_y?: number
  player_count: number
  last_active?: string
  has_market: boolean
  has_mining: boolean
  has_travel: boolean
  has_chat: boolean
  chat_scope: 'LOCAL' | 'REGIONAL' | 'GLOBAL'
  welcome_message?: string
  lore?: string
  min_level?: number
  entry_cost?: number
  is_private: boolean
  created_at: Date
  updated_at: Date
  svg_path_id: string
  theme: string
  // New fields from migration
  is_explored?: boolean
  status?: 'explored' | 'unexplored' | 'locked'
  subLocations?: Location[]
}

// Item and MarketItem interfaces for inventory and market. Why are these separate? Well, the MarketItem is a more detailed version of Item with additional fields like price, quantity, and seller information. But, not all items are meant for the market.

export interface Item {
  id: string
  name: string
  category: string
  rarity: string
  description: string
  energy_effect?: number
  health_effect?: number
  durability?: number
}

// Alias for backward compatibility
export type DatabaseLocation = Location

export interface MarketItem {
  id: string
  price: number
  quantity: number
  is_systemItem: boolean
  isLocalSpecialty?: boolean
  seller?: {
    id: string
    name: string
  }
  item: {
    id: string
    name: string
    description: string
    category: string
    rarity: string
    image_url?: string
  }
}

export interface ChatMessage {
  id: string
  message: string
  message_type: 'CHAT' | 'EMOTE' | 'SYSTEM'
  is_system: boolean
  timeAgo: string
  created_at: string
  character?: {
    id: string
    name: string
    character_type: string
    image_url?: string
  }
  location: {
    id: string
    name: string
    location_type: string
  }
}

export interface Player {
  id: string
  name: string
  gender: string
  character_type: string
  level: number
  energy: number
  health: number
  status: string
  current_image_url?: string
  equippedItems: Array<{
    name: string
    category: string
    rarity: string
  }>
}

export type EquipmentSlot = 'head' | 'body' | 'accessory' | 'tool'

export interface EquipmentSlotInfo {
  name: string
  slot: EquipmentSlot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any // Lucide icon component
  equipped?: {
    id: string
    name: string
    rarity: string
  }
}

export interface EnhancedCharacter extends Character {
  equipmentSlots?: {
    [K in EquipmentSlot]?: {
      item_id: string
      itemName: string
      rarity: string
    }
  }
}

// Equipment slot conflicts - for future slot-specific logic
export const SLOT_CONFLICTS: Record<string, EquipmentSlot[]> = {
  HAT: ['head'],
  CLOTHING: ['body'],
  ACCESSORY: ['accessory'],
  TOOL: ['tool'],
}

// Equipment bonuses by slot - for future enhancement
export interface SlotBonuses {
  energyBonus: number
  healthBonus: number
  miningBonus: number
  luckBonus: number
}

// Map-related types
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

export interface RegionInteraction {
  regionId: string
  action: 'explore' | 'trade' | 'mine' | 'chat'
  timestamp: Date
}

export interface LocationTheme {
  strokeClass: string
  hoverClass: string
  fillClass: string
  id: string
  name: string
  colors: {
    base: string
    hover: string
    border?: string
  }
  opacity: number
  effects: {
    filter?: string
    blur?: string
  }
}

// Updated MapLocation interface to work with database
export interface MapLocation {
  id: string
  name: string
  description: string
  svg_path_id: string
  difficulty: number
  theme: LocationTheme
  is_explored: boolean
  isPlayerHere: boolean
  status: 'explored' | 'unexplored' | 'locked' | 'gm-only'
}

// New types for database-driven travel system
export interface TravelValidation {
  allowed: boolean
  reason?: string
  cost?: number
}

export interface TravelRestriction {
  type: 'level' | 'cost' | 'private' | 'disabled' | 'exploration'
  value?: number
  message: string
}

// Theme system types for database integration
export interface ThemeColors {
  fillClass: string
  hoverClass: string
  strokeClass: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
}

export interface LocationThemeDefinition {
  name: string
  fillClass: string
  hoverClass: string
  strokeClass: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor?: string
  borderColor?: string
}

// Travel system types
export interface TravelOptions {
  character_id: string
  destinationId: string
  payentry_cost?: boolean
}

export interface TravelResult {
  success: boolean
  message: string
  newLocation?: Location
  costPaid?: number
}

// Location query types for API
export interface LocationFilters {
  biome?: string
  minDifficulty?: number
  maxDifficulty?: number
  has_travel?: boolean
  is_explored?: boolean
  accessible?: boolean // Only locations character can access
}

export interface LocationsResponse {
  locations: Location[]
  totalCount: number
  accessibleCount?: number
}
