// src/components/admin/QuickActions.tsx
import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Settings,
  Plus,
  Package,
  RefreshCw,
  AlertTriangle,
  Activity
} from 'lucide-react'

interface QuickActionsProps {
  onCreateLocation: () => void
  onCreateItem: () => void
  onRefreshData: () => void
  onValidateWorld: () => void
  onResetWorldDay: () => void
  isProcessing: boolean
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onCreateLocation,
  onCreateItem,
  onRefreshData,
  onValidateWorld,
  onResetWorldDay,
  isProcessing
}) => {
  return (
    <div className="bg-muted/30 border border-primary/20 rounded p-3">
      <div className="flex items-center gap-2 mb-2 border-b border-primary/20 pb-2">
        <Settings className="w-3 h-3" />
        <span className="text-primary font-bold text-xs font-mono">QUICK_ACTIONS</span>
      </div>
      <div className="space-y-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateLocation}
          disabled={isProcessing}
          className="w-full justify-start text-xs font-mono h-6"
        >
          <Plus className="h-3 w-3 mr-1" />
          CREATE_LOCATION
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onCreateItem}
          disabled={isProcessing}
          className="w-full justify-start text-xs font-mono h-6"
        >
          <Package className="h-3 w-3 mr-1" />
          ADD_ITEM
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshData}
          disabled={isProcessing}
          className="w-full justify-start text-xs font-mono h-6"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isProcessing ? 'animate-spin' : ''}`} />
          REFRESH_DATA
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onValidateWorld}
          disabled={isProcessing}
          className="w-full justify-start text-xs font-mono h-6"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          VALIDATE_DATA
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
  )
}
