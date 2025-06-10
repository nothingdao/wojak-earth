// src/components/AppRouter.tsx
import { useEffect } from 'react'
import { useGame } from '@/providers/GameProvider'
import { LoadingScreen } from './screens/LoadingScreen'
import { WalletScreen } from './screens/WalletScreen'
import { CharacterCreationScreen } from './screens/CharacterCreationScreen'
import { GameScreen } from './screens/GameScreen'
import { TravelScreen } from './screens/TravelScreen'
import { ErrorScreen } from './screens/ErrorScreen'

export function AppRouter() {
  const { state } = useGame()

  // Clear console when app state changes (screen transitions)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.clear()
      console.log('🌍 Wojak Earth - Screen:', state.appState)
      if (state.travelingTo) {
        console.log('🚀 Traveling to:', state.travelingTo.name)
      }
    }
  }, [state.appState, state.travelingTo])

  // Show travel screen if traveling (from your existing logic)
  if (state.travelingTo) {
    return <TravelScreen destination={state.travelingTo} />
  }

  // Route based on app state (from your existing App.tsx switch)
  switch (state.appState) {
    case 'wallet-disconnected':
      return <WalletScreen />

    case 'error':
      return <ErrorScreen error={state.error} />

    case 'initial-loading':
      return <LoadingScreen message="INITIALIZING_WORLD_DATA" />

    case 'character-loading':
      return <LoadingScreen message="SCANNING_CHARACTER_PROFILE" />

    case 'game-loading':
      return <LoadingScreen message="CONSTRUCTING_GAME_WORLD" />

    case 'no-character':
      return <CharacterCreationScreen />

    case 'ready':
      return <GameScreen />

    default:
      return <LoadingScreen message="INITIALIZING_SYSTEMS" />
  }
}
