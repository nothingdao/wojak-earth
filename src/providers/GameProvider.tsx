// src/providers/GameProvider.tsx - Explicit State Machine Version
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { usePlayerCharacter, useCharacterActions } from '@/hooks/usePlayerCharacter'
import { useGameData } from '@/hooks/useGameData'
import { toast } from 'sonner'
import type { GameView, DatabaseLocation, Character } from '@/types'

// Simplified app states - only what user sees
type AppState =
  | 'wallet-required'      // Show wallet connect
  | 'checking-character'   // Loading spinner only
  | 'character-required'   // Show character creation
  | 'entering-game'        // Loading game data
  | 'ready'               // Game is ready
  | 'error'               // Show error

interface GameState {
  appState: AppState
  currentView: GameView
  error?: string
  character?: Character
  characterLoading: boolean
  hasCharacter: boolean
  gameData: any
  loadingItems: Set<string>
  travelingTo?: DatabaseLocation
  selectedLocation?: DatabaseLocation | undefined

  // New: track what checks we've completed
  hasCheckedCharacter: boolean
  hasLoadedGameData: boolean
}

type GameAction =
  | { type: 'SET_APP_STATE'; appState: AppState }
  | { type: 'SET_VIEW'; view: GameView }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING_ITEM'; item_id: string; loading: boolean }
  | { type: 'START_TRAVEL'; destination: DatabaseLocation }
  | { type: 'END_TRAVEL' }
  | { type: 'SET_SELECTED_LOCATION'; location: DatabaseLocation | undefined }
  | { type: 'SET_CHARACTER_DATA'; character: Character; hasCharacter: boolean; loading: boolean }
  | { type: 'CHARACTER_CHECK_COMPLETE'; hasCharacter: boolean }
  | { type: 'GAME_DATA_LOADED' }
  | { type: 'USER_WANTS_TO_ENTER_GAME' }

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
      return { ...state, selectedLocation: action.location || undefined }

    case 'SET_CHARACTER_DATA':
      return {
        ...state,
        character: action.character,
        hasCharacter: action.hasCharacter,
        characterLoading: action.loading
      }

    case 'CHARACTER_CHECK_COMPLETE':
      return {
        ...state,
        hasCheckedCharacter: true,
        appState: action.hasCharacter ? 'entering-game' : 'character-required'
      }

    case 'GAME_DATA_LOADED':
      return {
        ...state,
        hasLoadedGameData: true,
        appState: 'ready'
      }

    case 'USER_WANTS_TO_ENTER_GAME':
      return {
        ...state,
        appState: 'entering-game'
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
    setSelectedLocation: (location: DatabaseLocation | undefined) => void

    // Character actions
    refetchCharacter: () => Promise<void>

    // New: explicit user actions
    checkForCharacter: () => Promise<void>
    enterGame: () => Promise<void>
    createCharacterComplete: () => void

    // Game actions (same as before)
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
  const { character, loading: characterLoading, hasCharacter, refetchCharacter } = usePlayerCharacter()
  const characterActions = useCharacterActions()

  const [state, dispatch] = useReducer(gameReducer, {
    appState: 'wallet-required',
    currentView: 'main',
    characterLoading: false,
    hasCharacter: false,
    character: undefined,
    gameData: {},
    loadingItems: new Set<string>(),
    hasCheckedCharacter: false,
    hasLoadedGameData: false
  })

  const gameData = useGameData(character, state.currentView, state.selectedLocation)

  // Update character data when hooks change
  useEffect(() => {
    if (character) {
      dispatch({
        type: 'SET_CHARACTER_DATA',
        character: character,
        hasCharacter,
        loading: characterLoading
      })
    }
  }, [character, hasCharacter, characterLoading])

  // Only handle wallet connection/disconnection automatically
  useEffect(() => {
    if (!wallet.connected) {
      dispatch({ type: 'SET_APP_STATE', appState: 'wallet-required' })
      dispatch({ type: 'CLEAR_ERROR' })
      dispatch({ type: 'SET_VIEW', view: 'main' })
    } else if (wallet.connected && state.appState === 'wallet-required') {
      // When wallet connects, check for character
      dispatch({ type: 'SET_APP_STATE', appState: 'checking-character' })
    }
  }, [wallet.connected, state.appState])


  // Fallback fix: If we have a character object but hasCharacter is false, fix it
  useEffect(() => {
    if (character && character.id && !hasCharacter && !characterLoading) {
      console.log('🔧 FIXING character detection - character exists but hasCharacter is false')
      console.log('Character found via real-time:', {
        id: character.id,
        name: character.name,
        hasCharacter,
        appState: state.appState
      })

      // Force the character check to complete with the correct hasCharacter value
      dispatch({
        type: 'CHARACTER_CHECK_COMPLETE',
        hasCharacter: true // Force this to true since we have a character
      })
    }
  }, [character, hasCharacter, characterLoading, state.appState])

  // Check if the character is loaded but we're still in wrong state
  useEffect(() => {
    if (character && character.id && hasCharacter && state.appState === 'character-required') {
      console.log('🔧 FIXING app state - have character but still showing character-required')

      // If we have a character and hasCharacter is true, but we're still showing character-required
      dispatch({
        type: 'SET_APP_STATE',
        appState: 'entering-game'
      })
    }
  }, [character, hasCharacter, state.appState])

  // Actions
  const actions = {
    // Navigation
    navigate: useCallback((view: GameView) => {
      dispatch({ type: 'SET_VIEW', view })
    }, []),

    setSelectedLocation: useCallback((location: DatabaseLocation | undefined) => {
      dispatch({ type: 'SET_SELECTED_LOCATION', location })
    }, []),

    // NEW: Explicit character checking
    checkForCharacter: useCallback(async () => {
      if (!wallet.connected) return

      try {
        await refetchCharacter()
        // The character data will update via useEffect above
        // Then we dispatch completion
        dispatch({ type: 'CHARACTER_CHECK_COMPLETE', hasCharacter })
      } catch (error) {
        dispatch({ type: 'SET_ERROR', error: 'Failed to check character' })
      }
    }, [wallet.connected, refetchCharacter, hasCharacter]),

    // NEW: Explicit game entry
    enterGame: useCallback(async () => {
      if (!character) return

      try {
        // Wait for game data to load
        await gameData.actions.loadGameData()
        dispatch({ type: 'GAME_DATA_LOADED' })
      } catch (error) {
        dispatch({ type: 'SET_ERROR', error: 'Failed to load game data' })
      }
    }, [character, gameData.actions]),

    // NEW: Called after character creation completes
    createCharacterComplete: useCallback(() => {
      dispatch({ type: 'USER_WANTS_TO_ENTER_GAME' })
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

    // Game Actions (from your existing code)
    handleMining: useCallback(async () => {
      if (!character) return

      if (character.energy < 10) {
        toast.error('Not enough energy! Need at least 10 energy to mine.')
        return
      }

      try {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: 'mining', loading: true })
        const result = await characterActions.mine()

        if (result.success) {
          if (result.foundItem) {
            toast.success(`Found ${result.foundItem.name}! (-${result.energyCost} energy)`)
          } else {
            toast.warning(`Nothing found this time... (-${result.energyCost} energy)`)
          }
          if (result.healthLoss > 0) {
            toast.warning(`Lost ${result.healthLoss} health!`)
          }
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

    handleTravel: useCallback(async (location_id: string) => {
      if (!character) {
        toast.error('No character found')
        return
      }

      const location = gameData.locations?.find((l: any) => l.id === location_id)
      if (!location) {
        console.error('Location not found:', location_id)
        toast.error('Location not found')
        return
      }

      // Check if already at this location
      if (character.current_location_id === location_id) {
        toast.info('You are already at this location')
        return
      }

      // Check level requirements
      if (location.min_level && character.level < location.min_level) {
        toast.error(`You need to be level ${location.min_level} to travel here`)
        return
      }

      // Check entry cost
      if (location.entry_cost && location.entry_cost > (character.coins || 0)) {
        toast.error(`You need ${location.entry_cost} RUST to travel here`)
        return
      }

      try {
        console.log('🎯 Starting travel to:', location.name)
        dispatch({ type: 'START_TRAVEL', destination: location })

        // Make the actual API call to travel
        console.log('🌐 Making API call to travel...')
        const result = await characterActions.travel(location_id)
        console.log('📋 Travel API result:', result)

        if (result.success) {
          toast.success(`Traveled to ${location.name}!`)

          // Update character data
          console.log('🔄 Refetching character data...')
          await refetchCharacter()

          // Reload game data for new location
          console.log('🔄 Reloading game data...')
          await gameData.actions.loadGameData()

          // Switch to main view after successful travel
          dispatch({ type: 'SET_VIEW', view: 'main' })
          console.log('✅ Travel completed successfully!')
        } else {
          console.error('❌ Travel failed:', result.message)
          toast.error(result.message || 'Travel failed')
        }
      } catch (error) {
        console.error('❌ Travel error:', error)
        toast.error('Travel failed. Please try again.')
      } finally {
        dispatch({ type: 'END_TRAVEL' })
      }
    }, [character, gameData.locations, characterActions, refetchCharacter, gameData.actions]),

    handlePurchase: useCallback(async (item_id: string, cost: number, itemName: string) => {
      if (!character) return

      try {
        dispatch({ type: 'SET_LOADING_ITEM', item_id, loading: true })
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

    handleEquipItem: useCallback(async (inventoryId: string, isCurrentlyEquipped: boolean) => {
      if (!character) return

      try {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: inventoryId, loading: true })
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

    handleUseItem: useCallback(async (inventoryId: string, itemName: string, energy_effect?: number, health_effect?: number) => {
      if (!character) return

      try {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: inventoryId, loading: true })
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

    handleSendMessage: useCallback(async (message: string) => {
      if (!character || !message.trim()) return

      try {
        const location_id = state.selectedLocation?.id || character.currentLocation.id
        const result = await characterActions.sendMessage(location_id, message.trim())

        if (result.success) {
          await gameData.actions.loadChatMessages(location_id)
        } else {
          toast.error(result.message || 'Failed to send message')
        }
      } catch (error) {
        console.error('Send message failed:', error)
        toast.error('Failed to send message. Please try again.')
      }
    }, [character, characterActions, gameData.actions, state.selectedLocation])
    ,
    handleRetry: useCallback(() => {
      dispatch({ type: 'CLEAR_ERROR' })
      if (wallet.connected) {
        dispatch({ type: 'SET_APP_STATE', appState: 'checking-character' })
      }
    }, [wallet.connected]),

    handleRefresh: useCallback(() => {
      window.location.reload()
    }, [])
  }

  const contextValue: GameContextType = {
    state: {
      ...state,
      gameData
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

export type { GameContextType, GameState, GameAction }
