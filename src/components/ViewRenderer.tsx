// src/components/ViewRenderer.tsx - Fixed with game handlers
import { useState } from 'react'
import { toast } from 'sonner'
import {
  MainView,
  ProfileView,
  WorldMapView,
  InventoryView,
  MarketView,
  MiningView,
  ChatView,
  AdminView,
  CharactersView,
  LeaderboardsView,
  RustMarket,
  EconomyView
} from './views'
import type { Character, GameView } from '@/types'
import { useGame } from '@/providers/GameProvider'
import { useGameHandlers } from '@/hooks/useGameHandlers'

interface ViewRendererProps {
  currentView: GameView
  character: Character
  gameData: any
  loadingItems: Set<string>
  actions: any
}

export function ViewRenderer({
  currentView,
  character,
  gameData,
  loadingItems,
  actions
}: ViewRendererProps) {
  // State to manage fullscreen chat
  const [isFullscreenChat, setIsFullscreenChat] = useState(false)

  const { state } = useGame()

  // Simple travel handler that delegates to GameProvider with animation delay
  const handleTravel = async (location_id: string) => {
    console.log('🗺️ ViewRenderer handleTravel called with:', location_id)

    if (!character) {
      console.error('❌ No character found for travel')
      toast.error('No character found')
      return
    }

    // Set map animation state immediately - STAY ON MAP
    state.dispatch?.({
      type: 'SET_MAP_TRAVELING',
      isTraveling: true,
      destination: location_id
    })

    toast.success('Traveling...')

    try {
      // Delay the actual travel to allow animation, then use GameProvider's travel action
      setTimeout(async () => {
        try {
          console.log('🚀 Animation complete, now calling GameProvider travel...')

          // Use the GameProvider's travel action which handles all the API logic
          if (actions.handleTravel) {
            await actions.handleTravel(location_id)

            console.log('✅ Travel complete - staying on map view')
            // DON'T switch views - stay on the map after successful travel
            // actions.navigate('main') // REMOVED
          } else {
            throw new Error('Travel action not available')
          }

        } catch (error) {
          console.error('❌ Travel failed:', error)
          toast.error(`Travel failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          // Clear animation state on error
          state.dispatch?.({ type: 'CLEAR_MAP_TRAVELING' })
        }
      }, 2800) // Wait for animation to complete

    } catch (error) {
      console.error('❌ Travel setup failed:', error)
      state.dispatch?.({ type: 'CLEAR_MAP_TRAVELING' })
      toast.error('Travel setup failed')
    }
  }

  // Helper functions to adapt your existing component interfaces
  const handleSetPrimary = async (inventoryId: string, category: string) => {
    if (!character) return

    try {
      const response = await fetch('/netlify/functions/equip-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: character.wallet_address,
          inventoryId: inventoryId,
          equip: true,
          setPrimary: true
        })
      })

      if (!response.ok) throw new Error('Failed to set primary')

      const result = await response.json()
      toast.success(`${result.item.name} set as primary for visual display!`)
      await actions.refetchCharacter()
    } catch (error) {
      console.error('Failed to set primary:', error)
      toast.error('Failed to set as primary')
    }
  }

  const handleReplaceSlot = async (inventoryId: string, category: string, slotIndex: number) => {
    if (!character) return

    try {
      const response = await fetch('/netlify/functions/equip-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: character.wallet_address,
          inventoryId: inventoryId,
          equip: true,
          replaceSlot: slotIndex
        })
      })

      if (!response.ok) throw new Error('Failed to replace slot')

      const result = await response.json()
      toast.success(result.message)
      await actions.refetchCharacter()
    } catch (error) {
      console.error('Failed to replace slot:', error)
      toast.error('Failed to replace item')
    }
  }

  // Adapter functions for existing component interfaces
  const handlePurchaseAdapter = (item_id: string, cost: number) => {
    const marketItem = gameData.marketItems?.find((item: any) => item.id === item_id)
    const itemName = marketItem?.name || 'Unknown Item'
    // Use existing purchase action from GameProvider
    actions.handlePurchase(item_id, cost, itemName)
  }

  const handleEquipItemAdapter = (inventoryId: string) => {
    const isCurrentlyEquipped = character?.equippedItems?.some(
      (equipped: any) => equipped.inventoryId === inventoryId
    ) || false
    // Use existing equip action from GameProvider
    actions.handleEquipItem(inventoryId, isCurrentlyEquipped)
  }

  const handleUseItemAdapter = (inventoryId: string) => {
    const inventoryItem = character?.inventory?.find((item: any) => item.id === inventoryId)
    const itemName = inventoryItem?.name || 'Unknown Item'
    const energy_effect = inventoryItem?.effects?.energy
    const health_effect = inventoryItem?.effects?.health
    // Use existing use item action from GameProvider
    actions.handleUseItem(inventoryId, itemName, energy_effect, health_effect)
  }

  // Chat handlers
  const openFullscreenChat = () => setIsFullscreenChat(true)
  const closeFullscreenChat = () => setIsFullscreenChat(false)

  // Render fullscreen chat overlay if active
  if (isFullscreenChat) {
    return (
      <ChatView
        character={character}
        selectedLocation={gameData.selectedLocation}
        chatMessages={gameData.chatMessages || []}
        onSendMessage={handleSendMessage}
        onAddPresenceMessage={gameData.actions?.addPresenceMessage}
        onExitChat={closeFullscreenChat}
        loading={gameData.loading}
      />
    )
  }

  switch (currentView) {
    case 'main':
      return (
        <MainView
          character={character}
          playersAtLocation={gameData.playersAtLocation || []}
          onMineClick={() => actions.navigate('mine')}
          onMarketClick={() => actions.navigate('market')}
          onChatClick={openFullscreenChat}
          onEconomyClick={() => actions.navigate('economy')}
          onLeaderboardsClick={() => actions.navigate('leaderboards')}
          onRustMarketClick={() => actions.navigate('rust-market')}
        />
      )

    case 'profile':
      return (
        <ProfileView
          character={character}
          onCharacterUpdated={actions.refetchCharacter}
        />
      )

    case 'map':
      return (
        <WorldMapView
          locations={gameData.locations || []}
          character={character}
          onTravel={handleTravel} // ✅ Use our custom travel handler
          isTravelingOnMap={state.isTravelingOnMap}
          mapTravelDestination={state.mapTravelDestination}
        />
      )

    case 'inventory':
      return (
        <InventoryView
          character={character}
          loadingItems={loadingItems}
          onUseItem={handleUseItemAdapter}
          onEquipItem={handleEquipItemAdapter}
          onSetPrimary={handleSetPrimary}
          onReplaceSlot={handleReplaceSlot}
        />
      )

    case 'mine':
      return (
        <MiningView
          character={character}
          loadingItems={loadingItems}
          onMine={() => actions.handleMining()} // ✅ Use existing GameProvider mining
        />
      )

    case 'market':
      return (
        <MarketView
          character={character}
          selectedLocation={gameData.selectedLocation}
          locations={gameData.locations || []}
          marketItems={gameData.marketItems || []}
          loadingItems={loadingItems}
          onPurchase={handlePurchaseAdapter}
        />
      )

    case 'chat':
      return (
        <ChatView
          character={character}
          selectedLocation={gameData.selectedLocation}
          chatMessages={gameData.chatMessages || []}
          onSendMessage={handleSendMessage}
          onAddPresenceMessage={gameData.actions?.addPresenceMessage}
          onExitChat={closeFullscreenChat}
          loading={gameData.loading}
        />
      )

    case 'leaderboards':
      return <LeaderboardsView />

    case 'economy':
      return <EconomyView />

    case 'characters':
      return <CharactersView />

    case 'rust-market':
      return <RustMarket />

    case 'admin':
      return <AdminView character={character} />

    default:
      return (
        <MainView
          character={character}
          playersAtLocation={gameData.playersAtLocation || []}
          onMineClick={() => actions.navigate('mine')}
          onMarketClick={() => actions.navigate('market')}
          onChatClick={openFullscreenChat}
          onEconomyClick={() => actions.navigate('economy')}
          onLeaderboardsClick={() => actions.navigate('leaderboards')}
          onRustMarketClick={() => actions.navigate('rust-market')}
        />
      )
  }
}
