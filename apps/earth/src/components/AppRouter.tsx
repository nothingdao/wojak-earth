
// src/components/AppRouter.tsx - Refactored with Registry Dashboard
import React from 'react';
import { useGame } from '@/providers/GameProvider';
import { useNetwork } from '@/contexts/NetworkContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Loader2, Database, Zap, AlertTriangle, Activity, Terminal, User } from 'lucide-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// Import your existing game components
import { GameScreen } from '@/components/screens/GameScreen';
import { RegistryDashboard } from '@/components/screens/RegistryDashboard';
import { TopControls } from './TopControls';

export function AppRouter() {
  const { state, actions } = useGame();
  const { connected } = useWallet();
  const { isDevnet, setNetwork } = useNetwork();

  // console.log('Wallet Connected:', connected);
  // console.log('Wallet PublicKey:', publicKey?.toBase58());

  // Auto-switch to devnet by default (for game)
  React.useEffect(() => {
    if (connected && !isDevnet) {
      console.log('🔄 Auto-switching to devnet for game access');
      setNetwork(WalletAdapterNetwork.Devnet);
    }
  }, [connected, isDevnet, setNetwork]);

  // Normal game flow (always on devnet)
  switch (state.appState) {
    case 'wallet-required':
      return <WalletConnectScreen />;

    case 'checking-character':
      return <RegistryDashboard onEnterGame={actions.createCharacterComplete} />;

    case 'character-required':
      return (
        <RegistryDashboard
          onEnterGame={() => {
            console.log('🎮 User wants to enter game from registry');
            actions.createCharacterComplete(); // ✅ This already exists and sets 'USER_WANTS_TO_ENTER_GAME'
          }}
        />
      );

    case 'entering-game':
      return <EnteringGameScreen />;

    case 'ready':
      return <GameScreen />;

    case 'error':
      return <ErrorScreen error={state.error} onRetry={actions.handleRetry} />;

    default:
      return <LoadingScreen message="Initializing..." />;
  }
}

// Simplified WalletConnectScreen - no network selection
function WalletConnectScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <TopControls />

      <div className="w-full max-w-md mx-auto bg-background border rounded-lg p-6 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4 border-b pb-3 border-border">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-md">EARTH_2089 v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-success animate-pulse" />
            <span className="text-success text-xs">READY</span>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-background border rounded p-4 mb-4">
          <div className="text-center">
            <div className="text-primary font-bold text-xl mb-2">WELCOME_TO_EARTH</div>
            <div className="text-muted-foreground text-xs">
              Connect a Solana wallet to create a player or enter Earth with an existing one.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground font-mono text-center border-t pt-3 mt-4 border-border">
          EARTH_v2089 | POST_APOCALYPTIC_AND_CHILL
        </div>
      </div>
    </div>
  );
}


function EnteringGameScreen() {
  const { actions, state } = useGame()
  const startedRef = React.useRef(false)

  React.useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    actions.enterGame()
  }, [actions])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto bg-background border border-primary/30 rounded-lg p-6 font-mono text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-muted/30 rounded-xs flex items-center justify-center border border-primary/20 overflow-hidden">
          {state.character?.current_image_url ? (
            <img
              src={state.character.current_image_url}
              alt={state.character.name || 'Character'}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-8 h-8 text-primary" />
          )}
        </div>

        <Loader2 className="h-5 w-5 text-primary animate-spin mx-auto mb-3" />
        <h2 className="text-primary font-bold text-sm mb-1">Entering Earth</h2>
        <p className="text-xs text-muted-foreground">Loading your player and world state...</p>
      </div>
    </div>
  )
}

function ErrorScreen({ error, onRetry }: { error?: string, onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-background border border-error/50 rounded-lg p-6 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-error/30 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-error" />
            <span className="text-error font-bold text-sm">ERROR_HANDLER v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-error" />
            <span className="text-error text-xs">CRITICAL</span>
          </div>
        </div>

        {/* Error Display */}
        <div className="bg-red-950/20 border border-error/30 rounded p-4 mb-4">
          <div className="text-center">
            <div className="text-error text-2xl mb-2">💥</div>
            <div className="text-error font-bold mb-1">SYSTEM_MALFUNCTION</div>
            <div className="text-red-400 text-xs break-words">
              {error || 'UNKNOWN_ERROR_DETECTED'}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onRetry}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-mono text-sm"
          >
            <Terminal className="w-4 h-4 mr-2" />
            RETRY_CONNECTION
          </Button>

          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full border-error/50 text-red-400 hover:bg-red-950/20 font-mono text-sm"
          >
            EMERGENCY_RESTART
          </Button>
        </div>

        {/* Footer */}
        <div className="text-xs text-red-400/60 font-mono text-center border-t border-error/20 pt-3 mt-4">
          ERROR_HANDLER_v2089 | DIAGNOSTIC_MODE
        </div>
      </div>
    </div>
  )
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center font-mono">
        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
