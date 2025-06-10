// src/hooks/useGameData.ts - Optimized version
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
  selectedLocation: DatabaseLocation | null
): UseGameDataReturn {
  const [locations, setLocations] = useState<DatabaseLocation[]>([])
  const [marketItems, setMarketItems] = useState<MarketItem[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [playersAtLocation, setPlayersAtLocation] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep track of current subscriptions and prevent duplicate calls
  const chatSubscriptionRef = useRef<ReturnType<
    typeof realtimeSupabase.channel
  > | null>(null)
  const playersSubscriptionRef = useRef<ReturnType<
    typeof realtimeSupabase.channel
  > | null>(null)
  const currentLocationIdRef = useRef<string | null>(null)
  const loadingPlayersRef = useRef<boolean>(false)

  const loadGameData = useCallback(async () => {
    try {
      setLoading(true)
      const locationsResponse = await fetch(`${API_BASE}/get-locations`)
      if (!locationsResponse.ok) throw new Error('Failed to load locations')
      const locationsData = await locationsResponse.json()

      setLocations(locationsData.locations || [])
      setError(null)
    } catch (err) {
      console.error('Failed to load game data:', err)
      setError('Failed to load game data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMarketItems = useCallback(async (location_id: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/get-market?location_id=${location_id}`
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

  const loadChatMessages = useCallback(async (location_id: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/get-chat?location_id=${location_id}&limit=50`
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

  // Optimized loadPlayersAtLocation with debouncing
  const loadPlayersAtLocation = useCallback(async (location_id: string) => {
    // Prevent multiple simultaneous calls
    if (loadingPlayersRef.current) {
      console.log('🚫 Already loading players, skipping duplicate call')
      return
    }

    try {
      loadingPlayersRef.current = true
      console.log('🔄 Loading players for location:', location_id)

      const response = await fetch(
        `${API_BASE}/get-players-at-location?location_id=${location_id}`
      )

      if (response.ok) {
        const data = await response.json()
        setPlayersAtLocation(data.players || [])
        console.log(`✅ Loaded ${data.players?.length || 0} players`)
      } else {
        const errorText = await response.text()
        console.error('❌ Failed to load players:', response.status, errorText)
        setPlayersAtLocation([])
      }
    } catch (error) {
      console.error('❌ Failed to load players:', error)
      setPlayersAtLocation([])
    } finally {
      loadingPlayersRef.current = false
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
      location_id: string
      character_id: string
      message: string
      message_type: 'CHAT' | 'EMOTE' | 'SYSTEM'
      is_system: boolean
      created_at: string
    }): Promise<ChatMessage | null> => {
      try {
        // Get character details if not a system message
        let character = null
        if (!rawMessage.is_system && rawMessage.character_id) {
          const { data: charData } = await realtimeSupabase
            .from('characters')
            .select('id, name, character_type, current_image_url')
            .eq('id', rawMessage.character_id)
            .single()

          if (charData) {
            character = {
              id: charData.id,
              name: charData.name,
              character_type: charData.character_type,
              image_url: charData.current_image_url,
            }
          }
        }

        // Get location details
        const { data: locationData } = await realtimeSupabase
          .from('locations')
          .select('id, name, location_type')
          .eq('id', rawMessage.location_id)
          .single()

        if (!locationData) return null

        // Calculate time ago
        const timeAgo = getTimeAgo(new Date(rawMessage.created_at))

        return {
          id: rawMessage.id,
          message: rawMessage.message,
          message_type: rawMessage.message_type,
          is_system: rawMessage.is_system,
          timeAgo: timeAgo,
          created_at: rawMessage.created_at,
          character: rawMessage.is_system
            ? undefined
            : character
            ? {
                id: character.id,
                name: character.name,
                character_type: character.character_type,
                image_url: character.image_url || undefined,
              }
            : undefined,
          location: {
            id: locationData.id,
            name: locationData.name,
            location_type: locationData.location_type,
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
    (location_id: string) => {
      // Unsubscribe from previous location if exists
      if (chatSubscriptionRef.current) {
        chatSubscriptionRef.current.unsubscribe()
      }

      chatSubscriptionRef.current = realtimeSupabase
        .channel(`chat_${location_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `location_id=eq.${location_id}`,
          },
          async (payload) => {
            console.log('New chat message received:', payload)

            const transformedMessage = await transformRealtimeMessage(
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

      currentLocationIdRef.current = location_id
    },
    [transformRealtimeMessage]
  )

  // Debounced player subscription to prevent excessive API calls
  const subscribeToPlayers = useCallback(
    (location_id: string) => {
      // Unsubscribe from previous location if exists
      if (playersSubscriptionRef.current) {
        playersSubscriptionRef.current.unsubscribe()
      }

      let debounceTimer: NodeJS.Timeout | null = null

      playersSubscriptionRef.current = realtimeSupabase
        .channel(`players_${location_id}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'characters',
            filter: `current_location_id=eq.${location_id}`,
          },
          async (payload) => {
            console.log('Player movement detected:', payload.eventType, payload)

            // Debounce the API call to prevent spam
            if (debounceTimer) {
              clearTimeout(debounceTimer)
            }

            debounceTimer = setTimeout(async () => {
              await loadPlayersAtLocation(location_id)
            }, 500) // 500ms debounce
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
      const location_id = selectedLocation?.id || character.currentLocation.id

      loadChatMessages(location_id).then(() => {
        // Only start subscription AFTER initial messages load
        subscribeToChat(location_id)
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
      const location_id = selectedLocation?.id || character.currentLocation.id
      loadPlayersAtLocation(location_id)

      // Subscribe to real-time player updates for the main view
      subscribeToPlayers(location_id)
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

// Helper function to calculate time ago
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
