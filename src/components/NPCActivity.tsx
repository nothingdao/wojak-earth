// src/components/NPCActivity.tsx - Enhanced for lifelike behavior
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  Activity,
  Users,
  Pickaxe,
  MapPin,
  Store,
  Zap,
  Heart,
  RefreshCw,
  Settings,
  Play,
  Pause,
  AlertCircle,
  TrendingUp,
  Clock,
  Timer,
  Sparkles
} from 'lucide-react'

interface GlobalActivity {
  id: string
  timestamp: string
  characterName: string
  characterType: string
  actionType: 'TRAVEL' | 'MINE' | 'BUY' | 'SELL' | 'EQUIP' | 'UNEQUIP'
  description: string
  location?: string
  timeAgo: string
  isNPCAction: boolean
  details?: {
    itemName?: string
    itemRarity?: string
    energyChange?: number
    healthChange?: number
    priceChange?: number
    fromLocation?: string
    toLocation?: string
  }
}

interface ActivitySummary {
  totalActivities: number
  timeWindow: number
  activeCharacters: number
  npcActions: number
  playerActions: number
  activityBreakdown: Record<string, number>
  locationActivity: Record<string, number>
  characterActivity: Array<{ name: string; count: number }>
}

interface NPCActivityConfig {
  // Generation settings
  activityCount: number
  activityTypes: string[]
  forceActions: boolean

  // Lifelike behavior settings
  staggerActions: boolean
  staggerWindowMinutes: number
  useRandomIntervals: boolean
  simulateRealism: boolean

  // Feed settings
  timeWindow: number
  refreshInterval: number
  includePlayerActions: boolean
  autoRefresh: boolean
}

const DEFAULT_CONFIG: NPCActivityConfig = {
  // Generation
  activityCount: 8,
  activityTypes: ['TRAVEL', 'MINE', 'BUY', 'SELL', 'EQUIP'],
  forceActions: true,

  // Lifelike behavior
  staggerActions: true,
  staggerWindowMinutes: 5,      // Spread over 5 minutes
  useRandomIntervals: true,     // Random timing
  simulateRealism: true,        // Realistic behavior patterns

  // Feed
  timeWindow: 30,               // Show last 30 minutes
  refreshInterval: 10,          // Refresh every 10 seconds for lifelike feel
  includePlayerActions: true,
  autoRefresh: true
}

export function NPCActivity() {
  const [activities, setActivities] = useState<GlobalActivity[]>([])
  const [summary, setSummary] = useState<ActivitySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [generatingActions, setGeneratingActions] = useState(false)
  const [config, setConfig] = useState<NPCActivityConfig>(DEFAULT_CONFIG)
  const [showConfig, setShowConfig] = useState(false)
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentActivityHighlight, setRecentActivityHighlight] = useState<string | null>(null)

  // Memoized function to avoid dependency issues
  const loadGlobalActivity = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: '30',
        timeWindow: config.timeWindow.toString(),
        includePlayer: config.includePlayerActions.toString()
      })

      const response = await fetch(`/.netlify/functions/get-global-activity?${params}`)

      if (!response.ok) {
        throw new Error(`Failed to load activity: ${response.status}`)
      }

      const data = await response.json()

      // Check for new activities
      const newActivities = data.activities || []
      if (newActivities.length > 0 && activities.length > 0) {
        const latestNew = new Date(newActivities[0].timestamp)
        const latestOld = activities.length > 0 ? new Date(activities[0].timestamp) : new Date(0)

        if (latestNew > latestOld) {
          // New activity detected - briefly highlight
          setRecentActivityHighlight(newActivities[0].timestamp)
          setTimeout(() => setRecentActivityHighlight(null), 3000)
        }
      }

      setActivities(newActivities)
      setSummary(data.summary || null)
    } catch (error) {
      console.error('Error loading global activity:', error)
      setError(error instanceof Error ? error.message : 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [config.timeWindow, config.includePlayerActions, activities])

  // Auto-refresh effect
  useEffect(() => {
    if (isAutoRefreshing && config.autoRefresh) {
      const interval = setInterval(() => {
        loadGlobalActivity()
      }, config.refreshInterval * 1000)

      return () => clearInterval(interval)
    }
  }, [isAutoRefreshing, config.autoRefresh, config.refreshInterval, loadGlobalActivity])

  // Initial load
  useEffect(() => {
    loadGlobalActivity()
  }, [loadGlobalActivity])

  const generateNPCActions = async () => {
    setGeneratingActions(true)
    setError(null)

    try {
      const response = await fetch('/.netlify/functions/generate-npc-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || `Request failed: ${response.status}`)
      }

      const result = await response.json()

      // Enhanced success message for staggered actions
      if (config.staggerActions) {
        toast.success(
          `Scheduled ${result.actions?.length || 0} lifelike NPC actions`,
          {
            description: `Actions will appear over ${config.staggerWindowMinutes} minutes`,
            duration: 6000
          }
        )
      } else {
        toast.success(
          `Generated ${result.actions?.length || 0} NPC actions`,
          {
            description: result.message,
            duration: 4000
          }
        )
      }

      // Reload activity feed after a short delay
      setTimeout(() => {
        loadGlobalActivity()
      }, 1000)

    } catch (error) {
      console.error('Error generating NPC actions:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate NPC actions')
      toast.error('Failed to generate NPC actions', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setGeneratingActions(false)
    }
  }

  const getActionIcon = (actionType: GlobalActivity['actionType']) => {
    switch (actionType) {
      case 'TRAVEL': return <MapPin className="w-4 h-4" />
      case 'MINE': return <Pickaxe className="w-4 h-4" />
      case 'BUY':
      case 'SELL': return <Store className="w-4 h-4" />
      case 'EQUIP': return <Zap className="w-4 h-4" />
      case 'UNEQUIP': return <Heart className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getActionColor = (actionType: GlobalActivity['actionType'], isNPC: boolean) => {
    const baseColors = {
      'TRAVEL': 'text-blue-500',
      'MINE': 'text-amber-500',
      'BUY': 'text-green-500',
      'SELL': 'text-purple-500',
      'EQUIP': 'text-orange-500',
      'UNEQUIP': 'text-gray-500'
    }

    if (isNPC) {
      return baseColors[actionType]?.replace('500', '400') || 'text-gray-400'
    }

    return baseColors[actionType] || 'text-gray-500'
  }

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  const isRecentActivity = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    return diff < 30000 // Less than 30 seconds old
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          NPC Activity Feed
          {config.staggerActions && (
            <Sparkles className="w-4 h-4 text-amber-500" />
          )}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
            title={isAutoRefreshing ? 'Disable auto-refresh' : 'Enable auto-refresh'}
          >
            {isAutoRefreshing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowConfig(!showConfig)}
            title="Configure lifelike behavior"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={loadGlobalActivity}
            disabled={loading}
            title="Refresh activity feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 text-center text-sm">
        <div>
          <div className="font-medium">{summary?.totalActivities || 0}</div>
          <div className="text-muted-foreground">Activities</div>
        </div>
        <div>
          <div className="font-medium">{summary?.activeCharacters || 0}</div>
          <div className="text-muted-foreground">Characters</div>
        </div>
        <div>
          <div className="font-medium">{summary?.npcActions || 0}</div>
          <div className="text-muted-foreground">NPC Actions</div>
        </div>
        <div>
          <div className="font-medium">{config.refreshInterval}s</div>
          <div className="text-muted-foreground">Refresh Rate</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={generateNPCActions}
          disabled={generatingActions || loading}
          className="flex-1"
        >
          {generatingActions ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Scheduling...
            </>
          ) : config.staggerActions ? (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate NPC Actions
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Generate NPC Actions
            </>
          )}
        </Button>
      </div>

      {/* Lifelike Configuration Panel */}
      {showConfig && (
        <div className="bg-muted/50 p-4 rounded-lg space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Lifelike Behavior Configuration
          </h4>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-xs font-medium mb-1">NPC Actions to Generate</label>
              <input
                type="number"
                value={config.activityCount}
                onChange={(e) => setConfig(prev => ({ ...prev, activityCount: parseInt(e.target.value) || 5 }))}
                className="w-full px-2 py-1 border rounded text-xs"
                min="1"
                max="20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Time Window (min)</label>
              <input
                type="number"
                value={config.timeWindow}
                onChange={(e) => setConfig(prev => ({ ...prev, timeWindow: parseInt(e.target.value) || 30 }))}
                className="w-full px-2 py-1 border rounded text-xs"
                min="5"
                max="180"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Refresh Rate (s)</label>
              <input
                type="number"
                value={config.refreshInterval}
                onChange={(e) => setConfig(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) || 10 }))}
                className="w-full px-2 py-1 border rounded text-xs"
                min="5"
                max="60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Stagger Window (min)</label>
              <input
                type="number"
                value={config.staggerWindowMinutes}
                onChange={(e) => setConfig(prev => ({ ...prev, staggerWindowMinutes: parseInt(e.target.value) || 5 }))}
                className="w-full px-2 py-1 border rounded text-xs"
                min="1"
                max="30"
                disabled={!config.staggerActions}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={config.staggerActions}
                onChange={(e) => setConfig(prev => ({ ...prev, staggerActions: e.target.checked }))}
                className="w-3 h-3"
              />
              <Sparkles className="w-3 h-3" />
              Enable Lifelike Staggered Actions
            </label>

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={config.useRandomIntervals}
                onChange={(e) => setConfig(prev => ({ ...prev, useRandomIntervals: e.target.checked }))}
                className="w-3 h-3"
                disabled={!config.staggerActions}
              />
              Use Random Intervals (vs even spacing)
            </label>

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={config.simulateRealism}
                onChange={(e) => setConfig(prev => ({ ...prev, simulateRealism: e.target.checked }))}
                className="w-3 h-3"
                disabled={!config.staggerActions}
              />
              Simulate Realistic Behavior Patterns
            </label>

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={config.includePlayerActions}
                onChange={(e) => setConfig(prev => ({ ...prev, includePlayerActions: e.target.checked }))}
                className="w-3 h-3"
              />
              Include Player Actions in Feed
            </label>
          </div>

          {config.staggerActions && (
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              <strong>Lifelike Mode:</strong> Actions will appear gradually over {config.staggerWindowMinutes} minutes with {config.useRandomIntervals ? 'random' : 'even'} timing{config.simulateRealism ? ' and realistic behavioral patterns' : ''}.
            </div>
          )}
        </div>
      )}

      {/* Activity Feed */}
      <ScrollArea className="h-96">
        <div className="space-y-2">
          {loading && activities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
              Loading activity feed...
            </div>
          ) : activities.length > 0 ? (
            activities.map(activity => (
              <div
                key={activity.id}
                className={`flex items-start gap-3 p-3 bg-muted/30 rounded-lg transition-all duration-500 ${isRecentActivity(activity.timestamp) || recentActivityHighlight === activity.timestamp
                  ? 'ring-2 ring-green-500/50 bg-green-50 dark:bg-green-900/20'
                  : ''
                  }`}
              >
                <div className={`${getActionColor(activity.actionType, activity.isNPCAction)} mt-0.5`}>
                  {getActionIcon(activity.actionType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1 flex items-center gap-2">
                    <span className="truncate">{activity.description}</span>
                    {activity.isNPCAction && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        NPC
                      </span>
                    )}
                    {(isRecentActivity(activity.timestamp) || recentActivityHighlight === activity.timestamp) && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{activity.timeAgo}</span>
                    <span>•</span>
                    <span>{activity.characterName}</span>
                    {activity.location && (
                      <>
                        <span>•</span>
                        <span>{activity.location}</span>
                      </>
                    )}
                    {activity.details?.energyChange && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {activity.details.energyChange > 0 ? '+' : ''}{activity.details.energyChange}
                        </span>
                      </>
                    )}
                    {activity.details?.priceChange && (
                      <>
                        <span>•</span>
                        <span className={`flex items-center gap-1 ${activity.details.priceChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {activity.details.priceChange > 0 ? '+' : ''}{activity.details.priceChange} coins
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(activity.timestamp)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Activity className="w-12 h-12 mx-auto mb-2" />
              No recent activity found
              <div className="text-xs mt-1">
                Try generating some lifelike NPC actions
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Activity Summary */}
      {summary && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Most Active:</span>
            <span>
              {summary.characterActivity.slice(0, 3).map(char => char.name).join(', ')}
            </span>
          </div>
          {Object.keys(summary.locationActivity).length > 0 && (
            <div className="flex justify-between">
              <span>Busiest Locations:</span>
              <span>
                {Object.entries(summary.locationActivity)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 2)
                  .map(([location]) => location)
                  .join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
