// src/components/admin/ActivityFeed.tsx
import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity, Users, Pickaxe, MapPin, Package, Loader2 } from 'lucide-react'
import type { AdminActivity } from './types'

interface ActivityFeedProps {
  activities: AdminActivity[]
  loading?: boolean
}

const ActivityItem: React.FC<{ activity: AdminActivity }> = ({ activity }) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'character': return <Users className="h-3 w-3" />
      case 'mining': return <Pickaxe className="h-3 w-3" />
      case 'travel': return <MapPin className="h-3 w-3" />
      case 'market': return <Package className="h-3 w-3" />
      default: return <Activity className="h-3 w-3" />
    }
  }

  const getColor = () => {
    switch (activity.type) {
      case 'character': return 'text-blue-500'
      case 'mining': return 'text-yellow-500'
      case 'travel': return 'text-green-500'
      case 'market': return 'text-purple-500'
      default: return 'text-primary'
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/20 border border-primary/10 rounded font-mono">
      <div className={getColor()}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-primary font-bold truncate">
          {activity.action.toUpperCase()}
        </div>
        <div className="text-xs text-muted-foreground truncate">{activity.target}</div>
        <div className="text-xs text-muted-foreground/60">{activity.timestamp}</div>
      </div>
    </div>
  )
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, loading }) => {
  return (
    <div className="bg-muted/30 border border-primary/20 rounded p-3">
      <div className="flex items-center gap-2 mb-2 border-b border-primary/20 pb-2">
        <Activity className="w-3 h-3" />
        <span className="text-primary font-bold text-xs font-mono">RECENT_ACTIVITY</span>
      </div>
      <ScrollArea className="h-32">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground text-xs font-mono">LOADING_ACTIVITY...</span>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map(activity => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
