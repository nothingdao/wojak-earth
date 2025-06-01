// components/views/WorldMapView.tsx
import Earth from '../map/Earth'
import type { Location, Character } from '@/types'

interface WorldMapViewProps {
  locations?: Location[]
  character?: Character | null
  onTravel?: (locationId: string) => void
}

export function WorldMapView({ locations = [], character, onTravel }: WorldMapViewProps) {
  return (
    <div className="w-full">
      <Earth
        locations={locations}
        character={character}
        onTravel={onTravel}
      />
    </div>
  )
}
