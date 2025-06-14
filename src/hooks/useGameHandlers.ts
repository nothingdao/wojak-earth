// ========================================
// 1. COMPLETE useGameHandlers.ts
// ========================================

// src/hooks/useGameHandlers.ts - DEBUGGING VERSION
import { toast } from '@/components/ui/use-toast'
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
        selectedLocation?.id || character.current_location_id
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
    console.log('🗺️ handleTravel called with:', {
      location_id,
      hasCharacter: !!character,
      character_id: character?.id,
      current_location_id: character?.current_location_id,
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
    const destination = locations.find((loc) => loc.id === location_id)

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

    // Start map animation immediately
    setIsTravelingOnMap?.(true)
    setMapTravelDestination?.(location_id)

    // Create a rich toast with travel information
    toast.success('TRAVEL_INITIATED', {
      description: `DESTINATION: ${destination?.name.toUpperCase()}\n${
        destination?.biome ? `BIOME: ${destination.biome.toUpperCase()}\n` : ''
      }${
        destination?.difficulty
          ? `THREAT_LEVEL: ${destination.difficulty}\n`
          : ''
      }${
        destination?.entry_cost
          ? `ENTRY_COST: ${destination.entry_cost} RUST`
          : ''
      }`,
      duration: 4000,
    })

    try {
      // DELAY THE API CALL - Wait for animation to complete FIRST
      setTimeout(async () => {
        try {
          console.log('🚀 Animation complete, now calling API...')
          await characterActions.travel(location_id)
          console.log('✅ Travel API successful')

          // Update character and game data
          await refetchCharacter()
          await loadGameData()

          console.log('✅ Travel UI updates completed')

          // Show arrival toast
          const availableServices = []
          if (destination?.has_market) availableServices.push('MARKET')
          if (destination?.has_mining) availableServices.push('MINING')
          if (destination?.has_chat) availableServices.push('COMMS')

          toast.success('ARRIVAL_SUCCESSFUL', {
            description: `LOCATION: ${destination?.name.toUpperCase()}\n${
              availableServices.length > 0
                ? `AVAILABLE_SERVICES: ${availableServices.join(', ')}`
                : 'NO_SERVICES_AVAILABLE'
            }`,
            duration: 4000,
          })
        } catch (error) {
          console.error('❌ Travel API failed:', error)
          toast.error('TRAVEL_FAILED', {
            description:
              error instanceof Error ? error.message : 'Please try again.',
            duration: 4000,
          })
        } finally {
          // Clear all travel states
          setTravelingTo(null)
          setIsTravelingOnMap?.(false)
          setMapTravelDestination?.(null)
        }
      }, 2800) // Wait for animation to complete

      // Switch view immediately (before API call)
      setCurrentView('main')
    } catch (error) {
      // This catches immediate errors (validation, etc.)
      console.error('❌ Travel setup failed:', error)
      setTravelingTo(null)
      setIsTravelingOnMap?.(false)
      setMapTravelDestination?.(null)

      if (error instanceof Error) {
        toast.error('TRAVEL_SETUP_FAILED', {
          description: error.message,
          duration: 4000,
        })
      }
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
        selectedLocation?.id || character.current_location_id,
        chatInput,
        'CHAT'
      )

      await loadChatMessages(
        selectedLocation?.id || character.current_location_id
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
      await characterActions.equipItem(inventoryId, !is_equipped)
      await refetchCharacter()
    } catch (error) {
      console.error('Failed to equip item:', error)
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
      await characterActions.useItem(inventoryId)
      await refetchCharacter()
    } catch (error) {
      console.error('Use item failed:', error)
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
