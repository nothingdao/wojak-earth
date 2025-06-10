// src/components/LocationPreview.tsx
// import { EarthSVG } from './map/EarthSVG'
import type { DatabaseLocation } from '@/types'

interface LocationPreviewProps {
  location: DatabaseLocation
  locations?: DatabaseLocation[]
  size?: number
  className?: string
  animated?: boolean
}

export function LocationPreview({
  location,
  size = 120,
  className = '',
  animated = true
}: LocationPreviewProps) {

  // Get viewBox for this location
  const getViewBoxForLocation = (svg_path_id: string) => {
    switch (svg_path_id) {
      case 'fungi-networks':
        return "0 0 788 1440" // full map to test first
      // Add more locations as needed
      default:
        return "0 0 788 1440"
    }
  }

  const viewBox = getViewBoxForLocation(location.svg_path_id)

  // Parse viewBox for clipping
  const viewBoxParts = viewBox.split(' ').map(Number)
  const [vbX, vbY, vbWidth, vbHeight] = viewBoxParts
  const clipId = `clip-${location.id}-${Date.now()}`

  // Calculate center point for the animated dot
  const centerX = vbX + vbWidth / 2
  const centerY = vbY + vbHeight / 2

  return (
    <div className={`relative ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        className="border-2 border-primary/20 rounded-lg bg-card/50 backdrop-blur-sm shadow-lg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Clipping path */}
          <clipPath id={clipId}>
            <rect x={vbX} y={vbY} width={vbWidth} height={vbHeight} />
          </clipPath>

          <pattern id={`grid-${location.id}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(156,163,175,0.1)" strokeWidth="0.5" />
          </pattern>

          {/* Glow effect for animated version */}
          {animated && (
            <filter id={`glow-${location.id}`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        <rect x={vbX} y={vbY} width={vbWidth} height={vbHeight} fill={`url(#grid-${location.id})`} />

        {/* Clipped EarthSVG */}
        <g clipPath={`url(#${clipId})`}>
          {/* we need to do smoething cool using the map here for travel */}
          {/* <EarthSVG
            onMouseOver={() => { }}
            onMouseOut={() => { }}
            onClick={() => { }}
            getPathStyling={() => ''} // Return empty string to not override existing fill
            getPathAttributes={() => ({ fillOpacity: 1, style: {} })}
          /> */}
        </g>

        {/* Animated indicator dot for center */}
        {animated && (
          <circle
            cx={centerX}
            cy={centerY}
            r={Math.min(vbWidth, vbHeight) * 0.05}
            className="fill-primary animate-ping"
            style={{
              animationDuration: '1.5s'
            }}
          />
        )}
      </svg>

      {/* Compass rose overlay */}
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs backdrop-blur-sm">
        🧭
      </div>

      {/* Location type indicator */}
      <div className="absolute -bottom-1 -left-1 px-2 py-1 bg-card border border-border rounded text-xs font-medium shadow-sm">
        {location.biome}
      </div>

      {animated && (
        <style>{`
          @keyframes gentle-pulse {
            0%, 100% { 
              transform: scale(1);
              opacity: 0.8;
            }
            50% { 
              transform: scale(1.03);
              opacity: 1;
            }
          }
        `}</style>
      )}
    </div>
  )
}
