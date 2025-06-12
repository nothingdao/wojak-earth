// ========================================
// 1. COMPLETE useGameHandlers.ts
// ========================================

// src/hooks/useGameHandlers.ts - DEBUGGING VERSION
import { toast } from 'sonner'
import type { Location, MarketItem, Character, GameView } from '@/types'

type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

// Proper API response types
interface MineResponse {
  foundItem?: {
    name: string
    description: string
    rarity: Rarity
  }
  newEnergyLevel: number
}

interface UseItemResponse {
  effects?: {
    energy: number
    health: number
  }
}

interface EquipItemResponse {
  item: {
    name: string
    category: string
    rarity: string
  }
  replacedItems?: string[]
}

interface UseGameHandlersProps {
  character: Character | null
  characterActions: {
    mine: (location_id?: string) => Promise<MineResponse>
    travel: (destinationId: string) => Promise<void>
    buyItem: (marketListingId: string, quantity: number) => Promise<void>
    useItem: (inventoryId: string) => Promise<UseItemResponse>
    equipItem: (
      inventoryId: string,
      equip: boolean
    ) => Promise<EquipItemResponse>
    sendMessage: (
      location_id: string,
      message: string,
      message_type: string
    ) => Promise<void>
  }
  refetchCharacter: () => Promise<void>
  setLoadingItems: React.Dispatch<React.SetStateAction<Set<string>>>
  setMarketItems: React.Dispatch<React.SetStateAction<MarketItem[]>>
  setTravelingTo: React.Dispatch<React.SetStateAction<Location | null>>
  setCurrentView: React.Dispatch<React.SetStateAction<GameView>>
  loadGameData: () => Promise<void>
  loadChatMessages: (location_id: string) => Promise<void>
  selectedLocation: Location | null
  locations: Location[]
  // NEW: Optional map animation state setters
  setIsTravelingOnMap?: React.Dispatch<React.SetStateAction<boolean>>
  setMapTravelDestination?: React.Dispatch<React.SetStateAction<string | null>>
}

export function useGameHandlers({
  character,
  characterActions,
  refetchCharacter,
  setLoadingItems,
  setMarketItems,
  setTravelingTo,
  setCurrentView,
  loadGameData,
  loadChatMessages,
  selectedLocation,
  locations,
  setIsTravelingOnMap,
  setMapTravelDestination,
}: UseGameHandlersProps) {
  const handleMining = async (event?: React.MouseEvent) => {
    // Prevent default behavior that might cause page reload
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (!character) {
      toast.error('No character found')
      return
    }

    setLoadingItems((prev) => new Set(prev).add('mining-action'))

    try {
      const result = await characterActions.mine(
        selectedLocation?.id || character.currentLocation.id
      )

      if (result.foundItem) {
        const rarity = result.foundItem.rarity as Rarity
        const rarityEmoji: Record<Rarity, string> = {
          COMMON: '⚪',
          UNCOMMON: '🟢',
          RARE: '🔵',
          EPIC: '🟣',
          LEGENDARY: '🟡',
        }

        toast.success(
          `Found ${result.foundItem.name}! ${rarityEmoji[rarity] || '⚪'}`,
          {
            description: `${result.foundItem.description} • Energy: ${result.newEnergyLevel}/100`,
            duration: 4000,
          }
        )
      } else {
        toast.info('Nothing found this time...', {
          description: `Keep trying! Energy: ${result.newEnergyLevel}/100`,
          duration: 2000,
        })
      }

      await refetchCharacter()
    } catch (error) {
      console.error('Mining failed:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setLoadingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete('mining-action')
        return newSet
      })
    }
  }

  const handleTravel = async (location_id: string) => {
    // FIXED: Add extensive debugging
    console.log('🗺️ handleTravel called with:', {
      location_id,
      hasCharacter: !!character,
      character_id: character?.id,
      current_location_id: character?.currentLocation?.id,
    })

    if (!character) {
      console.error('❌ No character found for travel')
      toast.error('No character found')
      return
    }

    if (!location_id) {
      console.error('❌ No location_id provided for travel')
      toast.error('No destination selected')
      return
    }

    // Find the destination location
    const destination =
      locations.find((loc) => loc.id === location_id) ||
      locations
        .find((loc) => loc.subLocations?.some((sub) => sub.id === location_id))
        ?.subLocations?.find((sub) => sub.id === location_id)

    console.log('🎯 Destination found:', {
      location_id,
      destination: destination
        ? {
            id: destination.id,
            name: destination.name,
          }
        : null,
      totalLocations: locations.length,
    })

    if (destination) {
      setTravelingTo(destination)
    } else {
      console.warn('⚠️ Destination not found in locations array')
    }

    try {
      console.log('🚀 Calling characterActions.travel with:', location_id)

      await characterActions.travel(location_id)

      console.log('✅ Travel successful, setting timeout for UI update')

      setTimeout(async () => {
        await refetchCharacter()
        await loadGameData()
        setTravelingTo(null)

        // Clear map animation states (only if functions are provided)
        setIsTravelingOnMap?.(false)
        setMapTravelDestination?.(null)

        setCurrentView('main')
        console.log('✅ Travel UI updates completed')
      }, 2800)
    } catch (error) {
      console.error('❌ Travel failed:', error)
      setTravelingTo(null)

      // Clear map animation on error (only if functions are provided)
      setIsTravelingOnMap?.(false)
      setMapTravelDestination?.(null)

      // More detailed error logging
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
        })
      }

      // Error already handled in characterActions, but we'll add a fallback
      // if (!toast.isActive) {
      //   toast.error('Travel failed. Please try again.')
      // }
    }
  }

  const handlePurchase = async (
    marketListingId: string,
    price: number,
    itemName: string
  ) => {
    if (!character) return

    setLoadingItems((prev) => new Set(prev).add(marketListingId))

    try {
      await characterActions.buyItem(marketListingId, 1)

      toast.success(`Bought ${itemName} for ${price} coins!`)

      setMarketItems(
        (prev) =>
          prev
            .map((item) => {
              if (item.id === marketListingId) {
                const newQuantity = item.quantity - 1
                return newQuantity > 0
                  ? { ...item, quantity: newQuantity }
                  : null
              }
              return item
            })
            .filter(Boolean) as MarketItem[]
      )

      await refetchCharacter()
    } catch (error) {
      console.error('Purchase failed:', error)
      // Error already handled in characterActions
    } finally {
      setLoadingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(marketListingId)
        return newSet
      })
    }
  }

  const handleSendMessage = async (chatInput: string) => {
    if (!chatInput.trim() || !character) return

    try {
      await characterActions.sendMessage(
        selectedLocation?.id || character.currentLocation.id,
        chatInput,
        'CHAT'
      )

      await loadChatMessages(
        selectedLocation?.id || character.currentLocation.id
      )
    } catch (error) {
      console.error('Failed to send message:', error)
      // Error already handled in characterActions
    }
  }

  // FIXED: Made event parameter optional and added proper type checking
  const handleEquipItem = async (
    inventoryId: string,
    is_equipped: boolean,
    targetSlot?: string,
    event?: React.MouseEvent
  ) => {
    // Only call preventDefault if event exists and has the method
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault()
      event.stopPropagation()
    }

    if (!character) {
      toast.error('No character found')
      return
    }

    setLoadingItems((prev) => new Set(prev).add(inventoryId))

    try {
      const result = await characterActions.equipItem(inventoryId, !is_equipped)

      if (result.replacedItems && result.replacedItems.length > 0) {
        toast.success(`${result.item.name} equipped!`, {
          description: `Replaced ${result.replacedItems.join(', ')}`,
          duration: 4000,
        })
      } else {
        toast.success(
          is_equipped
            ? `${result.item.name} unequipped`
            : `${result.item.name} equipped!`,
          {
            description: `${result.item.category.toLowerCase()} • ${result.item.rarity.toLowerCase()}`,
            duration: 3000,
          }
        )
      }

      await refetchCharacter()
    } catch (error) {
      console.error('Failed to equip item:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setLoadingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(inventoryId)
        return newSet
      })
    }
  }

  // FIXED: Made event parameter optional and added proper type checking
  const handleUseItem = async (
    inventoryId: string,
    itemName: string,
    energy_effect?: number,
    health_effect?: number,
    event?: React.MouseEvent
  ) => {
    // Only call preventDefault if event exists and has the method
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault()
      event.stopPropagation()
    }

    if (!character) {
      toast.error('No character found')
      return
    }

    const actualEnergyGain = energy_effect
      ? Math.min(energy_effect, 100 - character.energy)
      : 0
    const actualHealthGain = health_effect
      ? Math.min(health_effect, 100 - character.health)
      : 0

    if (
      (energy_effect && actualEnergyGain === 0) ||
      (health_effect && actualHealthGain === 0)
    ) {
      toast.warning(
        `You're already at full ${
          energy_effect && actualEnergyGain === 0 ? 'energy' : 'health'
        }!`
      )
      return
    }

    setLoadingItems((prev) => new Set(prev).add(inventoryId))

    try {
      const result = await characterActions.useItem(inventoryId)

      const effects = []
      if (result.effects?.energy && result.effects.energy > 0)
        effects.push(`+${result.effects.energy} energy`)
      if (result.effects?.health && result.effects.health > 0)
        effects.push(`+${result.effects.health} health`)

      toast.success(
        `Used ${itemName}${
          effects.length > 0 ? ` (${effects.join(', ')})` : ''
        }`
      )

      await refetchCharacter()
    } catch (error) {
      console.error('Use item failed:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setLoadingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(inventoryId)
        return newSet
      })
    }
  }

  return {
    handleMining,
    handleTravel,
    handlePurchase,
    handleSendMessage,
    handleEquipItem,
    handleUseItem,
  }
}
