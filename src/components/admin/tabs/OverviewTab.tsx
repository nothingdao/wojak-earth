// src/components/admin/tabs/OverviewTab.tsx
import React from 'react'
import { Users, MapPin, Package, Activity } from 'lucide-react'
import { StatCard } from '../StatCard'
import { ActivityFeed } from '../ActivityFeed'
import { QuickActions } from '../QuickActions'
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
  activities,
  statsLoading,
  activityLoading,
  statsError,
  isProcessing,
  onCreateLocation,
  onCreateItem,
  onRefreshData,
  onValidateWorld,
  onResetWorldDay
}) => {
  return (
    <div className="space-y-3">
      {statsError && (
        <ErrorAlert title="ERROR_LOADING_STATS" error={statsError} />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          title="CHARACTERS"
          value={stats?.totalCharacters || 0}
          subtitle={`${stats?.activeCharacters || 0} ACTIVE`}
          icon={Users}
          loading={statsLoading}
        />
        <StatCard
          title="LOCATIONS"
          value={stats?.totalLocations || 0}
          subtitle="ALL_BIOMES"
          icon={MapPin}
          loading={statsLoading}
        />
        <StatCard
          title="ITEMS"
          value={stats?.totalItems || 0}
          subtitle="ALL_CATEGORIES"
          icon={Package}
          loading={statsLoading}
        />
        <StatCard
          title="ONLINE"
          value={stats?.onlineNow || 0}
          subtitle="ACTIVE_NOW"
          icon={Activity}
          loading={statsLoading}
        />
      </div>

      {/* Recent Activity */}
      <ActivityFeed activities={activities} loading={activityLoading} />

      {/* Quick Actions */}
      <QuickActions
        onCreateLocation={onCreateLocation}
        onCreateItem={onCreateItem}
        onRefreshData={onRefreshData}
        onValidateWorld={onValidateWorld}
        onResetWorldDay={onResetWorldDay}
        isProcessing={isProcessing}
      />
    </div>
  )
}
