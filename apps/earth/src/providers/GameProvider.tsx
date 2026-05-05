// src/providers/GameProvider.tsx - Added balance management
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { useNetwork } from '@/contexts/NetworkContext'
import { usePlayerCharacter, useCharacterActions } from '@/hooks/usePlayerCharacter'
import { useGameData } from '@/hooks/useGameData'
import { toast } from '@/components/ui/use-toast'
import { gameToast } from '@/utils/enhanced-toast'
import type { GameView, Location, Character } from '@/types'
import { SERVER_URL } from '@/config/functionsBase'
import { convexHttp } from '@/lib/convex-singleton'
import { api } from '@convex/_generated/api'

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
  travelingTo?: Location
  selectedLocation?: Location | undefined
  hasCheckedCharacter: boolean
  hasLoadedGameData: boolean
  isTravelingOnMap: boolean
  mapTravelDestination: string | null
  // ✅ ADD BALANCE STATE
  solBalance: number
  walletEarthBalance: number
  balancesLoading: boolean
}

type GameAction =
  | { type: 'SET_APP_STATE'; appState: AppState }
  | { type: 'SET_VIEW'; view: GameView }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING_ITEM'; item_id: string; loading: boolean }
  | { type: 'START_TRAVEL'; destination: Location }
  | { type: 'END_TRAVEL' }
  | { type: 'SET_SELECTED_LOCATION'; location: Location | undefined }
  | { type: 'SET_PLAYER_DATA'; character: Character; hasCharacter: boolean; loading: boolean }
  | { type: 'UPDATE_CHARACTER'; character: Character }
  | { type: 'PLAYER_CHECK_COMPLETE'; hasCharacter: boolean }
  | { type: 'GAME_DATA_LOADED' }
  | { type: 'USER_WANTS_TO_ENTER_GAME' }
  | { type: 'SET_MAP_TRAVELING'; isTraveling: boolean; destination: string | null }
  | { type: 'SET_TRAVEL_DESTINATION'; destination: string }
  | { type: 'CLEAR_MAP_TRAVELING' }
  | { type: 'RESET_ALL_STATE' }
  // ✅ ADD BALANCE ACTIONS
  | { type: 'SET_BALANCES_LOADING'; loading: boolean }
  | { type: 'SET_SOL_BALANCE'; balance: number }
  | { type: 'SET_WALLET_EARTH_BALANCE'; balance: number }
  | { type: 'SET_BALANCES'; solBalance: number; walletEarthBalance: number }
  | { type: 'RESET_BALANCES' }

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

    case 'SET_PLAYER_DATA':
      return {
        ...state,
        character: action.character,
        hasCharacter: action.hasCharacter,
        characterLoading: action.loading
      }

    case 'UPDATE_CHARACTER':
      return {
        ...state,
        character: action.character
      }

    case 'PLAYER_CHECK_COMPLETE':
      return {
        ...state,
        hasCheckedCharacter: true,
        appState: 'character-required'
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

    case 'SET_TRAVEL_DESTINATION':
      return {
        ...state,
        mapTravelDestination: action.destination
      }

    case 'CLEAR_MAP_TRAVELING':
      return {
        ...state,
        isTravelingOnMap: false,
        mapTravelDestination: null
      }

    // ✅ ADD BALANCE REDUCERS
    case 'SET_BALANCES_LOADING':
      return {
        ...state,
        balancesLoading: action.loading
      }

    case 'SET_SOL_BALANCE':
      return {
        ...state,
        solBalance: action.balance
      }

    case 'SET_WALLET_EARTH_BALANCE':
      return {
        ...state,
        walletEarthBalance: action.balance
      }

    case 'SET_BALANCES':
      return {
        ...state,
        solBalance: action.solBalance,
        walletEarthBalance: action.walletEarthBalance,
        balancesLoading: false
      }

    case 'RESET_BALANCES':
      return {
        ...state,
        solBalance: 0,
        walletEarthBalance: 0,
        balancesLoading: false
      }

    case 'RESET_ALL_STATE':
      return {
        ...state,
        appState: 'wallet-required',
        currentView: 'main',
        error: undefined,
        character: undefined,
        characterLoading: false,
        hasCharacter: false,
        gameData: {},
        loadingItems: new Set<string>(),
        travelingTo: undefined,
        selectedLocation: undefined,
        hasCheckedCharacter: false,
        hasLoadedGameData: false,
        isTravelingOnMap: false,
        mapTravelDestination: null,
        // ✅ RESET BALANCES
        solBalance: 0,
        walletEarthBalance: 0,
        balancesLoading: false
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
    setSelectedLocation: (location: Location | undefined) => void
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
    setTravelDestination: (locationId: string) => void
    // ✅ ADD BALANCE ACTIONS
    refetchBalances: () => Promise<void>
    formatBalance: (amount: number) => string
  }
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet()
  const { publicKey } = wallet
  const { isMainnet } = useNetwork()

  // Environment variables
  const EARTH_MINT_ADDRESS = import.meta.env.VITE_EARTH_MINT_ADDRESS
  const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com'

  // Load character data on devnet only, but don't completely block the hooks
  const {
    character,
    loading: characterLoading,
    hasCharacter,
    refetchCharacter
  } = usePlayerCharacter(!isMainnet) // Only load on devnet

  const characterActions = useCharacterActions(!isMainnet) // Only allow actions on devnet

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
    mapTravelDestination: null,
    // ✅ INITIALIZE BALANCE STATE
    solBalance: 0,
    walletEarthBalance: 0,
    balancesLoading: false
  })

  // Track if mining is in progress to suppress equipment toasts
  const isMiningInProgress = state.loadingItems.has('mining')

  const gameData = useGameData(
    !isMainnet ? character : null,
    !isMainnet ? state.currentView : 'main',
    !isMainnet ? state.selectedLocation : undefined
  )

  // ✅ BALANCE FETCHING FUNCTIONS
  const fetchSolBalance = useCallback(async (): Promise<number> => {
    if (!publicKey || isMainnet) return 0;

    try {
      const response = await fetch(`${SERVER_URL}/earth/sol-balance?wallet_address=${publicKey.toString()}`);
      const data = await response.json();

      if (data.success) {
        console.log(`💰 SOL Balance: ${data.solBalance}`);
        return data.solBalance;
      } else {
        console.error('Failed to fetch SOL balance:', data.error);
        return 0;
      }
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      return 0;
    }
  }, [publicKey, isMainnet]);

  const fetchWalletEarthBalance = useCallback(async (): Promise<number> => {
    if (!publicKey || !EARTH_MINT_ADDRESS || isMainnet) return 0;

    try {
      const connection = new Connection(SOLANA_RPC_URL);
      const earthMint = new PublicKey(EARTH_MINT_ADDRESS);
      const userTokenAccount = await getAssociatedTokenAddress(earthMint, publicKey);

      const balance = await connection.getTokenAccountBalance(userTokenAccount);
      const earthBalance = parseFloat(balance.value.uiAmount || '0');

      console.log(`🌍 Wallet EARTH Balance: ${earthBalance}`);
      return earthBalance;
    } catch (error) {
      if (error.message?.includes('could not find account')) {
        console.log('User has no EARTH token account yet');
        return 0;
      }
      console.error('Error fetching wallet EARTH balance:', error);
      return 0;
    }
  }, [publicKey, EARTH_MINT_ADDRESS, SOLANA_RPC_URL, isMainnet]);

  const refetchBalances = useCallback(async () => {
    if (!publicKey || isMainnet) {
      dispatch({ type: 'RESET_BALANCES' });
      return;
    }

    dispatch({ type: 'SET_BALANCES_LOADING', loading: true });

    try {
      const [solBalance, walletEarthBalance] = await Promise.all([
        fetchSolBalance(),
        fetchWalletEarthBalance()
      ]);

      dispatch({
        type: 'SET_BALANCES',
        solBalance,
        walletEarthBalance
      });
    } catch (error) {
      console.error('❌ Failed to fetch balances:', error);
      dispatch({ type: 'SET_BALANCES_LOADING', loading: false });
    }
  }, [publicKey, isMainnet, fetchSolBalance, fetchWalletEarthBalance]);

  // ✅ FORMAT BALANCE HELPER
  const formatBalance = useCallback((amount: number): string => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return Math.floor(amount).toString();
  }, []);

  // Character updates - sync hook state to provider state
  useEffect(() => {
    if (character && !isMainnet) {
      console.log('🔄 Character updated from hook, syncing to provider state');
      console.log('📊 Character EARTH balance:', character.earth);
      dispatch({
        type: 'SET_PLAYER_DATA',
        character: character,
        hasCharacter,
        loading: characterLoading
      });
    }
  }, [character, hasCharacter, characterLoading, isMainnet]);

  // ✅ FETCH BALANCES WHEN WALLET CONNECTS
  useEffect(() => {
    if (publicKey && !isMainnet) {
      refetchBalances();
    } else {
      dispatch({ type: 'RESET_BALANCES' });
    }
  }, [publicKey, isMainnet, refetchBalances]);

  // Wallet connection handling
  useEffect(() => {
    if (!wallet.connected) {
      console.log('🔌 Wallet disconnected - resetting game state');
      dispatch({ type: 'RESET_ALL_STATE' });
    } else if (wallet.connected && state.appState === 'wallet-required') {
      if (isMainnet) {
        console.log('🟢 MAINNET: Staying at wallet-required for reservations');
        return;
      }
      dispatch({ type: 'SET_APP_STATE', appState: 'checking-character' });
    }
  }, [wallet.connected, state.appState, isMainnet]);

  // Character detection - ONLY ON DEVNET
  useEffect(() => {
    if (!isMainnet && character && character.id && !hasCharacter && !characterLoading) {
      dispatch({
        type: 'PLAYER_CHECK_COMPLETE',
        hasCharacter: true
      });
    }
  }, [character, hasCharacter, characterLoading, isMainnet]);

  const actions = {
    navigate: useCallback((view: GameView) => {
      if (isMainnet) {
        console.log('🟢 MAINNET: Navigation blocked');
        return;
      }
      dispatch({ type: 'SET_VIEW', view });
    }, [isMainnet]),

    setSelectedLocation: useCallback((location: Location | undefined) => {
      if (isMainnet) {
        console.log('🟢 MAINNET: Location selection blocked');
        return;
      }
      dispatch({ type: 'SET_SELECTED_LOCATION', location });
    }, [isMainnet]),

    checkForCharacter: useCallback(async () => {
      if (!wallet.connected || isMainnet) return;
      try {
        await refetchCharacter();
        dispatch({ type: 'PLAYER_CHECK_COMPLETE', hasCharacter });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', error: 'Failed to check character' });
      }
    }, [wallet.connected, refetchCharacter, hasCharacter, isMainnet]),

    enterGame: useCallback(async () => {
      if (!character || isMainnet) return;
      try {
        await gameData.actions.loadGameData();
        dispatch({ type: 'GAME_DATA_LOADED' });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', error: 'Failed to load game data' });
      }
    }, [character, gameData.actions, isMainnet]),

    createCharacterComplete: useCallback(() => {
      if (isMainnet) return;
      dispatch({ type: 'USER_WANTS_TO_ENTER_GAME' });
    }, [isMainnet]),

    // ✅ ENHANCED: refetchCharacter now also refreshes balances
    refetchCharacter: useCallback(async () => {
      if (isMainnet) return;
      try {
        await refetchCharacter(); // This updates the hook's character state
        await refetchBalances(); // Also refresh wallet balances
      } catch (error) {
        console.error('❌ GameProvider: Character refetch failed:', error);
        dispatch({ type: 'SET_ERROR', error: 'Failed to refresh character data' });
      }
    }, [refetchCharacter, refetchBalances, isMainnet]),

    // ✅ ADD BALANCE ACTIONS
    refetchBalances,
    formatBalance,

    handleMining: useCallback(async () => {
      if (!character || isMainnet) return;
      if (character.energy < 10) {
        toast.error('Not enough energy! Need at least 10 energy to mine.');
        return;
      }

      try {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: 'mining', loading: true });
        
        // Suppress inventory toasts during mining
        (window as any).__suppressInventoryToasts = true;
        
        // Start progressive mining toast
        const estimatedEnergyCost = Math.max(10 - Math.floor(character.level / 5), 5);
        const miningToast = gameToast.miningFlow(estimatedEnergyCost);
        
        const result = await characterActions.mine();

        if (result.success) {
          if (result.found) {
            // Check if item is equipment type for auto-equip detection
            const isEquipment = ['EQUIPMENT', 'WEAPON', 'ARMOR', 'TOOL'].includes(result.found.item.category);
            const itemName = result.found.item.name || 'Unknown Item';
            
            miningToast.success(itemName, isEquipment);
          } else {
            miningToast.empty();
          }
          
          // Show health loss separately if needed
          if (result.healthLoss > 0) {
            setTimeout(() => {
              toast.warning(`Mining hazard: -${result.healthLoss} health!`);
            }, 1500);
          }
          
          await refetchCharacter();
        } else {
          miningToast.error(result.message || 'Mining operation failed');
        }
      } catch (error) {
        console.error('Mining error:', error);
        toast.error('Mining failed. Please try again.');
      } finally {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: 'mining', loading: false });
        // Re-enable inventory toasts after mining
        (window as any).__suppressInventoryToasts = false;
      }
    }, [character, characterActions, refetchCharacter, isMainnet]),

    handleTravel: useCallback(async (location_id: string) => {
      if (!character || isMainnet) return;

      try {
        dispatch({ type: 'SET_MAP_TRAVELING', isTraveling: true, destination: location_id });

        // Get location data for enhanced toast
        const destination = gameData.locations?.find(loc => loc.id === location_id);
        const currentLocation = gameData.locations?.find(loc => loc.id === character.current_location_id);

        const availableServices = [];
        if (destination?.has_market) availableServices.push('MARKET');
        if (destination?.has_mining) availableServices.push('MINING');
        if (destination?.has_chat) availableServices.push('COMMS');

        // Start progressive travel toast
        const travelToast = gameToast.travel(
          currentLocation?.name || 'UNKNOWN',
          destination?.name || 'UNKNOWN',
          availableServices
        );

        await convexHttp.mutation(api.earth.characters.travel, {
          walletAddress: character.wallet_address,
          destinationId: location_id,
        });

        // Complete the progressive toast
        travelToast.complete();

        await refetchCharacter();
        await gameData.actions.loadGameData();
      } catch (error) {
        console.error('Travel failed:', error);
        // Error already shown by travelToast.error() if it was a travel failure
        if (!error.message?.includes('Travel failed')) {
          toast.error(error instanceof Error ? error.message : 'Travel failed');
        }
      } finally {
        dispatch({ type: 'CLEAR_MAP_TRAVELING' });
      }
    }, [character, refetchCharacter, gameData.actions, gameData.locations, isMainnet]),

    handlePurchase: useCallback(async (item_id: string, cost: number, itemName: string) => {
      if (!character || isMainnet) return;

      try {
        dispatch({ type: 'SET_LOADING_ITEM', item_id, loading: true });
        
        // Suppress inventory toasts during purchase
        (window as any).__suppressInventoryToasts = true;
        
        // Start progressive purchase toast
        const purchaseToast = gameToast.purchaseFlow(itemName, cost);
        
        const result = await characterActions.buyItem(item_id);

        if (result.success) {
          // The purchase API returns the purchased item in the inventory field
          const purchasedItem = result.inventory?.item || result.item || {};
          const actualItemName = purchasedItem.name || 'UNKNOWN ITEM';
          
          // Check if item was auto-equipped (only equipment items should be)
          const isEquipment = purchasedItem?.category && ['EQUIPMENT', 'WEAPON', 'ARMOR', 'TOOL'].includes(purchasedItem.category);
          const newBalance = result.character?.earth || result.newBalance || 0;
          purchaseToast.success(newBalance, isEquipment, actualItemName);
          
          await refetchCharacter();
          await gameData.actions.loadGameData();
        } else {
          purchaseToast.error(result.message || 'INSUFFICIENT_FUNDS');
        }
      } catch (error) {
        toast.error('PURCHASE_FAILED', {
          description: 'NETWORK_ERROR • RETRY_REQUIRED',
          duration: 4000,
        });
      } finally {
        dispatch({ type: 'SET_LOADING_ITEM', item_id, loading: false });
        // Re-enable inventory toasts after purchase
        setTimeout(() => {
          (window as any).__suppressInventoryToasts = false;
        }, 500);
      }
    }, [character, characterActions, refetchCharacter, gameData.actions, isMainnet]),

    handleEquipItem: useCallback(async (inventoryId: string, shouldEquip: boolean) => {
      if (!character || isMainnet) return;

      try {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: inventoryId, loading: true });
        
        // Find the item being equipped for toast info
        const inventoryItem = character.inventory?.find(inv => inv.id === inventoryId);
        const itemName = inventoryItem?.item?.name || 'Unknown Item';
        const itemCategory = inventoryItem?.item?.category || 'UNKNOWN';
        
        // Suppress inventory toasts during equipment operations
        (window as any).__suppressInventoryToasts = true;
        
        // Start progressive equipment toast (unless during mining)
        let equipmentToast = null;
        if (!isMiningInProgress) {
          const action = shouldEquip ? 'equip' : 'unequip';
          equipmentToast = gameToast.equipmentFlow(action, itemName, itemCategory);
        }
        
        const result = await characterActions.equipItem(inventoryId, shouldEquip);

        if (result.success) {
          // Complete the progressive toast (unless during mining)
          if (!isMiningInProgress && equipmentToast) {
            const slotInfo = result.slotInfo ? `SLOT: ${result.slotInfo}` : '';
            equipmentToast.success(result.item.rarity, slotInfo);
          }
          await refetchCharacter();
        } else {
          // Show errors even during mining
          if (!isMiningInProgress && equipmentToast) {
            equipmentToast.error(result.message || 'INVALID_SLOT • RETRY_REQUIRED');
          } else {
            toast.error('EQUIPMENT_ERROR', {
              description: result.message || 'INVALID_SLOT • RETRY_REQUIRED',
              duration: 4000,
            });
          }
        }
      } catch (error) {
        toast.error('EQUIPMENT_ERROR', {
          description: 'NETWORK_ERROR • RETRY_REQUIRED',
          duration: 4000,
        });
      } finally {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: inventoryId, loading: false });
        // Re-enable inventory toasts after equipment operation
        setTimeout(() => {
          (window as any).__suppressInventoryToasts = false;
        }, 500); // Small delay to ensure all DB updates are processed
      }
    }, [character, characterActions, refetchCharacter, isMainnet]),

    handleUseItem: useCallback(async (inventoryId: string, itemName: string, energy_effect?: number, health_effect?: number) => {
      if (!character || isMainnet) return;

      try {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: inventoryId, loading: true });
        
        // Suppress inventory toasts during consumable use
        (window as any).__suppressInventoryToasts = true;
        
        // Start progressive consumable toast
        const effects = { energy: energy_effect, health: health_effect };
        const consumableToast = gameToast.consumableFlow(itemName, effects);
        
        const result = await characterActions.useItem(inventoryId);

        if (result.success) {
          consumableToast.success();
          await refetchCharacter();
        } else {
          consumableToast.error(result.message || 'INVALID_ITEM • RETRY_REQUIRED');
        }
      } catch (error) {
        toast.error('ITEM_ERROR', {
          description: 'NETWORK_ERROR • RETRY_REQUIRED',
          duration: 4000,
        });
      } finally {
        dispatch({ type: 'SET_LOADING_ITEM', item_id: inventoryId, loading: false });
        // Re-enable inventory toasts after consumable use
        setTimeout(() => {
          (window as any).__suppressInventoryToasts = false;
        }, 500);
      }
    }, [character, characterActions, refetchCharacter, isMainnet]),

    handleSendMessage: useCallback(async (message: string) => {
      if (!character || !message.trim() || isMainnet) return;

      try {
        const location_id = character.current_location_id;

        console.log('💬 Sending message debug info:', {
          character_name: character.name,
          character_current_location_id: character.current_location_id,
          selectedLocation_id: state.selectedLocation?.id,
          using_location_id: location_id,
          message_preview: message.trim().substring(0, 20) + '...'
        });

        const result = await characterActions.sendMessage(location_id, message.trim(), 'CHAT');

        if (result.success) {
          await gameData.actions.loadChatMessages(location_id);
        } else {
          toast.error(result.message || 'Failed to send message');
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('Failed to send message. Please try again.');
      }
    }, [character, characterActions, gameData.actions, state.selectedLocation, isMainnet]),

    setTravelDestination: useCallback((locationId: string) => {
      if (isMainnet) {
        console.log('🟢 MAINNET: Travel destination setting blocked');
        return;
      }
      dispatch({ type: 'SET_TRAVEL_DESTINATION', destination: locationId });
    }, [isMainnet]),

    handleRetry: useCallback(() => {
      dispatch({ type: 'CLEAR_ERROR' });
      if (wallet.connected && !isMainnet) {
        dispatch({ type: 'SET_APP_STATE', appState: 'checking-character' });
      }
    }, [wallet.connected, isMainnet]),

    handleRefresh: useCallback(() => {
      window.location.reload();
    }, [])
  };

  const contextValue: GameContextType = {
    state: {
      ...state,
      gameData: !isMainnet ? gameData : {}
    },
    dispatch,
    actions
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

export type { GameContextType, GameState, GameAction };
