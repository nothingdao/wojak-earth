// src/components/EarthMarket.tsx - Updated to use GameProvider balances
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, TrendingDown, Zap, Database, Activity, X, Search, Settings, Info, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { adaptTransaction } from '@/lib/convex-adapters';
import EarthBridge from '@/components/EarthBridge';
import { useGame } from '@/providers/GameProvider';
import type { Transaction } from '@/types';

interface EarthMarketProps {
  onCharacterUpdate?: () => Promise<void>;
}

const EarthMarket: React.FC<EarthMarketProps> = ({ onCharacterUpdate }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showBridge, setShowBridge] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showCharacterLookup, setShowCharacterLookup] = useState(false);
  const [lookupCharacter, setLookupCharacter] = useState('');
  const [characterHistory, setCharacterHistory] = useState<Transaction[]>([]);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [newTransactionIds, setNewTransactionIds] = useState<Set<string>>(new Set());
  const [systemStatus, setSystemStatus] = useState<'ONLINE' | 'MAINTENANCE' | 'OFFLINE'>('ONLINE');

  const { state, actions } = useGame();
  const { publicKey } = useWallet();
  const character = state.character;

  // Get all balances from GameProvider
  const solBalance = state.solBalance;
  const walletEarthBalance = state.walletEarthBalance;
  const gameEarthBalance = character?.earth || 0;

  const documentationScrollRef = useRef<HTMLDivElement>(null);

  // Enhanced character update using GameProvider's refetch (includes balances)
  const handleCharacterUpdate = async () => {
    if (onCharacterUpdate) {
      await onCharacterUpdate();
    }
    // Use GameProvider's enhanced refetch that includes balances
    await actions.refetchCharacter();
  };

  const formatAmount = (amount: number | null) => (amount || 0).toFixed(3);

  const getTransactionTypeDisplay = (tx: Transaction) => {
    // Handle bridge transactions
    if (tx.description?.includes('BRIDGE_DEPOSIT')) {
      return { type: 'DEPOSIT', icon: ArrowDownLeft, color: 'text-success' };
    }
    if (tx.description?.includes('BRIDGE_WITHDRAW')) {
      return { type: 'WITHDRAW', icon: ArrowUpRight, color: 'text-warning' };
    }

    // Handle exchange transactions (legacy market trades)
    if (tx.type === 'EXCHANGE') {
      const isBuy = tx.from_vault === 'SCRAP_SOL';
      return {
        type: isBuy ? 'BUY_EARTH' : 'SELL_EARTH',
        icon: isBuy ? TrendingUp : TrendingDown,
        color: isBuy ? 'text-success' : 'text-warning'
      };
    }

    // Handle other transaction types
    switch (tx.type) {
      case 'BUY':
        return { type: 'PURCHASE', icon: TrendingUp, color: 'text-success' };
      case 'SELL':
        return { type: 'SALE', icon: TrendingDown, color: 'text-warning' };
      case 'TRAVEL':
        return { type: 'TRAVEL', icon: ArrowLeftRight, color: 'text-primary' };
      default:
        return { type: tx.type || 'UNKNOWN', icon: Activity, color: 'text-muted-foreground' };
    }
  };

  const getSystemStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'text-success';
      case 'MAINTENANCE': return 'text-warning';
      case 'OFFLINE': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  // Add keyboard event listener for ESC key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDocumentation) {
        setShowDocumentation(false);
      }
    };

    if (showDocumentation) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showDocumentation]);

  const rawTxns = useQuery(api.earth.transactions.getGlobalActivity, { limit: 20 });

  useEffect(() => {
    if (rawTxns !== undefined) {
      const adapted = rawTxns.map(adaptTransaction);
      setTransactions(adapted as any);
      setIsLoading(false);
      setSystemStatus('ONLINE');
    }
  }, [rawTxns]);

  const fetchTransactionData = async () => {
    // Convex is reactive — no manual refetch needed
  };

  // Documentation Modal
  const DocumentationModal = () => {
    if (!showDocumentation) return null;

    const modalContent = (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-0">
        <div className="w-full h-full bg-background border-0 rounded-none p-6 font-mono text-xs text-primary flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b border-primary/20 pb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              <span className="text-primary font-bold text-sm">SOL/EARTH TERMINAL DOCUMENTATION v2.089</span>
            </div>
            <button
              onClick={() => setShowDocumentation(false)}
              className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded hover:bg-muted/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto documentation-modal-scroll" ref={documentationScrollRef}>
            <div className="max-w-6xl mx-auto space-y-8">
              <section className="bg-muted/30 border border-primary/20 rounded p-6">
                <h2 className="text-primary font-bold mb-4 flex items-center gap-2 text-base">
                  <Database className="w-5 h-5" />
                  TERMINAL_OVERVIEW
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3 text-sm">
                  The SOL/EARTH Terminal is your central hub for managing all SOL and EARTH transactions within
                  the Earth gaming ecosystem. Bridge between on-chain and in-game assets, view transaction history,
                  and access swap functionality (coming soon).
                </p>
                <div className="bg-primary/10 border border-primary/30 p-3 rounded mt-3">
                  <span className="text-primary font-bold">SUPPORTED OPERATIONS:</span>
                  <span className="text-muted-foreground ml-2">Bridge, Market Trades, Travel, Equipment</span>
                </div>
              </section>

              <div className="text-center py-8">
                <div className="text-muted-foreground/60 text-sm">
                  {'>'} SOL_EARTH_TERMINAL_v2.089
                </div>
                <div className="text-muted-foreground/60 text-sm mt-2">
                  UNIFIED_ASSET_MANAGEMENT
                </div>
                <div className="text-muted-foreground/40 text-xs mt-4">
                  Press ESC to close
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  const CharacterLookup = () => {
    const [isSearching, setIsSearching] = useState(false);

    const searchCharacterHistory = async () => {
      if (!lookupCharacter.trim()) return;

      setIsSearching(true);
      try {
        const { convexHttp: cx } = await import('@/lib/convex-singleton');
        const { api: a } = await import('@convex/_generated/api');
        const history = await cx.query(a.earth.transactions.getByCharacter, { characterId: lookupCharacter, limit: 50 });
        setCharacterHistory((history || []) as any[]);

        console.log(`🔍 Looking up history for: ${lookupCharacter}`);
      } catch (error) {
        console.error('Character lookup failed:', error);
        setCharacterHistory([]);
      }
      setIsSearching(false);
    };

    if (!showCharacterLookup) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-background border border-primary/30 rounded-lg p-4 font-mono text-xs text-primary">
          <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span className="text-primary font-bold">PLAYER_LOOKUP v2.089</span>
            </div>
            <button
              onClick={() => {
                setShowCharacterLookup(false);
                setCharacterHistory([]);
                setLookupCharacter('');
              }}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-4">
            <div className="text-muted-foreground text-xs mb-2">ENTER_PLAYER_ID_OR_CHARACTER_NAME:</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={lookupCharacter}
                onChange={(e) => setLookupCharacter(e.target.value)}
                placeholder="player_123 or character name..."
                className="flex-1 bg-muted/30 border border-primary/20 p-2 rounded text-primary outline-none focus:border-primary/50"
                onKeyPress={(e) => e.key === 'Enter' && searchCharacterHistory()}
              />
              <button
                onClick={searchCharacterHistory}
                disabled={!lookupCharacter.trim() || isSearching}
                className="bg-primary/10 border border-primary text-primary px-4 py-2 rounded font-bold hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSearching ? 'SEARCHING...' : 'SEARCH'}
              </button>
            </div>
          </div>

          {characterHistory.length > 0 && (
            <div>
              <div className="text-muted-foreground text-xs mb-2">
                TRANSACTION_HISTORY ({characterHistory.length} found):
              </div>
              <div className="bg-muted/30 border border-primary/20 rounded p-2 max-h-64 overflow-y-auto lookup-history-scroll">
                {characterHistory.map((tx) => {
                  const { type, icon: Icon, color } = getTransactionTypeDisplay(tx);
                  return (
                    <div
                      key={tx.id}
                      className="py-2 border-b border-border/30 last:border-b-0 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => {
                        setSelectedTransaction(tx);
                        setShowCharacterLookup(false);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold flex items-center gap-1 ${color}`}>
                            <Icon className="w-3 h-3" />
                            {type}
                          </span>
                        </div>
                        <span className="text-muted-foreground/60 text-xs">{new Date(tx.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-primary">{formatAmount(tx.from_units || 0)}</span>
                        <span className="text-muted-foreground">{tx.from_vault}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-primary">{formatAmount(tx.to_units || 0)}</span>
                        <span className="text-muted-foreground">{tx.to_vault}</span>
                        <span className="text-muted-foreground/50 ml-auto text-xs">CLICK_TO_EXPLORE</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {lookupCharacter && characterHistory.length === 0 && !isSearching && (
            <div className="bg-muted/30 border border-primary/20 rounded p-4 text-center">
              <div className="text-muted-foreground">NO_TRANSACTIONS_FOUND</div>
              <div className="text-muted-foreground/60 text-xs mt-1">
                Character "{lookupCharacter}" has no transaction history
              </div>
            </div>
          )}

          <div className="mt-4 pt-2 border-t border-primary/20 text-muted-foreground/60 text-xs text-center">
            {'>'} TERMINAL_PLAYER_TRACKER_v2.089
          </div>
        </div>
      </div>
    );
  };

  const TransactionExplorer = () => {
    if (!selectedTransaction) return null;

    const tx = selectedTransaction;
    const { type, icon: Icon, color } = getTransactionTypeDisplay(tx);

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-background border border-primary/30 rounded-lg p-4 font-mono text-xs text-primary">
          <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span className="text-primary font-bold">TRANSACTION_EXPLORER v2.089</span>
            </div>
            <button
              onClick={() => setSelectedTransaction(null)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-muted/50 border border-primary/20 p-3 rounded">
              <div className="text-muted-foreground text-xs mb-1">TRANSACTION_ID</div>
              <div className="text-primary font-bold break-all">{tx.id}</div>
            </div>

            <div className="bg-muted/50 border border-primary/20 p-3 rounded">
              <div className="text-muted-foreground text-xs mb-1">OPERATION_TYPE</div>
              <div className={`font-bold flex items-center gap-1 ${color}`}>
                <Icon className="w-3 h-3" />
                {type}
              </div>
            </div>

            <div className="bg-muted/50 border border-primary/20 p-3 rounded">
              <div className="text-muted-foreground text-xs mb-1">TIMESTAMP</div>
              <div className="text-primary font-bold">{new Date(tx.created_at).toLocaleString()}</div>
            </div>

            <div className="bg-muted/50 border border-primary/20 p-3 rounded">
              <div className="text-muted-foreground text-xs mb-1">CHARACTER</div>
              <div className="text-primary font-bold">{tx.character_id}</div>
            </div>
          </div>

          <div className="bg-muted/30 border border-primary/20 p-4 rounded mb-4">
            <div className="text-muted-foreground text-xs mb-3">TRANSACTION_DETAILS</div>

            {tx.from_vault && tx.to_vault && (
              <div className="flex items-center justify-between mb-3">
                <div className="text-center">
                  <div className="text-muted-foreground text-xs mb-1">FROM</div>
                  <div className="text-primary font-bold">{tx.from_vault}</div>
                  <div className="text-primary text-lg font-bold mt-1">{formatAmount(tx.from_units || 0)}</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="p-2 border rounded border-primary/50 bg-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">TRANSFER</div>
                </div>

                <div className="text-center">
                  <div className="text-muted-foreground text-xs mb-1">TO</div>
                  <div className="text-primary font-bold">{tx.to_vault}</div>
                  <div className="text-primary text-lg font-bold mt-1">{formatAmount(tx.to_units || 0)}</div>
                </div>
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">DESCRIPTION:</span>
                <span className="text-primary">{tx.description}</span>
              </div>
              {tx.exchange_flux && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EXCHANGE_RATE:</span>
                  <span className="text-primary">{formatAmount(tx.exchange_flux)}</span>
                </div>
              )}
              {tx.on_chain_signature && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TX_HASH:</span>
                  <span className="text-primary font-mono">{tx.on_chain_signature.slice(0, 8)}...{tx.on_chain_signature.slice(-8)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-primary/20 text-muted-foreground/60 text-xs text-center">
            {'>'} TERMINAL_TRANSACTION_EXPLORER_v2.089
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl bg-background border border-primary/30 rounded-lg p-4 font-mono text-xs text-primary">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-primary font-bold">SOL/EARTH TERMINAL v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className={`w-3 h-3 ${systemStatus === 'ONLINE' ? 'animate-pulse text-success' : systemStatus === 'MAINTENANCE' ? 'text-warning' : 'text-destructive'}`} />
          <span className={getSystemStatusColor(systemStatus)}>{systemStatus}</span>
        </div>
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">WALLET_SOL</div>
          <div className="text-primary text-lg font-bold">{actions.formatBalance(solBalance)}</div>
          <div className="text-muted-foreground text-xs">SOLANA</div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">GAME_EARTH</div>
          <div className="text-success text-lg font-bold">{actions.formatBalance(gameEarthBalance)}/{actions.formatBalance(walletEarthBalance)}</div>
          <div className="text-muted-foreground text-xs">IN-GAME/WALLET</div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">NETWORK</div>
          <div className="text-primary text-lg font-bold flex items-center gap-1">
            <Zap className="w-3 h-3" />
            DEVNET
          </div>
          <div className="text-muted-foreground text-xs">ACTIVE</div>
        </div>
      </div>

      {/* Action Menu Bar */}
      <div className="mb-4">
        <div className="flex border border-primary/30 rounded overflow-hidden">
          <div className="flex-1 overflow-x-auto">
            <div className="flex items-center gap-2 p-2 min-w-max">
              <button
                onClick={() => setShowBridge(true)}
                className="bg-primary/10 border border-primary text-primary px-3 py-1 rounded text-xs font-bold hover:bg-primary/20 transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                <Database className="w-3 h-3" />
                BRIDGE
              </button>

              <button
                disabled
                className="bg-muted/50 border border-primary/30 text-muted-foreground px-3 py-1 rounded text-xs font-bold cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
              >
                <ArrowLeftRight className="w-3 h-3" />
                SWAP (SOON)
              </button>

              <button
                onClick={() => setShowCharacterLookup(true)}
                className="bg-muted/50 border border-primary/30 text-primary px-3 py-1 rounded text-xs font-bold hover:border-primary/50 transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                <Search className="w-3 h-3" />
                LOOKUP
              </button>

              <button
                onClick={() => setShowDocumentation(true)}
                className="bg-muted/50 border border-primary/30 text-primary px-3 py-1 rounded text-xs font-bold hover:border-primary/50 transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                <Info className="w-3 h-3" />
                INFO
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 border-l border-primary/30 bg-muted/20">
            <span className="text-muted-foreground text-xs whitespace-nowrap hidden sm:inline">TERMINAL_TOOLS</span>
            <button
              onClick={() => console.log('Settings clicked')}
              className="bg-muted/50 border border-primary/30 text-primary px-2 py-1 rounded text-xs hover:border-primary/50 transition-colors flex-shrink-0"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transaction Activity */}
      <div>
        <div className="text-muted-foreground text-xs mb-2">RECENT SOL/EARTH ACTIVITY</div>
        <div className="bg-muted/30 border border-primary/20 rounded p-2 max-h-48 overflow-y-auto main-transactions-scroll">
          {isLoading ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              <Activity className="w-4 h-4 animate-spin mr-2" />
              LOADING TRANSACTION DATA...
            </div>
          ) : transactions.length > 0 ? (
            transactions.map((tx) => {
              const { type, icon: Icon, color } = getTransactionTypeDisplay(tx);
              return (
                <div
                  key={tx.id}
                  className={`py-2 border-b border-border/30 last:border-b-0 cursor-pointer hover:bg-muted/20 transition-all duration-300 ${newTransactionIds.has(tx.id) ? 'animate-pulse bg-primary/10 border-primary/30' : ''
                    }`}
                  onClick={() => setSelectedTransaction(tx)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold flex items-center gap-1 ${color}`}>
                        <Icon className="w-3 h-3" />
                        {type}
                      </span>
                      {tx.wasteland_block && (
                        <span className="text-muted-foreground text-xs">BLK{tx.wasteland_block % 10000}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground/60 text-xs">{new Date(tx.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {tx.from_vault && tx.to_vault ? (
                      <>
                        <span className="text-primary">{formatAmount(tx.from_units || 0)}</span>
                        <span className="text-muted-foreground">{tx.from_vault.split('_')[1] || tx.from_vault}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-primary">{formatAmount(tx.to_units || 0)}</span>
                        <span className="text-muted-foreground">{tx.to_vault.split('_')[1] || tx.to_vault}</span>
                        {tx.exchange_flux && (
                          <span className="text-muted-foreground ml-2">@{formatAmount(tx.exchange_flux)}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">{tx.description}</span>
                    )}
                    <span className="text-muted-foreground/50 ml-auto text-xs">CLICK_TO_EXPLORE</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              <div className="text-center">
                <div className="text-muted-foreground">NO_RECENT_ACTIVITY</div>
                <div className="text-muted-foreground/60 text-xs mt-1">SOL/EARTH transactions will appear here</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-2 border-t border-primary/20 flex justify-between text-xs text-muted-foreground/60">
        <span>SOL_EARTH_TERMINAL_v2089 | UNIFIED_MANAGEMENT</span>
        <span>LAST_UPDATE: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* Bridge Component with all functionality preserved */}
      <EarthBridge
        isOpen={showBridge}
        onClose={() => setShowBridge(false)}
        onCharacterUpdate={onCharacterUpdate}
      />

      {/* Character Lookup Modal */}
      <CharacterLookup />

      {/* Documentation Modal */}
      <DocumentationModal />

      {/* Transaction Explorer Modal */}
      <TransactionExplorer />
    </div>
  );
};

export default EarthMarket;
