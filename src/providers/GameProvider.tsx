// src/providers/GameProvider.tsx
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { usePlayerCharacter, useCharacterActions } from '@/hooks/usePlayerCharacter'
import { useGameData } from '@/hooks/useGameData'
import { toast } from 'sonner'
import type { GameView, DatabaseLocation, Character } from '@/types'

// Types from your existing code
type AppState = 'wallet-disconnected' | 'initial-loading' | 'character-loading' | 'no-character' | 'game-loading' | 'ready' | 'error'

interface GameState {
  // App state
  appState: AppState
  currentView: GameView
  error?: string

  // Character data (from your existing hooks)
  character?: Character
  characterLoading: boolean
  hasCharacter: boolean

  // Game data
  gameData: any

  // UI state (from your existing App.tsx)
  loadingItems: Set<string>
  travelingTo?: DatabaseLocation
  selectedLocation?: DatabaseLocation
}

type GameAction =
  | { type: 'SET_APP_STATE'; appState: AppState }
  | { type: 'SET_VIEW'; view: GameView }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING_ITEM'; item_id: string; loading: boolean }
  | { type: 'START_TRAVEL'; destination: DatabaseLocation }
  | { type: 'END_TRAVEL' }
  | { type: 'SET_SELECTED_LOCATION'; location: DatabaseLocation | null }
  | { type: 'SET_CHARACTER_DATA'; character: Character; hasCharacter: boolean; loading: boolean }

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_APP_STATE':
      return { ...state, appState: action.appState }

    case 'SET_VIEW':
      return { ...state, currentView: action.view }

    case 'SET_ERROR':
      return { ...state, error: action.error, appState: 'error' }

    case 'CLEAR_ERROR':
      return { ...state, error: undefined }

    case 'SET_LOADING_ITEM': {
      const newLoadingItems = new Set(state.loadingItems)
      if (action.loading) {
        newLoadingItems.add(action.item_id)
      } else {
        newLoadingItems.delete(action.item_id)
      }
      return { ...state, loadingItems: newLoadingItems }
    }

    case 'START_TRAVEL':
      return { ...state, travelingTo: action.destination }

    case 'END_TRAVEL':
      return { ...state, travelingTo: undefined }

    case 'SET_SELECTED_LOCATION':
      return { ...state, selectedLocation: action.location }

    case 'SET_CHARACTER_DATA':
      return {
        ...state,
        character: action.character,
        hasCharacter: action.hasCharacter,
        characterLoading: action.loading
      }

    default:
      return state
  }
}

interface GameContextType {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  actions: {
    // Navigation
    navigate: (view: GameView) => void
    setSelectedLocation: (location: DatabaseLocation | null) => void

    // Character actions
    refetchCharacter: () => Promise<void>

    // Game actions (migrated from your existing handlers)
    handleMining: () => Promise<void>
    handleTravel: (location_id: string) => void
    handlePurchase: (item_id: string, cost: number, itemName: string) => Promise<void>
    handleEquipItem: (inventoryId: string, isCurrentlyEquipped: boolean) => Promise<void>
    handleUseItem: (inventoryId: string, itemName: string, energy_effect?: number, health_effect?: number) => Promise<void>
    handleSendMessage: (message: string) => Promise<void>

    // Error handling
    handleRetry: () => void
    handleRefresh: () => void
  }
}

const GameContext = createContext<GameContextType | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet()

  // Your existing hooks
  const { character, loading: characterLoading, hasCharacter, refetchCharacter, error: characterError } = usePlayerCharacter()
  const characterActions = useCharacterActions()

  const [state, dispatch] = useReducer(gameReducer, {
    appState: 'wallet-disconnected',
    currentView: 'main',
    characterLoading,
    hasCharacter,
    character,
    gameData: {},
    loadingItems: new Set()
  })

  // Your existing gameData hook
  const gameData = useGameData(character, state.currentView, state.selectedLocation)

  // Update character data when hooks change
  useEffect(() => {
    dispatch({
      type: 'SET_CHARACTER_DATA',
      character: character!,
      hasCharacter,
      loading: characterLoading
    })
  }, [character, hasCharacter, characterLoading])

  // Your existing state management logic from App.tsx
  useEffect(() => {
    if (!wallet.connected) {
      dispatch({ type: 'SET_APP_STATE', appState: 'wallet-disconnected' })
      dispatch({ type: 'CLEAR_ERROR' })
      dispatch({ type: 'SET_VIEW', view: 'main' })
      return
    }

    if (characterError || state.error) {
      dispatch({ type: 'SET_APP_STATE', appState: 'error' })
      return
    }

    if (characterLoading) {
      dispatch({ type: 'SET_APP_STATE', appState: 'character-loading' })
      return
    }

    if (!hasCharacter) {
      dispatch({ type: 'SET_APP_STATE', appState: 'no-character' })
      return
    }

    if (!character) {
      dispatch({ type: 'SET_APP_STATE', appState: 'initial-loading' })
      return
    }

    if (gameData.loading && !gameData.locations.length) {
      dispatch({ type: 'SET_APP_STATE', appState: 'game-loading' })
      return
    }

    if (gameData.error) {
      dispatch({ type: 'SET_ERROR', error: gameData.error })
      return
    }

    dispatch({ type: 'SET_APP_STATE', appState: 'ready' })
  }, [
    wallet.connected,
    characterLoading,
    hasCharacter,
    character,
    characterError,
    state.error,
    gameData.loading,
    gameData.locations.length,
    gameData.error
  ])

  // Actions - migrated from your existing gameHandlers
  const actions = {
    // Navigation
    navigate: useCallback((view: GameView) => {
      dispatch({ type: 'SET_VIEW', view })
    }, []),

    setSelectedLocation: useCallback((location: DatabaseLocation | null) => {
      dispatch({ type: 'SET_SELECTED_LOCATION', location })
    }, []),

    // Character
    refetchCharacter: useCallback(async () => {
      try {
        await refetchCharacter()
      } catch (error) {
        console.error('Failed to refetch character:', error)
        dispatch({ type: 'SET_ERROR', error: 'Failed to refresh character data' })
      }
    }, [refetchCharacter]),

    // Mining - from your existing code
    handleMining: useCallback(async () => {
      if (!character) return

      // Check energy first
      if (character.energy < 10) {
        toast.error('Not enough energy! Need at least 10 energy to mine.')
        return
      }

      try {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: 'mining', loading: true })

        console.log('🎯 Starting mining action for character:', character.id)
        const result = await characterActions.mine()


        console.log('⛏️ Mining result:', result)

        if (result.success) {
          // Check if we found an item
          if (result.foundItem) {
            toast.success(`Found ${result.foundItem.name}! (-${result.energyCost} energy)`)
          } else {
            toast.warning(`Nothing found this time... (-${result.energyCost} energy)`)
          }

          // Show health loss if any
          if (result.healthLoss > 0) {
            toast.warning(`Lost ${result.healthLoss} health!`)
          }

          // Refresh character data
          await refetchCharacter()
        } else {
          toast.error(result.message || 'Mining failed')
        }
      } catch (error) {
        console.error('Mining failed:', error)
        toast.error('Mining failed. Please try again.')
      } finally {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: 'mining', loading: false })
      }
    }, [character, characterActions, refetchCharacter]),

    // Travel - from your existing code
    handleTravel: useCallback((location_id: string) => {
      const location = gameData.locations.find((l: any) => l.id === location_id)
      if (!location) {
        console.error('Location not found:', location_id)
        return
      }

      console.log('🎯 Travel action called with location:', location)
      dispatch({ type: 'START_TRAVEL', destination: location })

      // Simulate travel time (from your existing code)
      setTimeout(() => {
        dispatch({ type: 'END_TRAVEL' })
        dispatch({ type: 'SET_VIEW', view: 'main' })
      }, 5000)
    }, [gameData.locations]),

    // Purchase - from your existing code
    handlePurchase: useCallback(async (item_id: string, cost: number, itemName: string) => {
      if (!character) return

      try {
        dispatch({ type: 'SET_LOADING_ITEM', item_id, loading: true })

        console.log('🎯 Purchase action called:', { item_id, cost, itemName })
        const result = await characterActions.buyItem(item_id)

        if (result.success) {
          toast.success(`Purchased ${itemName}! (-${cost} RUST)`)
          await refetchCharacter()
          await gameData.actions.loadGameData()
        } else {
          toast.error(result.message || 'Purchase failed')
        }
      } catch (error) {
        console.error('Purchase failed:', error)
        toast.error('Purchase failed. Please try again.')
      } finally {
        dispatch({ type: 'SET_LOADING_ITEM', item_id, loading: false })
      }
    }, [character, characterActions, refetchCharacter, gameData.actions]),

    // Equip item - from your existing code
    handleEquipItem: useCallback(async (inventoryId: string, isCurrentlyEquipped: boolean) => {
      if (!character) return

      try {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: inventoryId, loading: true })

        console.log('🎯 Equip item action called:', { inventoryId, isCurrentlyEquipped })
        const result = await characterActions.equipItem(inventoryId, !isCurrentlyEquipped)


        if (result.success) {
          const action = isCurrentlyEquipped ? 'unequipped' : 'equipped'
          toast.success(`Item ${action}!`)
          await refetchCharacter()
        } else {
          toast.error(result.message || 'Failed to equip item')
        }
      } catch (error) {
        console.error('Equip item failed:', error)
        toast.error('Failed to equip item. Please try again.')
      } finally {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: inventoryId, loading: false })
      }
    }, [character, characterActions, refetchCharacter]),

    // Use item - from your existing code
    handleUseItem: useCallback(async (inventoryId: string, itemName: string, energy_effect?: number, health_effect?: number) => {
      if (!character) return

      try {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: inventoryId, loading: true })

        console.log('🎯 Use item action called:', { inventoryId, itemName, energy_effect, health_effect })
        const result = await characterActions.useItem(inventoryId)

        if (result.success) {
          let message = `Used ${itemName}!`
          if (energy_effect) message += ` (+${energy_effect} energy)`
          if (health_effect) message += ` (+${health_effect} health)`

          toast.success(message)
          await refetchCharacter()
        } else {
          toast.error(result.message || 'Failed to use item')
        }
      } catch (error) {
        console.error('Use item failed:', error)
        toast.error('Failed to use item. Please try again.')
      } finally {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: inventoryId, loading: false })
      }
    }, [character, characterActions, refetchCharacter]),

    // Send message - from your existing code
    handleSendMessage: useCallback(async (message: string) => {
      if (!character || !message.trim()) return

      try {
        console.log('🎯 Send message action called:', message)
        const result = await characterActions.sendMessage(character.wallet_address, message.trim())

        if (result.success) {
          await gameData.actions.loadChatMessages()
        } else {
          toast.error(result.message || 'Failed to send message')
        }
      } catch (error) {
        console.error('Send message failed:', error)
        toast.error('Failed to send message. Please try again.')
      }
    }, [character, characterActions, gameData.actions]),

    // Error handling - from your existing code
    handleRetry: useCallback(() => {
      dispatch({ type: 'CLEAR_ERROR' })
      refetchCharacter()
    }, [refetchCharacter]),

    handleRefresh: useCallback(() => {
      window.location.reload()
    }, [])
  }

  const contextValue: GameContextType = {
    state: {
      ...state,
      gameData // Include gameData in state
    },
    dispatch,
    actions
  }

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within GameProvider')
  }
  return context
}

// Export types for other components
export type { GameContextType, GameState, GameAction }
