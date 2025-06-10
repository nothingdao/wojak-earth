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

export interface RegionInteraction {
  regionId: string
  action: 'explore' | 'trade' | 'mine' | 'chat'
  timestamp: Date
}

// =============================================================================
// THEME/UI SYSTEM TYPES
// =============================================================================

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

// Enhanced MapLocation with UI state
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

// =============================================================================
// TRAVEL/GAME MECHANICS TYPES
// =============================================================================

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

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface LocationFilters {
  biome?: string
  minDifficulty?: number
  maxDifficulty?: number
  has_travel?: boolean
  is_explored?: boolean
  accessible?: boolean
}

export interface LocationsResponse {
  locations: Location[]
  totalCount: number
  accessibleCount?: number
}

// =============================================================================
// COMPONENT PROP TYPES
// =============================================================================

// LocalRadio component types
export interface Track {
  id: string
  name: string
  url: string
  title?: string
  artist?: string
  duration?: number
}

export interface RadioStation {
  id: string
  name: string
  genre?: string
  playlist: Track[]
}

export interface LocalRadioProps {
  location_id: string
  className?: string
}

// Hook return types
export interface UsePlayerCharacterReturn {
  character: Character | null
  loading: boolean
  hasCharacter: boolean
  error: string | null
  refetchCharacter: () => Promise<void>
}

// Economy View types
export interface EconomyData {
  totalWealth: number
  avgWealth: number
  wealthDistribution: {
    poor: number
    middle: number
    rich: number
  }
  totalCharacters: number
  marketData: {
    totalListings: number
    totalValue: number
    avgPrice: number
    mostExpensiveItem: {
      name: string
      price: number
      location: string
    }
    cheapestItem: {
      name: string
      price: number
      location: string
    }
    popularLocations: Array<{
      name: string
      listings: number
    }>
  }
  playerActivity: {
    onlineNow: number
    avgLevel: number
    avgEnergy: number
    avgHealth: number
    topLocations: Array<{
      name: string
      player_count: number
    }>
  }
  resources: {
    mostValuable: Array<{
      name: string
      rarity: string
      estimatedValue: number
    }>
  }
}

export interface RustMarketData {
  currentRate: number
  change24h: number
  volume24h: number
  totalTrades: number
  totalTransactions: number
}

export interface GameEconomyFlow {
  rustCirculation: {
    playerBalances: number
    merchantFloat: number
    tradingVelocity: number
    burnedRust: number
    totalMinted: number
  }
  solCirculation: {
    playerSOL: number
    directSOLTrades: number
    solAcceptingMerchants: number
    treasurySOL: number
  }
  crossCurrencyFlow: {
    solToRustTrades: number
    rustToSolTrades: number
    preferenceShifts: any
    arbitrageGaps: any
  }
  totalEconomicValue: {
    rustEconomyUSD: number
    solEconomyUSD: number
    totalEconomyUSD: number
    rustDominance: number
    solDominance: number
  }
}

// Admin types
export interface AdminStats {
  totalCharacters: number
  totalLocations: number
  totalItems: number
  totalResources: number
  activeCharacters: number
  onlineNow: number
  avgPlayerLevel: number
}

export interface AdminCharacter {
  id: string
  name: string
  gender: string
  current_location_id: string
  locationName: string
  level: number
  health: number
  energy: number
  coins: number
  status: string
  created_at: string
}

export interface AdminLocation {
  id: string
  name: string
  description: string
  biome: string
  difficulty: number
  player_count: number
  has_market: boolean
  has_mining: boolean
  has_travel: boolean
  has_chat: boolean
  status: string
  parentlocation_id?: string
}

export interface AdminItem {
  id: string
  name: string
  description: string
  category: string
  rarity: string
  layer_type?: string
  durability?: number
  energy_effect?: number
  health_effect?: number
}

export interface AdminActivity {
  id: string
  type: 'character' | 'mining' | 'travel' | 'market'
  action: string
  target: string
  timestamp: string
  characterName?: string
  locationName?: string
}

export interface AdminMarketListing {
  id: string
  location_id: string
  locationName: string
  item_id: string
  itemName: string
  seller_id?: string
  sellerName?: string
  quantity: number
  price: number
  is_system_item: boolean
  created_at: string
  updated_at: string
  isAvailable?: boolean
  lastUpdated?: string
}

// Component Props interfaces
export interface ChatViewProps {
  character: Character
  selectedLocation: Location | null
  chatMessages: ChatMessage[]
  onSendMessage: (message: string) => Promise<void>
  onAddPresenceMessage: (message: ChatMessage) => void
  loading?: boolean
}

export interface InventoryViewProps {
  character: Character
  loadingItems: Set<string>
  onUseItem: (
    inventoryId: string,
    itemName: string,
    energy_effect?: number,
    health_effect?: number,
    event?: React.MouseEvent
  ) => void
  onEquipItem: (
    inventoryId: string,
    is_equipped: boolean,
    targetSlot?: string,
    event?: React.MouseEvent
  ) => void
  onSetPrimary?: (inventoryId: string, category: string) => void
  onReplaceSlot?: (
    inventoryId: string,
    category: string,
    slotIndex: number
  ) => void
}

export interface ViewRendererProps {
  currentView: GameView
  character: Character
  gameData: any
  loadingItems: Set<string>
  actions: any
}

export interface CharacterCreationViewProps {
  character: Character | null
  onCharacterCreated?: () => void
}

// Character Creation types
export interface AssetEntry {
  file: string
  compatible_headwear?: string[]
  incompatible_headwear?: string[]
  requires_hair?: string[]
  incompatible_hair?: string[]
  incompatible_base?: string[]
  compatible_outerwear?: string[]
  incompatible_outerwear?: string[]
  rules?: Record<string, unknown>
}

export interface LayerManifest {
  male?: (string | AssetEntry)[]
  female?: (string | AssetEntry)[]
  neutral?: (string | AssetEntry)[]
}

export interface Manifest {
  [layer_type: string]: LayerManifest | any
  compatibility_rules?: {
    hair_headwear_conflicts?: Record<
      string,
      { blocks?: string[]; allows?: string[] }
    >
    outerwear_combinations?: Record<
      string,
      { blocks_headwear?: string[]; allows_headwear?: string[] }
    >
    style_themes?: Record<string, { preferred_combinations?: string[][] }>
  }
}

export type GenderFilter = 'ALL' | 'MALE' | 'FEMALE'

// =============================================================================
// BACKWARD COMPATIBILITY ALIASES (Remove these gradually)
// =============================================================================

// @deprecated Use Location from Supabase types instead
export type DatabaseLocation = Location
