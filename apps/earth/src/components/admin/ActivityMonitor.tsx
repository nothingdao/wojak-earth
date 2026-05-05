// src/components/ActivityMonitor.tsx - Migrated to Convex
import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Activity, Users, Pickaxe, MapPin, Store, Zap, Heart,
  RefreshCw, Play, Pause, AlertCircle, Clock, Sparkles,
  Filter, User, Bot
} from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

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

export function ActivityMonitor({ className = '', maxHeight = 'h-96' }: ActivityMonitorProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL')
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL')
  const [showFilters, setShowFilters] = useState(false)
  const [recentActivityHighlight] = useState<string | null>(null)

  const rawTxns = useQuery(api.earth.transactions.getGlobalActivity, { limit: 50 })
  const isLoading = rawTxns === undefined
  const isConnected = !isLoading

  const transactions: Transaction[] = (rawTxns ?? []).map((txn: any) => ({
    id: txn._id,
    character_id: txn.characterId,
    type: txn.type as TransactionType,
    item_id: txn.itemId ?? undefined,
    quantity: txn.quantity ?? undefined,
    description: txn.description ?? txn.type,
    created_at: txn.createdAt ? new Date(txn.createdAt).toISOString() : new Date().toISOString(),
    character: {
      name: txn.character?.name ?? 'Unknown',
      id: txn.character?._id ?? txn.characterId,
      character_type: txn.character?.characterType ?? 'HUMAN',
      level: txn.character?.level ?? 1,
      experience: txn.character?.experience ?? 0,
      current_image_url: txn.character?.currentImageUrl ?? null,
    },
  }))

  const filteredTransactions = transactions.filter((transaction) => {
    switch (filterMode) {
      case 'NPCS_ONLY':
        if (transaction.character.character_type !== 'NPC') return false
        break
      case 'PLAYERS_ONLY':
        if (transaction.character.character_type === 'NPC') return false
        break
    }
    if (typeFilter !== 'ALL' && transaction.type !== typeFilter) return false
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
      case 'EXCHANGE': return <RefreshCw className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const diffInSeconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (diffInSeconds < 0) return 'Just now'
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  const isNPC = (t: Transaction) => t.character.character_type === 'NPC'
  const isRecentActivity = (id: string) => recentActivityHighlight === id

  const npcCount = transactions.filter(isNPC).length
  const stats = {
    total: transactions.length,
    npcs: npcCount,
    players: transactions.length - npcCount,
    filtered: filteredTransactions.length,
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      <div className="p-3 sm:p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Live Activity Monitor</span>
            <span className="sm:hidden">Activity</span>
            {isLoading && <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />}
          </h3>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`} />
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {isConnected ? 'Live' : 'Loading'}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)} className="sm:hidden">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className={`space-y-3 ${showFilters ? 'block' : 'hidden sm:block'}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex border rounded-md overflow-hidden">
              {(['ALL', 'NPCS_ONLY', 'PLAYERS_ONLY'] as FilterMode[]).map((mode, i) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={filterMode === mode ? 'default' : 'ghost'}
                  onClick={() => setFilterMode(mode)}
                  className={`text-xs h-7 rounded-none border-0 ${i > 0 ? 'border-l' : ''} ${filterMode === mode ? 'bg-action text-action-foreground' : 'hover:bg-action/10'}`}
                >
                  {mode === 'NPCS_ONLY' ? <><Bot className="w-3 h-3" /><span className="hidden sm:inline ml-1">NPCs ({stats.npcs})</span></> :
                   mode === 'PLAYERS_ONLY' ? <><User className="w-3 h-3" /><span className="hidden sm:inline ml-1">Players ({stats.players})</span></> :
                   <>All <span className="hidden sm:inline ml-1">({stats.total})</span></>}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              <div className="border rounded-md overflow-hidden">
                <Button size="sm" variant={typeFilter === 'ALL' ? 'default' : 'ghost'}
                  onClick={() => setTypeFilter('ALL')}
                  className={`text-xs h-7 rounded-none border-0 ${typeFilter === 'ALL' ? 'bg-action text-action-foreground' : 'hover:bg-action/10'}`}>
                  All Types
                </Button>
              </div>
              <div className="border rounded-md overflow-hidden">
                {(['EXCHANGE', 'MINE', 'TRAVEL', 'BUY', 'SELL'] as TransactionType[]).map((type, index) => (
                  <Button key={type} size="sm" variant={typeFilter === type ? 'default' : 'ghost'}
                    onClick={() => setTypeFilter(type)}
                    className={`text-xs h-7 rounded-none border-0 ${index > 0 ? 'border-l' : ''} ${typeFilter === type ? 'bg-action text-action-foreground' : 'hover:bg-action/10'}`}>
                    {getTransactionIcon(type)}
                    <span className="hidden sm:inline sm:ml-1 capitalize">{type.toLowerCase()}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className={maxHeight}>
        <div className="p-2 sm:p-4 space-y-2">
          {isLoading && filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
              Loading activity feed...
            </div>
          ) : filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => {
              const npcTransaction = isNPC(transaction)
              const isHighlighted = isRecentActivity(transaction.id)
              return (
                <div key={transaction.id}
                  className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg transition-all duration-500 ${isHighlighted ? 'ring-2 ring-success/50 bg-success/5' : 'hover:bg-accent'}`}>
                  <div className="flex-shrink-0 relative">
                    {transaction.character.current_image_url ? (
                      <img src={transaction.character.current_image_url} alt={transaction.character.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-sm border object-cover" />
                    ) : (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-sm bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium">{transaction.character.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-action text-action-foreground flex items-center justify-center text-[9px] font-bold shadow-sm">
                      {transaction.character.level || 1}
                    </div>
                  </div>
                  <div className="text-muted-foreground mt-0.5">{getTransactionIcon(transaction.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                      <span className="font-medium truncate">{transaction.character.name}</span>
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted">{transaction.type}</span>
                      {npcTransaction && <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">NPC</span>}
                      {isHighlighted && <span className="text-xs bg-success/20 text-success px-1.5 py-0.5 rounded-full">NEW</span>}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{transaction.description}</p>
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <span className="font-mono bg-warning/10 text-warning px-1.5 py-0.5 rounded">
                        {(transaction.character.experience || 0).toLocaleString()} XP
                      </span>
                      {transaction.quantity && (
                        <span className="flex items-center gap-1"><span>Qty:</span><span className="font-mono">{transaction.quantity}</span></span>
                      )}
                    </div>
                  </div>
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
              <div className="text-xs mt-1">The world is waiting for adventurers!</div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 sm:p-3 border-t bg-muted/50">
        <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`} />
          {isConnected ? 'Live updates via Convex' : 'Loading...'}
          <span className="hidden sm:inline">• Showing {filteredTransactions.length} of {stats.total} activities</span>
        </div>
      </div>
    </div>
  )
}
