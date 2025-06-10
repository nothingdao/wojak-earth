// src/components/admin/tabs/SettingsTab.tsx
import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Settings, Database, RefreshCw, AlertTriangle, Activity } from 'lucide-react'

interface SettingsTabProps {
  stats: any
  isProcessing: boolean
  onRefreshData: () => void
  onValidateWorld: () => void
  onResetWorldDay: () => void
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  stats,
  isProcessing,
  onRefreshData,
  onValidateWorld,
  onResetWorldDay
}) => {
  return (
    <div className="space-y-3">
      <span className="text-primary font-bold font-mono">GAME_SETTINGS</span>

      {/* World Management */}
      <div className="bg-muted/30 border border-primary/20 rounded p-2">
        <div className="flex items-center gap-2 mb-2 border-b border-primary/20 pb-2">
          <Settings className="w-3 h-3" />
          <span className="text-primary font-bold text-xs font-mono">WORLD_MANAGEMENT</span>
        </div>
        <div className="space-y-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshData}
            disabled={isProcessing}
            className="w-full justify-start text-xs font-mono h-6"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isProcessing ? 'animate-spin' : ''}`} />
            REFRESH_ALL_DATA
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onValidateWorld}
            disabled={isProcessing}
            className="w-full justify-start text-xs font-mono h-6"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            VALIDATE_WORLD_DATA
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={onResetWorldDay}
            disabled={isProcessing}
            className="w-full justify-start text-xs font-mono h-6"
          >
            <Activity className="h-3 w-3 mr-1" />
            RESET_WORLD_DAY
          </Button>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-muted/30 border border-primary/20 rounded p-2">
        <div className="flex items-center gap-2 mb-2 border-b border-primary/20 pb-2">
          <Database className="w-3 h-3" />
          <span className="text-primary font-bold text-xs font-mono">SYSTEM_INFORMATION</span>
        </div>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-muted-foreground">LAST_UPDATED:</span>
            <span className="text-primary">2_MIN_AGO</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ADMIN_VERSION:</span>
            <span className="text-primary">v2.089</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">DATABASE_STATUS:</span>
            <Badge variant="default" className="text-xs">CONNECTED</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ACTIVE_SESSIONS:</span>
            <span className="text-primary">{stats?.onlineNow || 0}</span>
          </div>
        </div>
      </div>

      {/* Game Configuration */}
      <div className="bg-muted/30 border border-primary/20 rounded p-2">
        <div className="flex items-center gap-2 mb-2 border-b border-primary/20 pb-2">
          <Settings className="w-3 h-3" />
          <span className="text-primary font-bold text-xs font-mono">GAME_CONFIGURATION</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-muted-foreground">CHARACTER_ENERGY_CAP</span>
            <Input className="w-12 h-6 text-xs font-mono" defaultValue="100" type="number" />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-muted-foreground">DAILY_MINING_LIMIT</span>
            <Input className="w-12 h-6 text-xs font-mono" defaultValue="10" type="number" />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-muted-foreground">MARKET_FEE_PERCENT</span>
            <Input className="w-12 h-6 text-xs font-mono" defaultValue="5" type="number" />
          </div>
          <Button size="sm" className="w-full text-xs font-mono h-6">
            SAVE_CONFIGURATION
          </Button>
        </div>
      </div>
    </div>
  )
}
