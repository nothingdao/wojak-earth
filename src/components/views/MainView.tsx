// src/components/views/MainView.tsx
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Pickaxe,
  Store,
  MessageCircle,
  Activity,
  Mountain,
  Zap,
  Users,
  Shield,
  Gem,
  Loader2
} from 'lucide-react'
import { useChatParticipantCount } from '@/hooks/useChatPresence'
import type { Character, Player, DatabaseLocation } from '@/types'

// Types for the new data we'll be fetching
interface LocationResource {
  id: string
  itemId: string
  itemName: string
  itemRarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  spawnRate: number
  maxPerDay?: number
  difficulty: number
}

interface MarketPreview {
  totalListings: number
  cheapestItem?: { name: string; price: number }
  mostExpensive?: { name: string; price: number }
}

interface MainViewProps {
  character: Character
  playersAtLocation: Player[]
  onMineClick: () => void
  onMarketClick: () => void
  onChatClick: () => void
  onNPCActivityClick: () => void
}

export const MainView: React.FC<MainViewProps> = ({
  character,
  playersAtLocation,
  onMineClick,
  onMarketClick,
  onChatClick,
  onNPCActivityClick
}) => {
  const locationId = character.currentLocation.id
  const chatParticipants = useChatParticipantCount(locationId)

  // State for additional location data
  const [locationResources, setLocationResources] = useState<LocationResource[]>([])
  const [marketPreview, setMarketPreview] = useState<MarketPreview | null>(null)
  const [loadingResources, setLoadingResources] = useState(true)
  const [loadingMarket, setLoadingMarket] = useState(true)

  // Get the full location data (assuming it's available in character.currentLocation)
  const location = character.currentLocation as DatabaseLocation

  // Load location resources
  useEffect(() => {
    const loadLocationResources = async () => {
      if (!location.hasMining) {
        setLocationResources([])
        setLoadingResources(false)
        return
      }

      try {
        setLoadingResources(true)
        const response = await fetch(`/.netlify/functions/get-location-resources?locationId=${locationId}`)
        if (response.ok) {
          const data = await response.json()
          setLocationResources(data.resources || [])
        }
      } catch (error) {
        console.error('Failed to load location resources:', error)
        setLocationResources([])
      } finally {
        setLoadingResources(false)
      }
    }

    loadLocationResources()
  }, [locationId, location.hasMining])

  // Load market preview
  useEffect(() => {
    const loadMarketPreview = async () => {
      if (!location.hasMarket) {
        setMarketPreview(null)
        setLoadingMarket(false)
        return
      }

      try {
        setLoadingMarket(true)
        const response = await fetch(`/.netlify/functions/get-market-preview?locationId=${locationId}`)
        if (response.ok) {
          const data = await response.json()
          setMarketPreview(data.preview)
        }
      } catch (error) {
        console.error('Failed to load market preview:', error)
        setMarketPreview(null)
      } finally {
        setLoadingMarket(false)
      }
    }

    loadMarketPreview()
  }, [locationId, location.hasMarket])

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 1) return 'text-green-600'
    if (difficulty <= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getBiomeIcon = (biome?: string) => {
    // You can expand this based on your biomes
    switch (biome?.toLowerCase()) {
      case 'mountain':
      case 'mountains':
        return <Mountain className="w-4 h-4" />
      default:
        return <Mountain className="w-4 h-4" />
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'COMMON': return 'text-gray-600'
      case 'UNCOMMON': return 'text-green-600'
      case 'RARE': return 'text-blue-600'
      case 'EPIC': return 'text-purple-600'
      case 'LEGENDARY': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const AtmosphericHeader = () => (
    <div className="text-center space-y-2 mb-6">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        {getBiomeIcon(location.biome)}
        <span>{location.biome || 'Unknown'}</span>
        {location.theme && (
          <>
            <span>•</span>
            <span>{location.theme}</span>
          </>
        )}
        <span>•</span>
        <Shield className={`w-4 h-4 ${getDifficultyColor(location.difficulty)}`} />
        <span className={getDifficultyColor(location.difficulty)}>
          Level {location.difficulty} Area
        </span>
      </div>

      <h2 className="text-xl font-bold">{location.name}</h2>

      {location.lore && (
        <p className="text-sm text-muted-foreground italic max-w-xs mx-auto">
          "{location.lore}"
        </p>
      )}

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>{playersAtLocation.length} players here</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          <span>{character.energy}/100 energy</span>
        </div>
      </div>
    </div>
  )

  const ActionPreviewButtons = () => (
    <div className="grid grid-cols-2 gap-3">

      {/* mine */}
      <Button
        variant="outline"
        className="h-auto p-4 flex-col items-start"
        disabled={!location.hasMining}
        onClick={onMineClick}
      >
        <div className="flex items-center gap-2 mb-1 self-start">
          <Pickaxe className="w-4 h-4" />
          <span>Mine</span>
        </div>
        {location.hasMining ? (
          <div className="text-xs text-muted-foreground text-left">
            {loadingResources ? (
              <div className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : locationResources.length > 0 ? (
              <div>
                <div>{locationResources.filter(r => r.itemRarity === 'COMMON').length > 0 && 'Common materials likely'}</div>
                <div className="text-yellow-600">
                  {locationResources.filter(r => ['UNCOMMON', 'RARE'].includes(r.itemRarity)).length > 0 && 'Rare finds possible'}
                </div>
              </div>
            ) : (
              <div>Resources available</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            No mining deposits
          </div>
        )}
      </Button>
      {/* market */}
      <Button
        variant="outline"
        className="h-auto p-4 flex-col items-start"
        disabled={!location.hasMarket}
        onClick={onMarketClick}
      >
        <div className="flex items-center gap-2 mb-1 self-start">
          <Store className="w-4 h-4" />
          <span>Market</span>
        </div>
        {location.hasMarket ? (
          <div className="text-xs text-muted-foreground text-left">
            {loadingMarket ? (
              <div className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : marketPreview ? (
              <div>
                <div>{marketPreview.totalListings} items for sale</div>
                {marketPreview.cheapestItem && (
                  <div>From {marketPreview.cheapestItem.price} coins</div>
                )}
              </div>
            ) : (
              <div>Market available</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Remote location
          </div>
        )}
      </Button>
      {/* scavenge */}
      {/* todo: make items that can be found that are not typical mining itmes so this would be things like flppy disk, walkman, mobile phone, etc... */}
      <Button
        variant="outline"
        className="h-auto p-4 flex-col items-start"
        disabled={!location.hasScaveging}
      >
        <div className="flex items-center gap-2 mb-1 self-start">
          <Store className="w-4 h-4" />
          <span>Scavenge</span>
        </div>
        {location.hasMarket ? (

          <div className="text-xs text-muted-foreground">
            Look around for useful items
          </div>

        ) : (
          <div className="text-xs text-muted-foreground">
            Remote location
          </div>
        )}
      </Button>
    </div>
  )

  const DetailedResourcePreview = () => {
    if (!location.hasMining) return null

    return (
      <Card className="p-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Gem className="w-4 h-4" />
          Local Resources
        </h4>
        {loadingResources ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading resources...</span>
          </div>
        ) : locationResources.length > 0 ? (
          <div className="space-y-2">
            {locationResources.map((resource) => (
              <div key={resource.id} className="flex items-center justify-between text-sm">
                <span className={getRarityColor(resource.itemRarity)}>
                  {resource.itemName}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {resource.itemRarity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(resource.spawnRate * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-2">
            No specific resources catalogued for this area
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* LocationNavbar is now in App.tsx, so we removed it from here */}

      <AtmosphericHeader />
      <ActionPreviewButtons />
      <DetailedResourcePreview />

      <div className="space-y-2">
        <Button
          onClick={onChatClick}
          variant="outline"
          className="w-full"
          disabled={!location.hasChat}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          {location.hasChat ? (
            `Local Chat (${chatParticipants} active)`
          ) : (
            'Chat Unavailable'
          )}
        </Button>

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
