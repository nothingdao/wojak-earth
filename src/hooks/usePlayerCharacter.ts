// src/hooks/usePlayerCharacter.ts - Improved logging and error handling
import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import supabase from '../utils/supabase'
import { toast } from '@/components/ui/use-toast'
import { FUNCTIONS_API_BASE } from '@/config/functionsBase'
import type { Character, UsePlayerCharacterReturn } from '@/types'

const API_BASE = FUNCTIONS_API_BASE

export function usePlayerCharacter(
  shouldLoad: boolean = true
): UsePlayerCharacterReturn {
  const wallet = useWallet()
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasCharacter, setHasCharacter] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Real-time subscription refs
  const characterSubscriptionRef = useRef<ReturnType<
    typeof supabase.channel
  > | null>(null)
  const inventorySubscriptionRef = useRef<ReturnType<
    typeof supabase.channel
  > | null>(null)

  const fetchCharacter = useCallback(
    async (isRefetch = false) => {
      // Don't fetch if shouldLoad is false (mainnet)
      if (!shouldLoad) {
        console.log('⚠️ Character loading disabled (likely mainnet)')
        return
      }

      if (!wallet.connected || !wallet.publicKey) {
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
        console.log(
          '🔍 Loading character for wallet:',
          wallet.publicKey.toString().slice(0, 8) + '...'
        )
      }
      setError(null)

      try {
        const response = await fetch(
          `${API_BASE}/get-player-character?wallet_address=${wallet.publicKey.toString()}`
        )

        const data = await response.json()

        if (!response.ok) {
          // Handle 404 (no character) vs other errors differently
          if (response.status === 404 || data.error === 'NO_PROFILE_FOUND') {
            console.log(
              '💭 No character found for this wallet (this is normal for new players)'
            )
            setCharacter(null)
            setHasCharacter(false)
            setError(null) // Don't set this as an error state
            return
          }

          throw new Error(
            data.message || data.error || 'Failed to fetch character'
          )
        }

        if (data.hasCharacter && data.character) {
          console.log(
            '✅ Character loaded:',
            data.character.name,
            `(Level ${data.character.level})`
          )
          setCharacter(data.character)
          setHasCharacter(true)
          setError(null)
        } else {
          console.log('💭 API returned successfully but no character found')
          setCharacter(null)
          setHasCharacter(false)
          setError(null)
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'

        // Don't log "No character found" as an error - it's expected
        if (
          errorMessage.includes('NO_PROFILE_FOUND') ||
          errorMessage.includes('No active character')
        ) {
          console.log(
            '💭 No character exists for this wallet (ready for character creation)'
          )
          setCharacter(null)
          setHasCharacter(false)
          setError(null)
        } else {
          console.warn('⚠️ Character fetch failed:', errorMessage)
          setError(errorMessage)
          setCharacter(null)
          setHasCharacter(false)
        }
      } finally {
        setLoading(false)
      }
    },
    [wallet.connected, wallet.publicKey?.toString(), shouldLoad]
  )

  // Real-time character updates subscription
  const subscribeToCharacterUpdates = useCallback(
    (character_id: string) => {
      // Don't subscribe if shouldLoad is false
      if (!shouldLoad) return

      // Clean up existing subscription
      if (characterSubscriptionRef.current) {
        characterSubscriptionRef.current.unsubscribe()
      }

      characterSubscriptionRef.current = supabase
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
            console.log('📡 Character stats updated')

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
                inventory: prev.inventory
                  ? [...prev.inventory]
                  : prev.inventory,
                // Force re-render with timestamp
                _lastUpdated: Date.now(),
              }

              // Show toast for significant changes (but log details)
              if (new_.energy !== undefined && new_.energy !== prev.energy) {
                const diff = new_.energy - prev.energy
                if (diff > 0) {
                  console.log(
                    `⚡ Energy: ${prev.energy} → ${new_.energy} (+${diff})`
                  )
                  toast.success(`+${diff} Energy`, { duration: 2000 })
                } else if (diff < 0) {
                  console.log(
                    `⚡ Energy: ${prev.energy} → ${new_.energy} (${diff})`
                  )
                }
              }

              if (new_.health !== undefined && new_.health !== prev.health) {
                const diff = new_.health - prev.health
                if (diff > 0) {
                  console.log(
                    `❤️ Health: ${prev.health} → ${new_.health} (+${diff})`
                  )
                  toast.success(`+${diff} Health`, { duration: 2000 })
                } else if (diff < 0) {
                  console.log(
                    `❤️ Health: ${prev.health} → ${new_.health} (${diff})`
                  )
                }
              }

              if (new_.earth !== undefined && new_.earth !== prev.earth) {
                const diff = new_.earth - prev.earth
                if (diff > 0) {
                  console.log(
                    `🪙 Coins: ${prev.earth} → ${new_.earth} (+${diff})`
                  )
                  toast.success(`+${diff} Coins`, { duration: 2000 })
                } else if (diff < 0) {
                  console.log(
                    `🪙 Coins: ${prev.earth} → ${new_.earth} (${diff})`
                  )
                }
              }

              if (new_.level !== undefined && new_.level > prev.level) {
                console.log(`🎉 Level Up! ${prev.level} → ${new_.level}`)
                toast.success(`🎉 Level Up! Level ${new_.level}`, {
                  duration: 4000,
                })
              }

              return updated
            })
          }
        )
        .subscribe((status) => {
          // Real-time subscription status tracking (silent)
        })
    },
    [shouldLoad]
  )

  // Real-time inventory updates subscription
  const subscribeToInventoryUpdates = useCallback(
    (character_id: string) => {
      // Don't subscribe if shouldLoad is false
      if (!shouldLoad) return

      // Clean up existing subscription
      if (inventorySubscriptionRef.current) {
        inventorySubscriptionRef.current.unsubscribe()
      }

      inventorySubscriptionRef.current = supabase
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
            console.log('🎒 Inventory updated:', payload.eventType)

            // For inventory changes, we need to refetch to get the full item details
            await fetchCharacter(true)

            // Show appropriate toast messages (unless suppressed during mining)
            const suppressToasts = (window as any).__suppressInventoryToasts;
            
            if (!suppressToasts) {
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
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('🎒 Real-time inventory updates connected')
          } else if (status === 'CLOSED') {
            console.log('🎒 Real-time inventory updates disconnected')
          }
        })
    },
    [fetchCharacter, shouldLoad]
  )

  // Clean up subscriptions
  const cleanupSubscriptions = useCallback(() => {
    if (characterSubscriptionRef.current) {
      characterSubscriptionRef.current.unsubscribe()
      characterSubscriptionRef.current = null
    }

    if (inventorySubscriptionRef.current) {
      inventorySubscriptionRef.current.unsubscribe()
      inventorySubscriptionRef.current = null
    }
  }, [])

  // Handle wallet disconnection
  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey) {
      setCharacter(null)
      setHasCharacter(false)
      setError(null)
      setLoading(false)
      cleanupSubscriptions()
    }
  }, [wallet.connected, wallet.publicKey, cleanupSubscriptions])

  // Set up real-time subscriptions when character is loaded
  useEffect(() => {
    if (character?.id && hasCharacter && shouldLoad) {
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
    shouldLoad,
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

  // Fetch character on initial load and wallet change
  useEffect(() => {
    fetchCharacter()
  }, [fetchCharacter])

  const refetchCharacter = useCallback(async () => {
    await fetchCharacter(true) // This is a refetch, don't show loading
  }, [fetchCharacter])

  // Return appropriate state based on shouldLoad
  return {
    character: shouldLoad ? character : null,
    loading: shouldLoad ? loading : false,
    hasCharacter: shouldLoad ? hasCharacter : false,
    error: shouldLoad ? error : null,
    refetchCharacter,
  }
}

// Enhanced error handling and request validation
export function useCharacterActions(shouldLoad: boolean = true) {
  const wallet = useWallet()

  const performAction = useCallback(
    async (actionType: string, payload: Record<string, unknown> = {}) => {
      // Block actions if shouldLoad is false (mainnet)
      if (!shouldLoad) {
        console.log(`⚠️ ${actionType} blocked (likely mainnet)`)
        return {
          success: false,
          message: `${actionType} not available on this network`,
        }
      }

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
        console.log(`🎮 Performing action: ${actionType}`)

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
          console.warn(`❌ ${actionType} failed:`, {
            status: response.status,
            error: errorMessage,
          })
          throw new Error(errorMessage)
        }

        console.log(`✅ ${actionType} completed successfully`)
        return result
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ ${actionType} error:`, errorMessage)
        toast.error(`Failed: ${errorMessage}`)
        throw error
      }
    },
    [wallet.connected, wallet.publicKey, shouldLoad]
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

        console.log('🗺️ Travel action:', destinationId)
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
        performAction('send-message', {
          location_id,
          content: message.trim(), // Changed from 'message' to 'content'
          message_type,
        }),
      [performAction]
    ),
  }
}
