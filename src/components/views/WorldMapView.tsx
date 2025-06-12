// components/views/WorldMapView.tsx - FIXED VERSION
import Earth from '../map/Earth'
import type { DatabaseLocation, Character } from '@/types'
import { useEffect } from 'react'

interface WorldMapViewProps {
  locations?: DatabaseLocation[]
  character?: Character | null
  onTravel?: (location_id: string) => void
  isTravelingOnMap?: boolean
  mapTravelDestination?: string | null
}

export function WorldMapView({
  locations = [],
  character,
  onTravel, // <- Use the prop that's passed in
  isTravelingOnMap = false,
  mapTravelDestination = null
}: WorldMapViewProps) {
  // Prevent page scrolling only when map view is active
  useEffect(() => {
    // Store original overflow style
    const originalOverflow = document.body.style.overflow

    // Disable scrolling
    document.body.style.overflow = 'hidden'

    // Cleanup: restore original overflow when component unmounts
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-background">
      <Earth
        locations={locations}
        character={character || undefined}
        onTravel={onTravel} // <- Pass through the onTravel prop directly
        isTravelingOnMap={isTravelingOnMap}
        mapTravelDestination={mapTravelDestination}
      />
    </div>
  )
}
