// src/components/screens/WalletScreen.tsx - Migrated from your wallet-disconnected state
import { Terminal, WifiOff, Zap } from 'lucide-react'
import { WalletConnectButton } from '../wallet-connect-button'

export function WalletScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background border border-primary/30 rounded-lg p-4 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-3 border-b border-primary/20 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <span className="text-primary font-bold text-sm">ACCESS_CONTROL v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <WifiOff className="w-3 h-3 text-red-500" />
            <span className="text-red-500 text-xs">DISCONNECTED</span>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-muted/30 border border-primary/20 rounded p-3 mb-3">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <div className="text-primary font-bold mb-1">WALLET_AUTHENTICATION_REQUIRED</div>
            <div className="text-muted-foreground text-xs">
              SOLANA_NETWORK_ACCESS_NEEDED
            </div>
          </div>
        </div>

        {/* Connect Button */}
        <div className="mb-3">
          <WalletConnectButton />
        </div>

        {/* System Requirements */}
        <div className="bg-muted/20 border border-primary/10 rounded p-2 mb-3">
          <div className="text-xs text-muted-foreground font-mono">
            <div className="text-primary text-xs font-bold mb-1">[SYSTEM_REQUIREMENTS]</div>
            <div>• MIN_SOL: 0.01 • DEVNET • PHANTOM/SOLFLARE</div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-2">
          WOJAK_EARTH_v2089 | AUTH_REQUIRED
        </div>
      </div>
    </div>
  )
}
