// src/hooks/useSvgMapper.ts
import { useState, useCallback } from 'react'
import {
  getAllLocationsForMapping,
  createLocationFromSvgPath,
  linkPathToLocation,
  unlinkPathFromLocation,
  updateLocation,
  deleteLocation,
} from '../lib/admin/adminTools'

export interface DatabaseLocation {
  id: string
  name: string
  description: string
  biome?: string
  difficulty: number
  min_level?: number
  has_market: boolean
  has_mining: boolean
  has_travel: boolean
  has_chat: boolean
  svg_path_id?: string | null
  theme?: string
  is_explored?: boolean
  player_count: number
  entry_cost?: number
  location_type: string
  parentlocation_id?: string | null
  created_at: string
  updated_at: string
}

export function useSvgMapper() {
  const [locations, setLocations] = useState<DatabaseLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllLocationsForMapping()
      setLocations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch locations')
      console.error('Error fetching locations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createLocation = useCallback(
    async (
      pathId: string,
      locationData: Parameters<typeof createLocationFromSvgPath>[1]
    ) => {
      try {
        setLoading(true)
        setError(null)
        const newLocation = await createLocationFromSvgPath(
          pathId,
          locationData
        )
        await fetchLocations() // Refresh the list
        return newLocation
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to create location'
        )
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fetchLocations]
  )

  const updateLocationData = useCallback(
    async (location_id: string, updates: Partial<DatabaseLocation>) => {
      try {
        setError(null)
        const updatedLocation = await updateLocation(location_id, updates)

        // Update local state immediately for responsive UI
        setLocations((prev) =>
          prev.map((loc) =>
            loc.id === location_id ? { ...loc, ...updates } : loc
          )
        )

        return updatedLocation
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update location'
        )
        throw err
      }
    },
    []
  )

  const linkPath = useCallback(
    async (location_id: string, pathId: string) => {
      try {
        setError(null)
        const result = await linkPathToLocation(location_id, pathId)
        await fetchLocations() // Refresh to see changes
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to link path')
        throw err
      }
    },
    [fetchLocations]
  )

  const unlinkPath = useCallback(
    async (location_id: string) => {
      try {
        setError(null)
        const result = await unlinkPathFromLocation(location_id)
        await fetchLocations() // Refresh to see changes
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to unlink path')
        throw err
      }
    },
    [fetchLocations]
  )

  const deleteLocationData = useCallback(
    async (location_id: string) => {
      try {
        setLoading(true)
        setError(null)
        await deleteLocation(location_id)
        await fetchLocations() // Refresh the list
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete location'
        )
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fetchLocations]
  )

  // Generate mapData.ts content from current database state
  const generateMapDataFromDatabase = useCallback(
    (svgContent?: string) => {
      const pathMappings = locations
        .filter((loc) => loc.svg_path_id) // Only include locations with SVG paths
        .map((loc) => ({
          pathId: loc.svg_path_id!,
          location_id: loc.id,
        }))

      // Calculate total paths from SVG content if provided
      let totalPaths = 0
      if (svgContent) {
        try {
          const parser = new DOMParser()
          const doc = parser.parseFromString(svgContent, 'image/svg+xml')
          totalPaths = doc.querySelectorAll('path[id]').length
        } catch (error) {
          console.warn('Could not parse SVG content for path count:', error)
        }
      }

      const mapDataContent = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        svgContent: svgContent || '<!-- SVG content will be inserted here -->',
        pathMappings,
        metadata: {
          totalPaths,
          mappedPaths: pathMappings.length,
          unmappedPaths: Math.max(0, totalPaths - pathMappings.length),
          canvasSize: { width: 788, height: 1440 }, // Default size, can be extracted from SVG
        },
      }

      return mapDataContent
    },
    [locations]
  )

  // Export mapData.ts file from current database state
  const exportMapDataFromDatabase = useCallback(
    (svgContent?: string) => {
      const mapDataContent = generateMapDataFromDatabase(svgContent)

      const tsContent = `// data/mapData.ts - Generated map data - DO NOT EDIT MANUALLY
// Use the SVG Mapper tool to make changes
// Generated: ${mapDataContent.timestamp}

export interface PathMapping {
  pathId: string
  location_id: string
}

export interface MapData {
  version: string
  timestamp: string
  svgContent: string
  pathMappings: PathMapping[]
  metadata: {
    totalPaths: number
    mappedPaths: number
    unmappedPaths: number
    canvasSize: { width: number; height: number }
  }
}

export const mapData: MapData = ${JSON.stringify(mapDataContent, null, 2)}

export default mapData

// Utility functions for working with map data
export class MapDataManager {
  private mapData: MapData
  private pathToLocationMap: Map<string, string>
  private locationToPathMap: Map<string, string>

  constructor(data: MapData) {
    this.mapData = data
    this.pathToLocationMap = new Map()
    this.locationToPathMap = new Map()
    this.buildLookupMaps()
  }

  private buildLookupMaps(): void {
    this.pathToLocationMap.clear()
    this.locationToPathMap.clear()

    this.mapData.pathMappings.forEach((mapping) => {
      this.pathToLocationMap.set(mapping.pathId, mapping.location_id)
      this.locationToPathMap.set(mapping.location_id, mapping.pathId)
    })
  }

  getlocation_idByPath(pathId: string): string | undefined {
    return this.pathToLocationMap.get(pathId)
  }

  getPathIdByLocation(location_id: string): string | undefined {
    return this.locationToPathMap.get(location_id)
  }

  isPathMapped(pathId: string): boolean {
    return this.pathToLocationMap.has(pathId)
  }

  isLocationMapped(location_id: string): boolean {
    return this.locationToPathMap.has(location_id)
  }

  getMappedPathIds(): string[] {
    return Array.from(this.pathToLocationMap.keys())
  }

  getMappedlocation_ids(): string[] {
    return Array.from(this.locationToPathMap.keys())
  }

  getSvgContent(): string {
    return this.mapData.svgContent
  }

  getMetadata() {
    return this.mapData.metadata
  }

  getVersion(): string {
    return this.mapData.version
  }

  getTimestamp(): string {
    return this.mapData.timestamp
  }

  validateMapData(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.mapData.version) errors.push('Missing version field')
    if (!this.mapData.timestamp) errors.push('Missing timestamp field')
    if (!this.mapData.svgContent) errors.push('Missing SVG content')
    if (!Array.isArray(this.mapData.pathMappings)) errors.push('pathMappings must be an array')

    const pathIds = new Set<string>()
    const location_ids = new Set<string>()

    this.mapData.pathMappings.forEach((mapping, index) => {
      if (!mapping.pathId) errors.push(\`Mapping \${index}: missing pathId\`)
      if (!mapping.location_id) errors.push(\`Mapping \${index}: missing location_id\`)
      if (pathIds.has(mapping.pathId)) errors.push(\`Duplicate pathId: \${mapping.pathId}\`)
      if (location_ids.has(mapping.location_id)) errors.push(\`Duplicate location_id: \${mapping.location_id}\`)
      pathIds.add(mapping.pathId)
      location_ids.add(mapping.location_id)
    })

    if (this.mapData.metadata) {
      const actualMapped = this.mapData.pathMappings.length
      if (this.mapData.metadata.mappedPaths !== actualMapped) {
        errors.push(\`Metadata inconsistency: mappedPaths is \${this.mapData.metadata.mappedPaths}, but found \${actualMapped} mappings\`)
      }
    }

    return { isValid: errors.length === 0, errors }
  }

  exportAsJson(): string {
    return JSON.stringify(this.mapData, null, 2)
  }

  exportAsTypeScript(): string {
    return generateMapDataTypeScript(this.mapData)
  }
}

export function createMapDataManager(data: MapData): MapDataManager {
  return new MapDataManager(data)
}

export function extractPathsFromSvg(svgContent: string): Array<{
  id: string
  d: string | null
  fill: string
  className: string
}> {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgContent, 'image/svg+xml')

    const parserError = doc.querySelector('parsererror')
    if (parserError) {
      throw new Error(\`SVG parsing error: \${parserError.textContent}\`)
    }

    const pathsWithIds = doc.querySelectorAll('path[id]')

    return Array.from(pathsWithIds).map((path) => ({
      id: path.id,
      d: path.getAttribute('d'),
      fill: path.getAttribute('fill') || '#cccccc',
      className: path.getAttribute('class') || '',
    }))
  } catch (error) {
    console.error('Error extracting paths from SVG:', error)
    return []
  }
}

function generateMapDataTypeScript(mapData: any): string {
  return \`// data/mapData.ts - Generated map data - DO NOT EDIT MANUALLY
// Use the SVG Mapper tool to make changes  
// Generated: \${mapData.timestamp}

export interface PathMapping {
  pathId: string
  location_id: string
}

export interface MapData {
  version: string
  timestamp: string
  svgContent: string
  pathMappings: PathMapping[]
  metadata: {
    totalPaths: number
    mappedPaths: number
    unmappedPaths: number
    canvasSize: { width: number; height: number }
  }
}

export const mapData: MapData = \${JSON.stringify(mapData, null, 2)}

export default mapData
\`
}
`

      // Download generated file
      const blob = new Blob([tsContent], { type: 'text/typescript' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mapData.ts'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return mapDataContent
    },
    [generateMapDataFromDatabase]
  )

  // Sync database mappings with a provided mapData structure
  const syncDatabaseWithMapData = useCallback(
    async (newMapData: any) => {
      try {
        setLoading(true)
        setError(null)

        // Get current database mappings
        const currentMappings = new Set(
          locations
            .filter((loc) => loc.svg_path_id)
            .map((loc) => `${loc.svg_path_id}:${loc.id}`)
        )

        // Get new mappings from mapData
        const newMappings = new Set(
          newMapData.pathMappings.map(
            (mapping: any) => `${mapping.pathId}:${mapping.location_id}`
          )
        )

        // Find mappings to add (in new but not in current)
        const toAdd = newMapData.pathMappings.filter(
          (mapping: any) =>
            !currentMappings.has(`${mapping.pathId}:${mapping.location_id}`)
        )

        // Find mappings to remove (in current but not in new)
        const toRemove = locations.filter(
          (loc) =>
            loc.svg_path_id && !newMappings.has(`${loc.svg_path_id}:${loc.id}`)
        )

        // Apply changes
        const promises = []

        // Add new mappings
        for (const mapping of toAdd) {
          promises.push(linkPathToLocation(mapping.location_id, mapping.pathId))
        }

        // Remove old mappings
        for (const location of toRemove) {
          promises.push(unlinkPathFromLocation(location.id))
        }

        await Promise.all(promises)
        await fetchLocations() // Refresh data

        return {
          added: toAdd.length,
          removed: toRemove.length,
          total: newMapData.pathMappings.length,
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to sync database with map data'
        )
        throw err
      } finally {
        setLoading(false)
      }
    },
    [locations, linkPathToLocation, unlinkPathFromLocation, fetchLocations]
  )

  return {
    // Existing location operations
    locations,
    loading,
    error,
    fetchLocations,
    createLocation,
    updateLocation: updateLocationData,
    linkPath,
    unlinkPath,
    deleteLocation: deleteLocationData,

    // New map data operations
    generateMapDataFromDatabase,
    exportMapDataFromDatabase,
    syncDatabaseWithMapData,
  }
}
