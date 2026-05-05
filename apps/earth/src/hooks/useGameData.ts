// src/hooks/useGameData.ts
import { useCallback } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import {
  adaptLocation,
  adaptMarketItem,
  adaptChatMessage,
  adaptCharacterToPlayer,
} from '@/lib/convex-adapters'
import type { Character, GameView, Location, MarketItem, ChatMessage, Player } from '@/types'

interface UseGameDataReturn {
  locations: Location[]
  marketItems: MarketItem[]
  chatMessages: ChatMessage[]
  playersAtLocation: Player[]
  loading: boolean
  error: string | null
  actions: {
    loadGameData: () => Promise<void>
    loadMarketItems: (location_id: string) => Promise<void>
    loadChatMessages: (location_id: string) => Promise<void>
    loadPlayersAtLocation: (location_id: string) => Promise<void>
    setMarketItems: React.Dispatch<React.SetStateAction<MarketItem[]>>
    addPresenceMessage: (message: ChatMessage) => void
  }
}

export function useGameData(
  character: Character | null,
  currentView: GameView,
  selectedLocation: Location | null
): UseGameDataReturn {
  const marketLocationId = selectedLocation?.id ?? character?.currentLocationId ?? null
  const chatLocationId = selectedLocation?.id ?? character?.currentLocationId ?? null
  const playersLocationId = selectedLocation?.id ?? character?.currentLocationId ?? null

  const rawLocations = useQuery(api.earth.locations.getAll, {})
  const rawMarket = useQuery(
    api.earth.market.getByLocation,
    (currentView === 'market' || currentView === 'location') && marketLocationId
      ? { locationId: marketLocationId }
      : 'skip'
  )
  const rawChat = useQuery(
    api.earth.chat.getByLocation,
    currentView === 'chat' && chatLocationId
      ? { locationId: chatLocationId }
      : 'skip'
  )
  const rawPlayers = useQuery(
    api.earth.characters.getAtLocation,
    (currentView === 'main' || currentView === 'location') && playersLocationId
      ? { locationId: playersLocationId }
      : 'skip'
  )

  const locations = (rawLocations ?? []).map(adaptLocation)
  const marketItems = (rawMarket ?? []).map(adaptMarketItem)
  const chatMessages = (rawChat ?? []).map(adaptChatMessage)
  const playersAtLocation = (rawPlayers ?? []).map(adaptCharacterToPlayer)

  const loading = rawLocations === undefined

  // No-op action stubs — Convex is reactive, no manual fetching needed
  const noop = useCallback(async () => {}, [])

  return {
    locations,
    marketItems,
    chatMessages,
    playersAtLocation,
    loading,
    error: null,
    actions: {
      loadGameData: noop,
      loadMarketItems: noop,
      loadChatMessages: noop,
      loadPlayersAtLocation: noop,
      setMarketItems: () => {},
      addPresenceMessage: () => {},
    },
  }
}
