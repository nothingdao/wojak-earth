import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Zap, Database, Activity } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for realtime
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY)

interface Transaction {
  createdAt: string;
  fromvault: string;
  tovault: string;
  fromunits: number;
  tounits: number;
  exchangeflux: number;
  wastelandblock: number;
  txnshard: string;
  sendershard: string;
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
          // Refresh market data immediately when new exchange happens
          fetchMarketData();
        }
      )
      .subscribe();

    // Also poll every 30 seconds as backup
    const interval = setInterval(fetchMarketData, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const fetchMarketData = async () => {
    try {
      // Fetch real blockchain data
      const response = await fetch('/.netlify/functions/get-rust-markets');
      const data = await response.json();

      if (data.success && data.marketStats) {
        // Use processed market stats from backend
        const { marketStats } = data;
        setMarketData(marketStats.blocks);
        setCurrentRate(marketStats.currentRate);
        setChange24h(marketStats.change24h);
        setVolume24h(marketStats.volume24h);
        setTotalTrades(marketStats.totalTrades);

        console.log('📊 Real market data loaded:', {
          transactions: data.totalTransactions,
          currentRate: marketStats.currentRate,
          latestBlock: marketStats.latestBlock
        });
      } else {
        throw new Error('Invalid market data response');
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      console.log('📊 Falling back to mock data');
      // Mock data for demo
      generateMockData();
      setIsLoading(false);
    }
  };

  const processTransactionData = (transactions: Transaction[]): MarketData[] => {
    const blockGroups: { [key: number]: { rates: number[], volume: number, trades: number, time: string } } = {};

    transactions.forEach(tx => {
      if (!blockGroups[tx.wastelandblock]) {
        blockGroups[tx.wastelandblock] = {
          rates: [],
          volume: 0,
          trades: 0,
          time: tx.createdAt
        };
      }

      blockGroups[tx.wastelandblock].rates.push(tx.exchangeflux);
      blockGroups[tx.wastelandblock].volume += tx.fromvault === 'SCRAP_SOL' ? tx.fromunits : tx.tounits;
      blockGroups[tx.wastelandblock].trades += 1;
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

  const generateMockData = () => {
    const mockData: MarketData[] = [];
    const baseRate = 180;

    for (let i = 0; i < 20; i++) {
      const rate = baseRate + (Math.random() - 0.5) * 20;
      mockData.push({
        block: 29157800 + i,
        rate: Math.round(rate * 100) / 100,
        volume: Math.random() * 2,
        trades: Math.floor(Math.random() * 5) + 1,
        time: new Date(Date.now() - (20 - i) * 60000).toLocaleTimeString()
      });
    }

    setMarketData(mockData);
    setCurrentRate(mockData[mockData.length - 1].rate);
    setChange24h((Math.random() - 0.5) * 10);
    setVolume24h(mockData.reduce((sum, d) => sum + d.volume, 0));
    setTotalTrades(mockData.reduce((sum, d) => sum + d.trades, 0));
  };

  const formatRate = (rate: number) => rate.toFixed(2);
  const formatVolume = (vol: number) => vol.toFixed(3);
  const formatChange = (change: number) => `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;

  return (
    <div className="w-full max-w-4xl bg-background border border-primary/30 rounded-lg p-4 font-mono text-xs text-primary">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-primary font-bold">WASTELAND EXCHANGE v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 animate-pulse" />
          <span className="text-primary">LIVE</span>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">SOL/RUST</div>
          <div className="text-primary text-lg font-bold">{formatRate(currentRate)}</div>
          <div className={`text-xs flex items-center gap-1 ${change24h >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {formatChange(change24h)}
          </div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">24H VOLUME</div>
          <div className="text-primary text-lg font-bold">{formatVolume(volume24h)}</div>
          <div className="text-muted-foreground text-xs">SOL</div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">TRADES</div>
          <div className="text-primary text-lg font-bold">{totalTrades}</div>
          <div className="text-muted-foreground text-xs">24H</div>
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

      {/* Price Chart */}
      <div className="mb-4">
        <div className="text-muted-foreground text-xs mb-2 flex items-center justify-between">
          <span>PRICE FLUX (RUST PER SOL)</span>
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
        <div className="bg-muted/30 border border-primary/20 rounded p-2 max-h-32 overflow-y-auto">
          {marketData.slice(-5).reverse().map((data, idx) => (
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
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-2 border-t border-primary/20 flex justify-between text-xs text-muted-foreground/60">
        <span>RUST_CHAIN_v2089 | TREASURY_AMM</span>
        <span>LAST_UPDATE: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default RustMarket;
