// src/components/ViewRenderer.tsx - Clean view switching
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
    actions.handlePurchase(item_id, cost, itemName)
  }

  const handleEquipItemAdapter = (inventoryId: string) => {
    const isCurrentlyEquipped = character?.equippedItems?.some(
      (equipped: any) => equipped.inventoryId === inventoryId
    ) || false
    actions.handleEquipItem(inventoryId, isCurrentlyEquipped)
  }

  const handleUseItemAdapter = (inventoryId: string) => {
    const inventoryItem = character?.inventory?.find((item: any) => item.id === inventoryId)
    const itemName = inventoryItem?.name || 'Unknown Item'
    const energy_effect = inventoryItem?.effects?.energy
    const health_effect = inventoryItem?.effects?.health
    actions.handleUseItem(inventoryId, itemName, energy_effect, health_effect)
  }

  switch (currentView) {
    case 'main':
      return (
        <MainView
          character={character}
          playersAtLocation={gameData.playersAtLocation || []}
          onMineClick={() => actions.navigate('mine')}
          onMarketClick={() => actions.navigate('market')}
          onChatClick={() => actions.navigate('chat')}
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
          onTravel={actions.handleTravel}
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
          onMine={() => actions.handleMining()}
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
          onSendMessage={actions.handleSendMessage}
          onAddPresenceMessage={gameData.actions?.addPresenceMessage}
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
          onChatClick={() => actions.navigate('chat')}
          onEconomyClick={() => actions.navigate('economy')}
          onLeaderboardsClick={() => actions.navigate('leaderboards')}
          onRustMarketClick={() => actions.navigate('rust-market')}
        />
      )
  }
}
