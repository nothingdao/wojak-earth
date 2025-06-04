// components/Earth.tsx - Fixed to work with EarthSVG's expected interface
import { useState, useCallback, useMemo } from "react"
import {
  GiCrossedSwords,
  GiTreasureMap,
  GiMineWagon,
  GiChatBubble,
  GiCastle,
  GiCompass,
  GiPositionMarker,
  GiCrossMark,
  GiLockedBox,
  GiCoins
} from "react-icons/gi"
import { EarthSVG } from "./EarthSVG"
import { createMapStyling } from "./themes/DatabaseMapStyling"
import type { DatabaseLocation, Character, TravelValidation } from "@/types"
import { Button } from "@/components/ui/button"

interface EarthProps {
  locations: DatabaseLocation[]
  character?: Character
  onRegionClick?: (locationId: string) => void
  onTravel?: (locationId: string) => void
}

export default function Earth({
  locations,
  character,
  onRegionClick,
  onTravel
}: EarthProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [travelValidation, setTravelValidation] = useState<TravelValidation | null>(null)

  // Create styling manager with database locations
  const mapStyling = useMemo(() => {
    return createMapStyling(locations, character?.currentLocation?.id)
  }, [locations, character?.currentLocation?.id])

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

      if (newSelection) {
        const location = mapStyling.getLocationBySvgPath(target.id)
        if (location && onRegionClick) {
          onRegionClick(location.id)
        }

        // Validate travel when selecting a region
        if (character && location) {
          const validation = mapStyling.validateTravel(target.id, character)
          setTravelValidation(validation)
        }
      } else {
        setTravelValidation(null)
      }
    }
  }, [selectedRegion, mapStyling, onRegionClick, character])

  // Adapter function to match EarthSVG's expected interface
  const getPathAttributesForSVG = useCallback((pathId: string) => {
    const location = mapStyling.getLocationBySvgPath(pathId)
    const dataAttributes = mapStyling.getPathAttributes(pathId)

    // Return the format EarthSVG expects
    return {
      fillOpacity: location?.isExplored === false ? 0.6 : 1,
      style: {
        // Add any CSS properties here if needed
        ...dataAttributes, // This includes all the data-* attributes
      } as React.CSSProperties,
    }
  }, [mapStyling])

  return (
    <div className="w-full h-auto flex items-center justify-center relative">
      {/* Hover Tooltip */}
      {hoveredRegion && (
        <div className="absolute top-4 right-4 bg-card/95 backdrop-blur-sm text-card-foreground px-3 py-2 rounded-lg shadow-lg border z-50 max-w-xs animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {(() => {
            const location = mapStyling.getLocationBySvgPath(hoveredRegion)
            const info = mapStyling.getLocationInfo(hoveredRegion)

            if (!location || !info) {
              return (
                <>
                  <div className="font-medium text-sm">Unknown Territory</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    This region awaits discovery...
                  </div>
                </>
              )
            }

            return (
              <>
                <div className="font-medium text-sm">{info.name}</div>
                <div className="text-xs text-primary mt-1 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <GiTreasureMap className="w-3 h-3" />
                    <span>{location.isExplored ? 'Explored' : 'Unknown'}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>Level {info.difficulty}</span>
                  </div>

                  {mapStyling.isPlayerHere(hoveredRegion) && (
                    <div className="text-emerald-600 font-medium text-xs flex items-center gap-1">
                      <GiPositionMarker className="w-3 h-3 animate-pulse" />
                      You are here
                    </div>
                  )}

                  {/* Show restrictions */}
                  {!location.hasTravel && (
                    <div className="text-red-500 text-xs flex items-center gap-1">
                      <GiLockedBox className="w-3 h-3" />
                      Travel disabled
                    </div>
                  )}

                  {location.minLevel && character && character.level < location.minLevel && (
                    <div className="text-yellow-500 text-xs flex items-center gap-1">
                      <GiCrossedSwords className="w-3 h-3" />
                      Requires level {location.minLevel}
                    </div>
                  )}

                  {location.entryCost && (
                    <div className="text-blue-500 text-xs flex items-center gap-1">
                      <GiCoins className="w-3 h-3" />
                      Costs {location.entryCost} coins
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground mt-2 border-t pt-1">
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
            const location = mapStyling.getLocationBySvgPath(selectedRegion)
            const info = mapStyling.getLocationInfo(selectedRegion)

            if (!location || !info) {
              return (
                <div className="space-y-3">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">Unknown Territory</h3>
                    <button
                      onClick={() => setSelectedRegion(null)}
                      className="text-muted-foreground hover:text-card-foreground transition-colors p-1 hover:bg-muted rounded"
                    >
                      <GiCrossMark className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3 bg-muted/20 rounded-md border border-dashed">
                    <p className="text-xs text-muted-foreground">
                      This region has not yet been explored or documented.
                    </p>
                  </div>
                </div>
              )
            }

            return (
              <>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{info.name}</h3>
                  <button
                    onClick={() => setSelectedRegion(null)}
                    className="text-muted-foreground hover:text-card-foreground transition-colors p-1 hover:bg-muted rounded"
                  >
                    <GiCrossMark className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  {info.description}
                </p>

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
                      {location.isExplored ? 'Explored' : 'Unexplored'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground flex items-center gap-1">
                      <GiTreasureMap className="w-3 h-3" />
                      Biome:
                    </span>
                    <span className="capitalize font-medium">{location.biome}</span>
                  </div>

                  {location.minLevel && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">Min Level:</span>
                      <span className="font-medium">{location.minLevel}</span>
                    </div>
                  )}

                  {location.entryCost && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">Entry Cost:</span>
                      <span className="font-medium">{location.entryCost} coins</span>
                    </div>
                  )}
                </div>

                {/* Feature Indicators */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {location.hasMarket && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                      <GiCastle className="w-3 h-3" />
                      <span>Market</span>
                    </div>
                  )}
                  {location.hasMining && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                      <GiMineWagon className="w-3 h-3" />
                      <span>Mining</span>
                    </div>
                  )}
                  {location.hasChat && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                      <GiChatBubble className="w-3 h-3" />
                      <span>Chat</span>
                    </div>
                  )}
                </div>

                {/* Travel Button */}
                {onTravel && character && (
                  <div className="mt-3 pt-3 border-t">
                    <Button
                      onClick={() => {
                        if (travelValidation?.allowed) {
                          onTravel(location.id)
                        }
                      }}
                      disabled={!travelValidation?.allowed}
                      className="w-full"
                      variant={mapStyling.isPlayerHere(selectedRegion) ? "secondary" : "default"}
                      size="sm"
                    >
                      <GiPositionMarker className="w-4 h-4 mr-2" />
                      {mapStyling.isPlayerHere(selectedRegion)
                        ? "You are here"
                        : travelValidation?.allowed
                          ? `Travel to ${info.name}${travelValidation.cost ? ` (${travelValidation.cost} coins)` : ''}`
                          : travelValidation?.reason || "Cannot travel"
                      }
                    </Button>
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
        getPathAttributes={getPathAttributesForSVG}
      />
    </div>
  )
}
