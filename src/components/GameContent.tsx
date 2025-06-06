// src/components/GameContent.tsx
import React from 'react'
import { toast } from 'sonner'
import { AppShell } from './AppShell'
import {
  InventoryView,
  MarketView,
  MiningView,
  WorldMapView,
  ProfileView,
  MainView,
  ChatView,
  AdminView,
  SandboxView
} from './views'
import { NPCActivity } from './NPCActivity'
import type { Character, GameView, DatabaseLocation } from '@/types'

interface GameContentProps {
  character: Character
  currentView: GameView
  selectedLocation: DatabaseLocation | null
  gameData: any // Type this properly based on your useGameData return type
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
  const handleProfileClick = () => onViewChange('profile')
  const handleHomeClick = () => onViewChange('main')
  const handleMapClick = () => onViewChange('map')
  const handleSandboxClick = () => onViewChange('sandbox')
  const handleInventoryClick = () => onViewChange('inventory')
  const handleAdminClick = () => onViewChange('admin')

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

  const renderCurrentView = () => {
    switch (currentView) {
      case 'main':
        return (
          <MainView
            character={character}
            playersAtLocation={playersAtLocation}
            onMineClick={() => onViewChange('mine')}
            onMarketClick={() => onViewChange('market')}
            onChatClick={() => onViewChange('chat')}
            onNPCActivityClick={() => onViewChange('npc-activity')}
          />
        )
      case 'profile':
        return <ProfileView character={character} onCharacterUpdated={refetchCharacter} />
      case 'sandbox':
        return <SandboxView character={character} />
      case 'map':
        return (
          <WorldMapView
            locations={gameData.locations}
            character={character}
            onTravel={onTravel}
          />
        )
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
            onSetPrimary={handleSetPrimary}      // ← ADD THIS
            onReplaceSlot={handleReplaceSlot}    // ← ADD THIS
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
      case 'npc-activity':
        return <NPCActivity />
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
            onNPCActivityClick={() => onViewChange('npc-activity')}
          />
        )
    }
  }

  return (
    <AppShell
      character={character}
      currentView={currentView}
      onProfileClick={handleProfileClick}
      onHomeClick={handleHomeClick}
      onMapClick={handleMapClick}
      onSandboxClick={handleSandboxClick}
      onInventoryClick={handleInventoryClick}
      onAdminClick={handleAdminClick}
    >
      {renderCurrentView()}
    </AppShell>
  )
}
