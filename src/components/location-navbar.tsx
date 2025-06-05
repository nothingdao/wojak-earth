// src/components/location-navbar.tsx
import { Button } from '@/components/ui/button'
import { Map, Backpack, MapPin } from 'lucide-react'
import type { Character } from '@/types'
import { useState } from 'react'

interface LocationNavbarProps {
  character: Character
  currentLocation: string
  onProfileClick: () => void
  onHomeClick: () => void
  onMapClick: () => void
  onInventoryClick: () => void
}

export function LocationNavbar({
  character,
  currentLocation,
  onProfileClick,
  onHomeClick,
  onMapClick,
  onInventoryClick
}: LocationNavbarProps) {
  const [imageError, setImageError] = useState(false)

  // Handle image load error
  const handleImageError = () => {
    setImageError(true)
  }

  // Get character image URL with fallback
  const getCharacterImageUrl = () => {
    // If there's an error or no currentImageUrl, use fallback
    if (imageError || !character.currentImageUrl) {
      return '/wojak.png'
    }

    return character.currentImageUrl
  }

  return (
    <div className="mb-4 p-3 bg-card border rounded-lg">
      <div className="grid grid-cols-2 gap-2">
        {/* Location Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-10 flex items-center justify-start gap-2"
          onClick={onHomeClick}
        >
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate text-sm">{currentLocation}</span>
        </Button>

        {/* Profile Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-10 flex items-center justify-start gap-2"
          onClick={onProfileClick}
        >
          <div className="w-5 h-5 overflow-hidden rounded-sm flex-shrink-0">
            <img
              src={getCharacterImageUrl()}
              alt={character.name}
              className="w-full h-full object-cover"
              onError={handleImageError}
              onLoad={() => setImageError(false)}
            />
          </div>
          <span className="truncate text-sm">{character.name}</span>
        </Button>

        {/* Map Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-10 flex items-center justify-start gap-2"
          onClick={onMapClick}
        >
          <Map className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">World Map</span>
        </Button>

        {/* Inventory Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-10 flex items-center justify-start gap-2"
          onClick={onInventoryClick}
        >
          <Backpack className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">Inventory</span>
        </Button>
      </div>
    </div>
  )
}
