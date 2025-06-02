// src/App.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Earth } from 'lucide-react'
import { GlobalNavbar } from './components/global-navbar'
import { Toaster } from 'sonner'
import { InventoryView, MarketView, MiningView, WorldMapView, ProfileView, MainView, SandboxView, ChatView } from '@/components/views'
import { NPCActivity } from './components/NPCActivity'
import { usePlayerCharacter, useCharacterActions } from '@/hooks/usePlayerCharacter'
import { useGameData } from '@/hooks/useGameData'
import { useGameHandlers } from '@/hooks/useGameHandlers'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletConnectButton } from './components/wallet-connect-button'
import type { GameView, Location } from '@/types'

function App() {
  const wallet = useWallet()
  const { character, loading: characterLoading, hasCharacter, refetchCharacter } = usePlayerCharacter()
  const characterActions = useCharacterActions()

  const [currentView, setCurrentView] = useState<GameView>('main')
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [travelingTo, setTravelingTo] = useState<Location | null>(null)

  // Use the new game data hook
  const gameData = useGameData(character, currentView, selectedLocation)

  // Initialize game handlers with simplified dependencies
  const {
    handleMining,
    handleTravel,
    handlePurchase,
    handleSendMessage,
    handleEquipItem,
    handleUseItem
  } = useGameHandlers({
    character,
    characterActions,
    refetchCharacter,
    setLoadingItems,
    setMarketItems: gameData.actions.setMarketItems,
    setTravelingTo,
    setCurrentView,
    loadGameData: gameData.actions.loadGameData,
    loadChatMessages: gameData.actions.loadChatMessages,
    selectedLocation,
    locations: gameData.locations
  })

  const handleHomeClick = () => {
    setCurrentView('main')
    setSelectedLocation(null)
  }

  const handleProfileClick = () => {
    setCurrentView('profile')
    setSelectedLocation(null)
  }

  const handleNavMapClick = () => {
    setCurrentView('map')
    setSelectedLocation(null)
  }

  const handleSandboxClick = () => {
    setCurrentView('sandbox')
    setSelectedLocation(null)
  }

  const handleNavInventoryClick = () => {
    setCurrentView('inventory')
    setSelectedLocation(null)
  }

  // Wallet not connected
  if (!wallet.connected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">Connect your Solana wallet to play Wojak Earth</p>
          <WalletConnectButton />
        </div>
      </div>
    )
  }

  // Character loading
  if (characterLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Earth className="w-8 h-8 mb-4 animate-spin mx-auto text-primary" />
          <div className="text-lg font-medium">Loading your character...</div>
        </div>
      </div>
    )
  }

  // No character found
  if (!hasCharacter) {
    return (
      <div className="min-h-screen bg-background">
        <GlobalNavbar
          character={null}
          onProfileClick={handleProfileClick}
          onHomeClick={handleHomeClick}
          onMapClick={handleNavMapClick}
          onSandboxClick={handleSandboxClick}
          onInventoryClick={handleNavInventoryClick}
        />

        <div className="container mx-auto px-4 py-6">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Welcome to Wojak Earth</h2>
              <p className="text-muted-foreground">Create your character to start playing</p>
            </div>

            <SandboxView
              character={null}
              onCharacterCreated={refetchCharacter}
            />
          </div>
        </div>
      </div>
    )
  }

  // Initial loading state
  if ((gameData.loading || characterLoading) && !travelingTo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Earth className="w-8 h-8 mb-4 text-thin animate-spin mx-auto text-primary" />
          <div className="text-lg font-medium">Loading Wojak Earth...</div>
          <div className="text-sm text-muted-foreground mt-2">Preparing your adventure...</div>
        </div>
      </div>
    )
  }

  // Travel animation state
  if (travelingTo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <div className="text-4xl mb-4 animate-bounce">
              {travelingTo.biome === 'desert' ? '🏜️' :
                travelingTo.biome === 'urban' ? '🏙️' :
                  travelingTo.biome === 'plains' ? '🌾' :
                    travelingTo.locationType === 'BUILDING' ? '🏠' : '🗺️'}
            </div>
            <div className="text-xl font-bold mb-2">Traveling to...</div>
            <div className="text-2xl font-bold text-primary mb-2">{travelingTo.name}</div>
            <div className="text-muted-foreground mb-4">{travelingTo.description}</div>

            <div className="w-full bg-muted rounded-full h-2 mb-4 overflow-hidden">
              <div className="bg-primary h-2 rounded-full animate-pulse"
                style={{
                  animation: 'travel-progress 1.5s ease-in-out forwards',
                  width: '0%'
                }}></div>
            </div>

            <div className="text-sm text-muted-foreground animate-pulse">
              Preparing for arrival...
            </div>
          </div>

          <style>{`
            @keyframes travel-progress {
              0% { width: 0%; }
              100% { width: 100%; }
            }
          `}</style>
        </div>
      </div>
    )
  }

  // Error state
  if (gameData.error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-2xl mb-4">❌</div>
          <div className="text-red-500 mb-4">{gameData.error}</div>
          <Button onClick={gameData.actions.loadGameData}>Retry</Button>
        </div>
      </div>
    )
  }

  // No character data
  if (!character) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-2xl mb-4">🤔</div>
          <div>No character data found</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster
        position="bottom-left"
        expand={false}
        richColors={true}
        closeButton={false}
        offset={16}
        toastOptions={{
          duration: 7000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '14px',
            padding: '12px 16px',
            zIndex: 99999,
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            opacity: 1,
          },
          className: 'solid-toast',
        }}
      />

      <div className="min-h-screen bg-background">
        <GlobalNavbar
          character={character}
          onProfileClick={handleProfileClick}
          onHomeClick={handleHomeClick}
          onMapClick={handleNavMapClick}
          onSandboxClick={handleSandboxClick}
          onInventoryClick={handleNavInventoryClick}
        />

        <div className="container mx-auto px-4 py-6">
          <div className="max-w-md mx-auto">
            <div className="">
              {currentView === 'main' && (
                <MainView
                  character={character}
                  playersAtLocation={gameData.playersAtLocation}
                  onMineClick={() => setCurrentView('mine')}
                  onMarketClick={() => setCurrentView('market')}
                  onChatClick={() => setCurrentView('chat')}
                  onNPCActivityClick={() => setCurrentView('npc-activity')}
                />
              )}
              {currentView === 'profile' && <ProfileView character={character} />}
              {currentView === 'sandbox' && <SandboxView character={character} />}
              {currentView === 'map' && (
                <WorldMapView
                  locations={gameData.locations}
                  character={character}
                  onTravel={handleTravel}
                />
              )}
              {currentView === 'mine' && (
                <MiningView
                  character={character}
                  loadingItems={loadingItems}
                  onMine={handleMining}
                />
              )}
              {currentView === 'market' && (
                <MarketView
                  character={character}
                  selectedLocation={selectedLocation}
                  locations={gameData.locations}
                  marketItems={gameData.marketItems}
                  loadingItems={loadingItems}
                  onPurchase={handlePurchase}
                />
              )}
              {currentView === 'inventory' && (
                <InventoryView
                  character={character}
                  loadingItems={loadingItems}
                  onUseItem={handleUseItem}
                  onEquipItem={handleEquipItem}
                />
              )}
              {currentView === 'chat' && (
                <ChatView
                  character={character}
                  selectedLocation={selectedLocation}
                  chatMessages={gameData.chatMessages}
                  onSendMessage={handleSendMessage}
                  loading={gameData.loading}
                />
              )}
              {currentView === 'npc-activity' && <NPCActivity />}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
