// src/hooks/usePlayerCharacter.ts - WITH REAL-TIME SUBSCRIPTIONS
import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'
import type { Character } from '@/types'

const API_BASE = '/.netlify/functions'

// Create Supabase client for real-time subscriptions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const realtimeSupabase = createClient(supabaseUrl, supabaseAnonKey)

interface UsePlayerCharacterReturn {
  character: Character | null
  loading: boolean
  hasCharacter: boolean
  error: string | null
  refetchCharacter: () => Promise<void>
}

export function usePlayerCharacter(): UsePlayerCharacterReturn {
  const wallet = useWallet()
  const [character, setCharacter] = useState<Character | null>(null)
  console.log('🔍 Character in hook:', character?.id, character?.coins)

  const [loading, setLoading] = useState(false)
  const [hasCharacter, setHasCharacter] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Real-time subscription refs
  const characterSubscriptionRef = useRef<ReturnType<
    typeof realtimeSupabase.channel
  > | null>(null)
  const inventorySubscriptionRef = useRef<ReturnType<
    typeof realtimeSupabase.channel
  > | null>(null)

  // Right after creating realtimeSupabase
  console.log('🔌 Supabase client created:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    client: !!realtimeSupabase,
  })

  const fetchCharacter = useCallback(
    async (isRefetch = false) => {
      if (!wallet.connected || !wallet.publicKey) {
        setCharacter(null)
        setHasCharacter(false)
        setError(null)
        setIsInitialLoad(false)
        return
      }

      // Only show loading spinner on initial load, not on refetches
      if (!isRefetch) {
        setLoading(true)
      }
      setError(null)

      try {
        const response = await fetch(
          `${API_BASE}/get-player-character?walletAddress=${wallet.publicKey.toString()}`
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch character')
        }

        if (data.hasCharacter) {
          setCharacter(data.character)
          setHasCharacter(true)
        } else {
          setCharacter(null)
          setHasCharacter(false)
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setCharacter(null)
        setHasCharacter(false)
        console.error('Error fetching character:', err)
      } finally {
        setLoading(false)
        setIsInitialLoad(false)
      }
    },
    [wallet.connected, wallet.publicKey?.toString()]
  )

  // Real-time character updates subscription
  const subscribeToCharacterUpdates = useCallback((characterId: string) => {
    console.log('🔄 Subscribing to character updates for:', characterId)

    // Clean up existing subscription
    if (characterSubscriptionRef.current) {
      characterSubscriptionRef.current.unsubscribe()
    }

    characterSubscriptionRef.current = realtimeSupabase
      .channel(`character-updates-${characterId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'characters',
          filter: `id=eq.${characterId}`,
        },
        (payload) => {
          console.log('📡 Character update received:', payload.new)

          // Update character state with new data
          setCharacter((prev) => {
            if (!prev) return prev

            const new_ = payload.new as any

            // FORCE a new object reference - this is the key fix
            const updated = {
              ...prev,
              ...new_,
              // Preserve nested objects that might not be in the update
              currentLocation: prev.currentLocation
                ? { ...prev.currentLocation }
                : prev.currentLocation,
              inventory: prev.inventory ? [...prev.inventory] : prev.inventory,
              // Force re-render with timestamp
              _lastUpdated: Date.now(),
            }

            console.log('🔄 Character state updated:', {
              oldCoins: prev.coins,
              newCoins: updated.coins,
              timestamp: updated._lastUpdated,
            })

            // Show toast for significant changes
            if (new_.energy !== undefined && new_.energy !== prev.energy) {
              const diff = new_.energy - prev.energy
              if (diff > 0) {
                toast.success(`+${diff} Energy`, { duration: 2000 })
              }
            }

            if (new_.health !== undefined && new_.health !== prev.health) {
              const diff = new_.health - prev.health
              if (diff > 0) {
                toast.success(`+${diff} Health`, { duration: 2000 })
              }
            }

            if (new_.coins !== undefined && new_.coins !== prev.coins) {
              const diff = new_.coins - prev.coins
              if (diff > 0) {
                toast.success(`+${diff} Coins`, { duration: 2000 })
              }
            }

            if (new_.level !== undefined && new_.level > prev.level) {
              toast.success(`🎉 Level Up! Level ${new_.level}`, {
                duration: 4000,
              })
            }

            return updated
          })
        }
      )
      .subscribe((status) => {
        console.log('📡 Character subscription status:', status)
      })
  }, [])

  // Real-time inventory updates subscription
  const subscribeToInventoryUpdates = useCallback(
    (characterId: string) => {
      console.log('🎒 Subscribing to inventory updates for:', characterId)

      // Clean up existing subscription
      if (inventorySubscriptionRef.current) {
        inventorySubscriptionRef.current.unsubscribe()
      }

      inventorySubscriptionRef.current = realtimeSupabase
        .channel(`inventory-updates-${characterId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'character_inventory',
            filter: `characterId=eq.${characterId}`,
          },
          async (payload) => {
            console.log(
              '🎒 Inventory update received:',
              payload.eventType,
              payload
            )

            // For inventory changes, we need to refetch to get the full item details
            // This is because the inventory table only has item IDs, not full item data
            await fetchCharacter(true)

            // Show appropriate toast messages
            if (payload.eventType === 'INSERT') {
              toast.success('New item added to inventory!', { duration: 2000 })
            } else if (payload.eventType === 'UPDATE') {
              const newData = payload.new as any
              const oldData = payload.old as any

              if (newData.isEquipped !== oldData?.isEquipped) {
                // Equipment change
                if (newData.isEquipped) {
                  toast.success('Item equipped!', { duration: 2000 })
                } else {
                  toast.success('Item unequipped!', { duration: 2000 })
                }
              } else if (
                newData.is_primary !== oldData?.is_primary &&
                newData.is_primary
              ) {
                toast.success('Primary item updated!', { duration: 2000 })
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('🎒 Inventory subscription status:', status)
        })
    },
    [fetchCharacter]
  )

  // Clean up subscriptions
  const cleanupSubscriptions = useCallback(() => {
    if (characterSubscriptionRef.current) {
      console.log('🧹 Cleaning up character subscription')
      characterSubscriptionRef.current.unsubscribe()
      characterSubscriptionRef.current = null
    }

    if (inventorySubscriptionRef.current) {
      console.log('🧹 Cleaning up inventory subscription')
      inventorySubscriptionRef.current.unsubscribe()
      inventorySubscriptionRef.current = null
    }
  }, [])

  // Fetch character when wallet connects/changes
  useEffect(() => {
    fetchCharacter(false) // Initial load
  }, [fetchCharacter])

  // Set up real-time subscriptions when character is loaded
  useEffect(() => {
    if (character?.id && hasCharacter) {
      console.log(
        '🚀 Setting up real-time subscriptions for character:',
        character.id
      )
      subscribeToCharacterUpdates(character.id)
      subscribeToInventoryUpdates(character.id)
    } else {
      // Clean up subscriptions when no character
      cleanupSubscriptions()
    }

    // Cleanup on unmount or character change
    return cleanupSubscriptions
  }, [
    character?.id,
    hasCharacter,
    subscribeToCharacterUpdates,
    subscribeToInventoryUpdates,
    cleanupSubscriptions,
  ])

  // Clean up subscriptions when wallet disconnects
  useEffect(() => {
    if (!wallet.connected) {
      cleanupSubscriptions()
    }
  }, [wallet.connected, cleanupSubscriptions])

  const refetchCharacter = useCallback(async () => {
    await fetchCharacter(true) // This is a refetch, don't show loading
  }, [fetchCharacter])

  return {
    character,
    loading: loading && isInitialLoad, // Only show loading on initial load
    hasCharacter,
    error,
    refetchCharacter, // Still available for edge cases, but most calls will be eliminated
  }
}

// Helper hook for character actions - UNCHANGED
export function useCharacterActions() {
  const wallet = useWallet()

  const performAction = useCallback(
    async (actionType: string, payload: Record<string, unknown> = {}) => {
      if (!wallet.connected || !wallet.publicKey) {
        toast.error('Please connect your wallet')
        throw new Error('Wallet not connected')
      }

      const requestBody = {
        walletAddress: wallet.publicKey.toString(),
        ...payload,
      }

      try {
        const response = await fetch(`${API_BASE}/${actionType}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message || result.error || 'Action failed')
        }

        return result
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        toast.error(`Failed: ${errorMessage}`)
        throw error
      }
    },
    [wallet.connected, wallet.publicKey]
  )

  return {
    mine: useCallback(
      (locationId?: string) => performAction('mine-action', { locationId }),
      [performAction]
    ),

    travel: useCallback(
      (destinationId: string) =>
        performAction('travel-action', { destinationId }),
      [performAction]
    ),

    buyItem: useCallback(
      (marketListingId: string, quantity = 1) =>
        performAction('buy-item', { marketListingId, quantity }),
      [performAction]
    ),

    useItem: useCallback(
      (inventoryId: string) => performAction('use-item', { inventoryId }),
      [performAction]
    ),

    equipItem: useCallback(
      (inventoryId: string, equip = true) =>
        performAction('equip-item', { inventoryId, equip }),
      [performAction]
    ),

    sendMessage: useCallback(
      (locationId: string, message: string, messageType = 'CHAT') =>
        performAction('send-message', { locationId, message, messageType }),
      [performAction]
    ),
  }
}
