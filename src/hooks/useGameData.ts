// src/hooks/useGameData.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import type {
  Character,
  GameView,
  DatabaseLocation,
  MarketItem,
  ChatMessage,
  Player,
} from '@/types'

const API_BASE = '/.netlify/functions'

// Create a separate client for realtime (using anon key)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const realtimeSupabase = createClient(supabaseUrl, supabaseAnonKey)

interface UseGameDataReturn {
  locations: DatabaseLocation[]
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
    addPresenceMessage: (message: ChatMessage) => void
  }
}

export function useGameData(
  character: Character | null,
  currentView: GameView,
  selectedLocation: DatabaseLocation | null // Changed from Location to DatabaseLocation
): UseGameDataReturn {
  const [locations, setLocations] = useState<DatabaseLocation[]>([]) // Changed type
  const [marketItems, setMarketItems] = useState<MarketItem[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [playersAtLocation, setPlayersAtLocation] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep track of current subscriptions
  const chatSubscriptionRef = useRef<ReturnType<
    typeof realtimeSupabase.channel
  > | null>(null)
  const playersSubscriptionRef = useRef<ReturnType<
    typeof realtimeSupabase.channel
  > | null>(null)
  const currentLocationIdRef = useRef<string | null>(null)

  const loadGameData = useCallback(async () => {
    try {
      setLoading(true)
      // Make sure your get-locations API returns locations with svgpathid field
      const locationsResponse = await fetch(`${API_BASE}/get-locations`)
      if (!locationsResponse.ok) throw new Error('Failed to load locations')
      const locationsData = await locationsResponse.json()

      // Debug log to see what we're getting
      console.log(
        '🗂️ Loaded locations from API:',
        locationsData.locations?.length || 0
      )
      // console.log('📋 Sample location:', locationsData.locations?.[0])

      setLocations(locationsData.locations || [])
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
    console.log('Loading chat messages for locationId:', locationId)
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

  // NEW: Function to add presence messages to the main chat state
  const addPresenceMessage = useCallback((message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message])
  }, [])

  // Helper function to transform a raw chat message from realtime
  const transformRealtimeMessage = useCallback(
    async (rawMessage: {
      id: string
      locationId: string
      characterId: string
      message: string
      messageType: 'CHAT' | 'EMOTE' | 'SYSTEM'
      isSystem: boolean
      createdAt: string
    }): Promise<ChatMessage | null> => {
      console.log('Transform function called with:', rawMessage)

      try {
        // Get character details if not a system message
        let character = null
        if (!rawMessage.isSystem && rawMessage.characterId) {
          const { data: charData } = await realtimeSupabase
            .from('characters')
            .select('id, name, characterType, currentImageUrl')
            .eq('id', rawMessage.characterId)
            .single()

          if (charData) {
            character = {
              id: charData.id,
              name: charData.name,
              characterType: charData.characterType,
              imageUrl: charData.currentImageUrl,
            }
          }
        }

        // Get location details
        const { data: locationData } = await realtimeSupabase
          .from('locations')
          .select('id, name, locationType')
          .eq('id', rawMessage.locationId)
          .single()

        if (!locationData) return null

        // Calculate time ago
        const timeAgo = getTimeAgo(new Date(rawMessage.createdAt))

        return {
          id: rawMessage.id,
          message: rawMessage.message,
          messageType: rawMessage.messageType,
          isSystem: rawMessage.isSystem,
          timeAgo: timeAgo,
          createdAt: rawMessage.createdAt,
          character: rawMessage.isSystem
            ? undefined
            : character
            ? {
                id: character.id,
                name: character.name,
                characterType: character.characterType,
                imageUrl: character.imageUrl || undefined,
              }
            : undefined,
          location: {
            id: locationData.id,
            name: locationData.name,
            locationType: locationData.locationType,
          },
        }
      } catch (error) {
        console.error('Error transforming realtime message:', error)
        return null
      }
    },
    []
  )

  // Subscribe to realtime chat messages for current location
  const subscribeToChat = useCallback(
    (locationId: string) => {
      // Unsubscribe from previous location if exists
      if (chatSubscriptionRef.current) {
        chatSubscriptionRef.current.unsubscribe()
      }

      console.log('Subscribing to chat for location:', locationId)

      chatSubscriptionRef.current = realtimeSupabase
        .channel(`chat_${locationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `locationId=eq.${locationId}`,
          },
          async (payload) => {
            console.log('New chat message received:', payload)

            const transformedMessage = await transformRealtimeMessage(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              payload.new as any
            )
            if (transformedMessage) {
              setChatMessages((prev) => [...prev, transformedMessage])
            }
          }
        )
        .subscribe((status) => {
          console.log('Chat subscription status:', status)
        })

      currentLocationIdRef.current = locationId
    },
    [transformRealtimeMessage]
  )

  // Subscribe to realtime player changes for current location
  const subscribeToPlayers = useCallback(
    (locationId: string) => {
      // Unsubscribe from previous location if exists
      if (playersSubscriptionRef.current) {
        playersSubscriptionRef.current.unsubscribe()
      }

      console.log('Subscribing to players for location:', locationId)

      playersSubscriptionRef.current = realtimeSupabase
        .channel(`players_${locationId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'characters',
            filter: `currentLocationId=eq.${locationId}`,
          },
          async (payload) => {
            console.log('Player movement detected:', payload.eventType, payload)

            // Refresh the players list when someone arrives/leaves/updates
            await loadPlayersAtLocation(locationId)
          }
        )
        .subscribe((status) => {
          console.log('Players subscription status:', status)
        })
    },
    [loadPlayersAtLocation]
  )

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
      setChatMessages([])
      const locationId = selectedLocation?.id || character.currentLocation.id

      loadChatMessages(locationId).then(() => {
        // Only start subscription AFTER initial messages load
        subscribeToChat(locationId)
      })
    }
  }, [
    currentView,
    selectedLocation?.id,
    character?.currentLocation.id,
    character,
    loadChatMessages,
    subscribeToChat,
  ])

  // Subscribe to players when on main view
  useEffect(() => {
    if (character && currentView === 'main') {
      const locationId = selectedLocation?.id || character.currentLocation.id
      loadPlayersAtLocation(locationId)

      // Subscribe to real-time player updates for the main view
      subscribeToPlayers(locationId)
    }
  }, [
    currentView,
    selectedLocation?.id,
    character?.currentLocation.id,
    character,
    loadPlayersAtLocation,
    subscribeToPlayers,
  ])

  // Clean up subscriptions when location changes or component unmounts
  useEffect(() => {
    const currentLocationId =
      selectedLocation?.id || character?.currentLocation.id

    if (
      currentView !== 'chat' ||
      currentLocationIdRef.current !== currentLocationId
    ) {
      if (chatSubscriptionRef.current) {
        console.log('Unsubscribing from chat')
        chatSubscriptionRef.current.unsubscribe()
        chatSubscriptionRef.current = null
      }
    }

    if (
      currentView !== 'main' ||
      currentLocationIdRef.current !== currentLocationId
    ) {
      if (playersSubscriptionRef.current) {
        console.log('Unsubscribing from players')
        playersSubscriptionRef.current.unsubscribe()
        playersSubscriptionRef.current = null
      }
    }

    // Update current location ref
    currentLocationIdRef.current = currentLocationId || null

    // Cleanup on unmount
    return () => {
      if (chatSubscriptionRef.current) {
        chatSubscriptionRef.current.unsubscribe()
      }
      if (playersSubscriptionRef.current) {
        playersSubscriptionRef.current.unsubscribe()
      }
    }
  }, [currentView, selectedLocation?.id, character?.currentLocation.id])

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
      addPresenceMessage,
    },
  }
}

// Helper function to calculate time ago (same as in your get-chat.js)
function getTimeAgo(date: Date) {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  }
}
