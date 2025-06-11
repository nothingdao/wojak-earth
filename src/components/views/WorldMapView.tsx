// components/views/WorldMapView.tsx - SIMPLE VERSION
import Earth from '../map/Earth'
import type { DatabaseLocation, Character } from '@/types'

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
  onTravel,
  isTravelingOnMap = false,
  mapTravelDestination = null
}: WorldMapViewProps) {
  return (
    <div className="w-full h-full">
      <Earth
        locations={locations}
        character={character || undefined}
        onTravel={onTravel}
        isTravelingOnMap={isTravelingOnMap}
        mapTravelDestination={mapTravelDestination}
      />
    </div>
  )
}
