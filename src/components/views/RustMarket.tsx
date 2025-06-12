import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Zap, Database, Activity, ArrowUpDown, AlertTriangle, X, Search, BarChart3, History, Settings, Info } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for realtime
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY)

interface Transaction {
  created_at: string;
  from_vault: string;
  to_vault: string;
  from_units: number;
  to_units: number;
  exchange_flux: number;
  wasteland_block: number;
  txn_shard: string;
  sender_shard: string;
}

interface MarketData {
  block: number;
  rate: number;
  volume: number;
  trades: number;
  time: string;
}

const RustMarket: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [change24h, setChange24h] = useState<number>(0);
  const [volume24h, setVolume24h] = useState<number>(0);
  const [totalTrades, setTotalTrades] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSwap, setShowSwap] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showCharacterLookup, setShowCharacterLookup] = useState(false);
  const [lookupCharacter, setLookupCharacter] = useState('');
  const [characterHistory, setCharacterHistory] = useState<Transaction[]>([]);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [newTransactionIds, setNewTransactionIds] = useState<Set<string>>(new Set());

  // Add ref to track documentation scroll position
  const documentationScrollRef = useRef<HTMLDivElement>(null);

  // Add keyboard event listener for ESC key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDocumentation) {
        setShowDocumentation(false);
      }
    };

    if (showDocumentation) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showDocumentation]);

  useEffect(() => {
    fetchMarketData();

    // Set up realtime subscription for new exchange transactions
    const subscription = supabase
      .channel('rust-market-updates')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: 'type=eq.EXCHANGE'
        },
        (payload) => {
          console.log('📊 New exchange transaction detected!', payload.new);
          fetchMarketData();
        }
      )
      .subscribe();

    const interval = setInterval(fetchMarketData, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const fetchMarketData = async () => {
    try {
      const response = await fetch('/.netlify/functions/rust-market');
      const data = await response.json();

      if (data.success) {
        console.log('📊 Data:', data);

        // Set SOL price
        setCurrentRate(data.data.rustPerSOL);

        // Process your transactions using your existing function
        if (data.transactions && data.transactions.length > 0) {
          const processedData = processTransactionData(data.transactions);
          setMarketData(processedData);

          // Set recent individual transactions for detailed view
          const newTransactions = data.transactions.slice(0, 10);

          // Only update recent transactions if they're actually different
          const hasNewTransactions = !arraysEqual(
            recentTransactions.map((tx: Transaction) => tx.txn_shard || tx.wasteland_block),
            newTransactions.map((tx: Transaction) => tx.txn_shard || tx.wasteland_block)
          );

          if (hasNewTransactions) {
            // Track new transactions for animation
            if (recentTransactions.length > 0) {
              const existingIds = new Set(recentTransactions.map((tx: Transaction) => tx.txn_shard || tx.wasteland_block));
              const newIds = new Set<string>();

              newTransactions.forEach((tx: Transaction) => {
                const txId = tx.txn_shard || tx.wasteland_block;
                if (txId && !existingIds.has(txId)) {
                  newIds.add(String(txId));
                }
              });

              if (newIds.size > 0) {
                setNewTransactionIds(newIds);
                // Clear the animation after 3 seconds
                setTimeout(() => setNewTransactionIds(new Set()), 3000);
              }
            }

            setRecentTransactions(newTransactions);
          }

          // Calculate simple stats
          const totalVol = processedData.reduce((sum, d) => sum + d.volume, 0);
          const totalTx = processedData.reduce((sum, d) => sum + d.trades, 0);
          setVolume24h(totalVol);
          setTotalTrades(totalTx);

          // Calculate 24h change from first to last
          if (processedData.length > 1) {
            const firstRate = processedData[0].rate;
            const lastRate = processedData[processedData.length - 1].rate;
            const change = ((lastRate - firstRate) / firstRate) * 100;
            setChange24h(change);
          }
        }
      }

      setIsLoading(false);

    } catch (error) {
      console.error('Failed to fetch market data:', error);
      setIsLoading(false);
    }
  };

  // Helper function to compare arrays
  const arraysEqual = (a: (string | number | undefined)[], b: (string | number | undefined)[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  const processTransactionData = (transactions: Transaction[]): MarketData[] => {
    const blockGroups: { [key: number]: { rates: number[], volume: number, trades: number, time: string } } = {};

    transactions.forEach(tx => {
      if (!blockGroups[tx.wasteland_block]) {
        blockGroups[tx.wasteland_block] = {
          rates: [],
          volume: 0,
          trades: 0,
          time: tx.created_at
        };
      }

      blockGroups[tx.wasteland_block].rates.push(tx.exchange_flux);
      blockGroups[tx.wasteland_block].volume += tx.from_vault === 'SCRAP_SOL' ? tx.from_units : tx.to_units;
      blockGroups[tx.wasteland_block].trades += 1;
    });

    return Object.entries(blockGroups)
      .map(([block, data]) => ({
        block: parseInt(block),
        rate: data.rates.reduce((sum, r) => sum + r, 0) / data.rates.length,
        volume: data.volume,
        trades: data.trades,
        time: new Date(data.time).toLocaleTimeString()
      }))
      .sort((a, b) => a.block - b.block);
  };

  const formatRate = (rate: number) => rate.toFixed(2);
  const formatVolume = (vol: number) => vol.toFixed(3);
  const formatChange = (change: number) => `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;

  // Swap Modal Component
  const SwapModal = () => {
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
    const [fromToken, setFromToken] = useState('SOL');
    const [toToken, setToToken] = useState('SHARD');
    const [isProcessing, setIsProcessing] = useState(false);

    // Calculate conversion
    useEffect(() => {
      if (fromAmount && !isNaN(parseFloat(fromAmount))) {
        const amount = parseFloat(fromAmount);
        if (fromToken === 'SOL') {
          setToAmount((amount * currentRate).toFixed(2));
        } else {
          setToAmount((amount / currentRate).toFixed(6));
        }
      } else {
        setToAmount('');
      }
    }, [fromAmount, fromToken, toToken]);

    const flipTokens = () => {
      setFromToken(toToken);
      setToToken(fromToken);
      setFromAmount(toAmount);
    };

    const executeSwap = async () => {
      setIsProcessing(true);

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('🔄 Executing swap:', {
        from: `${fromAmount} ${fromToken}`,
        to: `${toAmount} ${toToken}`,
        rate: currentRate
      });

      setIsProcessing(false);
      setShowSwap(false);
    };

    if (!showSwap) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-background border border-primary/30 rounded-lg p-4 font-mono text-xs text-primary">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span className="text-primary font-bold">SWAP_TERMINAL v2.089</span>
            </div>
            <button
              onClick={() => setShowSwap(false)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Rate Display */}
          <div className="bg-muted/50 border border-primary/20 p-3 rounded mb-4">
            <div className="text-muted-foreground text-xs mb-1">EXCHANGE_RATE</div>
            <div className="text-primary font-bold">
              1 SOL = {formatRate(currentRate)} SHARD
            </div>
            <div className="text-muted-foreground text-xs mt-1">
              {'>'} LIVE_FEED_ACTIVE
            </div>
          </div>

          {/* From Token */}
          <div className="mb-3">
            <div className="text-muted-foreground text-xs mb-2">FROM:</div>
            <div className="bg-muted/30 border border-primary/20 p-3 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-primary font-bold">{fromToken}</span>
                <span className="text-muted-foreground text-xs">BAL: 0.000</span>
              </div>
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-primary text-lg font-bold outline-none placeholder-muted-foreground/50"
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center mb-3">
            <button
              onClick={flipTokens}
              className="bg-muted/30 border border-primary/20 p-2 rounded hover:border-primary/50 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4 text-primary" />
            </button>
          </div>

          {/* To Token */}
          <div className="mb-4">
            <div className="text-muted-foreground text-xs mb-2">TO:</div>
            <div className="bg-muted/30 border border-primary/20 p-3 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-primary font-bold">{toToken}</span>
                <span className="text-muted-foreground text-xs">BAL: 0.000</span>
              </div>
              <div className="text-primary text-lg font-bold">
                {toAmount || '0.00'}
              </div>
            </div>
          </div>

          {/* Warning */}
          {fromAmount && parseFloat(fromAmount) > 0.1 && (
            <div className="bg-destructive/10 border border-destructive/50 p-3 rounded mb-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">PRICE_IMPACT: HIGH</span>
              </div>
            </div>
          )}

          {/* Execute Button */}
          <button
            onClick={executeSwap}
            disabled={!fromAmount || parseFloat(fromAmount) <= 0 || isProcessing}
            className="w-full bg-primary/10 border border-primary text-primary p-3 rounded font-bold hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-4 h-4 animate-pulse" />
                PROCESSING_SWAP...
              </div>
            ) : (
              `EXECUTE_SWAP`
            )}
          </button>

          {/* Footer */}
          <div className="mt-4 pt-2 border-t border-primary/20 text-muted-foreground/60 text-xs text-center">
            {'>'} WASTELAND_TREASURY_AMM_v2.089
          </div>
        </div>
      </div>
    );
  };

  // Documentation Modal
  const DocumentationModal = () => {
    if (!showDocumentation) return null;

    const modalContent = (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-0">
        <div className="w-full h-full bg-background border-0 rounded-none p-6 font-mono text-xs text-primary flex flex-col">
          {/* Header - Fixed */}
          <div className="flex items-center justify-between mb-6 border-b border-primary/20 pb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              <span className="text-primary font-bold text-sm">SHARD_MARKET_DOCUMENTATION v2.089</span>
            </div>
            <button
              onClick={() => setShowDocumentation(false)}
              className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded hover:bg-muted/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto documentation-modal-scroll" ref={documentationScrollRef}>
            {/* Documentation Content */}
            <div className="max-w-6xl mx-auto space-y-8">

              {/* Overview */}
              <section className="bg-muted/30 border border-primary/20 rounded p-6">
                <h2 className="text-primary font-bold mb-4 flex items-center gap-2 text-base">
                  <Database className="w-5 h-5" />
                  OVERVIEW
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3 text-sm">
                  The SHARD Market is a hybrid off-chain/on-chain automated market maker (AMM) that enables seamless
                  trading between SOL and SHARD tokens. Built for the Earth gaming ecosystem, it combines the
                  efficiency of off-chain processing with the security of on-chain asset backing on Solana.
                </p>
                <div className="bg-primary/10 border border-primary/30 p-3 rounded mt-3">
                  <span className="text-primary font-bold">KEY PRINCIPLE:</span>
                  <span className="text-muted-foreground ml-2">1 SHARD = 1 USDC (pegged value) - No Fractional Reserve</span>
                </div>
              </section>

              {/* Vault System */}
              <section className="bg-muted/30 border border-primary/20 rounded p-6">
                <h2 className="text-primary font-bold mb-4 flex items-center gap-2 text-base">
                  <Zap className="w-5 h-5" />
                  VAULT_SYSTEM
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-muted/50 border border-primary/20 p-4 rounded">
                    <div className="text-green-500 font-bold mb-2 text-sm">SCRAP_SOL</div>
                    <div className="text-muted-foreground text-sm leading-relaxed">
                      Real SOL tokens held in our on-chain treasury wallet. Provides actual liquidity backing
                      for all SHARD redemptions. Balance visible on Solana blockchain.
                    </div>
                  </div>
                  <div className="bg-muted/50 border border-primary/20 p-4 rounded">
                    <div className="text-orange-500 font-bold mb-2 text-sm">SHARD_COIN</div>
                    <div className="text-muted-foreground text-sm leading-relaxed">
                      Off-chain SHARD tokens stored in our database. Pegged 1:1 with USDC value.
                      Instantly transferable between game characters with zero gas fees. Off-chain validators verify supply is true.
                    </div>
                  </div>
                </div>
              </section>

              {/* Value Pegging */}
              <section className="bg-muted/30 border border-primary/20 rounded p-6">
                <h2 className="text-primary font-bold mb-4 flex items-center gap-2 text-base">
                  <TrendingUp className="w-5 h-5" />
                  VALUE_PEGGING_MECHANISM
                </h2>
                <div className="space-y-4">
                  <div className="bg-muted/50 border border-primary/20 p-4 rounded">
                    <div className="text-primary font-bold mb-2">USDC_PEG_FORMULA:</div>
                    <code className="text-green-500 text-sm">SHARD_VALUE = 1 USDC</code>
                    <div className="text-muted-foreground text-sm mt-2">
                      SHARD maintains stable purchasing power regardless of SOL price volatility.
                    </div>
                  </div>
                  <div className="bg-muted/50 border border-primary/20 p-4 rounded">
                    <div className="text-primary font-bold mb-2">EXCHANGE_RATE_CALCULATION:</div>
                    <code className="text-green-500 text-sm">SOL_TO_SHARD_RATE = SOL_USD_PRICE / 1</code>
                    <div className="text-muted-foreground text-sm mt-2">
                      Dynamic rate based on real-time SOL/USD pricing from Jupiter/Helius APIs.
                    </div>
                  </div>
                </div>
              </section>

              {/* Hybrid AMM */}
              <section className="bg-muted/30 border border-primary/20 rounded p-6">
                <h2 className="text-primary font-bold mb-4 flex items-center gap-2 text-base">
                  <BarChart3 className="w-5 h-5" />
                  HYBRID_AMM_ARCHITECTURE
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-muted/50 border border-primary/20 p-4 rounded">
                    <div className="text-blue-500 font-bold mb-2 text-sm">ON_CHAIN_COMPONENT:</div>
                    <div className="text-muted-foreground text-sm space-y-1">
                      <div>• Treasury wallet holds real SOL on Solana devnet</div>
                      <div>• Transparent, auditable reserves</div>
                      <div>• Future migration path to full on-chain AMM</div>
                    </div>
                  </div>
                  <div className="bg-muted/50 border border-primary/20 p-4 rounded">
                    <div className="text-purple-500 font-bold mb-2 text-sm">OFF_CHAIN_COMPONENT:</div>
                    <div className="text-muted-foreground text-sm space-y-1">
                      <div>• SHARD balances in Supabase for instant transfers</div>
                      <div>• Zero gas fees for in-game transactions</div>
                      <div>• Real-time market data processing</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Market Dynamics */}
              <section className="bg-muted/30 border border-primary/20 rounded p-6">
                <h2 className="text-primary font-bold mb-4 flex items-center gap-2 text-base">
                  <Activity className="w-5 h-5" />
                  MARKET_DYNAMICS
                </h2>
                <div className="space-y-4">
                  <div className="bg-muted/50 border border-primary/20 p-4 rounded">
                    <div className="text-primary font-bold mb-2">PRICE_DISCOVERY:</div>
                    <div className="text-muted-foreground text-sm">
                      SOL price fluctuates based on real crypto markets. SHARD maintains stable USD value.
                      Exchange rate automatically adjusts to reflect current SOL/USD pricing.
                    </div>
                  </div>
                  <div className="bg-muted/50 border border-primary/20 p-4 rounded">
                    <div className="text-primary font-bold mb-2">LIQUIDITY_MANAGEMENT:</div>
                    <div className="text-muted-foreground text-sm">
                      Treasury SOL reserves back all SHARD redemptions. No impermanent loss for users.
                      Slippage-free trading due to external price oracle integration.
                    </div>
                  </div>
                </div>
              </section>

              {/* Trading Examples */}
              <section className="bg-muted/30 border border-primary/20 rounded p-6">
                <h2 className="text-primary font-bold mb-4 flex items-center gap-2 text-base">
                  <ArrowUpDown className="w-5 h-5" />
                  TRADING_EXAMPLES
                </h2>
                <div className="bg-muted/50 border border-primary/20 p-4 rounded">
                  <div className="text-primary font-bold mb-3">SCENARIO: SOL = $150 USD</div>
                  <div className="text-muted-foreground text-sm space-y-2">
                    <div>• Player trades 1 SOL → receives 150 SHARD</div>
                    <div>• Player trades 75 SHARD → receives 0.5 SOL</div>
                    <div>• SHARD purchasing power: 1 SHARD = $1 USD equivalent</div>
                    <div>• All rates update automatically with SOL price changes</div>
                  </div>
                </div>
              </section>

              {/* Future Roadmap */}
              <section className="bg-muted/30 border border-primary/20 rounded p-6">
                <h2 className="text-primary font-bold mb-4 flex items-center gap-2 text-base">
                  <Settings className="w-5 h-5" />
                  MAINNET_MIGRATION_PATH
                </h2>
                <div className="space-y-3">
                  <div className="bg-green-500/10 border border-green-500/30 p-3 rounded">
                    <span className="text-green-500 font-bold">PHASE_1:</span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      Current hybrid system with USDC reserves backing
                    </span>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded">
                    <span className="text-yellow-500 font-bold">PHASE_2:</span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      SPL token deployment with on-chain SHARD minting
                    </span>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded">
                    <span className="text-blue-500 font-bold">PHASE_3:</span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      Full decentralized AMM with liquidity provider rewards
                    </span>
                  </div>
                </div>
              </section>

              {/* Technical Specs */}
              <section className="bg-muted/30 border border-primary/20 rounded p-6">
                <h2 className="text-primary font-bold mb-4 text-base">TECHNICAL_SPECIFICATIONS</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-2">NETWORK:</div>
                    <div className="text-primary">Solana Devnet</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-2">PRICE_ORACLE:</div>
                    <div className="text-primary">Jupiter API + Helius</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-2">DATABASE:</div>
                    <div className="text-primary">Supabase PostgreSQL</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-2">UPDATE_FREQUENCY:</div>
                    <div className="text-primary">30 seconds</div>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="text-center py-8">
                <div className="text-muted-foreground/60 text-sm">
                  {'>'} WASTELAND_TREASURY_AMM_DOCUMENTATION_v2.089
                </div>
                <div className="text-muted-foreground/60 text-sm mt-2">
                  BUILT_FOR_THE_FUTURE_OF_GAMING_FINANCE
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

    // Render modal as a portal to document.body
    return createPortal(modalContent, document.body);
  };


  const CharacterLookup = () => {
    const [isSearching, setIsSearching] = useState(false);

    const searchCharacterHistory = async () => {
      if (!lookupCharacter.trim()) return;

      setIsSearching(true);
      try {
        // Simulate API call - replace with actual lookup
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock data - replace with actual character transaction lookup
        const mockHistory = recentTransactions.filter((tx: Transaction) =>
          tx.sender_shard === lookupCharacter ||
          tx.txn_shard === lookupCharacter
        );

        setCharacterHistory(mockHistory);
        console.log(`🔍 Looking up history for: ${lookupCharacter}`);
      } catch (error) {
        console.error('Character lookup failed:', error);
      }
      setIsSearching(false);
    };

    if (!showCharacterLookup) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-background border border-primary/30 rounded-lg p-4 font-mono text-xs text-primary">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span className="text-primary font-bold">CHARACTER_LOOKUP v2.089</span>
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

          {/* Search Input */}
          <div className="mb-4">
            <div className="text-muted-foreground text-xs mb-2">ENTER_CHARACTER_ID_OR_SHARD:</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={lookupCharacter}
                onChange={(e) => setLookupCharacter(e.target.value)}
                placeholder="player_123 or shard_abc..."
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

          {/* Results */}
          {characterHistory.length > 0 && (
            <div>
              <div className="text-muted-foreground text-xs mb-2">
                TRANSACTION_HISTORY ({characterHistory.length} found):
              </div>
              <div className="bg-muted/30 border border-primary/20 rounded p-2 max-h-64 overflow-y-auto lookup-history-scroll">
                {characterHistory.map((tx, idx) => {
                  const isBuy = tx.from_vault === 'SCRAP_SOL';
                  return (
                    <div
                      key={idx}
                      className="py-2 border-b border-border/30 last:border-b-0 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => {
                        setSelectedTransaction(tx);
                        setShowCharacterLookup(false);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold flex items-center gap-1 ${isBuy ? 'text-green-500' : 'text-red-500'}`}>
                            {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isBuy ? 'BUY_SHARD' : 'SELL_SHARD'}
                          </span>
                          <span className="text-muted-foreground text-xs">BLK{tx.wasteland_block % 10000}</span>
                        </div>
                        <span className="text-muted-foreground/60 text-xs">{new Date(tx.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-primary">{tx.from_units}</span>
                        <span className="text-muted-foreground">{tx.from_vault.split('_')[1] || tx.from_vault}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-primary">{formatVolume(tx.to_units)}</span>
                        <span className="text-muted-foreground">{tx.to_vault.split('_')[1] || tx.to_vault}</span>
                        <span className="text-muted-foreground ml-2">@{formatRate(tx.exchange_flux)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results */}
          {lookupCharacter && characterHistory.length === 0 && !isSearching && (
            <div className="bg-muted/30 border border-primary/20 rounded p-4 text-center">
              <div className="text-muted-foreground">NO_TRANSACTIONS_FOUND</div>
              <div className="text-muted-foreground/60 text-xs mt-1">
                Character "{lookupCharacter}" has no exchange history
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-2 border-t border-primary/20 text-muted-foreground/60 text-xs text-center">
            {'>'} WASTELAND_CHARACTER_TRACKER_v2.089
          </div>
        </div>
      </div>
    );
  };


  const TransactionExplorer = () => {
    if (!selectedTransaction) return null;

    const tx = selectedTransaction;
    const isBuy = tx.from_vault === 'SCRAP_SOL';

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-background border border-primary/30 rounded-lg p-4 font-mono text-xs text-primary">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span className="text-primary font-bold">SHARD_BLOCK_EXPLORER v2.089</span>
            </div>
            <button
              onClick={() => setSelectedTransaction(null)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Transaction Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-muted/50 border border-primary/20 p-3 rounded">
              <div className="text-muted-foreground text-xs mb-1">TRANSACTION_ID</div>
              <div className="text-primary font-bold break-all">{tx.txn_shard || tx.wasteland_block || 'N/A'}</div>
            </div>

            <div className="bg-muted/50 border border-primary/20 p-3 rounded">
              <div className="text-muted-foreground text-xs mb-1">WASTELAND_BLOCK</div>
              <div className="text-primary font-bold">{tx.wasteland_block}</div>
            </div>

            <div className="bg-muted/50 border border-primary/20 p-3 rounded">
              <div className="text-muted-foreground text-xs mb-1">OPERATION_TYPE</div>
              <div className={`font-bold flex items-center gap-1 ${isBuy ? 'text-green-500' : 'text-red-500'}`}>
                {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isBuy ? 'BUY_SHARD' : 'SELL_SHARD'}
              </div>
            </div>

            <div className="bg-muted/50 border border-primary/20 p-3 rounded">
              <div className="text-muted-foreground text-xs mb-1">TIMESTAMP</div>
              <div className="text-primary font-bold">{new Date(tx.created_at).toLocaleString()}</div>
            </div>
          </div>

          {/* Exchange Details */}
          <div className="bg-muted/30 border border-primary/20 p-4 rounded mb-4">
            <div className="text-muted-foreground text-xs mb-3">EXCHANGE_DETAILS</div>

            <div className="flex items-center justify-between mb-3">
              <div className="text-center">
                <div className="text-muted-foreground text-xs mb-1">FROM_VAULT</div>
                <div className="text-primary font-bold">{tx.from_vault}</div>
                <div className="text-primary text-lg font-bold mt-1">{tx.from_units}</div>
              </div>

              <div className="flex flex-col items-center">
                <div className={`p-2 border rounded ${isBuy ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                  {isBuy ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                </div>
                <div className="text-muted-foreground text-xs mt-1">EXCHANGE</div>
              </div>

              <div className="text-center">
                <div className="text-muted-foreground text-xs mb-1">TO_VAULT</div>
                <div className="text-primary font-bold">{tx.to_vault}</div>
                <div className="text-primary text-lg font-bold mt-1">{tx.to_units}</div>
              </div>
            </div>

            <div className="border-t border-primary/20 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">EXCHANGE_RATE:</span>
                <span className="text-primary font-bold">{formatRate(tx.exchange_flux)} SHARD/SOL</span>
              </div>
            </div>
          </div>

          {/* Character Info */}
          <div className="bg-muted/50 border border-primary/20 p-3 rounded mb-4">
            <div className="text-muted-foreground text-xs mb-1">CHARACTER_DATA</div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">SENDER: </span>
                <span className="text-primary">{tx.sender_shard || tx.txn_shard || 'UNKNOWN'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">RECEIVER: </span>
                <span className="text-primary">{'TREASURY'}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-primary/20 text-muted-foreground/60 text-xs text-center">
            {'>'} WASTELAND_BLOCKCHAIN_EXPLORER_v2.089
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
          <span className="text-primary font-bold">EARTH GLOBAL EXCHANGE v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 animate-pulse" />
          <span className="text-primary">LIVE</span>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-4">
        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">SOL/SHARD</div>
          <div className="text-primary text-lg font-bold">{formatRate(currentRate)}</div>
          <div className={`text-xs flex items-center gap-1 ${change24h >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {formatChange(change24h)}
          </div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">24H VOL<span className="hidden sm:inline">UME</span></div>
          <div className="text-primary text-lg font-bold">{formatVolume(volume24h)}</div>
          <div className="text-muted-foreground text-xs">SOL</div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">TRADES</div>
          <div className="text-primary text-lg font-bold">{totalTrades}</div>
          <div className="text-muted-foreground text-xs">24H</div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded hidden sm:block">
          <div className="text-muted-foreground text-xs mb-1">NETWORK</div>
          <div className="text-primary text-lg font-bold flex items-center gap-1">
            <Zap className="w-3 h-3" />
            DEVNET
          </div>
          <div className="text-muted-foreground text-xs">ACTIVE</div>
        </div>
      </div>

      {/* Trading Menu Bar */}
      <div className="mb-4">
        <div className="flex border border-primary/30 rounded overflow-hidden">
          {/* Left side - scrollable buttons */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex items-center gap-2 p-2 min-w-max">
              <button
                onClick={() => setShowSwap(true)}
                className="bg-primary/10 border border-primary text-primary px-3 py-1 rounded text-xs font-bold hover:bg-primary/20 transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                <ArrowUpDown className="w-3 h-3" />
                SWAP
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

          {/* Right side - settings (always visible) */}
          <div className="flex items-center gap-2 p-2 border-l border-primary/30 bg-muted/20">
            <span className="text-muted-foreground text-xs whitespace-nowrap hidden sm:inline">TRADING_TOOLS</span>
            <button
              onClick={() => console.log('Settings clicked')}
              className="bg-muted/50 border border-primary/30 text-primary px-2 py-1 rounded text-xs hover:border-primary/50 transition-colors flex-shrink-0"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <div className="mb-4">
        <div className="text-muted-foreground text-xs mb-2 flex items-center justify-between">
          <span>PRICE FLUX (SHARD PER SOL)</span>
          <span>LAST {marketData.length} BLOCKS</span>
        </div>
        <div className="bg-muted/30 border border-primary/20 rounded p-2 h-48">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Activity className="w-4 h-4 animate-spin mr-2" />
              SYNCING BLOCKCHAIN...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marketData}>
                <XAxis
                  dataKey="block"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${value % 10000}`}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <ReferenceLine y={180} stroke="hsl(var(--destructive))" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 2 }}
                  activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="text-muted-foreground text-xs mb-2">RECENT TRANSACTIONS</div>
        <div className="bg-muted/30 border border-primary/20 rounded p-2 max-h-48 overflow-y-auto main-transactions-scroll">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((tx, idx) => {
              const isBuy = tx.from_vault === 'SCRAP_SOL';
              const txKey = String(tx.txn_shard || tx.wasteland_block);
              return (
                <div
                  key={txKey || idx}
                  className={`py-2 border-b border-border/30 last:border-b-0 cursor-pointer hover:bg-muted/20 transition-all duration-300 ${newTransactionIds.has(txKey)
                    ? 'animate-pulse bg-primary/10 border-primary/30'
                    : ''
                    }`}
                  onClick={() => setSelectedTransaction(tx)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold flex items-center gap-1 ${isBuy ? 'text-green-500' : 'text-red-500'}`}>
                        {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isBuy ? 'BUY_SHARD' : 'SELL_SHARD'}
                      </span>
                      <span className="text-muted-foreground text-xs">BLK{tx.wasteland_block % 10000}</span>
                    </div>
                    <span className="text-muted-foreground/60 text-xs">{new Date(tx.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-primary">{tx.from_units}</span>
                    <span className="text-muted-foreground">{tx.from_vault.split('_')[1] || tx.from_vault}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-primary">{formatVolume(tx.to_units)}</span>
                    <span className="text-muted-foreground">{tx.to_vault.split('_')[1] || tx.to_vault}</span>
                    <span className="text-muted-foreground ml-2">@{formatRate(tx.exchange_flux)}</span>
                    <span className="text-muted-foreground/50 ml-auto text-xs">CLICK_TO_EXPLORE</span>
                  </div>
                </div>
              );
            })
          ) : (
            marketData.slice(-5).reverse().map((data, idx) => (
              <div key={idx} className="flex justify-between items-center py-1 border-b border-border/30 last:border-b-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">BLK{data.block % 10000}</span>
                  <span className="text-primary">{formatRate(data.rate)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{formatVolume(data.volume)}SOL</span>
                  <span className="text-muted-foreground/60">{data.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-2 border-t border-primary/20 flex justify-between text-xs text-muted-foreground/60">
        <span>SHARD_CHAIN_v2089 | TREASURY_AMM</span>
        <span>LAST_UPDATE: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* Swap Modal */}
      <SwapModal />

      {/* Character Lookup Modal */}
      <CharacterLookup />

      {/* Documentation Modal */}
      <DocumentationModal />

      {/* Transaction Explorer Modal */}
      <TransactionExplorer />
    </div>
  );
};

export default RustMarket;
