// src/components/GameContent.tsx - Simplified, no longer uses AppShell
import React from 'react'
import { toast } from 'sonner'
import {
  InventoryView,
  MarketView,
  MiningView,
  WorldMapView,
  ProfileView,
  MainView,
  ChatView,
  AdminView,
  CharacterCreationView,
  CharactersView,
  LeaderboardsView,
  RustMarket,
  EconomyView
} from './views'
import type { Character, GameView, DatabaseLocation } from '@/types'


interface GameContentProps {
  character: Character
  currentView: GameView
  selectedLocation: DatabaseLocation | null
  gameData: any
  loadingItems: Set<string>
  playersAtLocation: any[]
  chatMessages: any[]
  onViewChange: (view: GameView) => void
  onMining: (itemId: string) => void
  onTravel: (location: DatabaseLocation) => void
  onPurchase: (itemId: string, cost: number) => void
  onSendMessage: (message: string) => void
  onEquipItem: (inventoryId: string) => void
  onUseItem: (inventoryId: string) => void
  refetchCharacter: () => void
}

export const GameContent: React.FC<GameContentProps> = ({
  character,
  currentView,
  selectedLocation,
  gameData,
  loadingItems,
  playersAtLocation,
  chatMessages,
  onViewChange,
  onMining,
  onTravel,
  onPurchase,
  onSendMessage,
  onEquipItem,
  onUseItem,
  refetchCharacter
}) => {
  // NEW: Handler to set an item as primary for visual rendering
  const handleSetPrimary = async (inventoryId: string, category: string) => {
    if (!character) return

    try {
      const response = await fetch('/netlify/functions/equip-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: character.walletAddress,
          inventoryId: inventoryId,
          equip: true,
          setPrimary: true
        })
      })

      if (!response.ok) throw new Error('Failed to set primary')

      const result = await response.json()
      toast.success(`${result.item.name} set as primary for visual display!`)

      // Refresh character data to update UI
      await refetchCharacter()
    } catch (error) {
      console.error('Failed to set primary:', error)
      toast.error('Failed to set as primary')
    }
  }

  // NEW: Handler to replace a specific slot when all slots are full
  const handleReplaceSlot = async (inventoryId: string, category: string, slotIndex: number) => {
    if (!character) return

    try {
      const response = await fetch('/netlify/functions/equip-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: character.walletAddress,
          inventoryId: inventoryId,
          equip: true,
          replaceSlot: slotIndex
        })
      })

      if (!response.ok) throw new Error('Failed to replace slot')

      const result = await response.json()
      toast.success(result.message)

      // Refresh character data to update UI
      await refetchCharacter()
    } catch (error) {
      console.error('Failed to replace slot:', error)
      toast.error('Failed to replace item')
    }
  }

  // Simple view renderer without shell wrapper
  switch (currentView) {
    case 'main':
      return (
        <MainView
          character={character}
          playersAtLocation={playersAtLocation}
          onMineClick={() => onViewChange('mine')}
          onMarketClick={() => onViewChange('market')}
          onChatClick={() => onViewChange('chat')}
          onEconomyClick={() => onViewChange('economy')}
          onLeaderboardsClick={() => onViewChange('leaderboards')}
          onRustMarketClick={() => onViewChange('rust-market')}
        />
      )

    case 'profile':
      return <ProfileView character={character} onCharacterUpdated={refetchCharacter} />

    case 'character-creation-view':
      return <CharacterCreationView character={character} />

    case 'map':
      return (
        <WorldMapView
          locations={gameData.locations}
          character={character}
          onTravel={onTravel}
        />
      )

    case 'characters':
      return <CharactersView />

    case 'economy':
      return <EconomyView />

    case 'leaderboards':
      return <LeaderboardsView />

    case 'mine':
      return (
        <MiningView
          character={character}
          loadingItems={loadingItems}
          onMine={onMining}
        />
      )

    case 'market':
      return (
        <MarketView
          character={character}
          selectedLocation={selectedLocation}
          locations={gameData.locations}
          marketItems={gameData.marketItems}
          loadingItems={loadingItems}
          onPurchase={onPurchase}
        />
      )

    case 'inventory':
      return (
        <InventoryView
          character={character}
          loadingItems={loadingItems}
          onUseItem={onUseItem}
          onEquipItem={onEquipItem}
          onSetPrimary={handleSetPrimary}
          onReplaceSlot={handleReplaceSlot}
        />
      )

    case 'chat':
      return (
        <ChatView
          character={character}
          selectedLocation={selectedLocation}
          chatMessages={chatMessages}
          onSendMessage={onSendMessage}
          onAddPresenceMessage={gameData.actions.addPresenceMessage}
          loading={gameData.loading}
        />
      )
    case 'rust-market':
      return <RustMarket />

    case 'admin':
      return <AdminView character={character} />

    default:
      return (
        <MainView
          character={character}
          playersAtLocation={playersAtLocation}
          onMineClick={() => onViewChange('mine')}
          onMarketClick={() => onViewChange('market')}
          onChatClick={() => onViewChange('chat')}
          onLeaderboardsClick={() => onViewChange('leaderboards')}
        />
      )
  }
}
