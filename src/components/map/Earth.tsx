// components/Earth.tsx - Enhanced with zoom and pan functionality
import { useState, useCallback, useMemo, useRef, useEffect } from "react"
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

// Configuration constants
const ZOOM_CONFIG = {
  min: 0.5,
  max: 4,
  step: 0.1,
  wheelSensitivity: 0.001,
  doubleTapZoom: 2,
  transition: 'transform 0.2s ease-out'
}

// Viewport configuration
const VIEWPORT = {
  maxWidth: '500px',
  aspectRatio: '3/4', // Portrait ratio that works well for the SVG
  minHeight: '400px'
}

// Helper function to get distance between two touch points
const getTouchDistance = (touches: TouchList): number => {
  if (touches.length < 2) return 0
  const touch1 = touches[0]
  const touch2 = touches[1]
  return Math.sqrt(
    Math.pow(touch2.clientX - touch1.clientX, 2) +
    Math.pow(touch2.clientY - touch1.clientY, 2)
  )
}

// Helper function to get center point of two touches
const getTouchCenter = (touches: TouchList): { x: number; y: number } => {
  if (touches.length < 2) return { x: 0, y: 0 }
  const touch1 = touches[0]
  const touch2 = touches[1]
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  }
}

export default function Earth({
  locations,
  character,
  onRegionClick,
  onTravel
}: EarthProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<HTMLDivElement>(null)

  // Map interaction state
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [travelValidation, setTravelValidation] = useState<TravelValidation | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Zoom and pan state
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Touch handling state
  const [lastTouchDistance, setLastTouchDistance] = useState(0)
  const [lastTouchCenter, setLastTouchCenter] = useState({ x: 0, y: 0 })
  const [lastTapTime, setLastTapTime] = useState(0)

  // Drag state
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 })
  const [hasDragged, setHasDragged] = useState(false)

  // Create styling manager with database locations
  const mapStyling = useMemo(() => {
    return createMapStyling(locations, character?.currentLocation?.id)
  }, [locations, character?.currentLocation?.id])

  // Clamp zoom within bounds
  const clampZoom = useCallback((newZoom: number): number => {
    return Math.max(ZOOM_CONFIG.min, Math.min(ZOOM_CONFIG.max, newZoom))
  }, [])

  // Calculate pan boundaries based on current zoom
  const getPanBounds = useCallback((currentZoom: number) => {
    if (!containerRef.current) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }

    const containerRect = containerRef.current.getBoundingClientRect()
    const scaledWidth = containerRect.width * currentZoom
    const scaledHeight = containerRect.height * currentZoom

    const maxPanX = Math.max(0, (scaledWidth - containerRect.width) / 2)
    const maxPanY = Math.max(0, (scaledHeight - containerRect.height) / 2)

    return {
      minX: -maxPanX,
      maxX: maxPanX,
      minY: -maxPanY,
      maxY: maxPanY
    }
  }, [])

  // Clamp pan within bounds
  const clampPan = useCallback((newPanX: number, newPanY: number, currentZoom: number) => {
    const bounds = getPanBounds(currentZoom)
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, newPanX)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, newPanY))
    }
  }, [getPanBounds])

  // Reset zoom and pan to default
  const resetView = useCallback(() => {
    setIsTransitioning(true)
    setZoom(1)
    setPanX(0)
    setPanY(0)
    setTimeout(() => setIsTransitioning(false), 200)
  }, [])

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation() // Stop all other listeners

    const delta = -e.deltaY * ZOOM_CONFIG.wheelSensitivity
    const newZoom = clampZoom(zoom + delta)

    if (newZoom !== zoom) {
      // Zoom towards mouse cursor
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const mouseX = e.clientX - rect.left - rect.width / 2
        const mouseY = e.clientY - rect.top - rect.height / 2

        const zoomRatio = newZoom / zoom
        const newPanX = mouseX * (1 - zoomRatio) + panX * zoomRatio
        const newPanY = mouseY * (1 - zoomRatio) + panY * zoomRatio

        const clampedPan = clampPan(newPanX, newPanY, newZoom)

        setZoom(newZoom)
        setPanX(clampedPan.x)
        setPanY(clampedPan.y)
      }
    }

    return false // Extra insurance
  }, [zoom, panX, panY, clampZoom, clampPan])

  // Handle mouse drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left mouse button

    // Close modal immediately on any mouse down
    if (selectedRegion) {
      setSelectedRegion(null)
      setTravelValidation(null)
    }

    // Clear tooltip when starting to drag
    setHoveredRegion(null)

    setIsDragging(true)
    setHasDragged(false) // Reset drag flag
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      panX,
      panY
    })
  }, [panX, panY, selectedRegion])

  // Handle mouse drag
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    // If we've moved more than a few pixels, consider it a drag
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      setHasDragged(true)
    }

    const newPanX = dragStart.panX + deltaX
    const newPanY = dragStart.panY + deltaY

    const clampedPan = clampPan(newPanX, newPanY, zoom)
    setPanX(clampedPan.x)
    setPanY(clampedPan.y)
  }, [isDragging, dragStart, zoom, clampPan])

  // Handle mouse drag end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()

    // Clear tooltip on touch
    setHoveredRegion(null)

    if (e.touches.length === 1) {
      // Single touch - check for double tap or start drag
      const now = Date.now()
      const touch = e.touches[0]

      if (now - lastTapTime < 300) {
        // Double tap - zoom in/out
        const newZoom = zoom < 2 ? ZOOM_CONFIG.doubleTapZoom : 1
        setIsTransitioning(true)
        setZoom(newZoom)
        if (newZoom === 1) {
          setPanX(0)
          setPanY(0)
        }
        setTimeout(() => setIsTransitioning(false), 200)
      } else {
        // Start drag
        setIsDragging(true)
        setHasDragged(false)
        setDragStart({
          x: touch.clientX,
          y: touch.clientY,
          panX,
          panY
        })
      }

      setLastTapTime(now)
    } else if (e.touches.length === 2) {
      // Pinch start
      setIsDragging(false)
      const distance = getTouchDistance(e.touches)
      const center = getTouchCenter(e.touches)
      setLastTouchDistance(distance)
      setLastTouchCenter(center)
    }
  }, [zoom, panX, panY, lastTapTime])

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 1 && isDragging) {
      // Single touch drag
      const touch = e.touches[0]
      const deltaX = touch.clientX - dragStart.x
      const deltaY = touch.clientY - dragStart.y

      const newPanX = dragStart.panX + deltaX
      const newPanY = dragStart.panY + deltaY

      const clampedPan = clampPan(newPanX, newPanY, zoom)
      setPanX(clampedPan.x)
      setPanY(clampedPan.y)
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const distance = getTouchDistance(e.touches)
      const center = getTouchCenter(e.touches)

      if (lastTouchDistance > 0) {
        const zoomDelta = (distance - lastTouchDistance) * 0.01
        const newZoom = clampZoom(zoom + zoomDelta)

        if (newZoom !== zoom) {
          // Zoom towards pinch center
          const rect = containerRef.current?.getBoundingClientRect()
          if (rect) {
            const centerX = center.x - rect.left - rect.width / 2
            const centerY = center.y - rect.top - rect.height / 2

            const zoomRatio = newZoom / zoom
            const newPanX = centerX * (1 - zoomRatio) + panX * zoomRatio
            const newPanY = centerY * (1 - zoomRatio) + panY * zoomRatio

            const clampedPan = clampPan(newPanX, newPanY, newZoom)

            setZoom(newZoom)
            setPanX(clampedPan.x)
            setPanY(clampedPan.y)
          }
        }
      }

      setLastTouchDistance(distance)
      setLastTouchCenter(center)
    }
  }, [isDragging, dragStart, zoom, panX, panY, lastTouchDistance, clampZoom, clampPan])

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false)
      setLastTouchDistance(0)
    } else if (e.touches.length === 1) {
      setLastTouchDistance(0)
    }
  }, [])

  // Original hover/click handlers
  const handleMouseOver = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Don't show tooltip while dragging
    if (isDragging) return

    const target = e.target as SVGPathElement
    if (target.tagName === "path" && target.id) {
      setHoveredRegion(target.id)
      // Update mouse position for tooltip positioning
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
      }
    }
  }, [isDragging])

  const handleMouseOut = useCallback(() => {
    setHoveredRegion(null)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Don't handle clicks if we were dragging
    if (isDragging || hasDragged) return

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
  }, [selectedRegion, mapStyling, onRegionClick, character, isDragging, hasDragged])

  // Adapter function to match EarthSVG's expected interface
  const getPathAttributesForSVG = useCallback((pathId: string) => {
    const location = mapStyling.getLocationBySvgPath(pathId)
    const dataAttributes = mapStyling.getPathAttributes(pathId)

    return {
      fillOpacity: location?.isExplored === false ? 0.6 : 1,
      style: {
        ...dataAttributes,
      } as React.CSSProperties,
    }
  }, [mapStyling])

  // Apply zoom controls when zoom changes
  useEffect(() => {
    if (zoom <= 1.1) {
      // Reset pan when zoom is close to 1
      const clampedPan = clampPan(panX, panY, zoom)
      if (clampedPan.x !== panX || clampedPan.y !== panY) {
        setPanX(clampedPan.x)
        setPanY(clampedPan.y)
      }
    }
  }, [zoom, panX, panY, clampPan])

  // Add native wheel event listener to capture trackpad scrolls
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleNativeWheel = (e: WheelEvent) => {
      // Block ALL wheel events on this container
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      // Handle zoom manually
      const delta = -e.deltaY * ZOOM_CONFIG.wheelSensitivity
      const newZoom = Math.max(ZOOM_CONFIG.min, Math.min(ZOOM_CONFIG.max, zoom + delta))

      if (newZoom !== zoom) {
        const rect = container.getBoundingClientRect()
        const mouseX = e.clientX - rect.left - rect.width / 2
        const mouseY = e.clientY - rect.top - rect.height / 2

        const zoomRatio = newZoom / zoom
        const newPanX = mouseX * (1 - zoomRatio) + panX * zoomRatio
        const newPanY = mouseY * (1 - zoomRatio) + panY * zoomRatio

        const bounds = getPanBounds(newZoom)
        const clampedPanX = Math.max(bounds.minX, Math.min(bounds.maxX, newPanX))
        const clampedPanY = Math.max(bounds.minY, Math.min(bounds.maxY, newPanY))

        setZoom(newZoom)
        setPanX(clampedPanX)
        setPanY(clampedPanY)
      }

      return false
    }

    // Add passive: false to ensure preventDefault works
    container.addEventListener('wheel', handleNativeWheel, { passive: false, capture: true })

    return () => {
      container.removeEventListener('wheel', handleNativeWheel, { capture: true })
    }
  }, [zoom, panX, panY, getPanBounds])

  const transformStyle = {
    transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
    transition: isTransitioning ? ZOOM_CONFIG.transition : 'none',
    transformOrigin: 'center center',
    cursor: isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default'
  }

  // Smart tooltip positioning - avoid the top-left dead zone
  const getTooltipPosition = () => {
    const isInTopLeft = mousePosition.x < 200 && mousePosition.y < 100
    return isInTopLeft ? 'top-4 right-4' : 'top-4 left-16'
  }

  return (
    <div className="w-full flex items-center justify-center relative">
      {/* Responsive Viewport Container */}
      <div
        className="relative w-full bg-background border rounded-lg overflow-hidden"
        style={{
          maxWidth: VIEWPORT.maxWidth,
          aspectRatio: VIEWPORT.aspectRatio,
          minHeight: VIEWPORT.minHeight
        }}
      >
        {/* Zoom Controls */}
        <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newZoom = clampZoom(zoom + 0.5)
              setZoom(newZoom)
            }}
            disabled={zoom >= ZOOM_CONFIG.max}
            className="w-8 h-8 p-0"
          >
            +
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newZoom = clampZoom(zoom - 0.5)
              setZoom(newZoom)
              if (newZoom <= 1.1) {
                setPanX(0)
                setPanY(0)
              }
            }}
            disabled={zoom <= ZOOM_CONFIG.min}
            className="w-8 h-8 p-0"
          >
            −
          </Button>
          {(zoom !== 1 || panX !== 0 || panY !== 0) && (
            <Button
              size="sm"
              variant="outline"
              onClick={resetView}
              className="w-8 h-8 p-0 text-xs"
            >
              ⌂
            </Button>
          )}
        </div>

        {/* Zoom Level Indicator */}
        {zoom !== 1 && (
          <div className="absolute top-4 right-4 z-50 bg-card/95 backdrop-blur-sm text-card-foreground px-2 py-1 rounded text-xs border">
            {Math.round(zoom * 100)}%
          </div>
        )}

        {/* Hover Tooltip */}
        {hoveredRegion && (
          <div className={`absolute ${getTooltipPosition()} bg-card/95 backdrop-blur-sm text-card-foreground px-3 py-2 rounded-lg shadow-lg border z-40 max-w-xs animate-in fade-in-0 slide-in-from-top-1 duration-200`}>
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
          <div className="absolute top-36 right-4 bg-card/95 backdrop-blur-sm text-card-foreground p-4 rounded-lg shadow-lg border max-w-sm z-40 animate-in fade-in-0 slide-in-from-left-1 duration-300">
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

        {/* Map Container */}
        <div
          ref={containerRef}
          className="w-full h-full relative overflow-hidden select-none"
          style={{
            touchAction: 'none',
            outline: 'none',
            overscrollBehavior: 'none' // Prevent overscroll on trackpads
          }}
          onWheel={(e) => {
            // This is just a backup - the native listener should handle it
            e.preventDefault()
            e.stopPropagation()
          }}
          onScroll={(e) => {
            // Block any scroll events that slip through
            e.preventDefault()
            e.stopPropagation()
            return false
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div ref={svgRef} style={transformStyle}>
            <EarthSVG
              onMouseOver={handleMouseOver}
              onMouseOut={handleMouseOut}
              onClick={handleClick}
              getPathStyling={(pathId) => mapStyling.getPathClasses(pathId)}
              getPathAttributes={getPathAttributesForSVG}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
