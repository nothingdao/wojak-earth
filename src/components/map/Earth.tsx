import { useState, useCallback, useRef } from "react"
import { Badge, X } from "lucide-react"
import { baseSVGData } from "../../data/baseMapSVG"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Separator } from "@radix-ui/react-dropdown-menu"

interface DatabaseLocation {
  id: string
  name: string
  description: string
  biome?: string
  difficulty: number
  minLevel?: number
  hasMarket: boolean
  hasMining: boolean
  hasTravel: boolean
  hasChat: boolean
  svgpathid?: string | null
  theme?: string
  isExplored?: boolean
  playerCount: number
  entryCost?: number
  locationType: string
  parentLocationId?: string | null
  createdAt: string
  updatedAt: string
}

interface Character {
  id: string
  name: string
  level: number
  coins?: number
  currentLocation?: {
    id: string
    name: string
  }
}

interface EarthProps {
  locations: DatabaseLocation[]
  character?: Character
  onTravel?: (locationId: string) => void
}

export default function Earth({ locations, character, onTravel }: EarthProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, translateX: 0, translateY: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  // Create lookup map for quick location finding
  const locationMap = useCallback(() => {
    const map = new Map<string, DatabaseLocation>()
    locations.forEach(loc => {
      if (loc.svgpathid) {
        map.set(loc.svgpathid, loc)
      }
    })
    return map
  }, [locations])

  const locationLookup = locationMap()

  const getLocation = useCallback((pathId: string) => {
    return locationLookup.get(pathId)
  }, [locationLookup])

  // Pan and zoom handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      translateX: transform.translateX,
      translateY: transform.translateY
    })
  }, [transform])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y
    setTransform(prev => ({
      ...prev,
      translateX: dragStart.translateX + deltaX,
      translateY: dragStart.translateY + deltaY
    }))
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(1.2, Math.min(5, transform.scale * delta))
    setTransform(prev => ({ ...prev, scale: newScale }))
  }, [transform.scale])

  const resetView = useCallback(() => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 })
  }, [])

  // Path styling function
  const getPathStyle = useCallback((pathId: string) => {
    const location = getLocation(pathId)
    const isSelected = pathId === selectedPath
    const isHovered = pathId === hoveredPath
    const isPlayerHere = location && character?.currentLocation?.id === location.id

    let fill = '#6b7280' // Default gray
    let stroke = '#4b5563'
    let strokeWidth = '0'
    let opacity = '0.6'

    if (location) {
      // Color by biome - slightly adjusted for better dark mode visibility
      switch (location.biome) {
        case 'forest': fill = '#10b981'; break
        case 'desert': fill = '#f59e0b'; break
        case 'urban': fill = '#3b82f6'; break
        case 'plains': fill = '#22c55e'; break
        case 'mountain': fill = '#8b5cf6'; break
        case 'water': fill = '#06b6d4'; break
        case 'swamp': fill = '#84cc16'; break
        case 'tundra': fill = '#64748b'; break
        default: fill = '#6b7280'
      }
      opacity = '0.8'
    }

    if (isSelected) {
      fill = '#3b82f6'
      stroke = '#1d4ed8'
      strokeWidth = '3'
      opacity = '1'
    } else if (isPlayerHere) {
      stroke = '#10b981'
      strokeWidth = '3'
      opacity = '1'
    } else if (isHovered) {
      opacity = '0.9'
      strokeWidth = '2'
    }

    return {
      fill,
      stroke,
      strokeWidth,
      opacity,
      cursor: 'pointer'
    }
  }, [getLocation, selectedPath, hoveredPath, character])

  // Handle path clicks
  const handlePathClick = useCallback((pathId: string) => {
    if (isDragging) return
    setSelectedPath(selectedPath === pathId ? null : pathId)
  }, [selectedPath, isDragging])

  const selectedLocation = selectedPath ? getLocation(selectedPath) : null

  return (
    <div className="w-full h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-900 overflow-hidden">

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-2">
        <button
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(5, prev.scale * 1.2) }))}
          className="w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-gray-100"
        >
          +
        </button>
        <button
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(0.1, prev.scale * 0.8) }))}
          className="w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-gray-100"
        >
          −
        </button>
        <button
          onClick={resetView}
          className="w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center text-xs text-gray-900 dark:text-gray-100"
        >
          ⌂
        </button>
      </div>

      {/* SVG Map */}
      <div
        className="w-full h-full select-none overflow-hidden"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          transform: `scale(${transform.scale}) translate(${transform.translateX}px, ${transform.translateY}px)`,
          transformOrigin: 'center center',
          background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.4) 80%), rgba(0,0,0,0.4)',
          backgroundColor: 'rgba(0,0,0,0.4)'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          viewBox={baseSVGData.viewBox}
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {baseSVGData.paths.map((path) => {
            const style = getPathStyle(path.id)
            return (
              <path
                key={path.id}
                id={path.id}
                d={path.d}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                opacity={style.opacity}
                style={{ cursor: style.cursor }}
                onClick={() => handlePathClick(path.id)}
                onMouseEnter={() => setHoveredPath(path.id)}
                onMouseLeave={() => setHoveredPath(null)}
              />
            )
          })}
        </svg>
      </div>

      {/* Hover tooltip */}
      {hoveredPath && (
        <div className="absolute top-4 left-4 bg-white/95 dark:bg-gray-800/95 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-40">
          {(() => {
            const location = getLocation(hoveredPath)
            if (!location) {
              return <div className="text-sm text-gray-900 dark:text-gray-100">Unknown: {hoveredPath}</div>
            }
            return (
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{location.name}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {location.biome} • Level {location.difficulty}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Selected location modal */}
      {selectedLocation && (
        <div className="absolute top-20 left-4 bg-card/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border max-w-sm z-40">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-card-foreground">{selectedLocation.name}</h3>
            <button
              onClick={() => setSelectedPath(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-3">{selectedLocation.description}</p>

          <div className="text-xs mb-3 space-y-1 text-muted-foreground">
            <div>Biome: {selectedLocation.biome || 'Unknown'}</div>
            <div>Difficulty: {selectedLocation.difficulty}</div>
            <div>Type: {selectedLocation.locationType}</div>
            {selectedLocation.minLevel && (
              <div className={`${character && character.level < selectedLocation.minLevel ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                Min Level: {selectedLocation.minLevel}
                {character && character.level < selectedLocation.minLevel && ' ⚠️'}
              </div>
            )}
            {selectedLocation.entryCost && selectedLocation.entryCost > 0 && (
              <div className={`${character && (character.coins || 0) < selectedLocation.entryCost ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                Cost: {selectedLocation.entryCost} coins
                {character && (character.coins || 0) < selectedLocation.entryCost && ' ⚠️'}
              </div>
            )}
            {selectedLocation.hasMarket && <div>• Has Market</div>}
            {selectedLocation.hasMining && <div>• Has Mining</div>}
            {selectedLocation.hasChat && <div>• Has Chat</div>}
            <div>Players: {selectedLocation.playerCount}</div>
          </div>

          {onTravel && character && (
            <button
              onClick={() => {
                onTravel(selectedLocation.id)
                setSelectedPath(null)
              }}
              disabled={
                character.currentLocation?.id === selectedLocation.id ||
                (selectedLocation.minLevel && character.level < selectedLocation.minLevel) ||
                (selectedLocation.entryCost && selectedLocation.entryCost > (character.coins || 0))
              }
              className={`w-full py-2 px-3 rounded text-sm transition-colors ${character.currentLocation?.id === selectedLocation.id
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : (selectedLocation.minLevel && character.level < selectedLocation.minLevel) ||
                  (selectedLocation.entryCost && selectedLocation.entryCost > (character.coins || 0))
                  ? 'bg-destructive/10 text-destructive cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
            >
              {character.currentLocation?.id === selectedLocation.id
                ? 'You are here'
                : (selectedLocation.minLevel && character.level < selectedLocation.minLevel)
                  ? `Requires Level ${selectedLocation.minLevel} (You're ${character.level})`
                  : (selectedLocation.entryCost && selectedLocation.entryCost > (character.coins || 0))
                    ? `Need ${selectedLocation.entryCost} coins (You have ${character.coins || 0})`
                    : `Travel to ${selectedLocation.name}`}
            </button>
          )}
        </div>
      )}

      {/* Scale indicator */}
      {transform.scale !== 1 && (
        <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
          {Math.round(transform.scale * 100)}%
        </div>
      )}

      {/* Debug info */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
        Selected: {selectedPath || 'none'} | Locations: {locations.length} | Mapped: {locationLookup.size}
      </div>
    </div>
  )
}
