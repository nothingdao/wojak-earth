// src/components/admin/tabs/OverviewTab.tsx
import React from 'react'
import { ActivityMonitor } from '@/components/admin'
import { ErrorAlert } from '../ErrorAlert'
import type { AdminStats, AdminActivity } from '../types'

interface OverviewTabProps {
  stats: AdminStats | null
  activities: AdminActivity[]
  statsLoading: boolean
  activityLoading: boolean
  statsError: string | null
  isProcessing: boolean
  onCreateLocation: () => void
  onCreateItem: () => void
  onRefreshData: () => void
  onValidateWorld: () => void
  onResetWorldDay: () => void
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  statsError
}) => {
  return (
    <div className="space-y-3">
      {statsError && (
        <ErrorAlert title="ERROR_LOADING_STATS" error={statsError} />
      )}

      {/* Compact Stats */}
      <div className="bg-muted/30 border border-primary/20 rounded p-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex gap-4 flex-wrap">
            <span><span className="text-muted-foreground">PLAYERS:</span> <span className="text-primary">{stats?.totalCharacters || 0}</span></span>
            <span><span className="text-muted-foreground">ACTIVE:</span> <span className="text-green-500">{stats?.activeCharacters || 0}</span></span>
            <span><span className="text-muted-foreground">LOCATIONS:</span> <span className="text-primary">{stats?.totalLocations || 0}</span></span>
            <span><span className="text-muted-foreground">ITEMS:</span> <span className="text-primary">{stats?.totalItems || 0}</span></span>
            <span><span className="text-muted-foreground">ONLINE:</span> <span className="text-green-500">{stats?.onlineNow || 0}</span></span>
          </div>
        </div>
      </div>

      {/* Activity Monitor */}
      <div className="bg-muted/30 border border-primary/20 rounded p-2">
        <div className="text-muted-foreground text-xs mb-2 font-mono">LIVE TRANSACTION FEED</div>
        <ActivityMonitor className="w-full" maxHeight="h-64" />
      </div>
    </div>
  )
}
