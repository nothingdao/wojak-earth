export interface NPC_CONFIG {
  CHAT_CONFIG: {
    enabled: boolean
    showContext: boolean
    messagePoolSize: number
  }
  BASE_ACTIVITY_INTERVAL: number
  ACTIVITY_VARIANCE: number
  SPAWN_DELAY: number
  DEFAULT_NPC_COUNT: number
  FUNDING_AMOUNT: number
  LOG_LEVEL: string
  ENABLE_LOGS: boolean
  RESPAWN_ENABLED: boolean
  RESUME_EXISTING: boolean
  RESPAWN_DELAY_MINUTES: number
  ANNOUNCE_DEATHS: boolean
  ANNOUNCE_RESPAWNS: boolean
  CRITICAL_HEALTH_THRESHOLD: number
  MAX_HEALING_ATTEMPTS: number
  GLOBAL_ACTIVITY_RATE: number
  AVAILABLE_PERSONALITIES: readonly string[]
}

export const defaultConfig: NPC_CONFIG = {
  CHAT_CONFIG: {
    enabled: true,
    showContext: true,
    messagePoolSize: 50,
  },
  BASE_ACTIVITY_INTERVAL: 45000,
  ACTIVITY_VARIANCE: 0.4,
  SPAWN_DELAY: 2000,
  DEFAULT_NPC_COUNT: 8,
  FUNDING_AMOUNT: 0.02,
  LOG_LEVEL: 'info',
  ENABLE_LOGS: true,
  RESPAWN_ENABLED: true,
  RESUME_EXISTING: true,
  RESPAWN_DELAY_MINUTES: 5,
  ANNOUNCE_DEATHS: true,
  ANNOUNCE_RESPAWNS: true,
  CRITICAL_HEALTH_THRESHOLD: 20,
  MAX_HEALING_ATTEMPTS: 3,
  GLOBAL_ACTIVITY_RATE: 1.0,
  AVAILABLE_PERSONALITIES: [
    'friendly',
    'aggressive',
    'neutral',
    'greedy',
    'cautious',
  ] as const,
}

export function createNPCEngineConfig(
  overrides: Partial<NPC_CONFIG> = {}
): NPC_CONFIG {
  return {
    ...defaultConfig,
    ...overrides,
  }
}

export default defaultConfig
