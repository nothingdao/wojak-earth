// components/map/themes/DatabaseMapStyling.ts

import type { DatabaseLocation, Character, TravelValidation } from '@/types'
import { LOCATION_THEMES } from './locationThemes'

export class DatabaseMapStyling {
  private locations: DatabaseLocation[]
  private playerLocation?: string

  constructor(locations: DatabaseLocation[], playerLocation?: string) {
    this.locations = locations
    this.playerLocation = playerLocation
  }

  // Find location by SVG path ID
  getLocationBySvgPath(svgPathId: string): DatabaseLocation | undefined {
    console.log(`🔍 Looking for svgPathId: "${svgPathId}"`)
    console.log('📊 Available locations:', this.locations.length)
    console.log(
      '📋 Sample svgpathids:',
      this.locations.slice(0, 3).map((l) => l.svgpathid)
    )

    const location = this.locations.find((loc) => loc.svgpathid === svgPathId)

    if (location) {
      console.log(`✅ FOUND: "${svgPathId}" -> "${location.name}"`)
    } else {
      console.log(`❌ NOT FOUND: "${svgPathId}"`)
      console.log(
        'All available svgpathids:',
        this.locations.map((l) => l.svgpathid)
      )
    }

    return location
  }

  // Get location info for tooltips
  getLocationInfo(
    svgPathId: string
  ): { name: string; description: string; difficulty: number } | null {
    const location = this.getLocationBySvgPath(svgPathId)
    if (!location) return null

    return {
      name: location.name,
      description: location.description,
      difficulty: location.difficulty,
    }
  }

  // Check if player is at this location
  isPlayerHere(svgPathId: string): boolean {
    if (!this.playerLocation) return false
    const location = this.getLocationBySvgPath(svgPathId)
    return location ? location.id === this.playerLocation : false
  }

  // Get theme for location
  getLocationTheme(location: DatabaseLocation) {
    // Get theme from LOCATION_THEMES object
    const theme = LOCATION_THEMES[location.theme] || LOCATION_THEMES.plains
    return theme
  }

  // Get path styling classes
  getPathClasses(svgPathId: string): string {
    const location = this.getLocationBySvgPath(svgPathId)
    if (!location) {
      return 'fill-slate-200 hover:fill-slate-300 stroke-slate-400 cursor-pointer transition-colors'
    }

    const theme = this.getLocationTheme(location)
    const isPlayerHere = this.isPlayerHere(svgPathId)

    let classes = `${theme.fillClass || 'fill-slate-200'} ${
      theme.hoverClass || 'hover:fill-slate-300'
    } ${
      theme.strokeClass || 'stroke-slate-400'
    } cursor-pointer transition-colors`

    // Add player indicator
    if (isPlayerHere) {
      classes += ' ring-2 ring-emerald-400 ring-offset-1'
    }

    // Add restriction indicators
    if (!location.hasTravel) {
      classes += ' opacity-50 cursor-not-allowed'
    } else if (location.isPrivate) {
      classes += ' opacity-75'
    }

    // Add exploration status
    if (!location.isExplored) {
      classes += ' opacity-60'
    }

    return classes
  }

  // Get path attributes for accessibility and data
  getPathAttributes(svgPathId: string): Record<string, string> {
    const location = this.getLocationBySvgPath(svgPathId)
    if (!location) {
      return {
        'aria-label': 'Unknown territory',
        'data-location-id': '',
        'data-difficulty': '0',
        'data-biome': '',
        'data-has-travel': 'false',
      }
    }

    return {
      'aria-label': `${location.name} - Difficulty ${location.difficulty}`,
      'data-location-id': location.id,
      'data-difficulty': location.difficulty.toString(),
      'data-biome': location.biome,
      'data-has-travel': location.hasTravel.toString(),
    }
  }

  // Validate if character can travel to location
  validateTravel(svgPathId: string, character: Character): TravelValidation {
    const location = this.getLocationBySvgPath(svgPathId)
    if (!location) {
      return { allowed: false, reason: 'Location not found' }
    }

    // Check if travel is enabled
    if (!location.hasTravel) {
      return { allowed: false, reason: 'Travel is disabled for this location' }
    }

    // Check if player is already here
    if (character.currentLocation.id === location.id) {
      return { allowed: false, reason: 'You are already here' }
    }

    // Check level requirements
    if (location.minLevel && character.level < location.minLevel) {
      return {
        allowed: false,
        reason: `Requires level ${location.minLevel} (you are level ${character.level})`,
      }
    }

    // Check entry cost
    if (location.entryCost && character.coins < location.entryCost) {
      return {
        allowed: false,
        reason: `Costs ${location.entryCost} coins (you have ${character.coins})`,
        cost: location.entryCost,
      }
    }

    // Check private access
    if (location.isPrivate) {
      return { allowed: false, reason: 'This is a private area' }
    }

    // Check exploration status
    if (!location.isExplored) {
      return { allowed: false, reason: 'This area has not been explored yet' }
    }

    return {
      allowed: true,
      cost: location.entryCost || 0,
    }
  }

  // Get all explorable locations for a character
  getAccessibleLocations(character: Character): DatabaseLocation[] {
    return this.locations.filter((location) => {
      const validation = this.validateTravel(location.svgpathid, character)
      return validation.allowed
    })
  }

  // Get locations by biome
  getLocationsByBiome(biome: string): DatabaseLocation[] {
    return this.locations.filter((loc) => loc.biome === biome)
  }

  // Get locations by difficulty range
  getLocationsByDifficulty(
    minDiff: number,
    maxDiff: number
  ): DatabaseLocation[] {
    return this.locations.filter(
      (loc) => loc.difficulty >= minDiff && loc.difficulty <= maxDiff
    )
  }
}

// Helper function to create the styling manager
export function createMapStyling(
  locations: DatabaseLocation[],
  playerLocationId?: string
): DatabaseMapStyling {
  return new DatabaseMapStyling(locations, playerLocationId)
}
