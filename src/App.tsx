// Updated src/App.tsx
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Toaster } from 'sonner'
import { usePlayerCharacter, useCharacterActions } from '@/hooks/usePlayerCharacter'
import { useGameData } from '@/hooks/useGameData'
import { useGameHandlers } from '@/hooks/useGameHandlers'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletConnectButton } from './components/wallet-connect-button'
import { LoadingScreen } from './components/LoadingScreen'
import { WelcomeScreen } from './components/WelcomeScreen'
import { TravelScreen } from './components/TravelScreen'
import { GameContent } from './components/GameContent'
import type { GameView, DatabaseLocation } from '@/types'

function App() {
  const wallet = useWallet()
  const { character, loading: characterLoading, hasCharacter, refetchCharacter } = usePlayerCharacter()
  const characterActions = useCharacterActions()
  const [currentView, setCurrentView] = useState<GameView>('main')
  const [selectedLocation, setSelectedLocation] = useState<DatabaseLocation | null>(null)
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [travelingTo, setTravelingTo] = useState<DatabaseLocation | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
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

  // Add this useEffect to your App component or AppShell
  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
      }
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

  // Handle initial loading sequence
  useEffect(() => {
    if (wallet.connected && !characterLoading) {
      // Add a small delay to prevent flash, then determine state
      const timer = setTimeout(() => {
        setInitialLoading(false)
      }, 300) // Small delay to prevent flash

      return () => clearTimeout(timer)
    }
  }, [wallet.connected, characterLoading])

  // Reset initial loading when wallet disconnects
  useEffect(() => {
    if (!wallet.connected) {
      setInitialLoading(true)
    }
  }, [wallet.connected])

  // Wallet not connected - simple state
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

  // Initial loading or character loading - prevent flash
  if (initialLoading || characterLoading) {
    return (
      <LoadingScreen
        title="Loading your character..."
        subtitle="Preparing your adventure..."
      />
    )
  }

  // Travel animation - full screen state
  if (travelingTo) {
    return <TravelScreen destination={travelingTo} locations={gameData.locations} />
  }

  // No character - show welcome/character creation (only after initial loading is done)
  if (!hasCharacter && !characterLoading) {
    return (
      <WelcomeScreen
        onCharacterCreated={refetchCharacter}
        currentView={currentView}
        onProfileClick={() => setCurrentView('profile')}
        onHomeClick={() => setCurrentView('main')}
        onMapClick={() => setCurrentView('map')}
        onSandboxClick={() => setCurrentView('sandbox')}
        onInventoryClick={() => setCurrentView('inventory')}
        onAdminClick={() => setCurrentView('admin')}
      />
    )
  }

  // Game data loading for initial load
  if (gameData.loading && !character) {
    return (
      <LoadingScreen
        title="Loading Wojak Earth..."
        subtitle="Preparing your adventure..."
      />
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

  // No character data (safety check)
  if (!character && hasCharacter) {
    return (
      <LoadingScreen
        title="Loading character data..."
        subtitle="Almost ready..."
      />
    )
  }

  // Final safety check
  if (!character) {
    return (
      <LoadingScreen
        title="Character not found"
        subtitle="Please try refreshing the page"
        showSpinner={false}
      />
    )
  }

  console.log('📱 App character before passing to GameContent:', character?.coins)


  // Main game content
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

      <GameContent
        character={character}
        currentView={currentView}
        selectedLocation={selectedLocation}
        gameData={gameData}
        loadingItems={loadingItems}
        playersAtLocation={gameData.playersAtLocation}
        chatMessages={gameData.chatMessages}
        onViewChange={setCurrentView}
        onMining={gameHandlers.handleMining}
        onTravel={gameHandlers.handleTravel}
        onPurchase={gameHandlers.handlePurchase}
        onSendMessage={gameHandlers.handleSendMessage}
        onEquipItem={gameHandlers.handleEquipItem}
        onUseItem={gameHandlers.handleUseItem}
        refetchCharacter={refetchCharacter}
      />
    </>
  )
}

export default App
