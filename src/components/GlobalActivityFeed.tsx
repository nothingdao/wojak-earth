import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import supabase from '@/utils/supabase';

// Types based on your Prisma schema
type TransactionType = 'MINT' | 'MINE' | 'BUY' | 'SELL' | 'TRAVEL' | 'EQUIP' | 'UNEQUIP';

interface Transaction {
  id: string;
  characterId: string;
  type: TransactionType;
  itemId?: string;
  quantity?: number;
  description: string;
  createdAt: string;
  character: {
    name: string;
    id: string;
  };
}

interface GlobalActivityFeedProps {
  className?: string;
}

export default function GlobalActivityFeed({ className = "" }: GlobalActivityFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Function to fetch initial transactions
    async function getTransactions() {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          character:characters(name, id)
        `)
        .order('createdAt', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to fetch transactions:', error);
      } else if (transactions && transactions.length > 0) {
        setTransactions(transactions);
      }

      setIsLoading(false);
    }

    getTransactions();

    // Set up realtime subscription
    const channel = supabase
      .channel('global-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions'
        },
        async (payload) => {
          console.log('🔥 New transaction received via realtime:', payload);

          // The payload.new contains the raw transaction data
          // We need to fetch the character data separately since relations aren't included
          try {
            const { data: character } = await supabase
              .from('characters')
              .select('name, id')
              .eq('id', payload.new.characterId)
              .single();

            if (character) {
              const newTransaction: Transaction = {
                id: payload.new.id,
                characterId: payload.new.characterId,
                type: payload.new.type,
                itemId: payload.new.itemId,
                quantity: payload.new.quantity,
                description: payload.new.description,
                createdAt: payload.new.createdAt,
                character: {
                  name: character.name,
                  id: character.id
                }
              };

              console.log('✅ Adding new transaction to feed:', newTransaction);
              // Add new transaction to the top of the list
              setTransactions(prev => [newTransaction, ...prev.slice(0, 19)]); // Keep only latest 20
            }
          } catch (error) {
            console.error('❌ Failed to fetch character for new transaction:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'TRAVEL':
        return '🚶';
      case 'MINE':
        return '⛏️';
      case 'BUY':
        return '💰';
      case 'SELL':
        return '🏪';
      case 'EQUIP':
        return '⚔️';
      case 'UNEQUIP':
        return '📦';
      case 'MINT':
        return '✨';
      default:
        return '📝';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
  };

  return (
    <div className={`border rounded-lg ${className}`}>
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          🌍 Global Activity Feed
          {isLoading && (
            <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin"></div>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-foreground' : 'bg-muted'}`}></div>
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {isConnected ? 'Real-time activities across the world' : 'Latest activities across the world'}
        </p>
      </div>

      <ScrollArea className="h-64 p-4">
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="text-lg flex-shrink-0">
                {getTransactionIcon(transaction.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">
                    {transaction.character.name}
                  </span>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-muted">
                    {transaction.type}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {transaction.description}
                </p>

                {transaction.quantity && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Quantity: {transaction.quantity}
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground flex-shrink-0">
                {formatTimeAgo(transaction.createdAt)}
              </div>
            </div>
          ))}

          {transactions.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">🌱</div>
              <p>No activity yet...</p>
              <p className="text-xs mt-1">The world is waiting for adventurers!</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-muted/50">
        <button
          onClick={() => {
            setIsLoading(true);
            // Refetch transactions
            async function getTransactions() {
              const { data: transactions, error } = await supabase
                .from('transactions')
                .select(`
                  *,
                  character:characters(name, id)
                `)
                .order('createdAt', { ascending: false })
                .limit(20);

              if (error) {
                console.error('Failed to fetch transactions:', error);
              } else if (transactions) {
                setTransactions(transactions);
              }

              setIsLoading(false);
            }
            getTransactions();
          }}
          disabled={isLoading}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Refreshing...' : isConnected ? 'Refresh • Live updates enabled' : 'Refresh • Realtime disconnected'}
        </button>
      </div>
    </div>
  );
}
