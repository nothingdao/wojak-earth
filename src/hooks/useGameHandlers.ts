// src/hooks/useGameHandlers.ts
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
    mine: (locationId?: string) => Promise<MineResponse>
    travel: (destinationId: string) => Promise<void>
    buyItem: (marketListingId: string, quantity: number) => Promise<void>
    useItem: (inventoryId: string) => Promise<UseItemResponse>
    equipItem: (
      inventoryId: string,
      equip: boolean
    ) => Promise<EquipItemResponse>
    sendMessage: (
      locationId: string,
      message: string,
      messageType: string
    ) => Promise<void>
  }
  refetchCharacter: () => Promise<void>
  setLoadingItems: React.Dispatch<React.SetStateAction<Set<string>>>
  setMarketItems: React.Dispatch<React.SetStateAction<MarketItem[]>>
  // Remove setChatInput from here since ChatView manages it internally
  setTravelingTo: React.Dispatch<React.SetStateAction<Location | null>>
  setCurrentView: React.Dispatch<React.SetStateAction<GameView>>
  loadGameData: () => Promise<void>
  loadChatMessages: (locationId: string) => Promise<void>
  selectedLocation: Location | null
  locations: Location[]
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

  const handleTravel = async (locationId: string) => {
    if (!character) return

    const destination =
      locations.find((loc) => loc.id === locationId) ||
      locations
        .find((loc) => loc.subLocations?.some((sub) => sub.id === locationId))
        ?.subLocations?.find((sub) => sub.id === locationId)

    if (destination) {
      setTravelingTo(destination)
    }

    try {
      await characterActions.travel(locationId)

      setTimeout(async () => {
        await refetchCharacter()
        await loadGameData()
        setTravelingTo(null)
        setCurrentView('main')
      }, 2800)
    } catch (error) {
      console.error('Travel failed:', error)
      setTravelingTo(null)
      // Error already handled in characterActions
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

      // Remove setChatInput('') since ChatView handles this internally
      await loadChatMessages(
        selectedLocation?.id || character.currentLocation.id
      )
    } catch (error) {
      console.error('Failed to send message:', error)
      // Error already handled in characterActions
    }
  }

  const handleEquipItem = async (
    inventoryId: string,
    isEquipped: boolean,
    event?: React.MouseEvent
  ) => {
    // Prevent default behavior that might cause page reload
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (!character) {
      toast.error('No character found')
      return
    }

    setLoadingItems((prev) => new Set(prev).add(inventoryId))

    try {
      const result = await characterActions.equipItem(inventoryId, !isEquipped)

      if (result.replacedItems && result.replacedItems.length > 0) {
        toast.success(`${result.item.name} equipped!`, {
          description: `Replaced ${result.replacedItems.join(', ')}`,
          duration: 4000,
        })
      } else {
        toast.success(
          isEquipped
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

  const handleUseItem = async (
    inventoryId: string,
    itemName: string,
    energyEffect?: number,
    healthEffect?: number,
    event?: React.MouseEvent
  ) => {
    // Prevent default behavior that might cause page reload
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (!character) {
      toast.error('No character found')
      return
    }

    const actualEnergyGain = energyEffect
      ? Math.min(energyEffect, 100 - character.energy)
      : 0
    const actualHealthGain = healthEffect
      ? Math.min(healthEffect, 100 - character.health)
      : 0

    if (
      (energyEffect && actualEnergyGain === 0) ||
      (healthEffect && actualHealthGain === 0)
    ) {
      toast.warning(
        `You're already at full ${
          energyEffect && actualEnergyGain === 0 ? 'energy' : 'health'
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
