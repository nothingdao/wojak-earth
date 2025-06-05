// config/gameConfig.ts - Static game settings only (no database-dependent data)

export const GAME_CONFIG = {
  // Character Defaults
  CHARACTER: {
    DEFAULT_HEALTH: 100,
    DEFAULT_ENERGY: 100,
    ENERGY_VARIATION: 20,
    HEALTH_VARIATION: 10,
    STARTING_COINS: 50,
    STARTING_LEVEL: 1,
  },

  // Economy Settings
  ECONOMY: {
    BASE_MINING_ENERGY_COST: 10,
    PRICE_VOLATILITY: 0.1, // ±10% price variation
    MARKET_REFRESH_HOURS: 24,
  },

  // Mining Mechanics
  MINING: {
    BASE_SPAWN_RATES: {
      COMMON: 0.4,
      UNCOMMON: 0.2,
      RARE: 0.1,
      EPIC: 0.05,
      LEGENDARY: 0.01,
    },
    ENERGY_COST_PER_ATTEMPT: 10,
    DAILY_ATTEMPT_LIMIT: 50,
    DIFFICULTY_MULTIPLIER: 1.2, // Each difficulty level increases by 20%
  },

  // Combat & Health
  COMBAT: {
    HEALTH_REGEN_RATE: 1, // HP per hour
    ENERGY_REGEN_RATE: 5, // Energy per hour
    MAX_REGEN_TIME: 24, // Hours to full recovery
  },

  // Item System
  ITEMS: {
    MAX_DURABILITY: 1000,
    REPAIR_COST_MULTIPLIER: 0.1, // 10% of item value
    STACK_LIMITS: {
      MATERIAL: 999,
      CONSUMABLE: 99,
      TOOL: 1,
      CLOTHING: 1,
      HAT: 1,
      ACCESSORY: 5,
    },
  },

  // Map & UI Themes
  THEMES: {
    plains: { name: 'Plains', color: '#22c55e', icon: '🌾' },
    underground: { name: 'Underground', color: '#a855f7', icon: '🕳️' },
    alpine: { name: 'Alpine', color: '#3b82f6', icon: '🏔️' },
    volcanic: { name: 'Volcanic', color: '#ef4444', icon: '🌋' },
    desert: { name: 'Desert', color: '#fbbf24', icon: '🏜️' },
    urban: { name: 'Urban', color: '#6b7280', icon: '🏙️' },
    digital: { name: 'Digital', color: '#06b6d4', icon: '💾' },
    temporal: { name: 'Temporal', color: '#6366f1', icon: '⏰' },
    ossuary: { name: 'Ossuary', color: '#d97706', icon: '💀' },
    electromagnetic: { name: 'Electromagnetic', color: '#ec4899', icon: '📡' },
    wilderness: { name: 'Wilderness', color: '#92400e', icon: '🌿' },
    ocean: { name: 'Ocean', color: '#0ea5e9', icon: '🌊' },
    invisible: { name: 'Hidden', color: 'transparent', icon: '👻' },
  },

  // Rarity System
  RARITY: {
    COMMON: { name: 'Common', color: '#9ca3af', weight: 70 },
    UNCOMMON: { name: 'Uncommon', color: '#22c55e', weight: 20 },
    RARE: { name: 'Rare', color: '#3b82f6', weight: 7 },
    EPIC: { name: 'Epic', color: '#a855f7', weight: 2.5 },
    LEGENDARY: { name: 'Legendary', color: '#f59e0b', weight: 0.5 },
  },

  // Chat & Social
  CHAT: {
    MESSAGE_HISTORY_LIMIT: 100,
    MAX_MESSAGE_LENGTH: 500,
    RATE_LIMIT_MESSAGES: 10, // per minute
    CHAT_SCOPES: ['LOCAL', 'GLOBAL', 'TRADE', 'PRIVATE'] as const,
  },

  // Travel & Movement
  TRAVEL: {
    BASE_ENERGY_COST: 5,
    DISTANCE_MULTIPLIER: 0.1, // Energy cost per map unit
    FAST_TRAVEL_MULTIPLIER: 2, // 2x energy for instant travel
  },

  // Level System
  LEVELS: {
    XP_BASE: 100, // XP needed for level 2
    XP_MULTIPLIER: 1.5, // Each level needs 50% more XP
    MAX_LEVEL: 100,
    STAT_POINTS_PER_LEVEL: 2,
  },
} as const

// Type exports for better TypeScript support
export type GameTheme = keyof typeof GAME_CONFIG.THEMES
export type ItemRarity = keyof typeof GAME_CONFIG.RARITY
export type ChatScope = (typeof GAME_CONFIG.CHAT.CHAT_SCOPES)[number]
export type ItemCategory = keyof typeof GAME_CONFIG.ITEMS.STACK_LIMITS

// Helper functions for theme and rarity
export function getThemeConfig(biome: string) {
  return GAME_CONFIG.THEMES[biome as GameTheme] || GAME_CONFIG.THEMES.plains
}

export function getRarityConfig(rarity: string) {
  return GAME_CONFIG.RARITY[rarity as ItemRarity] || GAME_CONFIG.RARITY.COMMON
}

export function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.floor(
    GAME_CONFIG.LEVELS.XP_BASE *
      Math.pow(GAME_CONFIG.LEVELS.XP_MULTIPLIER, level - 2)
  )
}

export function calculateMiningEnergyCost(difficulty: number): number {
  return Math.floor(
    GAME_CONFIG.MINING.ENERGY_COST_PER_ATTEMPT *
      Math.pow(GAME_CONFIG.MINING.DIFFICULTY_MULTIPLIER, difficulty - 1)
  )
}

export function calculateTravelCost(
  distance: number,
  fastTravel = false
): number {
  let cost =
    GAME_CONFIG.TRAVEL.BASE_ENERGY_COST +
    distance * GAME_CONFIG.TRAVEL.DISTANCE_MULTIPLIER
  if (fastTravel) cost *= GAME_CONFIG.TRAVEL.FAST_TRAVEL_MULTIPLIER
  return Math.floor(cost)
}
