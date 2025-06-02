// src/hooks/useGameData.ts
import { useState, useEffect, useCallback } from 'react'
import type {
  Character,
  GameView,
  Location,
  MarketItem,
  ChatMessage,
  Player,
} from '@/types'

const API_BASE = '/.netlify/functions'

interface UseGameDataReturn {
  locations: Location[]
  marketItems: MarketItem[]
  chatMessages: ChatMessage[]
  playersAtLocation: Player[]
  loading: boolean
  error: string | null
  actions: {
    loadGameData: () => Promise<void>
    loadMarketItems: (locationId: string) => Promise<void>
    loadChatMessages: (locationId: string) => Promise<void>
    loadPlayersAtLocation: (locationId: string) => Promise<void>
    setMarketItems: React.Dispatch<React.SetStateAction<MarketItem[]>>
  }
}

export function useGameData(
  character: Character | null,
  currentView: GameView,
  selectedLocation: Location | null
): UseGameDataReturn {
  const [locations, setLocations] = useState<Location[]>([])
  const [marketItems, setMarketItems] = useState<MarketItem[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [playersAtLocation, setPlayersAtLocation] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadGameData = useCallback(async () => {
    try {
      setLoading(true)
      const locationsResponse = await fetch(`${API_BASE}/get-locations`)
      if (!locationsResponse.ok) throw new Error('Failed to load locations')
      const locationsData = await locationsResponse.json()
      setLocations(locationsData.locations)
      setError(null)
    } catch (err) {
      console.error('Failed to load game data:', err)
      setError('Failed to load game data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMarketItems = useCallback(async (locationId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/get-market?locationId=${locationId}`
      )
      if (response.ok) {
        const data = await response.json()
        setMarketItems(data.items || [])
      }
    } catch (error) {
      console.error('Failed to load market items:', error)
      setMarketItems([])
    }
  }, [])

  const loadChatMessages = useCallback(async (locationId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/get-chat?locationId=${locationId}&limit=50`
      )
      if (response.ok) {
        const data = await response.json()
        setChatMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error)
      setChatMessages([])
    }
  }, [])

  const loadPlayersAtLocation = useCallback(async (locationId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/get-players-at-location?locationId=${locationId}`
      )
      if (response.ok) {
        const data = await response.json()
        setPlayersAtLocation(data.players || [])
      }
    } catch (error) {
      console.error('Failed to load players:', error)
      setPlayersAtLocation([])
    }
  }, [])

  // Load initial data when wallet connects and character is available
  useEffect(() => {
    if (character) {
      loadGameData()
      loadPlayersAtLocation(character.currentLocation.id)
    }
  }, [
    character?.id,
    character?.currentLocation.id,
    loadGameData,
    loadPlayersAtLocation,
  ])

  // Load chat when location changes and chat view is active
  useEffect(() => {
    if (character && currentView === 'chat') {
      loadChatMessages(selectedLocation?.id || character.currentLocation.id)
    }
  }, [
    currentView,
    selectedLocation?.id,
    character?.currentLocation.id,
    character,
    loadChatMessages,
  ])

  // Load players when viewing location
  useEffect(() => {
    if (selectedLocation && currentView === 'location') {
      loadPlayersAtLocation(selectedLocation.id)
    }
  }, [
    selectedLocation?.id,
    currentView,
    selectedLocation,
    loadPlayersAtLocation,
  ])

  // Load market when opening market view
  useEffect(() => {
    if (character && currentView === 'market') {
      loadMarketItems(selectedLocation?.id || character.currentLocation.id)
    }
  }, [
    currentView,
    selectedLocation?.id,
    character?.currentLocation.id,
    character,
    loadMarketItems,
  ])

  return {
    locations,
    marketItems,
    chatMessages,
    playersAtLocation,
    loading,
    error,
    actions: {
      loadGameData,
      loadMarketItems,
      loadChatMessages,
      loadPlayersAtLocation,
      setMarketItems,
    },
  }
}
