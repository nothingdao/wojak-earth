// src/hooks/usePlayerCharacter.ts
import { useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { toast } from '@/components/ui/use-toast'
import { adaptCharacter } from '@/lib/convex-adapters'
import type { Character, UsePlayerCharacterReturn } from '@/types'

export function usePlayerCharacter(shouldLoad: boolean = true): UsePlayerCharacterReturn {
  const wallet = useWallet()
  const walletAddress = wallet.connected && wallet.publicKey ? wallet.publicKey.toString() : undefined

  const result = useQuery(
    api.earth.characters.getFullByWallet,
    shouldLoad && walletAddress ? { walletAddress } : 'skip'
  )

  const character: Character | null = result
    ? adaptCharacter(result.character, result.location, result.inventory, (result as any).completedChapters)
    : null

  const loading = result === undefined && shouldLoad && !!walletAddress
  const hasCharacter = !!character
  const error: string | null = null

  const refetchCharacter = useCallback(async () => {
    // Convex useQuery is reactive — no manual refetch needed
  }, [])

  return {
    character: shouldLoad ? character : null,
    loading: shouldLoad ? loading : false,
    hasCharacter: shouldLoad ? hasCharacter : false,
    error: shouldLoad ? error : null,
    refetchCharacter,
  }
}

export function useCharacterActions(shouldLoad: boolean = true) {
  const wallet = useWallet()
  const mineAtLocation = useMutation(api.earth.transactions.mineAtLocation)
  const travelMutation = useMutation(api.earth.transactions.travel)
  const buyMutation = useMutation(api.earth.market.buy)
  const equipMutation = useMutation(api.earth.inventory.equip)
  const unequipMutation = useMutation(api.earth.inventory.unequip)
  const sendChatMutation = useMutation(api.earth.chat.send)

  const requireWallet = () => {
    if (!shouldLoad) throw new Error('Actions not available on this network')
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Please connect your wallet')
      throw new Error('Wallet not connected')
    }
    return wallet.publicKey.toString()
  }

  return {
    mine: useCallback(
      async (locationId?: string) => {
        const walletAddress = requireWallet()
        if (!locationId) throw new Error('Location ID required for mining')
        try {
          const result = await mineAtLocation({ walletAddress, locationId })
          return result
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Mining failed'
          toast.error(`Mining failed: ${msg}`)
          throw err
        }
      },
      [wallet.connected, wallet.publicKey, shouldLoad, mineAtLocation]
    ),

    travel: useCallback(
      async (destinationId: string) => {
        const walletAddress = requireWallet()
        if (!destinationId) throw new Error('Destination ID required')
        try {
          await travelMutation({ walletAddress, destinationLocationId: destinationId })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Travel failed'
          toast.error(`Travel failed: ${msg}`)
          throw err
        }
      },
      [wallet.connected, wallet.publicKey, shouldLoad, travelMutation]
    ),

    buyItem: useCallback(
      async (listingId: string, quantity = 1) => {
        const walletAddress = requireWallet()
        try {
          await buyMutation({
            walletAddress,
            listingId: listingId as Id<'earth_marketListings'>,
            quantity,
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Purchase failed'
          toast.error(`Purchase failed: ${msg}`)
          throw err
        }
      },
      [wallet.connected, wallet.publicKey, shouldLoad, buyMutation]
    ),

    useItem: useCallback(
      async (_inventoryId: string) => {
        // TODO: add useItem mutation to Convex
        toast.error('Item use not yet available')
        return {}
      },
      [shouldLoad]
    ),

    equipItem: useCallback(
      async (inventoryId: string, equip = true) => {
        const walletAddress = requireWallet()
        try {
          if (equip) {
            await equipMutation({
              walletAddress,
              inventoryId: inventoryId as Id<'earth_inventory'>,
            })
          } else {
            await unequipMutation({
              walletAddress,
              inventoryId: inventoryId as Id<'earth_inventory'>,
            })
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Equip failed'
          toast.error(`Equip failed: ${msg}`)
          throw err
        }
      },
      [wallet.connected, wallet.publicKey, shouldLoad, equipMutation, unequipMutation]
    ),

    sendMessage: useCallback(
      async (location_id: string, message: string, message_type = 'CHAT') => {
        const walletAddress = requireWallet()
        try {
          await sendChatMutation({
            walletAddress,
            locationId: location_id,
            message: message.trim(),
            messageType: message_type as 'CHAT' | 'EMOTE' | 'SYSTEM' | 'WHISPER',
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Message failed'
          toast.error(`Send failed: ${msg}`)
          throw err
        }
      },
      [wallet.connected, wallet.publicKey, shouldLoad, sendChatMutation]
    ),
  }
}
