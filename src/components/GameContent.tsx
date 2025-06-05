// src/components/GameContent.tsx
import React from 'react'
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
