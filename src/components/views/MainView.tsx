// src/components/views/MainView.tsx
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pickaxe, Store, MessageCircle, Activity } from 'lucide-react'
import type { Character, Player } from '@/types'

interface MainViewProps {
  character: Character
  playersAtLocation: Player[]
  onMineClick: () => void
  onMarketClick: () => void
  onChatClick: () => void
  onNPCActivityClick: () => void
}

// Character Renderer component (moved from App.tsx)
const CharacterRenderer: React.FC<{ character: Character }> = ({ character }) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  return (
    <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center mb-4 overflow-hidden relative">
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!imageError ? (
        <img
          src="/wojak.png"
          alt={character.name}
          className="w-full h-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: imageLoading ? 'none' : 'block' }}
        />
      ) : (
        // Fallback to default wojak image
        <img
          src="/wojak.png"
          alt={character.name}
          className="w-full h-full object-cover"
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageLoading(false)
            // Ultimate fallback
            const target = event?.target as HTMLImageElement
            if (target) {
              target.style.display = 'none'
              if (target.parentElement) {
                target.parentElement.innerHTML = '<div class="text-4xl">🥺</div>'
              }
            }
          }}
        />
      )}
    </div>
  )
}

export const MainView: React.FC<MainViewProps> = ({
  character,
  playersAtLocation,
  onMineClick,
  onMarketClick,
  onChatClick,
  onNPCActivityClick
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <CharacterRenderer character={character} />
        <h2 className="text-xl font-bold">{character.name}</h2>
        <p className="text-muted-foreground">Currently in {character.currentLocation.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={onMineClick} variant="outline">
          <Pickaxe className="w-4 h-4 mr-2" />
          Mine
        </Button>
        <Button onClick={onMarketClick} variant="outline">
          <Store className="w-4 h-4 mr-2" />
          Market
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        <Button onClick={onChatClick} variant="outline" className="w-full">
          <MessageCircle className="w-4 h-4 mr-2" />
          Local Chat ({playersAtLocation.length} online)
        </Button>

        {/* Add this button for development */}
        {process.env.NODE_ENV === 'development' && (
          <Button onClick={onNPCActivityClick} variant="outline" className="w-full">
            <Activity className="w-4 h-4 mr-2" />
            NPC Activity Monitor
          </Button>
        )}
      </div>
    </div>
  )
}
