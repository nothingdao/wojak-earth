// data/miningConfigs.ts - Pure data, no dependencies, safe for browser

export interface MiningResource {
  name: string
  spawnRate: number
  maxPerDay: number
  difficulty: number
}

export interface MiningConfig {
  locationName: string
  resources: MiningResource[]
}

export const MINING_CONFIGS: Record<string, MiningResource[]> = {
  'Mining Plains': [
    { name: 'Dirty Coal', spawnRate: 0.5, maxPerDay: 25, difficulty: 1 },
    { name: 'Iron Scraps', spawnRate: 0.35, maxPerDay: 15, difficulty: 1 },
    { name: 'Basic Pickaxe', spawnRate: 0.08, maxPerDay: 3, difficulty: 1 },
  ],

  'Rimeglass Lake': [
    { name: 'Crystal Shard', spawnRate: 0.2, maxPerDay: 8, difficulty: 4 }, // Dragon's hoard crystals
    { name: 'Ancient Coin', spawnRate: 0.12, maxPerDay: 4, difficulty: 5 }, // Sunken treasure
    { name: 'Temporal Flux', spawnRate: 0.03, maxPerDay: 1, difficulty: 6 }, // Time moves strangely near the dragon
    { name: 'Ice Walker Boots', spawnRate: 0.05, maxPerDay: 1, difficulty: 5 }, // Rare find in ice
  ],

  'The Old Cairns': [
    { name: 'Ancient Artifact', spawnRate: 0.08, maxPerDay: 2, difficulty: 6 }, // Burial goods
    { name: 'Ancient Coin', spawnRate: 0.25, maxPerDay: 10, difficulty: 4 }, // Offerings to old gods
    { name: 'Iron Scraps', spawnRate: 0.3, maxPerDay: 12, difficulty: 3 }, // Rusted weapons/tools
    { name: 'Calcium Crystals', spawnRate: 0.15, maxPerDay: 6, difficulty: 4 }, // Mineralized bones
    { name: 'Frostbite Cloak', spawnRate: 0.02, maxPerDay: 1, difficulty: 6 }, // Ancient burial gear
  ],

  'Crystal Caves': [
    { name: 'Crystal Shard', spawnRate: 0.15, maxPerDay: 5, difficulty: 3 },
    { name: 'Ancient Coin', spawnRate: 0.08, maxPerDay: 3, difficulty: 2 },
    { name: 'Omni-Tool', spawnRate: 0.002, maxPerDay: 1, difficulty: 5 },
  ],

  'Desert Outpost': [
    { name: 'Ancient Coin', spawnRate: 0.18, maxPerDay: 8, difficulty: 3 },
    { name: 'Crystal Shard', spawnRate: 0.06, maxPerDay: 2, difficulty: 4 },
    { name: 'Ancient Artifact', spawnRate: 0.01, maxPerDay: 1, difficulty: 5 },
  ],

  'The Glitch Wastes': [
    { name: 'Pixel Dust', spawnRate: 0.4, maxPerDay: 20, difficulty: 4 },
    { name: 'Fragmented Code', spawnRate: 0.12, maxPerDay: 6, difficulty: 5 },
    { name: 'Glitch Goggles', spawnRate: 0.02, maxPerDay: 1, difficulty: 6 },
  ],

  'Corrupted Data Mines': [
    { name: 'Fragmented Code', spawnRate: 0.3, maxPerDay: 10, difficulty: 5 },
    {
      name: 'Buffer Overflow Potion',
      spawnRate: 0.008,
      maxPerDay: 1,
      difficulty: 7,
    },
    {
      name: 'Neural Interface Crown',
      spawnRate: 0.001,
      maxPerDay: 1,
      difficulty: 8,
    }, // Ultra rare tech
  ],

  'Fungi Networks': [
    { name: 'Mycelium Thread', spawnRate: 0.5, maxPerDay: 30, difficulty: 3 },
    { name: 'Neural Spores', spawnRate: 0.25, maxPerDay: 15, difficulty: 3 },
  ],

  'The Great Mycelium': [
    { name: 'Neural Spores', spawnRate: 0.4, maxPerDay: 20, difficulty: 4 },
    { name: 'Symbiotic Armor', spawnRate: 0.015, maxPerDay: 1, difficulty: 5 },
  ],

  'Temporal Rift Zone': [
    { name: 'Temporal Flux', spawnRate: 0.05, maxPerDay: 2, difficulty: 6 },
    { name: 'Causality Loop', spawnRate: 0.08, maxPerDay: 3, difficulty: 5 },
  ],

  'Clock Tower Ruins': [
    { name: 'Temporal Flux', spawnRate: 0.08, maxPerDay: 3, difficulty: 6 },
    { name: 'Paradox Engine', spawnRate: 0.001, maxPerDay: 1, difficulty: 8 },
  ],

  'The Bone Markets': [
    { name: 'Calcium Crystals', spawnRate: 0.35, maxPerDay: 18, difficulty: 3 },
    { name: 'Living Bone Tools', spawnRate: 0.06, maxPerDay: 3, difficulty: 4 },
  ],

  'Static Fields': [
    { name: 'Static Cling', spawnRate: 0.45, maxPerDay: 22, difficulty: 4 },
    {
      name: 'White Noise Generator',
      spawnRate: 0.07,
      maxPerDay: 3,
      difficulty: 5,
    },
  ],

  'Channel 0': [
    { name: 'Static Cling', spawnRate: 0.6, maxPerDay: 30, difficulty: 4 },
    {
      name: 'Signal Booster Helmet',
      spawnRate: 0.02,
      maxPerDay: 1,
      difficulty: 6,
    },
  ],
}

// Helper functions
export function getMiningConfigForLocation(
  locationName: string
): MiningResource[] {
  return MINING_CONFIGS[locationName] || []
}

export function getAllMiningLocations(): string[] {
  return Object.keys(MINING_CONFIGS)
}

export function findResourceInMines(
  itemName: string
): Array<{ location: string; config: MiningResource }> {
  const results: Array<{ location: string; config: MiningResource }> = []

  for (const [location, resources] of Object.entries(MINING_CONFIGS)) {
    const resource = resources.find((resource) => resource.name === itemName)
    if (resource) {
      results.push({ location, config: resource })
    }
  }

  return results
}

export function getMiningStats() {
  const locations = Object.keys(MINING_CONFIGS)
  const allResources = Object.values(MINING_CONFIGS).flat()

  const totalResources = allResources.length
  const averageSpawnRate =
    allResources.reduce((sum, res) => sum + res.spawnRate, 0) / totalResources
  const averageDifficulty =
    allResources.reduce((sum, res) => sum + res.difficulty, 0) / totalResources
  const totalDailyOutput = allResources.reduce(
    (sum, res) => sum + res.maxPerDay,
    0
  )

  const difficultyRanges = {
    beginner: allResources.filter((res) => res.difficulty <= 2).length,
    intermediate: allResources.filter(
      (res) => res.difficulty >= 3 && res.difficulty <= 4
    ).length,
    advanced: allResources.filter(
      (res) => res.difficulty >= 5 && res.difficulty <= 6
    ).length,
    expert: allResources.filter((res) => res.difficulty >= 7).length,
  }

  const spawnRateRanges = {
    common: allResources.filter((res) => res.spawnRate >= 0.3).length,
    uncommon: allResources.filter(
      (res) => res.spawnRate >= 0.1 && res.spawnRate < 0.3
    ).length,
    rare: allResources.filter(
      (res) => res.spawnRate >= 0.01 && res.spawnRate < 0.1
    ).length,
    legendary: allResources.filter((res) => res.spawnRate < 0.01).length,
  }

  return {
    miningLocations: locations.length,
    totalResources,
    averageSpawnRate: Math.round(averageSpawnRate * 1000) / 1000,
    averageDifficulty: Math.round(averageDifficulty * 10) / 10,
    totalDailyOutput,
    difficultyRanges,
    spawnRateRanges,
    resourcesByLocation: locations.reduce((acc, location) => {
      acc[location] = MINING_CONFIGS[location].length
      return acc
    }, {} as Record<string, number>),
  }
}

export function validateMiningConfigs(availableItems: string[]): string[] {
  const issues: string[] = []

  for (const [location, resources] of Object.entries(MINING_CONFIGS)) {
    for (const resource of resources) {
      if (!availableItems.includes(resource.name)) {
        issues.push(
          `${location}: Resource "${resource.name}" not found in available items`
        )
      }
      if (resource.spawnRate <= 0 || resource.spawnRate > 1) {
        issues.push(
          `${location}: Resource "${resource.name}" has invalid spawn rate: ${resource.spawnRate}`
        )
      }
      if (resource.maxPerDay <= 0) {
        issues.push(
          `${location}: Resource "${resource.name}" has invalid maxPerDay: ${resource.maxPerDay}`
        )
      }
      if (resource.difficulty <= 0) {
        issues.push(
          `${location}: Resource "${resource.name}" has invalid difficulty: ${resource.difficulty}`
        )
      }
    }
  }

  return issues
}

export function getResourcesByDifficulty(
  minDifficulty: number,
  maxDifficulty: number
): MiningResource[] {
  return Object.values(MINING_CONFIGS)
    .flat()
    .filter(
      (resource) =>
        resource.difficulty >= minDifficulty &&
        resource.difficulty <= maxDifficulty
    )
}

export function getResourcesBySpawnRate(
  minRate: number,
  maxRate: number
): MiningResource[] {
  return Object.values(MINING_CONFIGS)
    .flat()
    .filter(
      (resource) =>
        resource.spawnRate >= minRate && resource.spawnRate <= maxRate
    )
}

export function getLocationDifficulty(locationName: string): number {
  const resources = getMiningConfigForLocation(locationName)
  if (resources.length === 0) return 0

  return Math.round(
    resources.reduce((sum, res) => sum + res.difficulty, 0) / resources.length
  )
}
