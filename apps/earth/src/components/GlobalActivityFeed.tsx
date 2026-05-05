// src/components/GlobalActivityFeed.tsx
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  GiWorld, GiWalk, GiMineWagon, GiCoins, GiShop,
  GiSwordman, GiBackpack, GiSparkles, GiScrollUnfurled, GiSeedling, GiCycle
} from 'react-icons/gi'
import { adaptTransaction } from '@/lib/convex-adapters'
import type { Transaction } from '@/types'

type TransactionType = 'MINT' | 'MINE' | 'BUY' | 'SELL' | 'TRAVEL' | 'EQUIP' | 'UNEQUIP'

interface GlobalActivityFeedProps {
  className?: string
}

export default function GlobalActivityFeed({ className = '' }: GlobalActivityFeedProps) {
  const rawTxns = useQuery(api.earth.transactions.getGlobalActivity, { limit: 20 })
  const transactions = (rawTxns ?? []).map(adaptTransaction)
  const isLoading = rawTxns === undefined

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'TRAVEL': return <GiWalk />
      case 'MINE': return <GiMineWagon />
      case 'BUY': return <GiCoins />
      case 'SELL': return <GiShop />
      case 'EQUIP': return <GiSwordman />
      case 'UNEQUIP': return <GiBackpack />
      case 'MINT': return <GiSparkles />
      default: return <GiScrollUnfurled />
    }
  }

  const formatTimeAgo = (ts: number | string | undefined) => {
    if (!ts) return ''
    const time = typeof ts === 'number' ? new Date(ts) : new Date(ts)
    const diffInSeconds = Math.floor((Date.now() - time.getTime()) / 1000)
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <GiWorld />
          Global Activity Feed
          {isLoading && (
            <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin" />
          )}
          <div className="flex items-center gap-1 ml-auto">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Real-time activities across the world</p>
      </div>

      <ScrollArea className="h-64 p-4">
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex-shrink-0">{getTransactionIcon(tx.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{tx.character?.name ?? 'Unknown'}</span>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-muted">{tx.type}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{tx.description}</p>
                {tx.quantity && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <span>Quantity:</span>
                    <span className="font-mono">{tx.quantity}</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex-shrink-0">
                {formatTimeAgo(tx.createdAt ?? tx.created_at)}
              </div>
            </div>
          ))}

          {transactions.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="flex justify-center mb-2"><GiSeedling /></div>
              <p>No activity yet...</p>
              <p className="text-xs mt-1">The world is waiting for adventurers!</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-muted/50">
        <div className="w-full text-xs text-muted-foreground flex items-center justify-center gap-2">
          <GiCycle />
          Live updates enabled via Convex
        </div>
      </div>
    </div>
  )
}
