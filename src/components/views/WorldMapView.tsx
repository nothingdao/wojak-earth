import { useState, useRef, useEffect } from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Users, MapPin, Star } from 'lucide-react'

interface Location {
  id: string
  name: string
  description?: string
  mapX?: number
  mapY?: number
  biome?: string
  difficulty: number
  playerCount: number
  locationType: string
  subLocations?: Location[]
  parentLocationId?: string
}

interface WorldMapViewProps {
  locations: Location[]
  onLocationSelect?: (location: Location) => void
  currentLocationId?: string
}

// Enhanced coordinate system - normalized to 0-100 for responsive scaling
const LOCATION_COORDINATES = {
  'Mining Plains': { x: 20, y: 40 },
  'Desert Outpost': { x: 80, y: 20 },
  'Cyber City': { x: 60, y: 60 },
  'The Glitch Wastes': { x: 85, y: 75 },
  'Fungi Networks': { x: 15, y: 75 },
  'Temporal Rift Zone': { x: 75, y: 45 },
  'The Bone Markets': { x: 25, y: 15 },
  'Static Fields': { x: 45, y: 25 },
}

// Sub-location offsets relative to parent (in percentage points)
const SUB_LOCATION_OFFSETS = {
  'Rusty Pickaxe Inn': { x: -8, y: -5 },
  'Crystal Caves': { x: 5, y: 8 },
  'Central Exchange': { x: -6, y: -8 },
  'The Glitch Club': { x: 8, y: 6 },
  'Error 404 Oasis': { x: -10, y: 8 },
  'Corrupted Data Mines': { x: 6, y: -6 },
  'Spore Exchange': { x: -7, y: 10 },
  'The Great Mycelium': { x: 9, y: -4 },
  "Yesterday's Tomorrow": { x: -9, y: 7 },
  'Clock Tower Ruins': { x: 7, y: -9 },
  'Calcium Exchange': { x: -6, y: 9 },
  'Ossuary Club': { x: 8, y: -5 },
  'Channel 0': { x: -8, y: 8 },
  'Dead Air Tavern': { x: 6, y: -7 },
}

function getBiomeColor(biome?: string) {
  switch (biome) {
    case 'plains': return '#eee'
    case 'desert': return '#ddd'
    case 'urban': return '#4a90e2'
    case 'digital': return '#ff6b9d'
    case 'underground': return '#8b4513'
    case 'temporal': return '#9370db'
    case 'ossuary': return '#dcdcdc'
    case 'electromagnetic': return '#00ffff'
    default: return '#888888'
  }
}

function getDifficultyIcon(difficulty: number) {
  if (difficulty <= 2) return '🟢'
  if (difficulty <= 4) return '🟡'
  return '🔴'
}

export function WorldMapView({ locations, onLocationSelect, currentLocationId }: WorldMapViewProps) {
  const [mapDimensions, setMapDimensions] = useState({ width: 800, height: 600 })
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateDimensions = () => {
      if (mapRef.current) {
        const container = mapRef.current.parentElement
        if (container) {
          const width = Math.min(container.clientWidth - 32, 1000) // Max width with padding
          const height = Math.max(width * 0.6, 400) // Maintain aspect ratio with minimum height
          setMapDimensions({ width, height })
        }
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Separate parent and child locations
  const parentLocations = locations.filter(loc => !loc.parentLocationId)

  const getLocationPosition = (location: Location) => {
    const coords = LOCATION_COORDINATES[location.name as keyof typeof LOCATION_COORDINATES]
    if (coords) {
      return {
        x: (coords.x / 100) * mapDimensions.width,
        y: (coords.y / 100) * mapDimensions.height
      }
    }

    // Fallback to original coordinates if available
    if (location.mapX && location.mapY) {
      return {
        x: Math.min(location.mapX, mapDimensions.width - 20),
        y: Math.min(location.mapY, mapDimensions.height - 20)
      }
    }

    // Random fallback
    return {
      x: Math.random() * (mapDimensions.width - 40) + 20,
      y: Math.random() * (mapDimensions.height - 40) + 20
    }
  }

  const getSubLocationPosition = (subLocation: Location, parentPosition: { x: number, y: number }) => {
    const offset = SUB_LOCATION_OFFSETS[subLocation.name as keyof typeof SUB_LOCATION_OFFSETS]
    if (offset) {
      return {
        x: parentPosition.x + (offset.x / 100) * mapDimensions.width,
        y: parentPosition.y + (offset.y / 100) * mapDimensions.height
      }
    }

    // Fallback: random position around parent
    const angle = Math.random() * 2 * Math.PI
    const distance = 40 + Math.random() * 20
    return {
      x: parentPosition.x + Math.cos(angle) * distance,
      y: parentPosition.y + Math.sin(angle) * distance
    }
  }

  const renderConnectingLine = (parent: { x: number, y: number }, child: { x: number, y: number }) => (
    <line
      key={`line-${parent.x}-${parent.y}-${child.x}-${child.y}`}
      x1={parent.x}
      y1={parent.y}
      x2={child.x}
      y2={child.y}
      stroke="rgba(148, 163, 184, 0.4)"
      strokeWidth="2"
      strokeDasharray="4,4"
    />
  )

  // Custom landmass shapes for each major location
  const getLandmassPath = (locationName: string, position: { x: number, y: number }) => {
    const { x, y } = position
    const scale = 1.2 // Make landmasses a bit larger

    switch (locationName) {
      case 'Mining Plains':
        // Rolling hills shape
        return `M ${x - 40 * scale} ${y + 10 * scale} 
                Q ${x - 30 * scale} ${y - 20 * scale} ${x - 10 * scale} ${y - 15 * scale}
                Q ${x + 5 * scale} ${y - 25 * scale} ${x + 25 * scale} ${y - 10 * scale}
                Q ${x + 35 * scale} ${y + 5 * scale} ${x + 30 * scale} ${y + 20 * scale}
                Q ${x + 10 * scale} ${y + 25 * scale} ${x - 15 * scale} ${y + 15 * scale}
                Q ${x - 35 * scale} ${y + 20 * scale} ${x - 40 * scale} ${y + 10 * scale} Z`

      case 'Desert Outpost':
        // Jagged desert shape
        return `M ${x - 35 * scale} ${y - 5 * scale}
                L ${x - 20 * scale} ${y - 25 * scale}
                L ${x - 5 * scale} ${y - 20 * scale}
                L ${x + 10 * scale} ${y - 30 * scale}
                L ${x + 30 * scale} ${y - 15 * scale}
                L ${x + 35 * scale} ${y + 5 * scale}
                L ${x + 25 * scale} ${y + 20 * scale}
                L ${x + 5 * scale} ${y + 25 * scale}
                L ${x - 20 * scale} ${y + 15 * scale}
                L ${x - 35 * scale} ${y - 5 * scale} Z`

      case 'Cyber City':
        // Geometric city shape
        return `M ${x - 30 * scale} ${y - 20 * scale}
                L ${x - 15 * scale} ${y - 25 * scale}
                L ${x + 15 * scale} ${y - 25 * scale}
                L ${x + 30 * scale} ${y - 20 * scale}
                L ${x + 35 * scale} ${y - 5 * scale}
                L ${x + 30 * scale} ${y + 15 * scale}
                L ${x + 10 * scale} ${y + 25 * scale}
                L ${x - 10 * scale} ${y + 25 * scale}
                L ${x - 30 * scale} ${y + 15 * scale}
                L ${x - 35 * scale} ${y - 5 * scale}
                L ${x - 30 * scale} ${y - 20 * scale} Z`

      case 'The Glitch Wastes':
        // Fragmented, corrupted shape
        return `M ${x - 25 * scale} ${y - 15 * scale}
                L ${x - 10 * scale} ${y - 30 * scale}
                L ${x + 5 * scale} ${y - 25 * scale}
                L ${x + 20 * scale} ${y - 35 * scale}
                L ${x + 35 * scale} ${y - 10 * scale}
                L ${x + 30 * scale} ${y + 10 * scale}
                L ${x + 15 * scale} ${y + 25 * scale}
                L ${x - 5 * scale} ${y + 30 * scale}
                L ${x - 25 * scale} ${y + 20 * scale}
                L ${x - 35 * scale} ${y + 5 * scale}
                L ${x - 25 * scale} ${y - 15 * scale} Z`

      case 'Fungi Networks':
        // Organic, mushroom-like shape
        return `M ${x - 20 * scale} ${y - 10 * scale}
                Q ${x - 35 * scale} ${y - 20 * scale} ${x - 30 * scale} ${y - 5 * scale}
                Q ${x - 40 * scale} ${y + 10 * scale} ${x - 25 * scale} ${y + 15 * scale}
                Q ${x - 15 * scale} ${y + 30 * scale} ${x + 5 * scale} ${y + 25 * scale}
                Q ${x + 25 * scale} ${y + 20 * scale} ${x + 30 * scale} ${y + 5 * scale}
                Q ${x + 35 * scale} ${y - 15 * scale} ${x + 15 * scale} ${y - 20 * scale}
                Q ${x - 5 * scale} ${y - 25 * scale} ${x - 20 * scale} ${y - 10 * scale} Z`

      case 'Temporal Rift Zone':
        // Twisted, time-distorted shape
        return `M ${x - 30 * scale} ${y - 10 * scale}
                Q ${x - 20 * scale} ${y - 30 * scale} ${x + 5 * scale} ${y - 25 * scale}
                Q ${x + 25 * scale} ${y - 35 * scale} ${x + 35 * scale} ${y - 5 * scale}
                Q ${x + 40 * scale} ${y + 15 * scale} ${x + 20 * scale} ${y + 25 * scale}
                Q ${x - 5 * scale} ${y + 35 * scale} ${x - 25 * scale} ${y + 20 * scale}
                Q ${x - 40 * scale} ${y + 5 * scale} ${x - 30 * scale} ${y - 10 * scale} Z`

      case 'The Bone Markets':
        // Skull-like shape
        return `M ${x - 25 * scale} ${y - 20 * scale}
                Q ${x - 35 * scale} ${y - 25 * scale} ${x - 30 * scale} ${y - 5 * scale}
                Q ${x - 35 * scale} ${y + 15 * scale} ${x - 15 * scale} ${y + 25 * scale}
                L ${x + 15 * scale} ${y + 25 * scale}
                Q ${x + 35 * scale} ${y + 15 * scale} ${x + 30 * scale} ${y - 5 * scale}
                Q ${x + 35 * scale} ${y - 25 * scale} ${x + 25 * scale} ${y - 20 * scale}
                Q ${x} ${y - 30 * scale} ${x - 25 * scale} ${y - 20 * scale} Z`

      case 'Static Fields':
        // Jagged, electric shape
        return `M ${x - 30 * scale} ${y - 15 * scale}
                L ${x - 15 * scale} ${y - 30 * scale}
                L ${x - 5 * scale} ${y - 20 * scale}
                L ${x + 10 * scale} ${y - 35 * scale}
                L ${x + 25 * scale} ${y - 25 * scale}
                L ${x + 35 * scale} ${y - 10 * scale}
                L ${x + 25 * scale} ${y + 5 * scale}
                L ${x + 35 * scale} ${y + 20 * scale}
                L ${x + 15 * scale} ${y + 30 * scale}
                L ${x - 5 * scale} ${y + 20 * scale}
                L ${x - 20 * scale} ${y + 25 * scale}
                L ${x - 35 * scale} ${y + 10 * scale}
                L ${x - 30 * scale} ${y - 15 * scale} Z`

      default:
        // Fallback generic landmass
        return `M ${x - 30 * scale} ${y - 15 * scale}
                Q ${x - 15 * scale} ${y - 25 * scale} ${x + 15 * scale} ${y - 25 * scale}
                Q ${x + 30 * scale} ${y - 15 * scale} ${x + 30 * scale} ${y + 15 * scale}
                Q ${x + 15 * scale} ${y + 25 * scale} ${x - 15 * scale} ${y + 25 * scale}
                Q ${x - 30 * scale} ${y + 15 * scale} ${x - 30 * scale} ${y - 15 * scale} Z`
    }
  }

  const renderLocationNode = (
    location: Location,
    position: { x: number, y: number },
    isParent: boolean = false
  ) => {
    const isCurrentLocation = location.id === currentLocationId
    const color = getBiomeColor(location.biome)

    if (isParent) {
      // Render landmass for major locations
      const landmassPath = getLandmassPath(location.name, position)

      return (
        <g key={location.id}>
          {/* Glow effect for current location */}
          {isCurrentLocation && (
            <path
              d={landmassPath}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="4"
              opacity="0.8"
              filter="blur(2px)"
            />
          )}

          {/* Main landmass */}
          <path
            d={landmassPath}
            fill={color}
            stroke={isCurrentLocation ? "#fbbf24" : "#374151"}
            strokeWidth={isCurrentLocation ? 3 : 2}
            className="cursor-pointer hover:stroke-blue-400 transition-colors"
            onClick={() => onLocationSelect?.(location)}
            opacity="0.9"
          />

          {/* Subtle inner shadow for depth */}
          <path
            d={landmassPath}
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.3"
          />

          {/* Location name label */}
          <text
            x={position.x}
            y={position.y - 35}
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill="#374151"
            className="pointer-events-none drop-shadow-sm"
          >
            {location.name}
          </text>

          {/* Difficulty indicator */}
          <circle
            cx={position.x + 35}
            cy={position.y - 25}
            r={10}
            fill="white"
            stroke="#374151"
            strokeWidth="2"
          />
          <text
            x={position.x + 35}
            y={position.y - 25}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="12"
            className="pointer-events-none"
          >
            {getDifficultyIcon(location.difficulty)}
          </text>

          {/* Player count indicator */}
          {location.playerCount > 0 && (
            <>
              <circle
                cx={position.x - 35}
                cy={position.y + 25}
                r={12}
                fill="#3b82f6"
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={position.x - 35}
                y={position.y + 25}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fill="white"
                className="font-bold pointer-events-none"
              >
                {location.playerCount}
              </text>
            </>
          )}
        </g>
      )
    } else {
      // Render simple square for sub-locations
      const squareSize = 16

      return (
        <g key={location.id}>
          {/* Glow effect for current location */}
          {isCurrentLocation && (
            <rect
              x={position.x - squareSize - 4}
              y={position.y - squareSize - 4}
              width={(squareSize + 4) * 2}
              height={(squareSize + 4) * 2}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3"
              opacity="0.6"
              rx="2"
            />
          )}

          {/* Main square */}
          <rect
            x={position.x - squareSize}
            y={position.y - squareSize}
            width={squareSize * 2}
            height={squareSize * 2}
            fill={color}
            stroke={isCurrentLocation ? "#fbbf24" : "#374151"}
            strokeWidth={isCurrentLocation ? 1 : 0}
            rx="2"
            className="cursor-pointer hover:stroke-blue-400 transition-colors"
            onClick={() => onLocationSelect?.(location)}
          />

          {/* Difficulty indicator */}
          <circle
            cx={position.x + squareSize + 8}
            cy={position.y - squareSize - 8}
            r={4}
            fill="white"
            stroke="#374151"
            strokeWidth="0"
          />
          <text
            x={position.x + squareSize + 8}
            y={position.y - squareSize - 8}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10"
            className="pointer-events-none"
          >
            {getDifficultyIcon(location.difficulty)}
          </text>

          {/* Player count indicator */}
          {location.playerCount > 0 && (
            <>
              <circle
                cx={position.x - squareSize - 8}
                cy={position.y + squareSize + 8}
                r={8}
                fill="#3b82f6"
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={position.x - squareSize - 8}
                y={position.y + squareSize + 8}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fill="white"
                className="font-bold pointer-events-none"
              >
                {location.playerCount}
              </text>
            </>
          )}
        </g>
      )
    }
  }

  return (
    <div className="w-full">
      <div
        ref={mapRef}
        className="relative w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg border overflow-hidden"
        style={{ height: mapDimensions.height }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(148, 163, 184, 0.3) 1px, transparent 0)`,
            backgroundSize: '20px 20px'
          }}
        />

        <svg
          width={mapDimensions.width}
          height={mapDimensions.height}
          className="absolute inset-0"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Connection lines */}
          {parentLocations.map(parent => {
            const parentPos = getLocationPosition(parent)
            return parent.subLocations?.map(child => {
              const childPos = getSubLocationPosition(child, parentPos)
              return renderConnectingLine(parentPos, childPos)
            })
          })}

          {/* Parent location nodes */}
          {parentLocations.map(location => {
            const position = getLocationPosition(location)
            return (
              <Tooltip key={location.id}>
                <TooltipTrigger asChild>
                  {renderLocationNode(location, position, true)}
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <div className="font-semibold flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {location.name}
                    </div>
                    {location.description && (
                      <div className="text-sm text-muted-foreground">
                        {location.description}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Level {location.difficulty}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {location.playerCount} players
                      </span>
                    </div>
                    {location.biome && (
                      <div className="text-xs capitalize">
                        Biome: {location.biome}
                      </div>
                    )}
                    {location.subLocations && location.subLocations.length > 0 && (
                      <div className="text-xs">
                        Contains {location.subLocations.length} sub-location{location.subLocations.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}

          {/* Child location nodes */}
          {parentLocations.map(parent => {
            const parentPos = getLocationPosition(parent)
            return parent.subLocations?.map(child => {
              const childPos = getSubLocationPosition(child, parentPos)
              return (
                <Tooltip key={child.id}>
                  <TooltipTrigger asChild>
                    {renderLocationNode(child, childPos, false)}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <div className="font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {child.name}
                      </div>
                      {child.description && (
                        <div className="text-sm text-muted-foreground">
                          {child.description}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Level {child.difficulty}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {child.playerCount} players
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Part of {parent.name}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            })
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-800/90 rounded-lg p-3 text-xs space-y-2 backdrop-blur-sm">
          <div className="font-semibold">Legend</div>
          <div className="flex items-center gap-2">
            <svg width="20" height="12" className="flex-shrink-0">
              <path
                d="M 2 6 Q 6 2 10 3 Q 14 4 18 6 Q 16 8 12 9 Q 8 10 2 6 Z"
                fill="#7ec850"
                stroke="#374151"
                strokeWidth="1"
              />
            </svg>
            <span>Major Region</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 border border-gray-600 rounded-sm flex-shrink-0" />
            <span>Sub-Location</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🟢🟡🔴</span>
            <span>Difficulty Level</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 text-white text-[8px] flex items-center justify-center font-bold flex-shrink-0">5</div>
            <span>Players Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 border-t-2 border-dashed border-gray-400 flex-shrink-0" />
            <span>Connection</span>
          </div>
        </div>
      </div>
    </div>
  )
}
