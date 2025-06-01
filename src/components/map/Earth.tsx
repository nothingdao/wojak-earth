// components/Earth.tsx - Simplified component with detailed modal
import { useState, useCallback, useMemo } from "react"
import {
  GiCrossedSwords,
  GiTreasureMap,
  GiMineWagon,
  GiChatBubble,
  GiCastle,
  GiCompass,
  GiPositionMarker,
  GiCrossMark
} from "react-icons/gi"
import { EarthSVG } from "./EarthSVG"
import { MapStyling } from "./themes/MapStyling"
import { MAP_LOCATIONS } from "../../../data/mapLocations"
import { Button } from "@/components/ui/button"

interface EarthProps {
  playerLocation?: string
  exploredRegions?: string[]
  onRegionClick?: (locationId: string) => void
  onTravel?: (locationId: string) => void
  locations?: Array<{ id: string; name: string }>
  character?: { currentLocation: { id: string } }
}

export default function Earth({
  playerLocation,
  onRegionClick,
  onTravel,
  locations = [],
  character
}: EarthProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  // Create styling manager with current state
  const mapStyling = useMemo(() => {
    const mapLocations = MAP_LOCATIONS.map(loc => ({
      ...loc,
      isPlayerHere: playerLocation === loc.id
      // status comes from the static data now
    }))

    return new MapStyling(mapLocations)
  }, [playerLocation])

  const handleMouseOver = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGPathElement
    if (target.tagName === "path" && target.id) {
      setHoveredRegion(target.id)
    }
  }, [])

  const handleMouseOut = useCallback(() => {
    setHoveredRegion(null)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGPathElement
    if (target.tagName === "path" && target.id) {
      const newSelection = selectedRegion === target.id ? null : target.id
      setSelectedRegion(newSelection)

      if (newSelection && onRegionClick) {
        const location = mapStyling.getLocation(target.id)
        if (location) {
          onRegionClick(location.id)
        }
      }
    }
  }, [selectedRegion, mapStyling, onRegionClick])

  const isPlayerAtLocation = useCallback((svgPathId: string): boolean => {
    if (!character) return false
    const location = mapStyling.getLocation(svgPathId)
    return location ? character.currentLocation.id === location.id : false
  }, [character, mapStyling])

  return (
    <div className="w-full h-auto flex items-center justify-center relative">
      {/* Hover Tooltip */}
      {hoveredRegion && (
        <div className="absolute top-4 right-4 bg-card/95 backdrop-blur-sm text-card-foreground px-3 py-2 rounded-lg shadow-lg border z-50 max-w-xs animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {(() => {
            const info = mapStyling.getLocationInfo(hoveredRegion)
            const location = mapStyling.getLocation(hoveredRegion)
            return (
              <>
                <div className="font-medium text-sm">{info ? info.name : 'Unknown Territory'}</div>

                {location ? (
                  <div className="text-xs text-primary mt-1 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <GiTreasureMap className="w-3 h-3" />
                      <span>{location.status === 'explored' ? 'Explored' : 'Unknown'}</span>
                      {info && info.difficulty > 0 && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span>Level {info.difficulty}</span>
                        </>
                      )}
                    </div>
                    {location.isPlayerHere && (
                      <div className="text-emerald-600 font-medium text-xs flex items-center gap-1">
                        <GiPositionMarker className="w-3 h-3 animate-pulse" />
                        You are here
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <GiCompass className="w-3 h-3" />
                      <span>Unexplored Territory</span>
                    </div>
                    <div className="text-xs opacity-75">
                      This region awaits discovery...
                    </div>
                  </div>
                )}

                {/* Always show path ID for debugging */}
                <div className="text-xs text-muted-foreground mt-2 border-t pt-1 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Path ID:</span>
                    <code className="bg-muted px-1 rounded text-xs">{hoveredRegion}</code>
                  </div>
                  <div>
                    {selectedRegion === hoveredRegion ? 'Click to close details' : 'Click for details'}
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* Detailed Info Modal */}
      {selectedRegion && (
        <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm text-card-foreground p-4 rounded-lg shadow-lg border max-w-sm z-50 animate-in fade-in-0 slide-in-from-left-1 duration-300">
          {(() => {
            const info = mapStyling.getLocationInfo(selectedRegion)
            const location = mapStyling.getLocation(selectedRegion)

            if (!info) return null

            return (
              <>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{info.name}</h3>
                  <button
                    onClick={() => setSelectedRegion(null)}
                    className="text-muted-foreground hover:text-card-foreground transition-colors p-1 hover:bg-muted rounded"
                    aria-label="Close panel"
                  >
                    <GiCrossMark className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  {info.description}
                </p>

                {location ? (
                  <>
                    <div className="space-y-2 mb-3 p-2 bg-muted/30 rounded-md">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-muted-foreground flex items-center gap-1">
                          <GiCrossedSwords className="w-3 h-3" />
                          Difficulty:
                        </span>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${info.difficulty <= 3 ? 'bg-emerald-500' :
                            info.difficulty <= 6 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                          <span className="font-mono">{info.difficulty}/10</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-muted-foreground flex items-center gap-1">
                          <GiCompass className="w-3 h-3" />
                          Status:
                        </span>
                        <span className="capitalize font-medium">
                          {location.status === 'explored' ? 'Explored' : 'Unknown Territory'}


                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-muted-foreground flex items-center gap-1">
                          <GiTreasureMap className="w-3 h-3" />
                          Theme:
                        </span>
                        <span className="capitalize font-medium">{location.theme.name}</span>
                      </div>
                    </div>

                    {/* Action Indicators */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                        <GiCastle className="w-3 h-3" />
                        <span>Market</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                        <GiMineWagon className="w-3 h-3" />
                        <span>Mining</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                        <GiChatBubble className="w-3 h-3" />
                        <span>Chat</span>
                      </div>
                    </div>

                    {/* Travel Button */}
                    {onTravel && (
                      <div className="mt-3 pt-3 border-t">
                        <Button
                          onClick={() => {
                            // Use the original logic: find location by region name from locations prop
                            const loc = mapStyling.getLocation(selectedRegion)
                            if (loc && onTravel && locations) {
                              const foundLocation = locations.find(l =>
                                l.name.toLowerCase() === loc.name.toLowerCase()
                              )
                              if (foundLocation) {
                                onTravel(foundLocation.id)
                              }
                            }
                          }}
                          disabled={(() => {
                            const loc = mapStyling.getLocation(selectedRegion)
                            return loc ? isPlayerAtLocation(selectedRegion) : true
                          })()}
                          className="w-full"
                          variant={isPlayerAtLocation(selectedRegion) ? "secondary" : "default"}
                          size="sm"
                        >
                          <GiPositionMarker className="w-4 h-4 mr-2" />
                          {isPlayerAtLocation(selectedRegion) ? "You are here" : `Travel to ${info.name}`}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-muted/20 rounded-md border border-dashed">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <GiCompass className="w-4 h-4" />
                        <span className="font-medium">Uncharted Territory</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This region has not yet been explored or documented. Future expeditions may reveal new locations, resources, or mysteries.
                      </p>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Path ID:</span>
                        <code className="bg-muted px-1 rounded">{selectedRegion}</code>
                      </div>
                      <div className="text-xs opacity-75">
                        Future development planned
                      </div>
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      <EarthSVG
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        onClick={handleClick}
        getPathStyling={(pathId) => mapStyling.getPathClasses(pathId)}
        getPathAttributes={(pathId) => mapStyling.getPathAttributes(pathId)}
      />
    </div>
  )
}
