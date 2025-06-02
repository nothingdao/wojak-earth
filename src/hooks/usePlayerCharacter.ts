// src/hooks/usePlayerCharacter.ts
import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import type { Character } from '@/types'

const API_BASE = '/.netlify/functions'

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
  const [loading, setLoading] = useState(false)
  const [hasCharacter, setHasCharacter] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

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

  // Fetch character when wallet connects/changes
  useEffect(() => {
    fetchCharacter(false) // Initial load
  }, [fetchCharacter])

  const refetchCharacter = useCallback(async () => {
    await fetchCharacter(true) // This is a refetch, don't show loading
  }, [fetchCharacter])

  return {
    character,
    loading: loading && isInitialLoad, // Only show loading on initial load
    hasCharacter,
    error,
    refetchCharacter,
  }
}

// Helper hook for character actions
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
