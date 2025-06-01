import type { LocationTheme, MapLocation } from '@/types'
import { LOCATION_THEMES } from './locationThemes'

// components/MapStyling.ts - Fixed to use isExplored parameter
export class MapStyling {
  private locations: Map<string, MapLocation>

  constructor(locations: MapLocation[]) {
    this.locations = new Map(locations.map((loc) => [loc.svgPathId, loc]))
  }

  // Get location by SVG path ID
  getLocation(svgPathId: string): MapLocation | null {
    return this.locations.get(svgPathId) || null
  }

  // Generate CSS classes for an SVG path
  getPathClasses(svgPathId: string): string {
    const location = this.getLocation(svgPathId)

    if (!location) {
      return this.buildClasses(LOCATION_THEMES.unexplored, false, false)
    }

    let theme
    switch (location.status) {
      case 'explored':
        theme = location.theme
        break
      case 'locked':
        theme = LOCATION_THEMES.locked
        break
      case 'gm-only':
        theme = LOCATION_THEMES.gmOnly
        break
      default: // 'unexplored'
        theme = LOCATION_THEMES.unexplored
    }

    return this.buildClasses(
      theme,
      location.isPlayerHere,
      location.status === 'explored'
    )
  }

  // Get SVG attributes (opacity, filters)
  getPathAttributes(svgPathId: string): {
    fillOpacity: number
    style: React.CSSProperties
  } {
    const location = this.getLocation(svgPathId)

    if (!location) {
      const theme = LOCATION_THEMES.unexplored
      return this.buildAttributes(theme)
    }

    const theme = location.isExplored
      ? location.theme
      : LOCATION_THEMES.unexplored
    return this.buildAttributes(theme)
  }

  private buildClasses(
    theme: LocationTheme,
    isPlayerHere: boolean,
    isExplored: boolean // ← Now actually using this parameter
  ): string {
    const classes = [
      theme.colors.base,
      theme.colors.hover,
      'cursor-pointer',
      'transition-all',
      'duration-300',
      'hover:brightness-110',
    ]

    // Only add blur class if the area is unexplored
    if (!isExplored && theme.effects.blur) {
      classes.push(theme.effects.blur)
    }

    if (isPlayerHere) {
      classes.push('ring-2', 'ring-primary', 'ring-offset-1')
    }

    return classes.join(' ')
  }

  private buildAttributes(theme: LocationTheme): {
    fillOpacity: number
    style: React.CSSProperties
  } {
    return {
      fillOpacity: theme.opacity,
      style: {
        filter: theme.effects.filter || 'none',
      },
    }
  }

  // Update location state
  updateLocation(
    svgPathId: string,
    updates: Partial<Pick<MapLocation, 'isExplored' | 'isPlayerHere'>>
  ): void {
    const location = this.locations.get(svgPathId)
    if (location) {
      Object.assign(location, updates)
    }
  }

  // Get display info for tooltips
  getLocationInfo(
    svgPathId: string
  ): { name: string; description: string; difficulty: number } | null {
    const location = this.getLocation(svgPathId)
    if (!location) {
      return {
        name: 'Unknown Territory',
        description: 'This region has not been explored yet',
        difficulty: 0,
      }
    }

    return {
      name: location.name,
      description: location.description,
      difficulty: location.difficulty,
    }
  }
}
