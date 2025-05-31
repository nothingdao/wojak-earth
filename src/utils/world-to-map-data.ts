// utils/world-to-map-data.ts - Type-safe bridge between world setup and map component
import {
  WORLD_LOCATIONS,
  getAllLocations,
  locationNameToKey,
  type WorldLocation,
} from '../../data/worldLocations'
import type { MapRegion, LandType, ExplorationState, BiomeType } from '../types'

// Map biomes to visual themes
const BIOME_TO_LAND_TYPE: Record<BiomeType, LandType> = {
  plains: 'inhabited',
  desert: 'uninhabited',
  urban: 'inhabited',
  digital: 'uninhabited',
  underground: 'inhabited',
  temporal: 'sacred',
  ossuary: 'ruins',
  electromagnetic: 'uninhabited',
} as const

// Map biomes to color schemes
const BIOME_COLORS: Record<BiomeType, { base: string; hover: string }> = {
  plains: {
    base: 'fill-green-100',
    hover: 'hover:fill-green-200',
  },
  desert: {
    base: 'fill-yellow-100',
    hover: 'hover:fill-yellow-200',
  },
  urban: {
    base: 'fill-blue-100',
    hover: 'hover:fill-blue-200',
  },
  digital: {
    base: 'fill-purple-100',
    hover: 'hover:fill-purple-200',
  },
  underground: {
    base: 'fill-amber-100',
    hover: 'hover:fill-amber-200',
  },
  temporal: {
    base: 'fill-indigo-100',
    hover: 'hover:fill-indigo-200',
  },
  ossuary: {
    base: 'fill-gray-100',
    hover: 'hover:fill-gray-200',
  },
  electromagnetic: {
    base: 'fill-slate-100',
    hover: 'hover:fill-slate-200',
  },
} as const

// Map difficulty to exploration state
function difficultyToExplorationState(difficulty: number): ExplorationState {
  if (difficulty <= 1) return 'known'
  if (difficulty <= 2) return 'explored'
  if (difficulty <= 3) return 'rumors'
  return 'unexplored'
}

// Convert world location to map region
function worldLocationToMapRegion(location: WorldLocation): MapRegion {
  const biomeColors =
    BIOME_COLORS[location.biome as BiomeType] || BIOME_COLORS.plains

  return {
    name: location.name,
    description: location.description,
    lore: location.lore || location.description,
    landType: BIOME_TO_LAND_TYPE[location.biome as BiomeType] || 'uninhabited',
    explorationState: difficultyToExplorationState(location.difficulty),
    hoverColor: biomeColors.hover,
    baseColor: biomeColors.base,
    // Include world data for game integration
    worldData: {
      difficulty: location.difficulty,
      biome: location.biome as BiomeType,
      hasMarket: location.hasMarket,
      hasMining: location.hasMining,
      hasChat: location.hasChat,
      welcomeMessage: location.welcomeMessage,
      mapX: location.mapX,
      mapY: location.mapY,
    },
  }
}

// Generate map regions from world data
export function generateMapRegions(): Record<string, MapRegion> {
  const regions: Record<string, MapRegion> = {}

  for (const location of getAllLocations()) {
    const key = locationNameToKey(location.name)
    regions[key] = worldLocationToMapRegion(location)
  }

  return regions
}

// Export specific region configs for easy import
export const MAP_REGIONS = generateMapRegions()

// Helper to find a region by various identifiers
export function findRegion(identifier: string): MapRegion | null {
  // Try exact key match first
  if (MAP_REGIONS[identifier]) return MAP_REGIONS[identifier]

  // Try by name
  for (const [, region] of Object.entries(MAP_REGIONS)) {
    if (region.name.toLowerCase() === identifier.toLowerCase()) {
      return region
    }
  }

  return null
}

// Export world locations for other uses
export { WORLD_LOCATIONS, getAllLocations, locationNameToKey }

// Utility functions that are actually used
export function getRegionsByDifficulty(maxDifficulty: number): MapRegion[] {
  return Object.values(MAP_REGIONS).filter(
    (region) => region.worldData.difficulty <= maxDifficulty
  )
}

export function getRegionsByBiome(biome: BiomeType): MapRegion[] {
  return Object.values(MAP_REGIONS).filter(
    (region) => region.worldData.biome === biome
  )
}

export function getRegionsWithFeature(
  feature: 'hasMarket' | 'hasMining' | 'hasChat'
): MapRegion[] {
  return Object.values(MAP_REGIONS).filter(
    (region) => region.worldData[feature]
  )
}
