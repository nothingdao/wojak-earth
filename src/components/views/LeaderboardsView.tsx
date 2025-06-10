import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Trophy,
  Crown,
  Medal,
  Coins,
  TrendingUp,
  Package,
  MapPin,
  Zap,
  RefreshCw,
  Star,
  Database,
  Activity,
  AlertTriangle
} from 'lucide-react'

const API_BASE = '/.netlify/functions'

interface LeaderboardEntry {
  id: string
  character_id: string
  character_name: string  // Changed from characterName
  character_image_url?: string  // Changed from characterimage_url
  character_type: 'HUMAN' | 'NPC'
  rank: number
  value: number
  change?: number
  badge?: string
}

interface LeaderboardData {
  wealth: LeaderboardEntry[]
  level: LeaderboardEntry[]
  items: LeaderboardEntry[]
  exploration: LeaderboardEntry[]
  trading: LeaderboardEntry[]
  energy: LeaderboardEntry[]
}

interface LeaderboardStats {
  totalPlayers: number
  lastUpdated: string
  period: 'daily' | 'weekly' | 'monthly' | 'alltime'
}

// Memoized components to prevent unnecessary re-renders
const RankIcon = React.memo(({ rank }: { rank: number }) => {
  switch (rank) {
    case 1: return <Crown className="h-4 w-4 text-yellow-500" />
    case 2: return <Medal className="h-4 w-4 text-gray-400" />
    case 3: return <Medal className="h-4 w-4 text-amber-600" />
    default: return <span className="text-xs font-bold text-muted-foreground font-mono">#{rank}</span>
  }
})

const TrendIcon = React.memo(({ change }: { change?: number }) => {
  if (!change) return null
  if (change > 0) return <TrendingUp className="h-3 w-3 text-green-500" />
  if (change < 0) return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />
  return null
})

// Memoized utility functions
const getRankBadgeColor = (rank: number) => {
  if (rank === 1) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
  if (rank === 2) return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  if (rank === 3) return 'bg-amber-500/20 text-amber-600 border-amber-500/30'
  if (rank <= 10) return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  return 'bg-muted/50 text-muted-foreground border-muted-foreground/30'
}

const formatValue = (value: number, type: string) => {
  switch (type) {
    case 'wealth':
    case 'trading':
      return `${value.toLocaleString()}_RUST`
    case 'level':
      return `LVL_${value}`
    case 'items':
      return `${value}_ITEMS`
    case 'exploration':
      return `${value}_ZONES`
    case 'energy':
      return `${value}%_ENERGY`
    default:
      return value.toString()
  }
}

// Virtualized leaderboard entry component
const LeaderboardEntry = React.memo(({
  entry,
  type,
}: {
  entry: LeaderboardEntry,
  type: string,
  index: number
}) => {
  return (
    <div
      className={`bg-muted/30 border border-primary/20 rounded p-3 font-mono transition-colors hover:bg-muted/40 ${entry.rank <= 3 ? 'border-primary/40 bg-primary/5' : ''
        }`}
    >
      <div className="grid grid-cols-[40px_40px_1fr_auto] gap-3 items-center">
        <div className="flex items-center justify-center">
          <RankIcon rank={entry.rank} />
        </div>

        <Avatar className="w-8 h-8 border border-primary/20">
          <AvatarImage src={entry.character_image_url}
          />
          <AvatarFallback className="text-xs font-mono bg-muted/50">
            {entry.character_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-primary text-sm truncate">
              {entry.character_name.toUpperCase()}
            </span>
            {entry.character_type === 'NPC' && (
              <Badge variant="outline" className="text-xs font-mono px-1 py-0">
                NPC
              </Badge>
            )}
            {entry.badge && (
              <Badge variant="secondary" className="text-xs font-mono px-1 py-0">
                {entry.badge.toUpperCase()}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{formatValue(entry.value, type)}</span>
            <TrendIcon change={entry.change} />
            {entry.change && (
              <span className={`text-xs font-mono ${entry.change > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                {entry.change > 0 ? '+' : ''}{entry.change}
              </span>
            )}
          </div>
        </div>

        <Badge variant="outline" className={`${getRankBadgeColor(entry.rank)} text-xs font-mono`}>
          #{entry.rank}
        </Badge>
      </div>
    </div>
  )
})

// Optimized hook with debouncing and caching
const useLeaderboards = () => {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [stats, setStats] = useState<LeaderboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboards = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Use AbortController for request cancellation
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetch(`${API_BASE}/get-leaderboards`, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboards')
      }

      const result = await response.json()

      // Batch state updates to prevent multiple re-renders
      setData(result.leaderboards)
      setStats(result.stats)
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Failed to fetch leaderboards')
        console.error('Error fetching leaderboards:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboards()
  }, [fetchLeaderboards])

  return { data, stats, loading, error, refetch: fetchLeaderboards }
}

// Optimized leaderboard table with virtual scrolling concept
const LeaderboardTable = React.memo(({
  entries,
  type,
  loading
}: {
  entries: LeaderboardEntry[],
  type: string,
  loading: boolean
}) => {
  // Memoize the loading skeleton
  const loadingSkeleton = useMemo(() => (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="bg-muted/30 border border-primary/20 rounded p-3 animate-pulse">
          <div className="grid grid-cols-[40px_40px_1fr_80px] gap-3 items-center">
            <div className="w-6 h-6 bg-muted/50 rounded" />
            <div className="w-8 h-8 bg-muted/50 rounded-full" />
            <div className="space-y-1">
              <div className="h-3 bg-muted/50 rounded w-3/4" />
              <div className="h-2 bg-muted/50 rounded w-1/2" />
            </div>
            <div className="h-4 bg-muted/50 rounded w-12" />
          </div>
        </div>
      ))}
    </div>
  ), [])

  // Memoize empty state
  const emptyState = useMemo(() => (
    <div className="bg-muted/30 border border-primary/20 rounded p-8 text-center">
      <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <div className="text-muted-foreground font-mono">
        <div className="text-lg mb-2">NO_RANKINGS_AVAILABLE</div>
        <div className="text-sm">AWAITING_COMPETITOR_DATA</div>
      </div>
    </div>
  ), [])

  if (loading) return loadingSkeleton
  if (!entries.length) return emptyState

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <LeaderboardEntry
            key={entry.character_id}
            entry={entry}
            type={type}
            index={index}
          />
        ))}
      </div>
    </ScrollArea>
  )
})

// Memoized champion card
const ChampionCard = React.memo(({
  category,
  topPlayer
}: {
  category: any,
  topPlayer: LeaderboardEntry
}) => (
  <div className="bg-muted/20 border border-primary/10 rounded p-2 flex items-center gap-2">
    <category.icon className={`h-4 w-4 ${category.color}`} />
    <div className="flex-1 min-w-0">
      <div className="text-xs text-muted-foreground">{category.label}_CHAMP</div>
      <div className="text-xs font-bold text-primary truncate font-mono">
        {topPlayer.character_name.toUpperCase()}
      </div>
      <div className="text-xs text-muted-foreground font-mono">
        {formatValue(topPlayer.value, category.id)}
      </div>
    </div>
    <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
  </div>
))

export default function LeaderboardsView() {
  const { data, stats, loading, error, refetch } = useLeaderboards()

  // Memoize categories to prevent recreation on every render
  const categories = useMemo(() => [
    {
      id: 'wealth',
      label: 'WEALTH',
      icon: Coins,
      description: 'HIGHEST_RUST',
      color: 'text-yellow-500'
    },
    {
      id: 'level',
      label: 'LEVEL',
      icon: Star,
      description: 'MAXIMUM_EXPERIENCE',
      color: 'text-purple-500'
    },
    {
      id: 'items',
      label: 'COLLECT',
      icon: Package,
      description: 'ITEM_ACCUMULATION',
      color: 'text-blue-500'
    },
    {
      id: 'exploration',
      label: 'EXPLORE',
      icon: MapPin,
      description: 'ZONE_DISCOVERY',
      color: 'text-green-500'
    },
    {
      id: 'trading',
      label: 'TRADE',
      icon: TrendingUp,
      description: 'TRANSACTION_VOLUME',
      color: 'text-orange-500'
    },
    {
      id: 'energy',
      label: 'ENERGY',
      icon: Zap,
      description: 'PEAK_PERFORMANCE',
      color: 'text-red-500'
    }
  ], [])

  // Memoize champion cards
  const championCards = useMemo(() => {
    if (!data || loading) return null

    return categories.slice(0, 6).map((category) => {
      const topPlayer = data[category.id as keyof LeaderboardData]?.[0]
      if (!topPlayer) return null

      return (
        <ChampionCard
          key={category.id}
          category={category}
          topPlayer={topPlayer}
        />
      )
    }).filter(Boolean)
  }, [data, loading, categories])

  // Memoize current time to prevent excessive re-renders
  const currentTime = useMemo(() => new Date().toLocaleTimeString(), [])

  // Debounced refresh handler
  const handleRefresh = useCallback(() => {
    if (!loading) {
      refetch()
    }
  }, [loading, refetch])

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-background border border-primary/30 rounded-lg p-4 font-mono text-primary">
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="text-primary font-bold">RANKING SYSTEM v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span className="text-red-500 text-xs">CONNECTION_ERROR</span>
          </div>
        </div>

        <div className="bg-muted/30 border border-red-500/30 rounded p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <div className="text-red-500 font-mono mb-4">
            <div className="text-lg mb-2">SYSTEM_ERROR_DETECTED</div>
            <div className="text-sm">{error}</div>
          </div>
          <Button onClick={handleRefresh} variant="outline" className="font-mono">
            <RefreshCw className="h-4 w-4 mr-2" />
            RETRY_CONNECTION
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-background border border-primary/30 rounded-lg p-4 font-mono text-primary">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-primary font-bold">RANKING SYSTEM v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            disabled={loading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Activity className="w-3 h-3 animate-pulse" />
          <span className="text-primary text-xs">
            {loading ? 'SYNCING' : 'ACTIVE'}
          </span>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-muted/30 border border-primary/20 rounded p-3 mb-4">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-muted-foreground mb-1">COMPETITORS</div>
            <div className="text-primary font-bold font-mono">
              {loading ? 'SCANNING...' : `${stats?.totalPlayers || 0}_ACTIVE`}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">PERIOD</div>
            <div className="text-primary font-bold font-mono">
              {loading ? 'LOADING...' : `${stats?.period || 'UNKNOWN'}`.toUpperCase()}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">LAST_SYNC</div>
            <div className="text-primary font-bold font-mono text-xs">
              {loading ? 'PENDING...' : stats ? new Date(stats.lastUpdated).toLocaleTimeString() : '--:--:--'}
            </div>
          </div>
        </div>
      </div>

      {/* Champion Spotlight */}
      {championCards && (
        <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
          <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            CHAMPION_ROSTER
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {championCards}
          </div>
        </div>
      )}

      {/* Ranking Categories */}
      <Tabs defaultValue="wealth" className="w-full">
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-max h-10 p-1 bg-muted/50">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="text-xs font-mono flex-shrink-0 px-3 flex items-center gap-2"
                >
                  <Icon className={`w-3 h-3 ${category.color}`} />
                  <span>{category.label}</span>
                  {data?.[category.id as keyof LeaderboardData]?.length > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-1 rounded">
                      {data[category.id as keyof LeaderboardData].length}
                    </span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-4">
            <div className="bg-muted/30 border border-primary/20 rounded p-4">
              <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
                <div className="flex items-center gap-2">
                  <category.icon className={`w-4 h-4 ${category.color}`} />
                  <span className="text-primary font-bold">{category.label}_RANKINGS</span>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {category.description}
                </div>
              </div>

              <LeaderboardTable
                entries={data?.[category.id as keyof LeaderboardData] || []}
                type={category.id}
                loading={loading}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Footer */}
      <div className="border-t border-primary/20 pt-2 mt-4 flex justify-between text-xs text-muted-foreground/60">
        <span>RANKING_SYSTEM_v2089 | REAL_TIME_LEADERBOARDS</span>
        <span>REFRESH_CYCLE: {currentTime}</span>
      </div>
    </div>
  )
}
