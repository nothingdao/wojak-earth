// src/components/screens/LoadingScreen.tsx - Migrated from your existing loading states

import {
  Database,
  Activity,
  Loader2,
  Signal
} from 'lucide-react'

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = 'INITIALIZING_SYSTEMS' }: LoadingScreenProps) {
  // Different content based on message type (from your existing code)
  const getContent = () => {
    switch (message) {
      case 'SCANNING_CHARACTER_PROFILE':
        return {
          icon: <Loader2 className="w-8 h-8 text-primary animate-spin" />,
          title: 'SCANNING_CHARACTER_PROFILE',
          subtitle: 'VERIFYING_ACCOUNT_STATUS...',
          systemName: 'PROFILE_SCANNER'
        }

      case 'CONSTRUCTING_GAME_WORLD':
        return {
          icon: <Database className="w-8 h-8 text-primary animate-pulse" />,
          title: 'CONSTRUCTING_GAME_WORLD',
          subtitle: 'GENERATING_LOCATIONS_AND_RESOURCES...',
          systemName: 'WORLD_GENERATOR'
        }

      case 'INITIALIZING_WORLD_DATA':
        return {
          icon: <Loader2 className="w-8 h-8 text-primary animate-spin" />,
          title: 'INITIALIZING_WORLD_DATA',
          subtitle: 'PREPARING_ADVENTURE_SYSTEMS...',
          systemName: 'WORLD_LOADER'
        }

      default:
        return {
          icon: <Loader2 className="w-8 h-8 text-primary animate-spin" />,
          title: message,
          subtitle: 'PLEASE_WAIT...',
          systemName: 'SYSTEM_LOADER'
        }
    }
  }

  const content = getContent()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background border border-primary/30 rounded-lg p-4 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-3 border-b border-primary/20 pb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="text-primary font-bold text-sm">{content.systemName} v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 animate-pulse" />
            <span className="text-primary text-xs">PROCESSING</span>
          </div>
        </div>

        {/* Loading Status */}
        <div className="bg-muted/30 border border-primary/20 rounded p-3 mb-3">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              {content.icon}
            </div>
            <div className="text-primary font-bold mb-1">{content.title}</div>
            <div className="text-muted-foreground text-xs mb-2">
              {content.subtitle}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Signal className="w-3 h-3 animate-pulse" />
              CONNECTED_TO_BLOCKCHAIN
            </div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="bg-muted/20 border border-primary/10 rounded p-2 mb-3">
          <div className="text-xs text-muted-foreground mb-1">SYSTEM_STATUS</div>
          <div className="w-full bg-muted h-2 rounded overflow-hidden">
            <div className="h-full bg-primary animate-pulse" style={{ width: '75%' }} />
          </div>
        </div>

        {/* Special content for world generation */}
        {message === 'CONSTRUCTING_GAME_WORLD' && (
          <div className="grid grid-cols-1 gap-1 mb-3">
            {[
              { step: 'TERRAIN_GENERATION', status: 'COMPLETE' },
              { step: 'RESOURCE_ALLOCATION', status: 'COMPLETE' },
              { step: 'NPC_SPAWNING', status: 'COMPLETE' },
              { step: 'MARKET_INIT', status: 'PROCESSING...' },
              { step: 'SECURITY_PROTOCOLS', status: 'PENDING' }
            ].map(({ step, status }) => (
              <div key={step} className="bg-muted/20 border border-primary/10 rounded p-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono">{step}</span>
                  <span className={`font-mono ${status === 'COMPLETE' ? 'text-green-500' : status === 'PROCESSING...' ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                    {status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-2">
          LOADING_SYSTEM_v2089 | PLEASE_WAIT...
        </div>
      </div>
    </div>
  )
}
