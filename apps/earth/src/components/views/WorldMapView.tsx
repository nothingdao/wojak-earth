// components/views/WorldMapView.tsx - FIXED VERSION
import React from 'react'
import Earth from '../map/Earth'
import type { Location, Character } from '@/types'
import { useEffect } from 'react'

interface WorldMapViewProps {
  locations?: Location[]
  character?: Character | null
  onTravel?: (location_id: string) => void
  onSetTravelDestination?: (locationId: string) => void
  onLocationUpdate?: (locationId: string, updates: Partial<Location>) => void // Add this
  isTravelingOnMap?: boolean
  mapTravelDestination?: string | null
}

export function WorldMapView({
  locations = [],
  character,
  onTravel,
  onSetTravelDestination,
  onLocationUpdate,
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
        onSetTravelDestination={onSetTravelDestination}
        onLocationUpdate={onLocationUpdate} // Pass it through
        isTravelingOnMap={isTravelingOnMap}
        mapTravelDestination={mapTravelDestination}
      />
    </div>
  )
}
