// src/components/ActivityMonitor.tsx - Unified real-time activity feed
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
  Settings,
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
type TransactionType = 'TRAVEL' | 'MINE' | 'BUY' | 'SELL' | 'EQUIP' | 'UNEQUIP' | 'SPAWN' | 'CHAT' | 'IDLE'

interface Transaction {
  id: string
  characterId: string
  type: TransactionType
  itemId?: string
  quantity?: number
  description: string
  createdAt: string
  character: {
    name: string
    id: string
    characterType: string
    currentImageUrl?: string // Add avatar URL
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
  const [showConfig, setShowConfig] = useState(false)
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
          character:characters(name, id, characterType, currentImageUrl)
        `)
        .order('createdAt', { ascending: false })
        .limit(50)

      if (error) {
        throw error
      }

      if (transactions && transactions.length > 0) {
        // Debug: Check what we're getting from the database
        console.log('📊 Sample transaction data:', {
          firstTransaction: transactions[0],
          characterData: transactions[0]?.character,
          hasImageUrl: !!transactions[0]?.character?.currentImageUrl
        })

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
              .select('name, id, characterType, currentImageUrl')
              .eq('id', payload.new.characterId)
              .single()

            if (character) {
              const newTransaction: Transaction = {
                id: payload.new.id,
                characterId: payload.new.characterId,
                type: payload.new.type,
                itemId: payload.new.itemId,
                quantity: payload.new.quantity,
                description: payload.new.description,
                createdAt: payload.new.createdAt,
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
    switch (filterMode) {
      case 'NPCS_ONLY':
        // Proper way: check characterType field
        return transaction.character.characterType === 'NPC'
      case 'PLAYERS_ONLY':
        // Real players have characterType 'HUMAN' or other non-NPC types
        return transaction.character.characterType !== 'NPC'
      default:
        return true
    }
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
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getTransactionColor = (type: TransactionType, isNPC: boolean) => {
    const baseColors = {
      'TRAVEL': 'text-blue-500',
      'MINE': 'text-amber-500',
      'BUY': 'text-green-500',
      'SELL': 'text-purple-500',
      'EQUIP': 'text-orange-500',
      'UNEQUIP': 'text-gray-500',
      'SPAWN': 'text-pink-500',
      'CHAT': 'text-cyan-500',
      'IDLE': 'text-slate-500'
    }

    // Dim NPC actions slightly
    if (isNPC) {
      return baseColors[type]?.replace('500', '400') || 'text-gray-400'
    }

    return baseColors[type] || 'text-gray-500'
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)

    // Ensure valid dates
    if (isNaN(time.getTime()) || isNaN(now.getTime())) {
      return 'Unknown'
    }

    const diffInMs = now.getTime() - time.getTime()
    const diffInSeconds = Math.floor(diffInMs / 1000)

    // Handle future timestamps or negative differences
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
    return transaction.character.characterType === 'NPC'
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
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Live Activity Monitor
            {isLoading && (
              <RefreshCw className="w-4 h-4 animate-spin" />
            )}
          </h3>

          <div className="flex items-center gap-2">
            {/* Connection status */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>

            {/* Auto-refresh toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
              title={isAutoRefreshing ? 'Disable auto-refresh' : 'Enable auto-refresh'}
            >
              {isAutoRefreshing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>

            {/* Config toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowConfig(!showConfig)}
              title="Filter settings"
            >
              <Settings className="w-4 h-4" />
            </Button>

            {/* Manual refresh */}
            <Button
              size="sm"
              onClick={fetchTransactions}
              disabled={isLoading}
              title="Refresh activity"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={filterMode === 'ALL' ? 'default' : 'outline'}
              onClick={() => setFilterMode('ALL')}
              className="text-xs"
            >
              All ({stats.total})
            </Button>
            <Button
              size="sm"
              variant={filterMode === 'NPCS_ONLY' ? 'default' : 'outline'}
              onClick={() => setFilterMode('NPCS_ONLY')}
              className="text-xs"
            >
              <Bot className="w-3 h-3 mr-1" />
              NPCs ({stats.npcs})
            </Button>
            <Button
              size="sm"
              variant={filterMode === 'PLAYERS_ONLY' ? 'default' : 'outline'}
              onClick={() => setFilterMode('PLAYERS_ONLY')}
              className="text-xs"
            >
              <User className="w-3 h-3 mr-1" />
              Players ({stats.players})
            </Button>
          </div>
        </div>

        {/* Config Panel */}
        {showConfig && (
          <div className="mt-3 p-3 bg-muted/50 rounded text-sm space-y-2">
            <div className="font-medium">Activity Monitor Settings</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>• Real-time updates via Supabase</div>
              <div>• Max 50 recent transactions</div>
              <div>• NPCs detected by naming pattern</div>
              <div>• Highlights fade after 3 seconds</div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <ScrollArea className={maxHeight}>
        <div className="p-4 space-y-2">
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
                  className={`flex items-start gap-3 p-3 border rounded-lg transition-all duration-500 ${isHighlighted
                    ? 'ring-2 ring-green-500/50 bg-green-50 dark:bg-green-900/20'
                    : 'hover:bg-accent'
                    }`}
                >
                  {/* Character Avatar */}
                  <div className="flex-shrink-0 relative">
                    {transaction.character.currentImageUrl ? (
                      <>
                        <img
                          src={transaction.character.currentImageUrl}
                          alt={transaction.character.name}
                          className="w-16 h-16 rounded-sm border object-cover"
                          onError={(e) => {
                            console.log('❌ Image failed to load:', transaction.character.currentImageUrl)
                            // Hide the image and show fallback
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'flex'
                          }}
                          onLoad={() => {
                            console.log('✅ Image loaded successfully:', transaction.character.currentImageUrl)
                          }}
                        />
                        {/* Fallback avatar (hidden by default) */}
                        <div
                          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center absolute top-0 left-0"
                          style={{ display: 'none' }}
                        >
                          <span className="text-xs font-medium">
                            {transaction.character.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {transaction.character.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Debug info */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="absolute -bottom-1 -right-1 text-xs" title={`Image URL: ${transaction.character.currentImageUrl || 'None'}`}>
                        {transaction.character.currentImageUrl ? '🖼️' : '❌'}
                      </div>
                    )}
                  </div>

                  {/* Icon */}
                  <div className={`${getTransactionColor(transaction.type, npcTransaction)} mt-0.5`}>
                    {getTransactionIcon(transaction.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {transaction.character.name}
                      </span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted">
                        {transaction.type}
                      </span>
                      {npcTransaction && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-1.5 py-0.5 rounded-full">
                          NPC
                        </span>
                      )}
                      {isHighlighted && (
                        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-1.5 py-0.5 rounded-full">
                          NEW
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {transaction.description}
                    </p>

                    {transaction.quantity && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <span>Quantity:</span>
                        <span className="font-mono">{transaction.quantity}</span>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(transaction.createdAt)}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2" />
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
      <div className="p-3 border-t bg-muted/50">
        <div className="text-xs text-muted-foreground text-center">
          {isConnected ?
            `Live updates • Showing ${filteredTransactions.length} of ${stats.total} activities` :
            `Disconnected • Showing ${filteredTransactions.length} of ${stats.total} activities`
          }
          {filterMode !== 'ALL' && (
            <span className="ml-2">
              • Filter: {filterMode.replace('_', ' ').toLowerCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
