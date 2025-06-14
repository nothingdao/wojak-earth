// Game configuration for NPC Engine

// NPC Personality Types and their preferences
export const NPC_PERSONALITIES = {
  casual: {
    preferences: {
      MINE: 1.0,
      TRAVEL: 1.0,
      BUY: 1.0,
      SELL: 1.0,
      CHAT: 1.0,
      EQUIP: 1.0,
      USE_ITEM: 1.0,
      EXCHANGE: 1.0
    },
    activityDelayMultiplier: 1.0
  },
  merchant: {
    preferences: {
      MINE: 0.5,
      TRAVEL: 1.2,
      BUY: 2.0,
      SELL: 2.0,
      CHAT: 0.8,
      EQUIP: 0.7,
      USE_ITEM: 0.6,
      EXCHANGE: 1.5
    },
    activityDelayMultiplier: 0.8
  },
  adventurer: {
    preferences: {
      MINE: 1.5,
      TRAVEL: 2.0,
      BUY: 0.8,
      SELL: 0.8,
      CHAT: 0.6,
      EQUIP: 1.2,
      USE_ITEM: 1.0,
      EXCHANGE: 0.5
    },
    activityDelayMultiplier: 0.9
  },
  social: {
    preferences: {
      MINE: 0.7,
      TRAVEL: 1.0,
      BUY: 1.0,
      SELL: 1.0,
      CHAT: 2.0,
      EQUIP: 0.8,
      USE_ITEM: 0.8,
      EXCHANGE: 0.7
    },
    activityDelayMultiplier: 1.1
  }
}

// Game mechanics configuration
export const GAME_MECHANICS = {
  MAX_HEALTH: 100,
  MAX_ENERGY: 100,
  ENERGY_REST_THRESHOLD: 30,
  REST_ENERGY_GAIN: 25,
  STARTING_COINS: 100,
  STARTING_LEVEL: 1
}

// Create NPC Engine configuration
export function createNPCEngineConfig(overrides = {}) {
  return {
    DEFAULT_NPC_COUNT: 8,
    BASE_ACTIVITY_INTERVAL: process.env.NODE_ENV === 'development' ? 15000 : 45000,
    ACTIVITY_VARIANCE: 0.4,
    FUNDING_AMOUNT: 0.002,
    LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    ENABLE_LOGS: true,
    RESPAWN_ENABLED: true,
    RESPAWN_DELAY_MINUTES: 5,
    RESUME_EXISTING: true,
    SPAWN_DELAY: 2000,
    AVAILABLE_PERSONALITIES: Object.keys(NPC_PERSONALITIES),
    CHAT_CONFIG: {
      enabled: true,
      showContext: process.env.NODE_ENV === 'development'
    },
    ...overrides
  }
}

// Calculate activity delay based on personality and population
export function calculateActivityDelay(personality, activeNPCCount, baseInterval) {
  const personalityConfig = NPC_PERSONALITIES[personality] || NPC_PERSONALITIES.casual
  const multiplier = personalityConfig.activityDelayMultiplier

  // Adjust delay based on population to prevent overload
  const populationFactor = Math.max(0.5, 1 - (activeNPCCount * 0.02))

  return baseInterval * multiplier * populationFactor
}

// Default game configuration
const gameConfig = {
  GAME_MECHANICS,
  NPC_PERSONALITIES
}

export default gameConfig 
