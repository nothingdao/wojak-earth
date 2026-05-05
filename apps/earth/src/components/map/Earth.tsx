// src/components/map/Earth.tsx
import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { baseSVGData } from "../../data/baseMapSVG"
import {
  Plus,
  Minus,
  Home,
  Database,
  Activity,
  Signal,
  Eye,
  AlertTriangle,
  Bookmark,
  MapPin
} from 'lucide-react'
import ZoneAnalysisModal from './ZoneAnalysisModal'

import type { Location, Character } from '@/types'

interface EarthProps {
  locations: Location[]
  character?: Character
  onTravel?: (location_id: string) => void
  onLocationUpdate?: (locationId: string, updates: Partial<Location>) => void
  onSetTravelDestination?: (locationId: string) => void
  isTravelingOnMap?: boolean
  mapTravelDestination?: string | null
}

export default function Earth({
  locations,
  character,
  onTravel,
  onLocationUpdate,
  onSetTravelDestination,
  isTravelingOnMap = false,
  mapTravelDestination = null
}: EarthProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, translateX: 0, translateY: 0 })

  // console.log('🗺️ Earth component locations array length:', locations.length)
  // console.log('🗺️ First location:', locations[0])

  // Touch-specific state
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null)
  const [touchStartTransform, setTouchStartTransform] = useState({ scale: 1, translateX: 0, translateY: 0 })
  const [touchCenter, setTouchCenter] = useState({ x: 0, y: 0 })
  const [isMultiTouch, setIsMultiTouch] = useState(false)

  // Saved position for testing
  const [savedPosition, setSavedPosition] = useState<{ scale: number, translateX: number, translateY: number } | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [visualLocationId, setVisualLocationId] = useState<string | null>(null)

  const biomeMap: Record<string, string> = {
    HOT_DESERT: 'desert',
    COASTAL: 'water',
    VOLCANIC: 'mountain',
    PRISON: 'urban',
    ECHO_CHAMBER: 'urban',
    FOREST: 'forest',
    PLAINS: 'plains',
    SWAMP: 'swamp',
    TUNDRA: 'tundra',
    MOUNTAIN: 'mountain',
    // Add more as needed
  }

  useEffect(() => {
    // console.log('🎯 VISUAL LOCATION DEBUG:', {
    //   characterLocationId: character?.current_location_id,
    //   isTravelingOnMap,
    //   currentVisualLocationId: visualLocationId,
    //   willUpdate: !isTravelingOnMap
    // })

    if (!character?.current_location_id) return

    if (isTravelingOnMap) {
      // During travel, keep showing the old location
      if (!visualLocationId) {
        console.log('🎯 Setting initial visual location during travel')
        setVisualLocationId(character.current_location_id)
      }
      // Don't update visual location during travel
    } else {
      // When not traveling, ALWAYS update to show current location
      setVisualLocationId(character.current_location_id)
    }
  }, [character?.current_location_id, isTravelingOnMap])

  const getLocationCoords = (pathId: string): { x: number, y: number } | null => {
    const path = document.getElementById(pathId) as SVGPathElement | null
    if (!path) return null

    const bbox = path.getBBox()
    return {
      x: bbox.x + bbox.width / 2,
      y: bbox.y + bbox.height / 2
    }
  }

  // Create lookup map for quick location finding
  // Now using location.id as the key (SVG elements should have matching IDs)
  const locationMap = useCallback(() => {
    const map = new Map<string, Location>()
    locations.forEach(loc => {
      // Use the location's ID as the key for SVG path matching
      map.set(loc.id, loc)
    })
    return map
  }, [locations])

  const locationLookup = locationMap()

  const getLocation = useCallback((pathId: string | undefined) => {
    if (!pathId) return null
    return locationLookup.get(pathId)
  }, [locationLookup])

  // Calculate pan boundaries
  const calculatePanBounds = useCallback((scale: number) => {
    if (!containerRef.current) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }

    const containerWidth = containerRef.current.clientWidth
    const containerHeight = containerRef.current.clientHeight

    const scaledWidth = containerWidth * scale
    const scaledHeight = containerHeight * scale

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

  // URL state management for deep linking
  const updateURLWithTransform = useCallback((newTransform: typeof transform) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('mapScale', newTransform.scale.toFixed(2))
      url.searchParams.set('mapX', newTransform.translateX.toFixed(1))
      url.searchParams.set('mapY', newTransform.translateY.toFixed(1))
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // Load transform from URL on mount
  const loadTransformFromURL = useCallback(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const scale = parseFloat(params.get('mapScale') || '1')
      const translateX = parseFloat(params.get('mapX') || '0')
      const translateY = parseFloat(params.get('mapY') || '0')

      if (scale !== 1 || translateX !== 0 || translateY !== 0) {
        const constrained = constrainTranslation(translateX, translateY, scale)
        setTransform({
          scale: Math.max(0.5, Math.min(5, scale)),
          translateX: constrained.translateX,
          translateY: constrained.translateY
        })
      }
    }
  }, [constrainTranslation])

  // Generate shareable link
  const generateShareableLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('mapScale', transform.scale.toFixed(2))
      url.searchParams.set('mapX', transform.translateX.toFixed(1))
      url.searchParams.set('mapY', transform.translateY.toFixed(1))
      return url.toString()
    }
    return ''
  }, [transform])

  // Save current position for testing
  const saveCurrentPosition = useCallback(() => {
    setSavedPosition({
      scale: transform.scale,
      translateX: transform.translateX,
      translateY: transform.translateY
    })
    console.log('📍 Position saved:', { scale: transform.scale, x: transform.translateX, y: transform.translateY })
  }, [transform])

  // Jump to saved position
  const jumpToSavedPosition = useCallback(() => {
    if (savedPosition) {
      const constrained = constrainTranslation(savedPosition.translateX, savedPosition.translateY, savedPosition.scale)
      const newTransform = {
        scale: savedPosition.scale,
        translateX: constrained.translateX,
        translateY: constrained.translateY
      }
      setTransform(newTransform)
      updateURLWithTransform(newTransform)
      console.log('🎯 Jumped to saved position:', savedPosition)
    }
  }, [savedPosition, constrainTranslation, updateURLWithTransform])

  // Copy coordinates to clipboard
  const copyCoordinatesToClipboard = useCallback(async () => {
    const link = generateShareableLink()
    try {
      await navigator.clipboard.writeText(link)
      console.log('Map coordinates copied to clipboard!')
    } catch (err) {
      console.log('Failed to copy coordinates:', err)
    }
  }, [generateShareableLink])

  // Load from URL on component mount
  useEffect(() => {
    loadTransformFromURL()
  }, [loadTransformFromURL])

  // Touch helper functions
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[1].clientX - touches[0].clientX
    const dy = touches[1].clientY - touches[0].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    }
  }

  // FIXED: Touch event handlers with proper event handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsMultiTouch(true)
      const distance = getTouchDistance(e.touches)
      const center = getTouchCenter(e.touches)

      setLastTouchDistance(distance)
      setTouchStartTransform(transform)
      setTouchCenter(center)
    }
  }, [transform])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && !isMultiTouch) {
      // Single touch panning - only start dragging after significant movement
      const touch = e.touches[0]
      const deltaX = touch.clientX - dragStart.x
      const deltaY = touch.clientY - dragStart.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // Start dragging only after significant movement (10px threshold)
      if (!isDragging && distance > 10) {
        e.preventDefault() // Prevent scrolling once we start dragging
        setIsDragging(true)
      }

      if (isDragging) {
        e.preventDefault()
        const newTranslateX = dragStart.translateX + deltaX
        const newTranslateY = dragStart.translateY + deltaY

        const constrained = constrainTranslation(newTranslateX, newTranslateY, transform.scale)

        setTransform(prev => ({
          ...prev,
          translateX: constrained.translateX,
          translateY: constrained.translateY
        }))
      }
    } else if (e.touches.length === 2 && lastTouchDistance !== null) {
      // Pinch zoom
      e.preventDefault()
      const currentDistance = getTouchDistance(e.touches)
      const currentCenter = getTouchCenter(e.touches)

      if (currentDistance > 0) {
        const scaleRatio = currentDistance / lastTouchDistance
        const newScale = Math.max(0.5, Math.min(5, touchStartTransform.scale * scaleRatio))

        // Handle translation during pinch
        const centerDeltaX = currentCenter.x - touchCenter.x
        const centerDeltaY = currentCenter.y - touchCenter.y

        const newTranslateX = touchStartTransform.translateX + centerDeltaX * 0.5
        const newTranslateY = touchStartTransform.translateY + centerDeltaY * 0.5

        const constrained = constrainTranslation(newTranslateX, newTranslateY, newScale)

        setTransform({
          scale: newScale,
          translateX: constrained.translateX,
          translateY: constrained.translateY
        })
      }
    }
  }, [isDragging, isMultiTouch, dragStart, lastTouchDistance, touchStartTransform, touchCenter, constrainTranslation, transform.scale])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      // All touches ended
      setIsDragging(false)
      setIsMultiTouch(false)
      setLastTouchDistance(null)
    } else if (e.touches.length === 1 && isMultiTouch) {
      // Went from multi-touch to single touch
      setIsMultiTouch(false)
      setLastTouchDistance(null)

      // Prepare for potential single-touch panning
      const touch = e.touches[0]
      setDragStart({
        x: touch.clientX,
        y: touch.clientY,
        translateX: transform.translateX,
        translateY: transform.translateY
      })
      setIsDragging(false)
    }
  }, [isMultiTouch, transform])

  // Mouse event handlers (keep existing functionality)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (transform.scale <= 1) return

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

    const newTranslateX = dragStart.translateX + deltaX
    const newTranslateY = dragStart.translateY + deltaY

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
    const newScale = Math.max(0.5, Math.min(5, transform.scale * delta))

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
  const getBiomeColor = useCallback((biome?: string, state?: string) => {
    const style = getComputedStyle(document.documentElement)

    // Build the CSS custom property name
    const mappedBiome = biomeMap[biome?.toUpperCase() || ''] || biome?.toLowerCase() || 'default'
    const suffix = state ? `-${state}` : ''
    const propertyName = `--map-${mappedBiome}${suffix}`

    // Get the color value
    const colorValue = style.getPropertyValue(propertyName).trim()

    // Fallback to base color if state-specific color doesn't exist
    if (!colorValue && state) {
      return style.getPropertyValue(`--map-${mappedBiome}`).trim()
    }

    return colorValue || style.getPropertyValue('--map-default').trim()
  }, [])

  // Add this new function alongside getBiomeColor
  const getTerritoryColor = useCallback((territory?: string) => {
    const style = getComputedStyle(document.documentElement)

    const territoryColors: Record<string, string> = {
      'underland': style.getPropertyValue('--map-territory-underland').trim() || '#22c55e',
      'dingo_continenta': style.getPropertyValue('--map-territory-dingo').trim() || '#f59e0b',
      'independent': style.getPropertyValue('--map-territory-independent').trim() || '#ef4444'
    }

    return territoryColors[territory || 'independent'] || territoryColors.independent
  }, [])

  // KEEP: Path styling using visualLocationId
  const getPathStyle = useCallback((pathId: string) => {
    const location = getLocation(pathId)
    const isSelected = pathId === selectedPath
    const isHovered = pathId === hoveredPath

    const isTravelingToHere = location && mapTravelDestination === location.id
    const isTravelingFromHere = location && visualLocationId === location.id && isTravelingOnMap

    // FOG OF WAR: Check if location is accessible to current character
    const isLevelLocked = location && location.min_level && character && character.level < location.min_level
    const isPrivateLocked = location && location.is_private && character && visualLocationId !== location.id
    const isUnexplored = location && location.status === 'unexplored'
    const isFogged = isLevelLocked || isPrivateLocked || isUnexplored

    // Get CSS custom properties for consistent theming
    const style = getComputedStyle(document.documentElement)

    // Default values for unmapped regions
    let fill = style.getPropertyValue('--map-default').trim()
    let stroke = style.getPropertyValue('--map-border-base').trim()
    let strokeWidth = '0.5'
    let opacity = '0.8'
    let filter = 'none'

    // Base biome styling
    if (location) {
      fill = getBiomeColor(location.biome || undefined)
      stroke = getBiomeColor(location.biome || undefined, 'border')
      strokeWidth = '1'
      opacity = '1'
    }

    // FOG OF WAR: Apply foggy styling for inaccessible areas
    if (isFogged) {
      fill = style.getPropertyValue('--map-fog').trim() || '#1a1a1a'
      stroke = style.getPropertyValue('--map-fog-border').trim() || '#808080'
      opacity = '0.3'
      filter = 'blur(6px) brightness(0.3) contrast(0.6) saturate(0.2) drop-shadow(0 0 12px rgba(0,0,0,0.4))'
      strokeWidth = '4'
    }

    // Selected state
    if (isSelected) {
      stroke = style.getPropertyValue('--map-selected').trim()
      strokeWidth = '2'
      filter = 'drop-shadow(0 0 2px var(--map-selected))'
    }

    // Hover state (but not for fogged areas)
    if (isHovered && !isFogged) {
      stroke = style.getPropertyValue('--map-hover').trim()
      strokeWidth = '2'
      filter = 'drop-shadow(0 0 2px var(--map-hover))'
    }

    // Travel states
    if (isTravelingToHere) {
      fill = style.getPropertyValue('--map-travel-destination').trim()
      stroke = style.getPropertyValue('--map-travel-destination-border').trim()
      strokeWidth = '2'
      filter = 'drop-shadow(0 0 2px var(--map-travel-destination))'
    }

    if (isTravelingFromHere) {
      fill = style.getPropertyValue('--map-travel-origin').trim()
      stroke = style.getPropertyValue('--map-travel-origin-border').trim()
      strokeWidth = '2'
      filter = 'drop-shadow(0 0 2px var(--map-travel-origin))'
    }

    console.log('Path:', pathId, 'Biome:', location?.biome, 'Fill:', style.fill)

    return {
      fill,
      stroke,
      strokeWidth,
      opacity,
      filter,
      cursor: 'pointer'
    }
  }, [selectedPath, hoveredPath, visualLocationId, mapTravelDestination, isTravelingOnMap, getBiomeColor, character, getLocation])

  // Handle path clicks
  const handlePathClick = useCallback((pathId: string) => {
    if (isDragging) return
    setSelectedPath(selectedPath === pathId ? null : pathId)
  }, [selectedPath, isDragging])

  const selectedLocation = selectedPath ? getLocation(selectedPath) : null

  // Add this function in Earth.tsx
  const handleLocationSave = async (locationId: string, updates: Partial<Location>) => {
    if (!onLocationUpdate) return
    onLocationUpdate(locationId, updates)
  }

  return (
    <div className="w-full h-full bg-background overflow-hidden font-mono relative">

      {/* Terminal Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-background backdrop-blur border-b border-border p-2">
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

      {/* PROGRESS BAR */}
      {isTravelingOnMap && (
        <div className="absolute top-12 left-0 right-0 z-40 px-4">
          <div className="bg-background border border-border rounded px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                <span className="text-destructive font-bold">TRAVEL_LINK_ACTIVE</span>
              </div>

              <div className="flex-1 bg-muted/50 rounded-full h-2 overflow-hidden border border-border">
                <div className="h-full bg-gradient-to-r from-destructive via-chart-3 to-chart-2 travel-progress" />
              </div>

              <span className="text-muted-foreground">TRANSFERRING_CONSCIOUSNESS</span>
            </div>
          </div>
        </div>
      )}

      {/* Original traveling status display */}
      {isTravelingOnMap && (
        <div className="absolute top-16 right-4 bg-background border border-border px-3 py-2 rounded shadow-lg z-40 font-mono">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-chart-3 rounded-full animate-pulse" />
            <span className="text-chart-3 font-bold">TRAVELING...</span>
            {mapTravelDestination && (() => {
              const dest = locations.find(loc => loc.id === mapTravelDestination)
              return dest ? <span className="text-muted-foreground">TO_{dest.name.toUpperCase()}</span> : null
            })()}
          </div>
        </div>
      )}

      {/* Terminal Control Panel */}
      <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-2">
        <div className="bg-background border border-border rounded p-2">
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
                const newScale = Math.max(0.5, transform.scale * 0.8)
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

      {/* FIXED: Terminal SVG Map Container with proper touch handling */}
      <div
        ref={containerRef}
        className="w-full select-none overflow-hidden bg-gradient-to-br from-background/50 via-muted/10 to-background/50"
        style={{
          cursor: transform.scale <= 1 ? 'default' : (isDragging ? 'grabbing' : 'grab'),
          transform: `scale(${transform.scale}) translate(${transform.translateX}px, ${transform.translateY}px)`,
          transformOrigin: 'center center',
          height: 'calc(100vh - 48px)',
          marginTop: '48px',
          // CRITICAL: Remove touchAction: 'none' to allow proper touch handling
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />

          {/* MAP PATHS */}
          {baseSVGData.paths.map((path) => {
            const style = getPathStyle(path.id)
            const location = getLocation(path.id)
            const isTravelingFromHere = location && visualLocationId === location.id && isTravelingOnMap
            const isTravelingToHere = location && mapTravelDestination === location.id

            // FOG OF WAR: Check if location is fogged
            const isLevelLocked = location && location.min_level && character && character.level < location.min_level
            const isPrivateLocked = location && location.is_private && character && visualLocationId !== location.id
            const isUnexplored = location && location.status === 'unexplored'
            const isFogged = isLevelLocked || isPrivateLocked || isUnexplored

            return (
              <g key={path.id}>
                <path
                  id={path.id}
                  d={path.d}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  opacity={style.opacity}
                  filter={style.filter}
                  style={{ cursor: style.cursor }}
                  className={`
          ${isTravelingOnMap && (isTravelingFromHere || isTravelingToHere) ? 'animate-pulse' : ''}
        `}
                  onClick={() => handlePathClick(path.id)}
                  onMouseEnter={() => setHoveredPath(path.id)}
                  onMouseLeave={() => setHoveredPath(null)}
                />
              </g>
            )
          })}

          {/* LOCATION INDICATORS */}
          {visualLocationId && !isTravelingOnMap && (() => {
            const currentLocation = locations.find(loc => loc.id === visualLocationId)
            if (!currentLocation?.id) return null

            const coords = getLocationCoords(currentLocation.id)
            if (!coords) return null

            return (
              <g>
                <circle
                  cx={coords.x} cy={coords.y}
                  r="8"
                  fill="#60a5fa"
                  opacity="1"
                />
                <circle
                  cx={coords.x} cy={coords.y}
                  r="15"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  className="animate-ping"
                />
                <circle
                  cx={coords.x} cy={coords.y}
                  r="25"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="1"
                  className="animate-ping"
                  style={{ animationDelay: '0.5s' }}
                />
              </g>
            )
          })()}

          {/* TRAVEL DESTINATION INDICATOR */}
          {isTravelingOnMap && mapTravelDestination && (() => {
            const destLocation = locations.find(loc => loc.id === mapTravelDestination)
            if (!destLocation?.id) return null

            const coords = getLocationCoords(destLocation.id)
            if (!coords) return null

            return (
              <g>
                <circle
                  cx={coords.x} cy={coords.y}
                  r="10"
                  fill="transparent"
                  stroke="#60a5fa"
                  strokeWidth={1 / transform.scale}
                  opacity="1"
                />
                {[1, 2, 3, 4].map(i => (
                  <circle
                    key={`destination-${i}`}
                    cx={coords.x} cy={coords.y}
                    r={15 + (i * 5)}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={1 / transform.scale}
                    className="animate-ping"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  />
                ))}
                <circle
                  cx={coords.x} cy={coords.y}
                  r="5"
                  fill="transparent"
                  stroke="#60a5fa"
                  strokeWidth={1 / transform.scale}
                  className="animate-ping"
                  style={{ animationDuration: '0.8s' }}
                />
              </g>
            )
          })()}

          {/* TRAVEL LINE */}
          {mapTravelDestination && visualLocationId && (() => {
            const originLocation = locations.find(loc => loc.id === visualLocationId)
            const destLocation = locations.find(loc => loc.id === mapTravelDestination)

            if (!originLocation?.id || !destLocation?.id) return null

            const originCoords = getLocationCoords(originLocation.id)
            const destCoords = getLocationCoords(destLocation.id)

            if (!originCoords || !destCoords) return null

            return (
              <line
                x1={originCoords.x}
                y1={originCoords.y}
                x2={destCoords.x}
                y2={destCoords.y}
                stroke="#60a5fa"
                strokeWidth={2 / transform.scale}
                strokeDasharray={`${8 / transform.scale},${4 / transform.scale}`}
                className="travel-line-flow"
                opacity="0.8"
              />
            )
          })()}
        </svg>
      </div>

      {/* Terminal Hover Display */}
      {hoveredPath && (
        <div className="absolute top-24 md:top-40 left-4 bg-background border border-border px-3 py-2 rounded shadow-lg z-40 font-mono">
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
            // Check if this location is fogged for the current character
            const isLevelLocked = location.min_level && character && character.level < location.min_level
            const isPrivateLocked = location.is_private && character && visualLocationId !== location.id
            const isUnexplored = location.status === 'unexplored'
            const isFogged = isLevelLocked || isPrivateLocked || isUnexplored

            return (
              <div className="text-xs">
                <div className="font-bold text-primary mb-1">{location.name.toUpperCase()}</div>

                {/* FOG OF WAR STATUS */}
                {isFogged && (
                  <div className="mb-2 p-1 bg-destructive/20 border border-destructive/30 rounded">
                    <div className="flex items-center gap-1 text-destructive text-xs">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="font-bold">INACCESSIBLE</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {isLevelLocked && <div>• Requires Level {location.min_level}</div>}
                      {isPrivateLocked && <div>• Private Area</div>}
                      {isUnexplored && <div>• Unexplored Region</div>}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Badge
                    variant="outline"
                    className="text-xs font-mono px-1 py-0 border-current"
                    style={{
                      backgroundColor: getBiomeColor(location.biome || undefined) + '20',
                      borderColor: getBiomeColor(location.biome || undefined),
                      color: getBiomeColor(location.biome || undefined)
                    }}
                  >
                    {location.biome?.toUpperCase()}
                  </Badge>
                  {location.territory && (
                    <Badge
                      variant="outline"
                      className="text-xs font-mono px-1 py-0 border-current"
                      style={{
                        backgroundColor: getTerritoryColor(location.territory) + '20',
                        borderColor: getTerritoryColor(location.territory),
                        color: getTerritoryColor(location.territory)
                      }}
                    >
                      {location.territory.toUpperCase()}
                    </Badge>
                  )}
                  <span>THREAT_LVL_{location.difficulty}</span>
                  {location.min_level && (
                    <span className={character && character.level < location.min_level ? 'text-destructive' : 'text-chart-2'}>
                      MIN_LVL_{location.min_level}
                    </span>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Terminal Location Analysis Panel */}
      {selectedLocation && (
        <ZoneAnalysisModal
          location={selectedLocation}
          character={character}
          walletAddress={character?.wallet_address}
          locations={locations}
          onClose={() => setSelectedPath(null)}
          onTravel={onTravel}
          onSetTravelDestination={onSetTravelDestination}
          onSave={handleLocationSave}
          getBiomeColor={getBiomeColor}
          getTerritoryColor={getTerritoryColor}
        />
      )}

      {/* Terminal Status Indicators */}
      {transform.scale !== 1 && (
        <div className="absolute bottom-4 left-4 bg-background border border-border px-2 py-1 rounded text-xs font-mono">
          <div className="flex items-center gap-2">
            <Eye className="w-3 h-3 text-primary" />
            <span className="text-primary">ZOOM: {Math.round(transform.scale * 100)}%</span>
          </div>
        </div>
      )}

      {/* Terminal Debug Info */}
      <div className="absolute bottom-12 left-4 bg-background border border-border px-2 py-1 rounded text-xs font-mono space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Database className="w-3 h-3" />
          <span>MAPPED: {locationLookup.size}/{baseSVGData.paths.length}</span>
          {selectedPath && <span>• SELECTED: {selectedPath}</span>}
        </div>

        {/* Transform Debug Info with Copy Button */}
        <div className="text-muted-foreground border-t border-border pt-1">
          <div className="flex items-center justify-between">
            <div>
              <div>SCALE: {transform.scale.toFixed(2)}x</div>
              <div>TRANSLATE: X={transform.translateX.toFixed(1)}, Y={transform.translateY.toFixed(1)}</div>
              <div className="text-chart-3">
                {isDragging ? 'DRAGGING' : isMultiTouch ? 'PINCHING' : 'IDLE'}
              </div>
              {savedPosition && (
                <div className="text-chart-1 text-xs">
                  SAVED: {savedPosition.scale.toFixed(2)}x, X={savedPosition.translateX.toFixed(1)}, Y={savedPosition.translateY.toFixed(1)}
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={copyCoordinatesToClipboard}
              className="h-6 w-6 p-0 ml-2"
              title="Copy map coordinates link"
            >
              📋
            </Button>
          </div>
          {/* Position Controls */}
          <div className="flex items-center gap-1 ml-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={saveCurrentPosition}
              className="h-5 w-5 p-0 hover:bg-muted/50"
              title="Save current position"
            >
              <Bookmark className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={jumpToSavedPosition}
              disabled={!savedPosition}
              className={`h-5 w-5 p-0 hover:bg-muted/50 ${!savedPosition ? 'opacity-30' : ''}`}
              title="Jump to saved position"
            >
              <MapPin className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {selectedLocation && (
        <div style={{ color: 'red', fontSize: 12 }}>
          is_private: {String(selectedLocation.is_private)}
        </div>
      )}
    </div>
  )
}
