// components/views/WorldMapView.tsx
import { useState } from 'react'
import Earth from '../map/Earth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Map, List, MapPin, Users, Shield, Coins } from 'lucide-react'
import type { DatabaseLocation, Character } from '@/types'

interface WorldMapViewProps {
  locations?: DatabaseLocation[]
  character?: Character | null
  onTravel?: (locationId: string) => void
}

export function WorldMapView({ locations = [], character, onTravel }: WorldMapViewProps) {
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())

  // Organize locations into hierarchy
  const organizeLocations = () => {
    const regions: { [key: string]: DatabaseLocation[] } = {}
    const subLocations: { [key: string]: DatabaseLocation[] } = {}

    locations.forEach(location => {
      if (location.parentLocationId) {
        // This is a sub-location
        if (!subLocations[location.parentLocationId]) {
          subLocations[location.parentLocationId] = []
        }
        subLocations[location.parentLocationId].push(location)
      } else {
        // This is a main location
        const biome = location.biome || 'Unknown'
        if (!regions[biome]) {
          regions[biome] = []
        }
        regions[biome].push(location)
      }
    })

    return { regions, subLocations }
  }

  const { regions, subLocations } = organizeLocations()

  const toggleRegion = (biome: string) => {
    const newExpanded = new Set(expandedRegions)
    if (newExpanded.has(biome)) {
      newExpanded.delete(biome)
    } else {
      newExpanded.add(biome)
    }
    setExpandedRegions(newExpanded)
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 1) return 'text-green-600'
    if (difficulty <= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getBiomeIcon = (biome: string) => {
    switch (biome?.toLowerCase()) {
      case 'urban': return '🏙️'
      case 'mountain':
      case 'alpine': return '🏔️'
      case 'desert': return '🏜️'
      case 'forest':
      case 'wilderness': return '🌲'
      case 'underground': return '🕳️'
      case 'digital': return '💻'
      case 'temporal': return '⏰'
      case 'ossuary': return '💀'
      case 'electromagnetic': return '⚡'
      case 'volcanic': return '🌋'
      case 'ocean': return '🌊'
      case 'plains': return '🌾'
      default: return '📍'
    }
  }

  const renderLocationCard = (location: DatabaseLocation, isSubLocation = false) => {
    const isCurrentLocation = character?.currentLocation?.id === location.id
    const hasSubLocations = subLocations[location.id]?.length > 0

    return (
      <div
        key={location.id}
        className={`p-3 rounded-lg border transition-colors ${isCurrentLocation
          ? 'bg-primary/10 border-primary'
          : 'bg-muted/30 border-muted hover:bg-muted/50'
          } ${isSubLocation ? 'ml-4' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{getBiomeIcon(location.biome)}</span>
              <h4 className={`font-medium truncate ${isCurrentLocation ? 'text-primary' : ''}`}>
                {location.name}
              </h4>
              {isCurrentLocation && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                  Current
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {location.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Shield className={`w-3 h-3 ${getDifficultyColor(location.difficulty)}`} />
                <span className={getDifficultyColor(location.difficulty)}>
                  Level {location.difficulty}
                </span>
              </div>

              {location.playerCount > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{location.playerCount} players</span>
                </div>
              )}

              {location.entryCost > 0 && (
                <div className="flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  <span>{location.entryCost} coins</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <span className="capitalize">{location.biome}</span>
                <span>•</span>
                <span className="capitalize">{location.locationType}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-3">
            {!isCurrentLocation && onTravel && (
              <Button
                size="sm"
                onClick={() => onTravel(location.id)}
                className="text-xs"
              >
                Travel
              </Button>
            )}

            {hasSubLocations && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleRegion(location.id)}
                className="text-xs"
              >
                {expandedRegions.has(location.id) ? 'Hide' : 'Show'} Areas
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderLocationsList = () => (
    <ScrollArea className="h-96">
      <div className="space-y-4">
        {Object.entries(regions).map(([biome, regionLocations]) => (
          <div key={biome}>
            {/* Biome Header */}
            <div
              className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg cursor-pointer mb-2"
              onClick={() => toggleRegion(biome)}
            >
              <span className="text-lg">{getBiomeIcon(biome)}</span>
              <h3 className="font-semibold capitalize flex-1">{biome} Region</h3>
              <span className="text-xs text-muted-foreground">
                {regionLocations.length} location{regionLocations.length !== 1 ? 's' : ''}
              </span>
              <Button size="sm" variant="ghost" className="text-xs">
                {expandedRegions.has(biome) ? '▼' : '▶'}
              </Button>
            </div>

            {/* Region Locations */}
            {expandedRegions.has(biome) && (
              <div className="space-y-2">
                {regionLocations.map(location => (
                  <div key={location.id}>
                    {renderLocationCard(location)}

                    {/* Sub-locations */}
                    {expandedRegions.has(location.id) && subLocations[location.id] && (
                      <div className="mt-2 space-y-2">
                        {subLocations[location.id].map(subLoc =>
                          renderLocationCard(subLoc, true)
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {Object.keys(regions).length === 0 && (
          <div className="bg-muted/30 p-8 rounded-lg text-center text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-2" />
            No locations available.<br />
            <span className="text-xs">Locations are still being discovered...</span>
          </div>
        )}
      </div>
    </ScrollArea>
  )

  return (
    <div className="w-full">
      <Tabs defaultValue="map" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="map" className="text-xs">
            <Map className="w-3 h-3 mr-1" />
            Map
            {locations.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">
                {locations.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="list" className="text-xs">
            <List className="w-3 h-3 mr-1" />
            List
            {Object.keys(regions).length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">
                {Object.keys(regions).length} regions
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Map Tab Content */}
        <TabsContent value="map" className="mt-4">
          <Earth
            locations={locations}
            character={character || undefined}
            onTravel={onTravel}
          />
        </TabsContent>

        {/* List Tab Content */}
        <TabsContent value="list" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">All Locations</h3>
              <div className="text-sm text-muted-foreground">
                {locations.length} total locations
              </div>
            </div>

            {renderLocationsList()}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
