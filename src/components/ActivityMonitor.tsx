// src/components/ActivityMonitor.tsx
import { useState, useEffect, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Activity,
  Users,
  Pickaxe,
  MapPin,
  Store,
  Zap,
  Heart,
  RefreshCw,
  Play,
  Pause,
  AlertCircle,
  Clock,
  Sparkles,
  Filter,
  User,
  Bot
} from 'lucide-react'
import supabase from '@/utils/supabase'

// Transaction types from your schema
type TransactionType = 'TRAVEL' | 'MINE' | 'BUY' | 'SELL' | 'EQUIP' | 'UNEQUIP' | 'SPAWN' | 'CHAT' | 'IDLE' | 'EXCHANGE'

interface Transaction {
  id: string
  character_id: string
  type: TransactionType
  item_id?: string
  quantity?: number
  description: string
  created_at: string
  character: {
    name: string
    id: string
    character_type: string
    level?: number
    experience?: number
    current_image_url?: string
  }
}

interface ActivityMonitorProps {
  className?: string
  maxHeight?: string
}

type FilterMode = 'ALL' | 'NPCS_ONLY' | 'PLAYERS_ONLY'

export function ActivityMonitor({ className = "", maxHeight = "h-96" }: ActivityMonitorProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL')
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL')
  const [showFilters, setShowFilters] = useState(false)
  const [recentActivityHighlight, setRecentActivityHighlight] = useState<string | null>(null)

  // Memoized function to fetch initial transactions
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          character:characters(name, id, character_type, level, experience, current_image_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        throw error
      }

      if (transactions && transactions.length > 0) {
        setTransactions(transactions)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      setError(error instanceof Error ? error.message : 'Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    fetchTransactions()

    const channel = supabase
      .channel('activity-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions'
        },
        async (payload) => {
          console.log('🔥 New transaction received:', payload)

          try {
            // Fetch character data for the new transaction
            const { data: character } = await supabase
              .from('characters')
              .select('name, id, character_type, level, experience, current_image_url')
              .eq('id', payload.new.character_id)
              .single()

            if (character) {
              const newTransaction: Transaction = {
                id: payload.new.id,
                character_id: payload.new.character_id,
                type: payload.new.type,
                item_id: payload.new.item_id,
                quantity: payload.new.quantity,
                description: payload.new.description,
                created_at: payload.new.created_at,
                character: character
              }

              console.log('✅ Adding new transaction to feed:', newTransaction)

              // Highlight new activity
              setRecentActivityHighlight(newTransaction.id)
              setTimeout(() => setRecentActivityHighlight(null), 3000)

              // Add to top of list, keep only latest 50
              setTransactions(prev => [newTransaction, ...prev.slice(0, 49)])
            }
          } catch (error) {
            console.error('❌ Failed to fetch character for new transaction:', error)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      console.log('🧹 Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [fetchTransactions])

  // Filter transactions based on mode
  const filteredTransactions = transactions.filter(transaction => {
    // Character type filter
    switch (filterMode) {
      case 'NPCS_ONLY':
        if (transaction.character.character_type !== 'NPC') return false
        break
      case 'PLAYERS_ONLY':
        if (transaction.character.character_type === 'NPC') return false
        break
      default:
        break
    }

    // Transaction type filter
    if (typeFilter !== 'ALL' && transaction.type !== typeFilter) {
      return false
    }

    return true
  })

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'TRAVEL': return <MapPin className="w-4 h-4" />
      case 'MINE': return <Pickaxe className="w-4 h-4" />
      case 'BUY':
      case 'SELL': return <Store className="w-4 h-4" />
      case 'EQUIP': return <Zap className="w-4 h-4" />
      case 'UNEQUIP': return <Heart className="w-4 h-4" />
      case 'SPAWN': return <Sparkles className="w-4 h-4" />
      case 'CHAT': return <Users className="w-4 h-4" />
      case 'IDLE': return <Clock className="w-4 h-4" />
      case 'EXCHANGE': return <RefreshCw className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)

    if (isNaN(time.getTime()) || isNaN(now.getTime())) {
      return 'Unknown'
    }

    const diffInMs = now.getTime() - time.getTime()
    const diffInSeconds = Math.floor(diffInMs / 1000)

    if (diffInSeconds < 0) {
      return 'Just now'
    }

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`
    } else {
      return `${Math.floor(diffInSeconds / 86400)}d ago`
    }
  }

  const isNPC = (transaction: Transaction) => {
    return transaction.character.character_type === 'NPC'
  }

  const isRecentActivity = (transactionId: string) => {
    return recentActivityHighlight === transactionId
  }

  const getFilterStats = () => {
    const npcCount = transactions.filter(t => isNPC(t)).length
    const playerCount = transactions.length - npcCount

    return {
      total: transactions.length,
      npcs: npcCount,
      players: playerCount,
      filtered: filteredTransactions.length
    }
  }

  const stats = getFilterStats()

  return (
    <div className={`border rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Live Activity Monitor</span>
            <span className="sm:hidden">Activity</span>
            {isLoading && (
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
            )}
          </h3>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Connection status */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>

            {/* Filter toggle (mobile) */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden"
            >
              <Filter className="w-4 h-4" />
            </Button>

            {/* Auto-refresh toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
              title={isAutoRefreshing ? 'Disable auto-refresh' : 'Enable auto-refresh'}
            >
              {isAutoRefreshing ? <Pause className="w-3 h-3 sm:w-4 sm:h-4" /> : <Play className="w-3 h-3 sm:w-4 sm:h-4" />}
            </Button>

            {/* Manual refresh */}
            <Button
              size="sm"
              onClick={fetchTransactions}
              disabled={isLoading}
              title="Refresh activity"
            >
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filter Controls - Mobile collapsible, Desktop always visible */}
        <div className={`space-y-2 ${showFilters ? 'block' : 'hidden sm:block'}`}>
          {/* Character Type Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex gap-1 flex-wrap">
              <Button
                size="sm"
                variant={filterMode === 'ALL' ? 'default' : 'outline'}
                onClick={() => setFilterMode('ALL')}
                className="text-xs h-7"
              >
                All <span className="hidden sm:inline">({stats.total})</span>
              </Button>
              <Button
                size="sm"
                variant={filterMode === 'NPCS_ONLY' ? 'default' : 'outline'}
                onClick={() => setFilterMode('NPCS_ONLY')}
                className="text-xs h-7"
              >
                <Bot className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">NPCs ({stats.npcs})</span>
              </Button>
              <Button
                size="sm"
                variant={filterMode === 'PLAYERS_ONLY' ? 'default' : 'outline'}
                onClick={() => setFilterMode('PLAYERS_ONLY')}
                className="text-xs h-7"
              >
                <User className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">Players ({stats.players})</span>
              </Button>
            </div>
          </div>

          {/* Transaction Type Filters */}
          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex gap-1 flex-wrap">
              <Button
                size="sm"
                variant={typeFilter === 'ALL' ? 'default' : 'outline'}
                onClick={() => setTypeFilter('ALL')}
                className="text-xs h-7"
              >
                All Types
              </Button>
              {['EXCHANGE', 'MINE', 'TRAVEL', 'BUY', 'SELL'].map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant={typeFilter === type ? 'default' : 'outline'}
                  onClick={() => setTypeFilter(type as TransactionType)}
                  className="text-xs h-7"
                >
                  {getTransactionIcon(type as TransactionType)}
                  <span className="hidden sm:inline sm:ml-1 capitalize">{type.toLowerCase()}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 sm:p-4 border-b">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <ScrollArea className={maxHeight}>
        <div className="p-2 sm:p-4 space-y-2">
          {isLoading && filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
              Loading activity feed...
            </div>
          ) : filteredTransactions.length > 0 ? (
            filteredTransactions.map(transaction => {
              const npcTransaction = isNPC(transaction)
              const isHighlighted = isRecentActivity(transaction.id)

              return (
                <div
                  key={transaction.id}
                  className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg transition-all duration-500 ${isHighlighted
                    ? 'ring-2 ring-success/50 bg-success/5'
                    : 'hover:bg-accent'
                    }`}
                >
                  {/* Character Avatar with Level Badge */}
                  <div className="flex-shrink-0 relative">
                    {transaction.character.current_image_url ? (
                      <>
                        <img
                          src={transaction.character.current_image_url}
                          alt={transaction.character.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-sm border object-cover"
                          onError={(e) => {
                            console.log('❌ Image failed to load:', transaction.character.current_image_url)
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                        {/* Fallback avatar (hidden by default) */}
                        <div
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-sm bg-muted flex items-center justify-center absolute top-0 left-0"
                          style={{ display: 'none' }}
                        >
                          <span className="text-xs font-medium">
                            {transaction.character.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-sm bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {transaction.character.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Level Badge */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground shadow-sm">
                      {transaction.character.level || 1}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="text-muted-foreground mt-0.5">
                    {getTransactionIcon(transaction.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                      <span className="font-medium truncate">
                        {transaction.character.name}
                      </span>
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted">
                        {transaction.type}
                      </span>
                      {npcTransaction && (
                        <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
                          NPC
                        </span>
                      )}
                      {isHighlighted && (
                        <span className="text-xs bg-success/20 text-success px-1.5 py-0.5 rounded-full">
                          NEW
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {transaction.description}
                    </p>

                    {/* XP and Quantity Display */}
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <span className="font-mono bg-warning/10 text-warning px-1.5 py-0.5 rounded">
                        {(transaction.character.experience || 0).toLocaleString()} XP
                      </span>
                      {transaction.quantity && (
                        <span className="flex items-center gap-1">
                          <span>Qty:</span>
                          <span className="font-mono">{transaction.quantity}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="hidden sm:inline">{formatTimeAgo(transaction.created_at)}</span>
                    <span className="sm:hidden">{formatTimeAgo(transaction.created_at).replace(' ago', '')}</span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2" />
              {filterMode === 'NPCS_ONLY' ? 'No NPC activity found' :
                filterMode === 'PLAYERS_ONLY' ? 'No player activity found' :
                  'No activity yet...'}
              <div className="text-xs mt-1">
                {filterMode === 'NPCS_ONLY' ? 'Start your NPC engine to see activity!' : 'The world is waiting for adventurers!'}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="p-2 sm:p-3 border-t bg-muted/50">
        <div className="text-xs text-muted-foreground text-center">
          <span className="flex items-center justify-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
            {isConnected ? 'Live updates' : 'Disconnected'}
            <span className="hidden sm:inline">
              • Showing {filteredTransactions.length} of {stats.total} activities
            </span>
          </span>
          {filterMode !== 'ALL' && (
            <div className="mt-1 sm:mt-0 sm:inline sm:ml-2">
              Filter: {filterMode.replace('_', ' ').toLowerCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
