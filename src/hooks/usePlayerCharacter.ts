// src/hooks/usePlayerCharacter.ts - Updated for explicit flow
import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'
import type { Character, UsePlayerCharacterReturn } from '@/types'

const API_BASE = '/.netlify/functions'

// Create Supabase client for real-time subscriptions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const realtimeSupabase = createClient(supabaseUrl, supabaseAnonKey)

export function usePlayerCharacter(): UsePlayerCharacterReturn {
  const wallet = useWallet()
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasCharacter, setHasCharacter] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Real-time subscription refs
  const characterSubscriptionRef = useRef<ReturnType<
    typeof realtimeSupabase.channel
  > | null>(null)
  const inventorySubscriptionRef = useRef<ReturnType<
    typeof realtimeSupabase.channel
  > | null>(null)

  const fetchCharacter = useCallback(
    async (isRefetch = false) => {
      if (!wallet.connected || !wallet.publicKey) {
        // Don't automatically clear state when wallet disconnects
        // Let the GameProvider handle this
        if (!isRefetch) {
          setCharacter(null)
          setHasCharacter(false)
          setError(null)
        }
        return
      }

      // Only show loading spinner on initial load, not on refetches
      if (!isRefetch) {
        setLoading(true)
      }
      setError(null)

      try {
        const response = await fetch(
          `${API_BASE}/get-player-character?wallet_address=${wallet.publicKey.toString()}`
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
      }
    },
    [wallet.connected, wallet.publicKey?.toString()]
  )

  // Real-time character updates subscription
  const subscribeToCharacterUpdates = useCallback((character_id: string) => {
    // Clean up existing subscription
    if (characterSubscriptionRef.current) {
      characterSubscriptionRef.current.unsubscribe()
    }

    characterSubscriptionRef.current = realtimeSupabase
      .channel(`character-updates-${character_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'characters',
          filter: `id=eq.${character_id}`,
        },
        (payload) => {
          console.log('📡 Character update received:', payload.new)

          // Update character state with new data
          setCharacter((prev) => {
            if (!prev) return prev

            const new_ = payload.new as any

            // Force a new object reference
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
    (character_id: string) => {
      // Clean up existing subscription
      if (inventorySubscriptionRef.current) {
        inventorySubscriptionRef.current.unsubscribe()
      }

      inventorySubscriptionRef.current = realtimeSupabase
        .channel(`inventory-updates-${character_id}`)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'character_inventory',
            filter: `character_id=eq.${character_id}`,
          },
          async (payload) => {
            console.log(
              '🎒 Inventory update received:',
              payload.eventType,
              payload
            )

            // For inventory changes, we need to refetch to get the full item details
            await fetchCharacter(true)

            // Show appropriate toast messages
            if (payload.eventType === 'INSERT') {
              toast.success('New item added to inventory!', { duration: 2000 })
            } else if (payload.eventType === 'UPDATE') {
              const newData = payload.new as any
              const oldData = payload.old as any

              if (newData.is_equipped !== oldData?.is_equipped) {
                if (newData.is_equipped) {
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
    loading,
    hasCharacter,
    error,
    refetchCharacter,
  }
}

// Enhanced error handling and request validation
export function useCharacterActions() {
  const wallet = useWallet()

  const performAction = useCallback(
    async (actionType: string, payload: Record<string, unknown> = {}) => {
      if (!wallet.connected || !wallet.publicKey) {
        toast.error('Please connect your wallet')
        throw new Error('Wallet not connected')
      }

      const wallet_address = wallet.publicKey.toString()

      // Ensure we always have the required fields
      const requestBody = {
        wallet_address,
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
          // Enhanced error reporting
          const errorMessage =
            result.message || result.error || `${actionType} failed`
          console.error(`❌ ${actionType} failed:`, {
            status: response.status,
            error: errorMessage,
            requestBody,
            result,
          })
          throw new Error(errorMessage)
        }

        return result
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ ${actionType} error:`, error)
        toast.error(`Failed: ${errorMessage}`)
        throw error
      }
    },
    [wallet.connected, wallet.publicKey]
  )

  return {
    mine: useCallback(() => performAction('mine-action', {}), [performAction]),

    travel: useCallback(
      (destinationId: string) => {
        // Add validation before making the request
        if (!destinationId) {
          const error = new Error('Destination ID is required for travel')
          toast.error('No destination selected')
          throw error
        }

        console.log(
          '🗺️ Travel action called with destinationId:',
          destinationId
        )
        return performAction('travel-action', { destinationId })
      },
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
      (location_id: string, message: string, message_type = 'CHAT') =>
        performAction('send-message', { location_id, message, message_type }),
      [performAction]
    ),
  }
}
