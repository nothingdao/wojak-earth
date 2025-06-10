import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Pickaxe,
  Store,
  MessageCircle,
  Activity,
  Mountain,
  Users,
  Shield,
  Gem,
  Loader2,
  Search,
  Database,
  MapPin,
  Signal,
  TrendingUp,
  BarChart3
} from 'lucide-react'
import { useChatParticipantCount } from '@/hooks/useChatPresence'
import { ActivityMonitor } from '@/components/ActivityMonitor'
import type { Character, Player, DatabaseLocation } from '@/types'
import { LocalRadio } from '../LocalRadio'

// Types for the new data we'll be fetching
interface LocationResource {
  id: string
  item_id: string
  itemName: string
  itemRarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  spawn_rate: number
  max_per_day?: number
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
  onEconomyClick?: () => void
  onLeaderboardsClick?: () => void
  onRustMarketClick?: () => void
}

export const MainView: React.FC<MainViewProps> = ({
  character,
  playersAtLocation,
  onMineClick,
  onMarketClick,
  onChatClick,
  onEconomyClick,
  onLeaderboardsClick,
  onRustMarketClick
}) => {
  const location_id = character.currentLocation.id
  const chatParticipants = useChatParticipantCount(location_id)

  // State for showing activity monitor
  const [showActivityMonitor, setShowActivityMonitor] = useState(false)

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
      if (!location.has_mining) {
        setLocationResources([])
        setLoadingResources(false)
        return
      }

      try {
        setLoadingResources(true)
        const response = await fetch(`/.netlify/functions/get-location-resources?location_id=${location_id}`)
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
  }, [location_id, location.has_mining])

  // Load market preview
  useEffect(() => {
    const loadMarketPreview = async () => {
      if (!location.has_market) {
        setMarketPreview(null)
        setLoadingMarket(false)
        return
      }

      try {
        setLoadingMarket(true)
        const response = await fetch(`/.netlify/functions/get-market-preview?location_id=${location_id}`)
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
  }, [location_id, location.has_market])

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 1) return 'text-green-500 dark:text-green-400'
    if (difficulty <= 3) return 'text-yellow-500 dark:text-yellow-400'
    return 'text-red-500 dark:text-red-400'
  }

  const getBiomeIcon = (biome?: string) => {
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
      case 'COMMON': return 'text-muted-foreground'
      case 'UNCOMMON': return 'text-green-500 dark:text-green-400'
      case 'RARE': return 'text-blue-500 dark:text-blue-400'
      case 'EPIC': return 'text-purple-500 dark:text-purple-400'
      case 'LEGENDARY': return 'text-yellow-500 dark:text-yellow-400'
      default: return 'text-muted-foreground'
    }
  }

  const getStatusColor = (isAvailable: boolean) => {
    return isAvailable ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
  }

  const AtmosphericHeader = () => (
    <div className="bg-background border border-primary/30 rounded-lg p-4 font-mono">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-primary font-bold">LOCATION INTERFACE v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Signal className="w-3 h-3 animate-pulse" />
          <span className="text-primary text-xs">CONNECTED</span>
        </div>
      </div>

      {/* Location Status */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">COORDINATES</div>
          <div className="text-primary text-sm font-bold flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {location.name.toUpperCase()}
          </div>
          <div className="text-muted-foreground text-xs">{location.biome?.toUpperCase() || 'UNKNOWN'}</div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">THREAT LEVEL</div>
          <div className={`text-sm font-bold flex items-center gap-1 ${getDifficultyColor(location.difficulty)}`}>
            <Shield className="w-3 h-3" />
            LEVEL {location.difficulty}
          </div>
          <div className="text-muted-foreground text-xs">
            {location.difficulty <= 1 ? 'SECURE' : location.difficulty <= 3 ? 'CAUTION' : 'HOSTILE'}
          </div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">POPULATION</div>
          <div className="text-primary text-sm font-bold flex items-center gap-1">
            <Users className="w-3 h-3" />
            {playersAtLocation.length} ACTIVE
          </div>
          <div className="text-muted-foreground text-xs">SURVIVORS</div>
        </div>
      </div>

      {/* Status Line */}
      <div className="text-xs text-muted-foreground border-t border-primary/20 pt-2">
        <div className="flex justify-between">
          <span>SURVIVOR: {character.name}</span>
          <span>ENERGY: {character.energy}/100</span>
          <span>HEALTH: {character.health}/100</span>
          <span>RUST: {character.coins}</span>
        </div>
      </div>

      {/* Location Description */}
      {location.lore && (
        <div className="mt-3 p-2 bg-muted/20 border border-primary/10 rounded text-xs text-muted-foreground">
          <div className="text-primary text-xs font-bold mb-1">[LOCATION_LOG]</div>
          {location.lore}
        </div>
      )}
    </div>
  )

  const ActionPreviewButtons = () => (
    <div className="bg-background border border-primary/30 rounded-lg p-4 font-mono">
      <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        AVAILABLE OPERATIONS
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Mining */}
        <div
          className={`bg-muted/30 border border-primary/20 rounded p-3 cursor-pointer transition-colors hover:bg-muted/50 ${!location.has_mining ? 'opacity-50' : ''}`}
          onClick={location.has_mining ? onMineClick : undefined}
        >
          <div className="flex items-center gap-2 mb-2">
            <Pickaxe className="w-4 h-4" />
            <span className="text-primary font-bold text-sm">EXTRACT</span>
            <div className={`text-xs px-1 rounded ${getStatusColor(location.has_mining)}`}>
              {location.has_mining ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {location.has_mining ? (
              loadingResources ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  SCANNING...
                </div>
              ) : locationResources.length > 0 ? (
                <div>
                  <div>DEPOSITS: {locationResources.length} CONFIRMED</div>
                  <div className="text-yellow-500">
                    {locationResources.filter(r => ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'].includes(r.itemRarity)).length > 0 && 'RARE MATERIALS DETECTED'}
                  </div>
                </div>
              ) : (
                <div>RESOURCES AVAILABLE</div>
              )
            ) : (
              <div>NO EXTRACTABLE DEPOSITS</div>
            )}
          </div>
        </div>

        {/* Market */}
        <div
          className={`bg-muted/30 border border-primary/20 rounded p-3 cursor-pointer transition-colors hover:bg-muted/50 ${!location.has_market ? 'opacity-50' : ''}`}
          onClick={location.has_market ? onMarketClick : undefined}
        >
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-4 h-4" />
            <span className="text-primary font-bold text-sm">TRADE</span>
            <div className={`text-xs px-1 rounded ${getStatusColor(location.has_market)}`}>
              {location.has_market ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {location.has_market ? (
              loadingMarket ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  CONNECTING...
                </div>
              ) : marketPreview ? (
                <div>
                  <div>LISTINGS: {marketPreview.totalListings}</div>
                  {marketPreview.cheapestItem && (
                    <div>FROM: {marketPreview.cheapestItem.price} RUST</div>
                  )}
                </div>
              ) : (
                <div>MARKETPLACE ACTIVE</div>
              )
            ) : (
              <div>NO TRADING POST</div>
            )}
          </div>
        </div>

        {/* Scavenge */}
        <div
          className={`bg-muted/30 border border-primary/20 rounded p-3 cursor-pointer transition-colors hover:bg-muted/50 ${!location.hasScaveging ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4" />
            <span className="text-primary font-bold text-sm">SCAVENGE</span>
            <div className={`text-xs px-1 rounded ${getStatusColor(location.hasScaveging)}`}>
              {location.hasScaveging ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {location.hasScaveging ? (
              <div>SALVAGE OPERATION READY</div>
            ) : (
              <div>AREA SWEPT CLEAN</div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div
          className={`bg-muted/30 border border-primary/20 rounded p-3 cursor-pointer transition-colors hover:bg-muted/50 ${!location.has_chat ? 'opacity-50' : ''}`}
          onClick={location.has_chat ? onChatClick : undefined}
        >
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4" />
            <span className="text-primary font-bold text-sm">COMM</span>
            <div className={`text-xs px-1 rounded ${getStatusColor(location.has_chat)}`}>
              {location.has_chat ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {location.has_chat ? (
              <div>
                {chatParticipants > 0 ? `${chatParticipants} ACTIVE CHANNELS` : 'OPEN FREQUENCY'}
              </div>
            ) : (
              <div>COMMUNICATIONS DOWN</div>
            )}
          </div>
        </div>
      </div>

      {/* System Access Buttons */}
      <div className="border-t border-primary/20 pt-3">
        <div className="text-muted-foreground text-xs mb-2">SYSTEM ACCESS</div>
        <div className="grid grid-cols-3 gap-2">
          {onEconomyClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEconomyClick}
              className="text-xs font-mono h-8"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              ECONOMY
            </Button>
          )}
          {onRustMarketClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRustMarketClick}
              className="text-xs font-mono h-8"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              EXCHANGE
            </Button>
          )}
          {onLeaderboardsClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLeaderboardsClick}
              className="text-xs font-mono h-8"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              RANKINGS
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  const DetailedResourcePreview = () => {
    if (!location.has_mining) return null

    return (
      <div className="bg-background border border-primary/30 rounded-lg p-4 font-mono">
        <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
          <Gem className="w-4 h-4" />
          GEOLOGICAL SURVEY
        </div>
        {loadingResources ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-xs text-muted-foreground">ANALYZING DEPOSITS...</span>
          </div>
        ) : locationResources.length > 0 ? (
          <div className="bg-muted/20 border border-primary/10 rounded p-2 max-h-32 overflow-y-auto">
            {locationResources.map((resource) => (
              <div key={resource.id} className="flex items-center justify-between py-1 border-b border-border/30 last:border-b-0">
                <span className={`text-xs font-bold ${getRarityColor(resource.itemRarity)}`}>
                  {resource.itemName.toUpperCase()}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1 rounded ${getRarityColor(resource.itemRarity)}`}>
                    {resource.itemRarity}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(resource.spawn_rate * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground py-2 bg-muted/20 border border-primary/10 rounded p-2">
            NO CONFIRMED DEPOSITS - MANUAL SURVEY REQUIRED
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">

      <LocalRadio location_id={'mining-plains'} />
      {/* Activity Monitor Section */}
      <div className="bg-background border border-primary/30 rounded-lg p-4 font-mono">
        <div className="flex items-center justify-between mb-3">
          <div className="text-muted-foreground text-xs flex items-center gap-2">
            <Activity className="w-4 h-4" />
            NETWORK ACTIVITY MONITOR
          </div>
          <Button
            onClick={() => setShowActivityMonitor(!showActivityMonitor)}
            variant="outline"
            size="sm"
            className="text-xs font-mono h-6"
          >
            {showActivityMonitor ? 'HIDE' : 'SHOW'}
          </Button>
        </div>

        {showActivityMonitor && (
          <div className="bg-muted/20 border border-primary/10 rounded p-2">
            <ActivityMonitor
              className="w-full"
              maxHeight="h-98"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-2">
        LOCATION_INTERFACE_v2089 | LAST_UPDATE: {new Date().toLocaleTimeString()}
      </div>
      <AtmosphericHeader />
      <ActionPreviewButtons />
      <DetailedResourcePreview />
    </div>
  )
}
