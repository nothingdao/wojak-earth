// src/components/screens/ErrorScreen.tsx
import { AlertTriangle, Activity, RefreshCw, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGame } from '@/providers/GameProvider'

interface ErrorScreenProps {
  error?: string
}

export function ErrorScreen({ error }: ErrorScreenProps) {
  const { actions } = useGame()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background border border-red-500/50 rounded-lg p-4 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-3 border-b border-red-500/30 pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-red-500 font-bold text-sm">ERROR_HANDLER v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 animate-pulse text-red-500" />
            <span className="text-red-500 text-xs">CRITICAL</span>
          </div>
        </div>

        {/* Error Status */}
        <div className="bg-red-950/20 border border-red-500/30 rounded p-3 mb-3">
          <div className="text-center">
            <div className="text-red-500 text-2xl mb-2">⚠</div>
            <div className="text-red-500 font-bold mb-1">SYSTEM_ERROR_DETECTED</div>
            <div className="text-red-400 text-xs break-words">
              {error ? error.substring(0, 80) + '...' : 'UNKNOWN_ERROR'}
            </div>
          </div>
        </div>

        {/* Recovery Options */}
        <div className="space-y-2 mb-3">
          <Button
            onClick={actions.handleRetry}
            className="w-full font-mono text-xs h-7"
            variant="outline"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            RETRY_CONNECTION
          </Button>
          <Button
            variant="destructive"
            onClick={actions.handleRefresh}
            className="w-full font-mono text-xs h-7"
          >
            <Terminal className="w-3 h-3 mr-1" />
            FORCE_RESTART
          </Button>
        </div>

        {/* Error Info */}
        <div className="bg-muted/20 border border-red-500/10 rounded p-2 mb-3">
          <div className="text-xs text-red-400 font-mono">
            <div className="text-red-500 text-xs font-bold mb-1">[ERROR_LOG]</div>
            <div>MODULE: APPLICATION_CORE • STATUS: RECOVERY_AVAILABLE</div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-red-400/60 font-mono text-center border-t border-red-500/20 pt-2">
          ERROR_SYSTEM_v2089 | CONTACT_SUPPORT
        </div>
      </div>
    </div>
  )
}
