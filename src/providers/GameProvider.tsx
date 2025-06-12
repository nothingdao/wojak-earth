// src/providers/GameProvider.tsx - Cleaned up travel handling
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { usePlayerCharacter, useCharacterActions } from '@/hooks/usePlayerCharacter'
import { useGameData } from '@/hooks/useGameData'
import { toast } from 'sonner'
import type { GameView, DatabaseLocation, Character } from '@/types'

type AppState =
  | 'wallet-required'
  | 'checking-character'
  | 'character-required'
  | 'entering-game'
  | 'ready'
  | 'error'

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
  hasCheckedCharacter: boolean
  hasLoadedGameData: boolean
  isTravelingOnMap: boolean
  mapTravelDestination: string | null
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
  | { type: 'SET_MAP_TRAVELING'; isTraveling: boolean; destination: string | null }
  | { type: 'CLEAR_MAP_TRAVELING' }

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

    case 'SET_MAP_TRAVELING':
      return {
        ...state,
        isTravelingOnMap: action.isTraveling,
        mapTravelDestination: action.destination
      }

    case 'CLEAR_MAP_TRAVELING':
      return {
        ...state,
        isTravelingOnMap: false,
        mapTravelDestination: null
      }

    default:
      return state
  }
}

interface GameContextType {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  actions: {
    navigate: (view: GameView) => void
    setSelectedLocation: (location: DatabaseLocation | undefined) => void
    refetchCharacter: () => Promise<void>
    checkForCharacter: () => Promise<void>
    enterGame: () => Promise<void>
    createCharacterComplete: () => void
    handleMining: () => Promise<void>
    handleTravel: (location_id: string) => Promise<void>
    handlePurchase: (item_id: string, cost: number, itemName: string) => Promise<void>
    handleEquipItem: (inventoryId: string, isCurrentlyEquipped: boolean) => Promise<void>
    handleUseItem: (inventoryId: string, itemName: string, energy_effect?: number, health_effect?: number) => Promise<void>
    handleSendMessage: (message: string) => Promise<void>
    handleRetry: () => void
    handleRefresh: () => void
  }
}

const GameContext = createContext<GameContextType | undefined>(undefined)

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
    hasLoadedGameData: false,
    isTravelingOnMap: false,
    mapTravelDestination: null
  })

  const gameData = useGameData(character, state.currentView, state.selectedLocation)

  // Character location updates
  useEffect(() => {
    if (character) {
      console.log('🔥 CHARACTER LOCATION UPDATED:', character.current_location_id)
      dispatch({
        type: 'SET_CHARACTER_DATA',
        character: character,
        hasCharacter,
        loading: characterLoading
      })
    }
  }, [character, hasCharacter, characterLoading])

  // Wallet connection handling
  useEffect(() => {
    if (!wallet.connected) {
      dispatch({ type: 'SET_APP_STATE', appState: 'wallet-required' })
      dispatch({ type: 'CLEAR_ERROR' })
      dispatch({ type: 'SET_VIEW', view: 'main' })
    } else if (wallet.connected && state.appState === 'wallet-required') {
      dispatch({ type: 'SET_APP_STATE', appState: 'checking-character' })
    }
  }, [wallet.connected, state.appState])

  // Character detection
  useEffect(() => {
    if (character && character.id && !hasCharacter && !characterLoading) {
      dispatch({
        type: 'CHARACTER_CHECK_COMPLETE',
        hasCharacter: true
      })
    }
  }, [character, hasCharacter, characterLoading])

  // App state management
  useEffect(() => {
    if (character && character.id && hasCharacter && state.appState === 'character-required') {
      dispatch({
        type: 'SET_APP_STATE',
        appState: 'entering-game'
      })
    }
  }, [character, hasCharacter, state.appState])

  const actions = {
    navigate: useCallback((view: GameView) => {
      dispatch({ type: 'SET_VIEW', view })
    }, []),

    setSelectedLocation: useCallback((location: DatabaseLocation | undefined) => {
      dispatch({ type: 'SET_SELECTED_LOCATION', location })
    }, []),

    checkForCharacter: useCallback(async () => {
      if (!wallet.connected) return
      try {
        await refetchCharacter()
        dispatch({ type: 'CHARACTER_CHECK_COMPLETE', hasCharacter })
      } catch (error) {
        dispatch({ type: 'SET_ERROR', error: 'Failed to check character' })
      }
    }, [wallet.connected, refetchCharacter, hasCharacter]),

    enterGame: useCallback(async () => {
      if (!character) return
      try {
        await gameData.actions.loadGameData()
        dispatch({ type: 'GAME_DATA_LOADED' })
      } catch (error) {
        dispatch({ type: 'SET_ERROR', error: 'Failed to load game data' })
      }
    }, [character, gameData.actions]),

    createCharacterComplete: useCallback(() => {
      dispatch({ type: 'USER_WANTS_TO_ENTER_GAME' })
    }, []),

    refetchCharacter: useCallback(async () => {
      try {
        await refetchCharacter()
      } catch (error) {
        dispatch({ type: 'SET_ERROR', error: 'Failed to refresh character data' })
      }
    }, [refetchCharacter]),

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
        toast.error('Mining failed. Please try again.')
      } finally {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: 'mining', loading: false })
      }
    }, [character, characterActions, refetchCharacter]),

    handleTravel: useCallback(async (location_id: string) => {
      if (!character) return

      try {
        // Set map animation state
        dispatch({ type: 'SET_MAP_TRAVELING', isTraveling: true, destination: location_id })

        // Use the correct travel-action endpoint with proper parameters
        const response = await fetch('/.netlify/functions/travel-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: character.wallet_address,
            destinationId: location_id
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorMessage = 'Travel failed'
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.error || errorData.message || errorMessage
          } catch {
            errorMessage = errorText || errorMessage
          }
          throw new Error(errorMessage)
        }

        const result = await response.json()
        toast.success(`Traveled to ${result.destination?.name || 'destination'}!`)

        await refetchCharacter()
        await gameData.actions.loadGameData()
      } catch (error) {
        console.error('Travel failed:', error)
        toast.error(error instanceof Error ? error.message : 'Travel failed')
      } finally {
        dispatch({ type: 'CLEAR_MAP_TRAVELING' })
      }
    }, [character, characterActions, refetchCharacter, gameData.actions]),

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
        toast.error('Failed to send message. Please try again.')
      }
    }, [character, characterActions, gameData.actions, state.selectedLocation]),

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
