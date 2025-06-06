// src/types/index.ts
export type GameView =
  | 'main'
  | 'map'
  | 'location'
  | 'mine'
  | 'market'
  | 'inventory'
  | 'chat'
  | 'npc-activity'
  | 'gamemaster'
  | 'profile'
  | 'sandbox'
  | 'admin'

export interface Character {
  createdAt: string | number | Date
  id: string
  name: string
  gender: string
  energy: number
  health: number
  level: number
  status: string
  coins: number
  currentImageUrl: string
  currentVersion: number
  nftAddress?: string
  characterType: string
  currentLocation: {
    id: string
    name: string
    description: string
    locationType: string
    biome?: string
    welcomeMessage?: string
  }
  inventory: Array<{
    id: string
    quantity: number
    isEquipped: boolean
    item: {
      id: string
      name: string
      description: string
      category: string
      rarity: string
      imageUrl?: string
      energyEffect?: number
      healthEffect?: number
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
  imageUrl?: string
  parentLocationId?: string
  locationType: 'REGION' | 'BUILDING' | 'AREA'
  biome: string
  difficulty: number
  mapX?: number
  mapY?: number
  playerCount: number
  lastActive?: string
  hasMarket: boolean
  hasMining: boolean
  hasTravel: boolean
  hasChat: boolean
  chatScope: 'LOCAL' | 'REGIONAL' | 'GLOBAL'
  welcomeMessage?: string
  lore?: string
  minLevel?: number
  entryCost?: number
  isPrivate: boolean
  createdAt: Date
  updatedAt: Date
  svgpathid: string
  theme: string
  // New fields from migration
  isExplored?: boolean
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
  energyEffect?: number
  healthEffect?: number
  durability?: number
}

// Alias for backward compatibility
export type DatabaseLocation = Location

export interface MarketItem {
  id: string
  price: number
  quantity: number
  isSystemItem: boolean
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
    imageUrl?: string
  }
}

export interface ChatMessage {
  id: string
  message: string
  messageType: 'CHAT' | 'EMOTE' | 'SYSTEM'
  isSystem: boolean
  timeAgo: string
  createdAt: string
  character?: {
    id: string
    name: string
    characterType: string
    imageUrl?: string
  }
  location: {
    id: string
    name: string
    locationType: string
  }
}

export interface Player {
  id: string
  name: string
  gender: string
  characterType: string
  level: number
  energy: number
  health: number
  status: string
  currentImageUrl?: string
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
      itemId: string
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
    hasMarket: boolean
    hasMining: boolean
    hasChat: boolean
    welcomeMessage: string
    mapX?: number
    mapY?: number
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
  svgPathId: string
  difficulty: number
  theme: LocationTheme
  isExplored: boolean
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
  characterId: string
  destinationId: string
  payEntryCost?: boolean
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
  hasTravel?: boolean
  isExplored?: boolean
  accessible?: boolean // Only locations character can access
}

export interface LocationsResponse {
  locations: Location[]
  totalCount: number
  accessibleCount?: number
}
