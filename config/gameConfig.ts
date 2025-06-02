// config/gameConfig.ts - Static game settings that rarely change
export const GAME_CONFIG = {
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

  // Mining Settings
  BASE_SPAWN_RATES: {
    COMMON: 0.4,
    UNCOMMON: 0.2,
    RARE: 0.1,
    EPIC: 0.05,
    LEGENDARY: 0.01,
  },

  // Map Settings
  THEMES: {
    plains: { name: 'plains', color: '#22c55e' },
    underground: { name: 'underground', color: '#a855f7' },
    alpine: { name: 'alpine', color: '#3b82f6' },
    volcanic: { name: 'volcanic', color: '#ef4444' },
    desert: { name: 'desert', color: '#fbbf24' },
    urban: { name: 'urban', color: '#6b7280' },
    digital: { name: 'digital', color: '#06b6d4' },
    temporal: { name: 'temporal', color: '#6366f1' },
    ossuary: { name: 'ossuary', color: '#d97706' },
    electromagnetic: { name: 'electromagnetic', color: '#ec4899' },
    wilderness: { name: 'wilderness', color: '#92400e' },
    invisible: { name: 'invisible', color: '#transparent' },
  },
} as const
