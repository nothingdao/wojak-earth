// src/components/map/Earth.tsx
import { useState, useCallback, useRef } from "react"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { baseSVGData } from "../../data/baseMapSVG"
import {
  X,
  Plus,
  Minus,
  Home,
  Database,
  Activity,
  Zap,
  DollarSign,
  Users,
  Shield,
  Pickaxe,
  MessageSquare,
  Store,
  Signal,
  Eye,
  Navigation,
  AlertTriangle
} from 'lucide-react'

import type { Tables } from '@/types'
type Character = Tables<'characters'>

interface DatabaseLocation {
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

interface EarthProps {
  locations: DatabaseLocation[]
  character?: Character
  onTravel?: (location_id: string) => void
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
      if (loc.svg_path_id) {
        map.set(loc.svg_path_id, loc)
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

    // Disable panning when at initial zoom level
    if (transform.scale <= 1) return

    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      translateX: transform.translateX,
      translateY: transform.translateY
    })
  }, [transform])

  // calculate pan boundaries
  const calculatePanBounds = useCallback((scale: number) => {
    if (!svgRef.current) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }

    const container = svgRef.current.parentElement
    if (!container) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Calculate how much the scaled content exceeds the container
    const scaledWidth = containerWidth * scale
    const scaledHeight = containerHeight * scale

    // Maximum translation is half the difference between scaled and container size
    const maxTranslateX = Math.max(0, (scaledWidth - containerWidth) / 2)
    const maxTranslateY = Math.max(0, (scaledHeight - containerHeight) / 2)

    return {
      minX: -maxTranslateX,
      maxX: maxTranslateX,
      minY: -maxTranslateY,
      maxY: maxTranslateY
    }
  }, [])

  // Helper function to constrain translation values
  const constrainTranslation = useCallback((translateX: number, translateY: number, scale: number) => {
    const bounds = calculatePanBounds(scale)

    return {
      translateX: Math.max(bounds.minX, Math.min(bounds.maxX, translateX)),
      translateY: Math.max(bounds.minY, Math.min(bounds.maxY, translateY))
    }
  }, [calculatePanBounds])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    const newTranslateX = dragStart.translateX + deltaX
    const newTranslateY = dragStart.translateY + deltaY

    // Apply constraints
    const constrained = constrainTranslation(newTranslateX, newTranslateY, transform.scale)

    setTransform(prev => ({
      ...prev,
      translateX: constrained.translateX,
      translateY: constrained.translateY
    }))
  }, [isDragging, dragStart, transform.scale, constrainTranslation])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(1.2, Math.min(5, transform.scale * delta))

    // Constrain translation for the new scale
    const constrained = constrainTranslation(transform.translateX, transform.translateY, newScale)

    setTransform(() => ({
      scale: newScale,
      translateX: constrained.translateX,
      translateY: constrained.translateY
    }))
  }, [transform, constrainTranslation])

  const resetView = useCallback(() => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 })
  }, [])

  // Get biome color from CSS custom properties
  const getBiomeColor = useCallback((biome?: string) => {
    const style = getComputedStyle(document.documentElement)

    switch (biome) {
      case 'forest': return style.getPropertyValue('--map-forest').trim()
      case 'desert': return style.getPropertyValue('--map-desert').trim()
      case 'urban': return style.getPropertyValue('--map-urban').trim()
      case 'plains': return style.getPropertyValue('--map-plains').trim()
      case 'mountain': return style.getPropertyValue('--map-mountain').trim()
      case 'water': return style.getPropertyValue('--map-water').trim()
      case 'swamp': return style.getPropertyValue('--map-swamp').trim()
      case 'tundra': return style.getPropertyValue('--map-tundra').trim()
      default: return style.getPropertyValue('--map-default').trim()
    }
  }, [])

  // Path styling function using computed colors that work in SVG
  const getPathStyle = useCallback((pathId: string) => {
    const location = getLocation(pathId)
    const isSelected = pathId === selectedPath
    const isHovered = pathId === hoveredPath
    const isPlayerHere = location && character?.current_location_id === location.id

    // Get computed colors from CSS custom properties
    const style = getComputedStyle(document.documentElement)
    const isDark = document.documentElement.classList.contains('dark')

    let fill = isDark ? '#374151' : '#9ca3af' // Default gray
    let stroke = isDark ? '#4b5563' : '#d1d5db' // Border gray
    let strokeWidth = '0.5'
    let opacity = '0.8'

    if (location) {
      fill = getBiomeColor(location.biome)
      opacity = '0.9'
      strokeWidth = '0.5'
      stroke = isDark ? '#6b7280' : '#9ca3af'
    }

    if (isSelected) {
      fill = isDark ? '#3b82f6' : '#2563eb' // Blue
      stroke = isDark ? '#ffffff' : '#1e40af'
      strokeWidth = '2'
      opacity = '1'
    } else if (isPlayerHere) {
      stroke = '#22c55e' // Green for current location
      strokeWidth = '3'
      opacity = '1'
    } else if (isHovered) {
      opacity = '1'
      strokeWidth = '1.5'
      stroke = isDark ? '#60a5fa' : '#3b82f6' // Light blue
    }

    return {
      fill,
      stroke,
      strokeWidth,
      opacity,
      cursor: 'pointer'
    }
  }, [getLocation, selectedPath, hoveredPath, character, getBiomeColor])

  // Handle path clicks
  const handlePathClick = useCallback((pathId: string) => {
    if (isDragging) return
    setSelectedPath(selectedPath === pathId ? null : pathId)
  }, [selectedPath, isDragging])

  const selectedLocation = selectedPath ? getLocation(selectedPath) : null

  return (
    <div className="w-full h-[calc(100vh-64px)] bg-background overflow-hidden font-mono relative">
      {/* Terminal Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-sm">GLOBAL_MAP_INTERFACE v2.089</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="font-mono">
              <Signal className="w-3 h-3 mr-1" />
              TRACKING_{locations.length}_ZONES
            </Badge>
            <Activity className="w-3 h-3 animate-pulse text-chart-2" />
            <span className="text-chart-2">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Terminal Control Panel */}
      <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-2">
        <div className="bg-background/95 border border-border rounded p-2">
          <div className="text-xs text-muted-foreground mb-2 font-mono">ZOOM_CONTROLS</div>
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const newScale = Math.min(5, transform.scale * 1.2)
                const constrained = constrainTranslation(transform.translateX, transform.translateY, newScale)
                setTransform(() => ({
                  scale: newScale,
                  translateX: constrained.translateX,
                  translateY: constrained.translateY
                }))
              }}
              className="h-8 w-8 p-0 font-mono"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const newScale = Math.max(0.1, transform.scale * 0.8)
                const constrained = constrainTranslation(transform.translateX, transform.translateY, newScale)
                setTransform(() => ({
                  scale: newScale,
                  translateX: constrained.translateX,
                  translateY: constrained.translateY
                }))
              }}
              className="h-8 w-8 p-0 font-mono"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetView}
              className="h-8 w-8 p-0 font-mono"
            >
              <Home className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Terminal SVG Map Container */}
      <div
        className="w-full h-full select-none overflow-hidden mt-12 bg-gradient-to-br from-background/50 via-muted/10 to-background/50"
        style={{
          cursor: transform.scale <= 1 ? 'default' : (isDragging ? 'grabbing' : 'grab'),
          transform: `scale(${transform.scale}) translate(${transform.translateX}px, ${transform.translateY}px)`,
          transformOrigin: 'center center'
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
          {/* Terminal Grid Background */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke={document.documentElement.classList.contains('dark') ? '#22c55e' : '#16a34a'}
                strokeWidth="0.5"
                opacity="0.2"
              />
            </pattern>
            {/* Add a subtle glow filter for better visibility */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />

          {baseSVGData.paths.map((path) => {
            const style = getPathStyle(path.id)
            const location = getLocation(path.id)
            const isPlayerHere = location && character?.current_location_id === location.id

            return (
              <g key={path.id}>
                <path
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
                {/* Player location indicator */}
                {isPlayerHere && (
                  <circle
                    cx="0" cy="0"
                    r="3"
                    fill="#22c55e"
                    stroke="#ffffff"
                    strokeWidth="1"
                    opacity="1"
                    className="animate-pulse"
                    style={{
                      transform: `translate(${path.id === 'california' ? '100px' : '0px'}, ${path.id === 'california' ? '100px' : '0px'})`
                    }}
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Terminal Hover Display */}
      {hoveredPath && (
        <div className="absolute top-16 left-4 bg-background/95 border border-border px-3 py-2 rounded shadow-lg z-40 font-mono">
          {(() => {
            const location = getLocation(hoveredPath)
            if (!location) {
              return (
                <div className="text-xs text-destructive">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    UNMAPPED_REGION
                  </div>
                  <div className="text-muted-foreground">ID: {hoveredPath}</div>
                </div>
              )
            }
            return (
              <div className="text-xs">
                <div className="font-bold text-primary mb-1">{location.name.toUpperCase()}</div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Badge
                    variant="outline"
                    className="text-xs font-mono px-1 py-0 border-current"
                    style={{
                      backgroundColor: getBiomeColor(location.biome) + '20',
                      borderColor: getBiomeColor(location.biome),
                      color: getBiomeColor(location.biome)
                    }}
                  >
                    {location.biome?.toUpperCase()}
                  </Badge>
                  <span>THREAT_LVL_{location.difficulty}</span>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Terminal Location Analysis Panel */}
      {selectedLocation && (
        <div className="absolute top-16 left-4 bg-background/95 border border-border rounded shadow-lg max-w-sm z-40 font-mono">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-primary font-bold text-sm">ZONE_ANALYSIS</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedPath(null)}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Location Info */}
          <div className="p-3 space-y-3">
            <div>
              <div className="font-bold text-primary text-sm mb-1">{selectedLocation.name.toUpperCase()}</div>
              <div className="text-xs text-muted-foreground">{selectedLocation.description}</div>
            </div>

            {/* Technical Specs */}
            <div className="bg-muted/30 border border-border rounded p-2">
              <div className="text-xs text-muted-foreground mb-2">ZONE_SPECIFICATIONS</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded"
                    style={{ backgroundColor: getBiomeColor(selectedLocation.biome) }}
                  />
                  <span>BIOME: {selectedLocation.biome?.toUpperCase() || 'UNKNOWN'}</span>
                </div>
                <div className="flex items-center gap-1 text-destructive">
                  <Shield className="w-3 h-3" />
                  <span>THREAT: {selectedLocation.difficulty}</span>
                </div>
                <div className="flex items-center gap-1 text-chart-1">
                  <Users className="w-3 h-3" />
                  <span>ACTIVE: {selectedLocation.player_count}</span>
                </div>
                <div className="flex items-center gap-1 text-chart-5">
                  <Database className="w-3 h-3" />
                  <span>TYPE: {selectedLocation.location_type}</span>
                </div>
              </div>
            </div>

            {/* Requirements */}
            {(selectedLocation.min_level || selectedLocation.entry_cost) && (
              <div className="bg-muted/30 border border-border rounded p-2">
                <div className="text-xs text-muted-foreground mb-2">ACCESS_REQUIREMENTS</div>
                <div className="space-y-1 text-xs">
                  {selectedLocation.min_level && (
                    <div className={`flex items-center gap-1 ${character && character.level < selectedLocation.min_level ? 'text-destructive' : 'text-chart-2'
                      }`}>
                      <Zap className="w-3 h-3" />
                      <span>MIN_LEVEL: {selectedLocation.min_level}</span>
                      {character && character.level < selectedLocation.min_level && <AlertTriangle className="w-3 h-3" />}
                    </div>
                  )}
                  {selectedLocation.entry_cost && selectedLocation.entry_cost > 0 && (
                    <div className={`flex items-center gap-1 ${character && (character.coins || 0) < selectedLocation.entry_cost ? 'text-destructive' : 'text-chart-2'
                      }`}>
                      <DollarSign className="w-3 h-3" />
                      <span>ENTRY_FEE: {selectedLocation.entry_cost}_RUST</span>
                      {character && (character.coins || 0) < selectedLocation.entry_cost && <AlertTriangle className="w-3 h-3" />}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Available Services */}
            <div className="bg-muted/30 border border-border rounded p-2">
              <div className="text-xs text-muted-foreground mb-2">AVAILABLE_SERVICES</div>
              <div className="flex flex-wrap gap-1">
                {selectedLocation.has_market && (
                  <Badge variant="secondary" className="text-xs font-mono flex items-center gap-1">
                    <Store className="w-3 h-3" />
                    MARKET
                  </Badge>
                )}
                {selectedLocation.has_mining && (
                  <Badge variant="secondary" className="text-xs font-mono flex items-center gap-1">
                    <Pickaxe className="w-3 h-3" />
                    MINING
                  </Badge>
                )}
                {selectedLocation.has_chat && (
                  <Badge variant="secondary" className="text-xs font-mono flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    COMMS
                  </Badge>
                )}
                {!selectedLocation.has_market && !selectedLocation.has_mining && !selectedLocation.has_chat && (
                  <span className="text-xs text-muted-foreground">NO_SERVICES_AVAILABLE</span>
                )}
              </div>
            </div>

            {/* Travel Action */}
            {onTravel && character && (
              <Button
                onClick={() => {
                  onTravel(selectedLocation.id)
                  setSelectedPath(null)
                }}
                disabled={
                  character.current_location_id === selectedLocation.id ||
                  (!!selectedLocation.min_level && character.level < selectedLocation.min_level) ||
                  (!!selectedLocation.entry_cost && selectedLocation.entry_cost > (character.coins || 0))
                }
                className={`w-full h-8 text-xs font-mono ${character.current_location_id === selectedLocation.id
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : (!!selectedLocation.min_level && character.level < selectedLocation.min_level) ||
                    (!!selectedLocation.entry_cost && selectedLocation.entry_cost > (character.coins || 0))
                    ? 'bg-destructive/20 text-destructive cursor-not-allowed border-destructive/30'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
              >
                <Navigation className="w-3 h-3 mr-2" />
                {character.current_location_id === selectedLocation.id
                  ? 'CURRENT_LOCATION'
                  : (!!selectedLocation.min_level && character.level < selectedLocation.min_level)
                    ? `REQ_LVL_${selectedLocation.min_level}`
                    : (!!selectedLocation.entry_cost && selectedLocation.entry_cost > (character.coins || 0))
                      ? `INSUFFICIENT_RUST`
                      : `TRAVEL_TO_${selectedLocation.name.toUpperCase()}`}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Terminal Status Indicators */}
      {transform.scale !== 1 && (
        <div className="absolute bottom-4 left-4 bg-background/95 border border-border px-2 py-1 rounded text-xs font-mono">
          <div className="flex items-center gap-2">
            <Eye className="w-3 h-3 text-primary" />
            <span className="text-primary">ZOOM: {Math.round(transform.scale * 100)}%</span>
          </div>
        </div>
      )}

      {/* Terminal Debug Info */}
      <div className="absolute bottom-16 left-4 bg-background/95 border border-border px-2 py-1 rounded text-xs font-mono">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Database className="w-3 h-3" />
          <span>MAPPED: {locationLookup.size}/{baseSVGData.paths.length}</span>
          {selectedPath && <span>• SELECTED: {selectedPath}</span>}
        </div>
      </div>
    </div>
  )
}
