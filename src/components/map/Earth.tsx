// src/components/map/Earth.tsx
import { useState, useCallback, useRef, useEffect } from "react"
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
  is_private?: boolean
}

interface EarthProps {
  locations: DatabaseLocation[]
  character?: Character
  onTravel?: (location_id: string) => void
  isTravelingOnMap?: boolean
  mapTravelDestination?: string | null
}

export default function Earth({
  locations,
  character,
  onTravel,
  isTravelingOnMap = false,
  mapTravelDestination = null
}: EarthProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, translateX: 0, translateY: 0 })

  // Touch-specific state
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null)
  const [touchStartTransform, setTouchStartTransform] = useState({ scale: 1, translateX: 0, translateY: 0 })
  const [touchCenter, setTouchCenter] = useState({ x: 0, y: 0 })

  // Saved position for testing
  const [savedPosition, setSavedPosition] = useState<{ scale: number, translateX: number, translateY: number } | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)


  const [visualLocationId, setVisualLocationId] = useState<string | null>(null)

  useEffect(() => {
    console.log('🎯 VISUAL LOCATION DEBUG:', {
      characterLocationId: character?.current_location_id,
      isTravelingOnMap,
      currentVisualLocationId: visualLocationId,
      willUpdate: !isTravelingOnMap
    })

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
      console.log('🎯 Travel ended, updating visual location to:', character.current_location_id)
      setVisualLocationId(character.current_location_id)
    }
  }, [character?.current_location_id, isTravelingOnMap]) // Remove visualLocationId from dependencies!

  useEffect(() => {
    if (!character?.current_location_id) return

    if (isTravelingOnMap) {
      // During travel, keep showing the old location
      if (!visualLocationId) {
        setVisualLocationId(character.current_location_id)
      }
    } else {
      // When not traveling, update to show current location
      setVisualLocationId(character.current_location_id)
    }
  }, [character?.current_location_id, isTravelingOnMap, visualLocationId])


  // Location coordinates mapping
  const getLocationCoords = (pathId: string): { x: number, y: number } | null => {
    const coordinates: Record<string, { x: number, y: number }> = {
      'drowning-mirror-lake': { x: 575, y: 655 },
      'fungi-networks': { x: 500, y: 800 },
      'the-centerlands': { x: 400, y: 700 },
      'frostpine-reaches': { x: 520, y: 200 },
      'underland': { x: 200, y: 1000 },
      'underland-island': { x: 315, y: 1175 },
      'solana-beach': { x: 345, y: 790 },
    }
    return coordinates[pathId] || null
  }

  const handleMapTravel = async (location_id: string) => {
    setSelectedPath(null)
    if (onTravel) {
      await onTravel(location_id)
    }
  }

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

  // Calculate pan boundaries
  const calculatePanBounds = useCallback((scale: number) => {
    if (!svgRef.current) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }

    const container = svgRef.current.parentElement
    if (!container) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

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

  // Jump to specific coordinates
  const jumpToCoordinates = useCallback((scale: number, translateX: number, translateY: number) => {
    const constrained = constrainTranslation(translateX, translateY, scale)
    const newTransform = {
      scale: Math.max(0.5, Math.min(5, scale)),
      translateX: constrained.translateX,
      translateY: constrained.translateY
    }
    setTransform(newTransform)
    updateURLWithTransform(newTransform)
  }, [constrainTranslation, updateURLWithTransform])

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
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return null
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const getTouchCenter = (touches: TouchList) => {
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY }
    }
    if (touches.length >= 2) {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      }
    }
    return { x: 0, y: 0 }
  }

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 1) {
      // Single touch - start panning
      if (transform.scale <= 1) return

      setIsDragging(true)
      const touch = e.touches[0]
      setDragStart({
        x: touch.clientX,
        y: touch.clientY,
        translateX: transform.translateX,
        translateY: transform.translateY
      })
    } else if (e.touches.length === 2) {
      // Multi-touch - start pinch zoom
      setIsDragging(false)
      const distance = getTouchDistance(e.touches)
      const center = getTouchCenter(e.touches)

      setLastTouchDistance(distance)
      setTouchStartTransform(transform)
      setTouchCenter(center)
    }
  }, [transform])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 1 && isDragging) {
      // Single touch panning
      const touch = e.touches[0]
      const deltaX = touch.clientX - dragStart.x
      const deltaY = touch.clientY - dragStart.y

      const newTranslateX = dragStart.translateX + deltaX
      const newTranslateY = dragStart.translateY + deltaY

      const constrained = constrainTranslation(newTranslateX, newTranslateY, transform.scale)

      setTransform(prev => ({
        ...prev,
        translateX: constrained.translateX,
        translateY: constrained.translateY
      }))
    } else if (e.touches.length === 2 && lastTouchDistance !== null) {
      // Pinch zoom
      const currentDistance = getTouchDistance(e.touches)
      const currentCenter = getTouchCenter(e.touches)

      if (currentDistance && currentDistance > 0) {
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
  }, [isDragging, dragStart, lastTouchDistance, touchStartTransform, touchCenter, constrainTranslation])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 0) {
      // All touches ended
      setIsDragging(false)
      setLastTouchDistance(null)
    } else if (e.touches.length === 1) {
      // Went from multi-touch to single touch
      setLastTouchDistance(null)

      // If we were zooming and now have one finger, prepare for panning
      if (transform.scale > 1) {
        const touch = e.touches[0]
        setDragStart({
          x: touch.clientX,
          y: touch.clientY,
          translateX: transform.translateX,
          translateY: transform.translateY
        })
        setIsDragging(true)
      }
    }
  }, [transform])

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
  // Replace your getPathStyle function with this:

  // KEEP: Path styling using visualLocationId
  const getPathStyle = useCallback((pathId: string) => {
    const location = getLocation(pathId)
    const isSelected = pathId === selectedPath
    const isHovered = pathId === hoveredPath

    const isPlayerHere = !isTravelingOnMap && location && visualLocationId === location.id
    const isTravelingToHere = location && mapTravelDestination === location.id
    const isTravelingFromHere = location && visualLocationId === location.id && isTravelingOnMap


    const style = getComputedStyle(document.documentElement)
    const isDark = document.documentElement.classList.contains('dark')

    let fill = isDark ? '#374151' : '#9ca3af'
    let stroke = isDark ? '#4b5563' : '#d1d5db'
    let strokeWidth = '0.5'
    let opacity = '0.8'
    let filter = 'none'

    if (location) {
      fill = getBiomeColor(location.biome)
      opacity = '0.9'
      strokeWidth = '0.5'
      stroke = isDark ? '#6b7280' : '#9ca3af'
    }

    if (isTravelingOnMap && (isTravelingFromHere || isTravelingToHere)) {
      filter = 'hue-rotate(90deg) saturate(150%)'
      opacity = '1'

      if (isTravelingFromHere) {
        fill = '#ef4444'
        stroke = '#ffffff'
        strokeWidth = '2'
      }

      if (isTravelingToHere) {
        fill = '#f59e0b'
        stroke = '#ffffff'
        strokeWidth = '2'
      }
    }

    if (isSelected) {
      fill = isDark ? '#3b82f6' : '#2563eb'
      stroke = isDark ? '#ffffff' : '#1e40af'
      strokeWidth = '2'
      opacity = '1'
    } else if (isPlayerHere && !isTravelingOnMap) {
      stroke = '#22c55e'
      strokeWidth = '3'
      opacity = '1'
    } else if (isHovered) {
      opacity = '1'
      strokeWidth = '1.5'
      stroke = isDark ? '#60a5fa' : '#3b82f6'
    }

    return {
      fill,
      stroke,
      strokeWidth,
      opacity,
      filter,
      cursor: 'pointer'
    }
  }, [getLocation, selectedPath, hoveredPath, visualLocationId, getBiomeColor, isTravelingOnMap, mapTravelDestination])

  // Handle path clicks
  const handlePathClick = useCallback((pathId: string) => {
    if (isDragging) return
    setSelectedPath(selectedPath === pathId ? null : pathId)
  }, [selectedPath, isDragging])

  const selectedLocation = selectedPath ? getLocation(selectedPath) : null

  return (
    <div className="w-full h-full bg-background overflow-hidden font-mono relative">

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

      {/* PROGRESS BAR */}
      {isTravelingOnMap && (
        <div className="absolute top-12 left-0 right-0 z-40 px-4">
          <div className="bg-background/95 border border-border rounded px-3 py-2 backdrop-blur">
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
        <div className="absolute top-16 right-4 bg-background/95 border border-border px-3 py-2 rounded shadow-lg z-40 font-mono">
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

      {/* SCREEN EFFECTS DURING TRAVEL */}
      {isTravelingOnMap && (
        <>
          <div className="absolute inset-0 bg-primary/5 pointer-events-none z-20 travel-flash" />
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            <div className="absolute w-full h-0.5 bg-primary/60 scan-line" style={{ top: '20%' }} />
            <div
              className="absolute w-full h-0.5 bg-primary/40 scan-line"
              style={{
                top: '90%',
                animationDelay: '1s'
              }}
            />
          </div>
        </>
      )}

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

        {/* Position Testing Controls */}
        <div className="bg-background/95 border border-border rounded p-2">
          <div className="text-xs text-muted-foreground mb-2 font-mono">POSITION_TEST</div>
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={saveCurrentPosition}
              className="h-8 w-8 p-0 font-mono"
              title="Save current position"
            >
              💾
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={jumpToSavedPosition}
              disabled={!savedPosition}
              className={`h-8 w-8 p-0 font-mono ${!savedPosition ? 'opacity-50' : ''}`}
              title="Jump to saved position"
            >
              🎯
            </Button>
          </div>
        </div>
      </div>

      {/* Terminal SVG Map Container */}
      <div
        className="w-full select-none overflow-hidden bg-gradient-to-br from-background/50 via-muted/10 to-background/50"
        style={{
          cursor: transform.scale <= 1 ? 'default' : (isDragging ? 'grabbing' : 'grab'),
          transform: `scale(${transform.scale}) translate(${transform.translateX}px, ${transform.translateY}px)`,
          transformOrigin: 'center center',
          height: 'calc(100vh - 48px)',
          marginTop: '48px',
          touchAction: 'none'
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
            const isPlayerHere = location && visualLocationId === location.id
            const isTravelingFromHere = location && visualLocationId === location.id && isTravelingOnMap
            const isTravelingToHere = location && mapTravelDestination === location.id


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
            if (!currentLocation?.svg_path_id) return null

            const coords = getLocationCoords(currentLocation.svg_path_id)
            if (!coords) return null

            return (
              <g>
                <circle
                  cx={coords.x} cy={coords.y}
                  r="8"
                  fill="#22c55e"
                  stroke="#ffffff"
                  strokeWidth="2"
                  opacity="1"
                />
                <circle
                  cx={coords.x} cy={coords.y}
                  r="15"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2"
                  className="animate-ping"
                />
                <circle
                  cx={coords.x} cy={coords.y}
                  r="25"
                  fill="none"
                  stroke="#22c55e"
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
            if (!destLocation?.svg_path_id) return null

            const coords = getLocationCoords(destLocation.svg_path_id)
            if (!coords) return null

            return (
              <g>
                <circle
                  cx={coords.x} cy={coords.y}
                  r="10"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="2"
                  opacity="1"
                />
                {[1, 2, 3, 4].map(i => (
                  <circle
                    key={`destination-${i}`}
                    cx={coords.x} cy={coords.y}
                    r={15 + (i * 5)}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1"
                    className="animate-ping"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  />
                ))}
                <circle
                  cx={coords.x} cy={coords.y}
                  r="5"
                  fill="#fbbf24"
                  className="animate-ping"
                  style={{ animationDuration: '0.8s' }}
                />
              </g>
            )
          })()}
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
                onClick={() => handleMapTravel(selectedLocation.id)}
                disabled={
                  character.current_location_id === selectedLocation.id ||
                  (!!selectedLocation.min_level && character.level < selectedLocation.min_level) ||
                  (!!selectedLocation.entry_cost && selectedLocation.entry_cost > (character.coins || 0)) ||
                  !!selectedLocation.is_private
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
      <div className="absolute bottom-16 left-4 bg-background/95 border border-border px-2 py-1 rounded text-xs font-mono space-y-1">
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
                {isDragging ? 'DRAGGING' : lastTouchDistance !== null ? 'PINCHING' : 'IDLE'}
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
