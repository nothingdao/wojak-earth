// src/components/screens/TravelScreen.tsx - Migrated from your existing TravelScreen
import { Database, Activity, MapPin, Loader2 } from 'lucide-react'
import type { DatabaseLocation } from '@/types'

interface TravelScreenProps {
  destination: DatabaseLocation
}

export function TravelScreen({ destination }: TravelScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background border border-primary/30 rounded-lg p-4 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-3 border-b border-primary/20 pb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="text-primary font-bold text-sm">TRANSPORT_PROTOCOL v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 animate-pulse" />
            <span className="text-primary text-xs">ACTIVE</span>
          </div>
        </div>

        {/* Travel Status */}
        <div className="bg-muted/30 border border-primary/20 rounded p-3 mb-3">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <MapPin className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="text-primary font-bold mb-1">TRANSPORT_IN_PROGRESS</div>
            <div className="text-muted-foreground text-xs mb-2">
              DESTINATION: {destination.name.toUpperCase()}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              CALCULATING_ROUTE...
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-muted/20 border border-primary/10 rounded p-2 mb-3">
          <div className="text-xs text-muted-foreground mb-1">TRANSPORT_STATUS</div>
          <div className="w-full bg-muted h-2 rounded overflow-hidden">
            <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-2">
          TRANSPORT_SYSTEM_v2089 | ETA: {new Date(Date.now() + 5000).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}
