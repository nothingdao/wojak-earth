// data/worldConfig.ts - Pure data, no dependencies, safe for browser

export interface WorldConfig {
  // World Settings
  WORLD_NAME: string
  MAX_TOTAL_CHARACTERS: number
  STARTING_LOCATION_NAME: string

  // Character Settings
  DEFAULT_HEALTH: number
  DEFAULT_ENERGY: number
  ENERGY_VARIATION: number
  HEALTH_VARIATION: number

  // Economy Settings
  BASE_MINING_ENERGY_COST: number
  PRICE_MULTIPLIERS: Record<string, number>

  // Mining Settings
  BASE_SPAWN_RATES: {
    COMMON: number
    UNCOMMON: number
    RARE: number
    EPIC: number
    LEGENDARY: number
  }

  // Features to Enable/Disable
  FEATURES: {
    CREATE_LOCATIONS: boolean
    CREATE_ITEMS: boolean
    CREATE_CHARACTERS: boolean
    SETUP_MARKETS: boolean
    SETUP_MINING: boolean
    CREATE_CHAT_HISTORY: boolean
    CLEAR_EXISTING_DATA: boolean
  }
}

export const WORLD_CONFIG: WorldConfig = {
  // World Settings
  WORLD_NAME: 'Wojak Earth',
  MAX_TOTAL_CHARACTERS: 100,
  STARTING_LOCATION_NAME: 'Mining Plains',

  // Character Settings
  DEFAULT_HEALTH: 100,
  DEFAULT_ENERGY: 100,
  ENERGY_VARIATION: 20,
  HEALTH_VARIATION: 10,

  // Economy Settings
  BASE_MINING_ENERGY_COST: 10,
  PRICE_MULTIPLIERS: {
    'Mining Plains': 1.0,
    'Desert Outpost': 1.2,
    'Cyber City': 1.1,
    'Central Exchange': 1.15,
    'The Glitch Club': 0.9,
    'Rusty Pickaxe Inn': 0.95,
    'Crystal Caves': 1.1,
    'The Glitch Wastes': 1.3,
    'Fungi Networks': 1.1,
    'Temporal Rift Zone': 1.5,
    'The Bone Markets': 1.0,
    'Static Fields': 1.2,
    'Frostpine Reaches': 1.1,
  },

  // Mining Settings
  BASE_SPAWN_RATES: {
    COMMON: 0.4,
    UNCOMMON: 0.2,
    RARE: 0.1,
    EPIC: 0.05,
    LEGENDARY: 0.01,
  },

  // Features to Enable/Disable
  FEATURES: {
    CREATE_LOCATIONS: true,
    CREATE_ITEMS: true,
    CREATE_CHARACTERS: true,
    SETUP_MARKETS: true,
    SETUP_MINING: true,
    CREATE_CHAT_HISTORY: true,
    CLEAR_EXISTING_DATA: true, // 🔥 NUKE EVERYTHING
  },
}

// Helper functions
export function getPriceMultiplier(locationName: string): number {
  return WORLD_CONFIG.PRICE_MULTIPLIERS[locationName] || 1.0
}

export function applyPriceMultiplier(
  basePrice: number,
  locationName: string
): number {
  const multiplier = getPriceMultiplier(locationName)
  return Math.round(basePrice * multiplier)
}

export function isFeatureEnabled(
  featureName: keyof WorldConfig['FEATURES']
): boolean {
  return WORLD_CONFIG.FEATURES[featureName]
}

export function getEnabledFeaturesCount(): number {
  return Object.values(WORLD_CONFIG.FEATURES).filter(Boolean).length
}

export function getTotalFeaturesCount(): number {
  return Object.keys(WORLD_CONFIG.FEATURES).length
}
