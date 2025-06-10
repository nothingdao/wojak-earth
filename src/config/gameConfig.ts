// src/config/gameConfig.ts - Unified game configuration for both frontend and NPC engine

// ===== CORE GAME MECHANICS =====
export const GAME_MECHANICS = {
  // Energy and Health
  MAX_ENERGY: 100,
  MAX_HEALTH: 100,
  ENERGY_REST_THRESHOLD: 30, // When NPCs should rest
  REST_ENERGY_GAIN: 15, // Energy gained per rest action

  // Mining
  MINING_ENERGY_COST: 10,
  MINING_SUCCESS_RATE: 0.7,
  MINING_HEALTH_RISK: 0.1, // 10% chance of 5 health loss
  MINING_HEALTH_DAMAGE: 5,

  // Travel
  TRAVEL_ENERGY_COST: 5,
  MAX_TRAVEL_HEALTH_COST: 10, // Based on difficulty difference

  // Currency and Economy
  COINS_PER_USD: 1, // 1 coin = $1 USD (for exchange rates)
  STARTING_COINS: 1200,
  STARTING_LEVEL: 1,

  // Experience and Leveling
  BASE_XP_REQUIREMENTS: [
    { level: 1, xpRequired: 0 },
    { level: 2, xpRequired: 100 },
    { level: 3, xpRequired: 300 },
    { level: 4, xpRequired: 600 },
    { level: 5, xpRequired: 1000 },
    { level: 6, xpRequired: 1500 },
    { level: 7, xpRequired: 2200 },
    { level: 8, xpRequired: 3000 },
    { level: 9, xpRequired: 4000 },
    { level: 10, xpRequired: 5200 },
  ] as const,

  // XP Rewards
  XP_REWARDS: {
    MINING: 10,
    MINING_RARE_BONUS: 15,
    TRAVEL: 5,
    TRAVEL_DIFFICULTY_BONUS: 3, // Per difficulty level
    TRAVEL_FIRST_VISIT_BONUS: 10,
    SHOPPING: 2,
    EQUIPMENT: 3,
    SURVIVAL: 2,
    SOCIAL: 1,
    BUSINESS: 3, // For selling items
    FINANCE: 3, // For exchange operations
  },

  // Multi-slot equipment system
  EQUIPMENT_SLOTS: {
    MAX_SLOTS_BASE: 1,
    SLOTS_PER_5_LEVELS: 1,
    MAX_SLOTS_TOTAL: 4,
  },
} as const

// ===== NPC SYSTEM CONFIGURATION =====
export const NPC_CONFIG = {
  // Activity timing
  BASE_ACTIVITY_INTERVAL: 45000, // 45 seconds base
  ACTIVITY_VARIANCE: 0.4, // ±40% randomness
  SPAWN_DELAY: 2000, // 2 seconds between NPC spawns

  // Population and spawning
  DEFAULT_NPC_COUNT: 8,
  FUNDING_AMOUNT: 0.02, // SOL to fund each NPC wallet
  RESUME_EXISTING: true, // Try to resume existing NPCs first

  // Death and respawn system
  RESPAWN_ENABLED: true,
  RESPAWN_DELAY_MINUTES: 15,
  ANNOUNCE_DEATHS: true,
  ANNOUNCE_RESPAWNS: true,
  CRITICAL_HEALTH_THRESHOLD: 5,
  MAX_HEALING_ATTEMPTS: 3,

  // Logging configuration
  ENABLE_LOGS: true,
  LOG_LEVEL: 'info' as 'debug' | 'info' | 'warn' | 'error',

  // Chat system
  CHAT_CONFIG: {
    enabled: true,
    showContext: true, // Show context in chat logs
    messagePoolSize: 50, // Max messages per context
  },

  // Global activity rate scaling
  GLOBAL_ACTIVITY_RATE: 45000, // Base rate that scales with population

  // Available personalities for NPCs
  AVAILABLE_PERSONALITIES: [
    'casual',
    'hardcore',
    'social',
    'merchant',
    'explorer',
  ] as const,
} as const

// ===== NPC PERSONALITY DEFINITIONS =====
export const NPC_PERSONALITIES = {
  casual: {
    preferences: {
      TRAVEL: 0.2,
      MINE: 0.2,
      BUY: 0.16,
      SELL: 0.07,
      CHAT: 0.09,
      EQUIP: 0.09,
      USE_ITEM: 0.07,
      EXCHANGE: 0.12,
    },
    activityDelayMultiplier: 1.5, // 50% slower
    description: 'Laid-back NPCs who take their time exploring',
  },

  hardcore: {
    preferences: {
      MINE: 0.45,
      SELL: 0.15,
      TRAVEL: 0.13,
      BUY: 0.08,
      EQUIP: 0.14,
      USE_ITEM: 0.03,
      CHAT: 0.01,
      EXCHANGE: 0.01,
    },
    activityDelayMultiplier: 0.8, // 20% faster
    description: 'Focused on mining and resource gathering',
  },

  social: {
    preferences: {
      TRAVEL: 0.22,
      BUY: 0.18,
      CHAT: 0.28,
      SELL: 0.08,
      MINE: 0.09,
      EQUIP: 0.1,
      USE_ITEM: 0.03,
      EXCHANGE: 0.02,
    },
    activityDelayMultiplier: 1.2, // 20% slower
    description: 'Enjoys chatting and social interactions',
  },

  merchant: {
    preferences: {
      BUY: 0.2,
      SELL: 0.23,
      TRAVEL: 0.16,
      EQUIP: 0.12,
      MINE: 0.08,
      CHAT: 0.02,
      USE_ITEM: 0.02,
      EXCHANGE: 0.17,
    },
    activityDelayMultiplier: 1.0, // Normal speed
    description: 'Business-focused, loves trading and exchanges',
  },

  explorer: {
    preferences: {
      TRAVEL: 0.33,
      MINE: 0.22,
      SELL: 0.12,
      BUY: 0.13,
      EQUIP: 0.1,
      USE_ITEM: 0.05,
      CHAT: 0.02,
      EXCHANGE: 0.03,
    },
    activityDelayMultiplier: 0.9, // 10% faster
    description: 'Loves to explore new locations and travel',
  },
} as const

// ===== EXCHANGE SYSTEM CONFIGURATION =====
export const EXCHANGE_CONFIG = {
  // Transaction limits
  MIN_TRANSACTION_USD: 1,
  MAX_TRANSACTION_USD: 100,

  // Treasury management
  TREASURY_RESERVE_SOL: 5, // Keep minimum 5 SOL in treasury
  EXCHANGE_FEE_PERCENT: 0.5, // 0.5% fee on all exchanges

  // Liquidity thresholds
  LIQUIDITY_THRESHOLDS: {
    HIGH: 10, // >10 SOL available
    MEDIUM: 2, // 2-10 SOL available
    LOW: 0.1, // <2 SOL available
  },

  // Price fallback if APIs fail
  FALLBACK_SOL_PRICE: 180,
} as const

// ===== ITEM AND RARITY SYSTEM =====
export const ITEM_CONFIG = {
  // Rarity probabilities for mining
  RARITY_WEIGHTS: {
    COMMON: 60,
    UNCOMMON: 25,
    RARE: 10,
    EPIC: 4,
    LEGENDARY: 1,
  },

  // Base sell prices by rarity (percentage of market value)
  SELL_PRICE_MULTIPLIERS: {
    COMMON: 0.6,
    UNCOMMON: 0.65,
    RARE: 0.7,
    EPIC: 0.75,
    LEGENDARY: 0.8,
  },

  // Base market prices by category
  CATEGORY_BASE_PRICES: {
    MATERIAL: 15,
    CONSUMABLE: 8,
    TOOL: 30,
    HAT: 20,
    CLOTHING: 25,
    ACCESSORY: 35,
    OUTERWEAR: 40,
  },

  // XP bonuses by rarity for finding items
  RARITY_XP_BONUSES: {
    COMMON: 0,
    UNCOMMON: 5,
    RARE: 15,
    EPIC: 40,
    LEGENDARY: 100,
  },
} as const

// ===== CHAT AND MESSAGING =====
export const CHAT_CONFIG = {
  // Message limits
  MAX_MESSAGE_LENGTH: 500,
  RATE_LIMIT_MESSAGES: 10, // Max messages per minute
  RATE_LIMIT_WINDOW: 60000, // 1 minute in milliseconds

  // Chat history
  DEFAULT_MESSAGE_LIMIT: 50,
  MAX_MESSAGE_HISTORY: 100,

  // Banned words (basic content filtering)
  BANNED_WORDS: ['spam', 'scam', 'hack'],

  // Message types
  MESSAGE_TYPES: ['CHAT', 'EMOTE', 'SYSTEM', 'WHISPER'] as const,

  // Chat scopes
  CHAT_SCOPES: ['LOCAL', 'REGIONAL', 'GLOBAL'] as const,
} as const

// ===== MARKET AND ECONOMY =====
export const MARKET_CONFIG = {
  // System item restocking
  DEFAULT_SYSTEM_STOCK: 99,
  RESTOCK_INTERVAL_HOURS: 24,

  // Price ranges by rarity
  RARITY_PRICE_RANGES: {
    COMMON: { min: 10, max: 25 },
    UNCOMMON: { min: 25, max: 50 },
    RARE: { min: 50, max: 100 },
    EPIC: { min: 100, max: 250 },
    LEGENDARY: { min: 250, max: 500 },
  },

  // Market listing limits
  MAX_LISTINGS_PER_PLAYER: 10,
  LISTING_DURATION_DAYS: 7,
} as const

// ===== API AND NETWORKING =====
export const API_CONFIG = {
  // Base URLs
  API_BASE: '/.netlify/functions',
  SOLANA_RPC_URL: 'https://api.devnet.solana.com',

  // Request timeouts
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  MINING_TIMEOUT: 15000, // 15 seconds for mining
  TRAVEL_TIMEOUT: 12000, // 12 seconds for travel

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second base delay

  // Rate limiting
  REQUEST_COOLDOWN: 500, // 500ms between requests
} as const

// ===== LOCATION SYSTEM =====
export const LOCATION_CONFIG = {
  // Starting locations for new characters
  STARTING_LOCATIONS: [
    'Frostpine Reaches',
    'Crystal Caverns',
    'Tech District',
    'Mining Plains',
  ],

  // Location types and their properties
  LOCATION_TYPES: {
    REGION: { maxSubLocations: 10, canHaveMarket: true },
    CITY: { maxSubLocations: 5, canHaveMarket: true },
    BUILDING: { maxSubLocations: 3, canHaveMarket: false },
    ROOM: { maxSubLocations: 0, canHaveMarket: false },
  },

  // Difficulty scaling
  DIFFICULTY_SCALING: {
    TRAVEL_HEALTH_COST_PER_LEVEL: 2,
    MINING_RISK_MULTIPLIER: 1.5,
    ENTRY_COST_BASE: 10, // Base cost for private locations
  },
} as const

// ===== UI AND FRONTEND SPECIFIC =====
export const UI_CONFIG = {
  // Animation durations
  TRAVEL_ANIMATION_DURATION: 2800,
  NOTIFICATION_DURATION: 4000,
  LOADING_DEBOUNCE: 300,

  // Auto-refresh intervals
  CHARACTER_REFRESH_INTERVAL: 30000, // 30 seconds
  MARKET_REFRESH_INTERVAL: 60000, // 1 minute
  CHAT_REFRESH_INTERVAL: 5000, // 5 seconds

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Real-time updates
  ENABLE_REALTIME: true,
  RECONNECTION_DELAY: 5000,

  // Map configuration
  MAP_CONFIG: {
    DEFAULT_ZOOM: 1,
    MIN_ZOOM: 0.5,
    MAX_ZOOM: 3,
    CANVAS_SIZE: { width: 788, height: 1440 },
  },
} as const

// ===== ADMIN TOOLS CONFIGURATION =====
export const ADMIN_CONFIG = {
  // Bulk operation limits
  MAX_BULK_OPERATIONS: 100,
  OPERATION_TIMEOUT: 30000,

  // Validation thresholds
  MAX_ORPHANED_RECORDS: 10,
  MAX_VALIDATION_ERRORS: 50,

  // Backup and export
  EXPORT_BATCH_SIZE: 1000,
  BACKUP_RETENTION_DAYS: 30,
} as const

// ===== TYPE DEFINITIONS =====
export type PersonalityType = keyof typeof NPC_PERSONALITIES
export type MessageType = (typeof CHAT_CONFIG.MESSAGE_TYPES)[number]
export type ChatScope = (typeof CHAT_CONFIG.CHAT_SCOPES)[number]
export type LocationType = keyof typeof LOCATION_CONFIG.LOCATION_TYPES
export type ItemCategory = keyof typeof ITEM_CONFIG.CATEGORY_BASE_PRICES
export type Rarity = keyof typeof ITEM_CONFIG.RARITY_WEIGHTS

// ===== ENVIRONMENT-SPECIFIC CONFIGURATIONS =====
export function createNPCEngineConfig(
  overrides: Partial<typeof NPC_CONFIG> = {}
) {
  return {
    ...NPC_CONFIG,
    ...overrides,
    // Merge nested objects properly
    CHAT_CONFIG: {
      ...NPC_CONFIG.CHAT_CONFIG,
      ...(overrides.CHAT_CONFIG || {}),
    },
  }
}

export function createFrontendConfig() {
  return {
    GAME_MECHANICS,
    CHAT_CONFIG,
    MARKET_CONFIG,
    UI_CONFIG,
    API_CONFIG,
    LOCATION_CONFIG,
  }
}

// ===== VALIDATION FUNCTIONS =====
export function validatePersonalityPreferences(
  preferences: Record<string, number>
): boolean {
  const total = Object.values(preferences).reduce((sum, val) => sum + val, 0)
  return Math.abs(total - 1.0) < 0.01 // Allow for small floating point errors
}

export function calculateActivityDelay(
  personality: PersonalityType,
  populationCount: number,
  baseRate: number = NPC_CONFIG.BASE_ACTIVITY_INTERVAL
): number {
  const personalityConfig = NPC_PERSONALITIES[personality]
  const populationScaling = baseRate * populationCount
  const personalityAdjustment =
    populationScaling * personalityConfig.activityDelayMultiplier

  // Add randomness
  const variance = NPC_CONFIG.ACTIVITY_VARIANCE
  const randomMultiplier = 1 + (Math.random() - 0.5) * variance

  return Math.max(30000, personalityAdjustment * randomMultiplier) // Minimum 30 seconds
}

export function getXPRequiredForLevel(level: number): number {
  const requirement = GAME_MECHANICS.BASE_XP_REQUIREMENTS.find(
    (req) => req.level === level
  )
  if (requirement) return requirement.xpRequired

  // For levels beyond the defined table, use exponential growth
  if (level > 10) {
    const baseXP = 5200 // Level 10 requirement
    return Math.floor(baseXP * Math.pow(1.5, level - 10))
  }

  return 0
}

export function calculateEquipmentSlots(characterLevel: number): number {
  const { MAX_SLOTS_BASE, SLOTS_PER_5_LEVELS, MAX_SLOTS_TOTAL } =
    GAME_MECHANICS.EQUIPMENT_SLOTS
  const bonusSlots = Math.floor(characterLevel / 5) * SLOTS_PER_5_LEVELS
  return Math.min(MAX_SLOTS_BASE + bonusSlots, MAX_SLOTS_TOTAL)
}

// ===== EXPORT DEFAULT CONFIG FOR EASY IMPORTING =====
export default {
  GAME_MECHANICS,
  NPC_CONFIG,
  NPC_PERSONALITIES,
  EXCHANGE_CONFIG,
  ITEM_CONFIG,
  CHAT_CONFIG,
  MARKET_CONFIG,
  API_CONFIG,
  LOCATION_CONFIG,
  UI_CONFIG,
  ADMIN_CONFIG,

  // Helper functions
  createNPCEngineConfig,
  createFrontendConfig,
  validatePersonalityPreferences,
  calculateActivityDelay,
  getXPRequiredForLevel,
  calculateEquipmentSlots,
} as const
