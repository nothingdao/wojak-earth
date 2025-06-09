// src/App.tsx - Restructured for better layout stability
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { usePlayerCharacter, useCharacterActions } from '@/hooks/usePlayerCharacter'
import { useGameData } from '@/hooks/useGameData'
import { useGameHandlers } from '@/hooks/useGameHandlers'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletConnectButton } from './components/wallet-connect-button'
import { AppShell } from './components/AppShell'
import { LoadingScreen } from './components/LoadingScreen'
import { CharacterCreationView } from './components/views'
import { GameContent } from './components/GameContent'
import type { GameView, DatabaseLocation } from '@/types'

// Define app states clearly
type AppState =
  | 'wallet-disconnected'
  | 'initial-loading'
  | 'character-loading'
  | 'no-character'
  | 'game-loading'
  | 'ready'
  | 'error'

function App() {
  const wallet = useWallet()
  const { character, loading: characterLoading, hasCharacter, refetchCharacter, error: characterError } = usePlayerCharacter()
  const characterActions = useCharacterActions()

  // Stable state management
  const [currentView, setCurrentView] = useState<GameView>('main')
  const [selectedLocation] = useState<DatabaseLocation | null>(null)
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [travelingTo, setTravelingTo] = useState<DatabaseLocation | null>(null)
  const [appError, setAppError] = useState<string | null>(null)

  // App state derived from conditions
  const [appState, setAppState] = useState<AppState>('wallet-disconnected')

  const gameData = useGameData(character, currentView, selectedLocation)

  // Initialize game handlers
  const gameHandlers = useGameHandlers({
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

  // Centralized state management
  useEffect(() => {
    if (!wallet.connected) {
      setAppState('wallet-disconnected')
      setAppError(null)
      setCurrentView('main')
      return
    }

    if (characterError || appError) {
      setAppState('error')
      return
    }

    if (characterLoading) {
      setAppState('character-loading')
      return
    }

    if (!hasCharacter) {
      setAppState('no-character')
      return
    }

    if (!character) {
      setAppState('initial-loading')
      return
    }

    if (gameData.loading && !gameData.locations.length) {
      setAppState('game-loading')
      return
    }

    if (gameData.error) {
      setAppError(gameData.error)
      setAppState('error')
      return
    }

    setAppState('ready')
  }, [
    wallet.connected,
    characterLoading,
    hasCharacter,
    character,
    characterError,
    appError,
    gameData.loading,
    gameData.locations.length,
    gameData.error
  ])

  // Prevent zoom
  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    const preventKeyboardZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0')) {
        e.preventDefault()
      }
    }
    document.addEventListener('wheel', preventZoom, { passive: false })
    document.addEventListener('keydown', preventKeyboardZoom)
    return () => {
      document.removeEventListener('wheel', preventZoom)
      document.removeEventListener('keydown', preventKeyboardZoom)
    }
  }, [])

  // Character creation callback
  const handleCharacterCreated = async () => {
    console.log('🎉 Character creation completed, refreshing data...')
    try {
      setAppState('initial-loading')
      await refetchCharacter()
      setTimeout(() => setCurrentView('main'), 500)
    } catch (error) {
      console.error('Failed to refresh character after creation:', error)
      setAppError('Failed to load character after creation. Please refresh the page.')
    }
  }

  // Error retry handlers
  const handleRetry = () => {
    setAppError(null)
    refetchCharacter()
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  // Adapter functions for GameContent
  const handleMiningAdapter = (_itemId: string) => gameHandlers.handleMining()
  const handleTravelAdapter = (location: DatabaseLocation) => gameHandlers.handleTravel(location.id)
  const handlePurchaseAdapter = (itemId: string, cost: number) => {
    const marketItem = gameData.marketItems.find((item: any) => item.id === itemId)
    const itemName = marketItem?.name || 'Unknown Item'
    gameHandlers.handlePurchase(itemId, cost, itemName)
  }
  const handleEquipItemAdapter = (inventoryId: string) => {
    const isCurrentlyEquipped = character?.equippedItems?.some(
      (equipped: any) => equipped.inventoryId === inventoryId
    ) || false
    gameHandlers.handleEquipItem(inventoryId, isCurrentlyEquipped)
  }
  const handleUseItemAdapter = (inventoryId: string) => {
    const inventoryItem = character?.inventory?.find((item: any) => item.id === inventoryId)
    const itemName = inventoryItem?.name || 'Unknown Item'
    const energyEffect = inventoryItem?.effects?.energy
    const healthEffect = inventoryItem?.effects?.health
    gameHandlers.handleUseItem(inventoryId, itemName, energyEffect, healthEffect)
  }

  // Navigation handlers
  const navHandlers = {
    onProfileClick: () => setCurrentView('profile'),
    onHomeClick: () => setCurrentView('main'),
    onMapClick: () => setCurrentView('map'),
    onInventoryClick: () => setCurrentView('inventory'),
    onAdminClick: () => setCurrentView('admin'),
    onCharactersClick: () => setCurrentView('characters'),
    onEconomyClick: () => setCurrentView('economy'),
    onLeaderboardsClick: () => setCurrentView('leaderboards'),
    onRustMarketClick: () => setCurrentView('rust-market'),

  }

  // Render based on app state
  const renderContent = () => {
    switch (appState) {
      case 'wallet-disconnected':
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">Connect your Solana wallet to play Wojak Earth</p>
              <WalletConnectButton />
              <p className="text-xs text-muted-foreground mt-4">
                Make sure you have some SOL for character creation and transactions
              </p>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="text-center max-w-md mx-auto">
              <div className="text-2xl mb-4">❌</div>
              <h2 className="text-xl font-semibold mb-2">Application Error</h2>
              <div className="text-red-500 mb-4 text-sm">{appError || characterError}</div>
              <div className="space-y-2">
                <Button onClick={handleRetry} className="w-full">Retry</Button>
                <Button variant="outline" onClick={handleRefresh} className="w-full">
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>
        )

      case 'initial-loading':
      case 'character-loading':
        return (
          <LoadingScreen
            title={appState === 'initial-loading' ? "Loading Wojak Earth..." : "Loading your character..."}
            subtitle={appState === 'initial-loading' ? "Preparing your adventure..." : "Checking your account..."}
          />
        )

      case 'game-loading':
        return (
          <LoadingScreen
            title="Loading game world..."
            subtitle="Setting up your adventure..."
          />
        )

      case 'no-character':
        return (
          <AppShell
            character={null}
            currentView={currentView}
            showNavigation={false} // Hide navigation during character creation
            {...navHandlers}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Welcome to Earth</h2>
              <p className="text-muted-foreground">Create your character to start playing</p>
            </div>
            <CharacterCreationView
              character={null}
              onCharacterCreated={handleCharacterCreated}
            />
          </AppShell>
        )

      case 'ready':
        if (travelingTo) {
          return <TravelScreen destination={travelingTo} locations={gameData.locations} />
        }

        return (
          <AppShell
            character={character}
            currentView={currentView}
            showNavigation={true}
            {...navHandlers}
          >
            <GameContent
              character={character!}
              currentView={currentView}
              selectedLocation={selectedLocation}
              gameData={gameData}
              loadingItems={loadingItems}
              playersAtLocation={gameData.playersAtLocation}
              chatMessages={gameData.chatMessages}
              onViewChange={setCurrentView}
              onMining={handleMiningAdapter}
              onTravel={handleTravelAdapter}
              onPurchase={handlePurchaseAdapter}
              onSendMessage={gameHandlers.handleSendMessage}
              onEquipItem={handleEquipItemAdapter}
              onUseItem={handleUseItemAdapter}
              refetchCharacter={refetchCharacter}
            />
          </AppShell>
        )

      default:
        return (
          <LoadingScreen
            title="Initializing..."
            subtitle="Please wait..."
          />
        )
    }
  }

  return renderContent()
}

export default App
