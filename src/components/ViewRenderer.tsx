// src/components/ViewRenderer.tsx - Fixed with EarthMarket character refresh
import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import { useAdminLocations } from '@/hooks/useAdminData'
import { playChapter } from '@/utils/story-playback'
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
  EarthMarket,
  EconomyView,
  StoriesView
} from './views'
import type { Character, GameView } from '@/types'
import { useGame } from '@/providers/GameProvider'

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
  const { updateLocation } = useAdminLocations()

  // Simple travel handler that delegates to GameProvider with animation delay
  const handleTravel = async (location_id: string) => {
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

    // Find the destination location
    const destination = gameData.locations?.find(loc => loc.id === location_id)

    toast.success('TRAVEL_INITIATED', {
      description: `DESTINATION: ${destination?.name.toUpperCase()}\n${destination?.biome ? `BIOME: ${destination.biome.toUpperCase()}\n` : ''
        }${destination?.difficulty ? `THREAT_LEVEL: ${destination.difficulty}\n` : ''
        }${destination?.entry_cost ? `ENTRY_COST: ${destination.entry_cost} EARTH` : ''
        }`,
      duration: 4000,
    })

    try {
      // Delay the actual travel to allow animation, then use GameProvider's travel action
      setTimeout(async () => {
        try {
          // Use the GameProvider's travel action which handles all the API logic
          if (actions.handleTravel) {
            await actions.handleTravel(location_id)
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

    console.log('Setting primary for:', inventoryId, 'category:', category, 'wallet:', character.wallet_address)

    try {
      const requestBody = {
        wallet_address: character.wallet_address,
        inventoryId: inventoryId,
        equip: true,
        setPrimary: true
      }
      
      console.log('Request body:', requestBody)
      
      const response = await fetch('/.netlify/functions/equip-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      console.log('Response status:', response.status, 'URL:', response.url)

      if (!response.ok) {
        let errorData = null
        try {
          errorData = await response.json()
        } catch (e) {
          // Handle empty or invalid JSON response
          errorData = { error: response.statusText }
        }
        console.error('Set primary failed:', response.status, response.url, errorData)
        throw new Error(`Failed to set primary: ${errorData.error || response.statusText}`)
      }

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

  const handleEquipItemAdapter = (inventoryId: string, shouldEquip: boolean, targetSlot?: string) => {
    actions.handleEquipItem(inventoryId, shouldEquip, targetSlot)
  }

  const handleUseItemAdapter = (inventoryId: string, itemName: string, energy_effect?: number, health_effect?: number) => {
    // Use existing use item action from GameProvider (already progressive)
    actions.handleUseItem(inventoryId, itemName, energy_effect, health_effect)
  }

  // ✅ ADD THIS: Chat message handler using GameProvider action
  const handleSendMessage = async (message: string) => {
    if (actions.handleSendMessage) {
      await actions.handleSendMessage(message)
    } else {
      console.error('❌ handleSendMessage action not available')
      toast.error('Chat not available')
    }
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
          onEarthMarketClick={() => actions.navigate('earth-market')}
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
          onTravel={handleTravel}
          onSetTravelDestination={actions.setTravelDestination}
          isTravelingOnMap={state.isTravelingOnMap}
          mapTravelDestination={state.mapTravelDestination}
          onLocationUpdate={async (locationId, updates) => {
            try {
              // Save to database using admin hook
              await updateLocation(locationId, updates)

              // Refresh game data to get updated locations
              await actions.enterGame()

              toast.success('Location updated successfully')
            } catch (error) {
              console.error('Failed to update location:', error)
              toast.error('Failed to save location changes')
            }
          }}
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
          onCharacterUpdated={actions.refetchCharacter}
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
          onSendMessage={handleSendMessage} // ✅ Now properly defined
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

    case 'earth-market':
      return (
        <EarthMarket
          onCharacterUpdate={actions.refetchCharacter} // ✅ FIXED: Pass refetchCharacter
        />
      )

    case 'stories':
      return (
        <StoriesView
          character={character}
          onPlayChapter={async (chapter) => {
            await playChapter({
              chapter,
              character,
              onComplete: () => {
                console.log('Story completed, refreshing character')
              },
              onCharacterUpdate: actions.refetchCharacter
            })
          }}
        />
      )

    case 'admin':
      return (
        <AdminView
          character={character}
          onClose={() => actions.navigate('main')}
        />
      )

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
          onEarthMarketClick={() => actions.navigate('earth-market')}
        />
      )
  }
}
