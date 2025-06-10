// src/components/views/EconomyView.tsx
import React, { useState, useEffect } from 'react';
import { XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Database,
  Activity,
  Zap,
  Heart,
} from 'lucide-react';

interface EconomyData {
  totalWealth: number
  avgWealth: number
  wealthDistribution: {
    poor: number
    middle: number
    rich: number
  }
  totalCharacters: number
  marketData: {
    totalListings: number
    totalValue: number
    avgPrice: number
    mostExpensiveItem: {
      name: string
      price: number
      location: string
    }
    cheapestItem: {
      name: string
      price: number
      location: string
    }
    popularLocations: Array<{
      name: string
      listings: number
    }>
  }
  playerActivity: {
    onlineNow: number
    avgLevel: number
    avgEnergy: number
    avgHealth: number
    topLocations: Array<{
      name: string
      player_count: number
    }>
  }
  resources: {
    mostValuable: Array<{
      name: string
      rarity: string
      estimatedValue: number
    }>
  }
}

interface RustMarketData {
  currentRate: number
  change24h: number
  volume24h: number
  totalTrades: number
  totalTransactions: number
}

interface GameEconomyFlow {
  rustCirculation: {
    playerBalances: number
    merchantFloat: number
    tradingVelocity: number
    burnedRust: number
    totalMinted: number
  }
  solCirculation: {
    playerSOL: number
    directSOLTrades: number
    solAcceptingMerchants: number
    treasurySOL: number
  }
  crossCurrencyFlow: {
    solToRustTrades: number
    rustToSolTrades: number
    preferenceShifts: any
    arbitrageGaps: any
  }
  totalEconomicValue: {
    rustEconomyUSD: number
    solEconomyUSD: number
    totalEconomyUSD: number
    rustDominance: number
    solDominance: number
  }
}

const EconomyView: React.FC = () => {
  const [economyData, setEconomyData] = useState<EconomyData | null>(null);
  const [rustMarketData, setRustMarketData] = useState<RustMarketData | null>(null);
  const [gameEconomyFlow, setGameEconomyFlow] = useState<GameEconomyFlow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEconomyData();
    const interval = setInterval(fetchEconomyData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchEconomyData = async () => {
    try {
      const [economyResponse, rustMarketResponse, gameEconomyResponse] = await Promise.all([
        fetch('/.netlify/functions/get-economy-overview'),
        fetch('/.netlify/functions/rust-market'),
        fetch('/.netlify/functions/game-economy')
      ]);

      if (economyResponse.ok) {
        const economyResult = await economyResponse.json();
        setEconomyData(economyResult.economy);
      }

      if (rustMarketResponse.ok) {
        const rustMarketResult = await rustMarketResponse.json();
        if (rustMarketResult.success) {
          setRustMarketData({
            currentRate: rustMarketResult.data.rustPerSOL,
            change24h: 0, // You can calculate this from your data
            volume24h: 0, // Add this to your rust-market endpoint
            totalTrades: rustMarketResult.transactionCount || 0,
            totalTransactions: rustMarketResult.transactionCount || 0
          });
        }
      }

      if (gameEconomyResponse.ok) {
        const gameEconomyResult = await gameEconomyResponse.json();
        if (gameEconomyResult.success) {
          setGameEconomyFlow(gameEconomyResult.gameEconomyFlow);
          console.log('🏦 Dual-Currency Economy Data:', gameEconomyResult);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch economy data:', error);
      // Generate mock data for demo
      generateMockData();
      setIsLoading(false);
    }
  };

  const generateMockData = () => {
    setEconomyData({
      totalWealth: 127543,
      avgWealth: 156,
      wealthDistribution: { poor: 234, middle: 145, rich: 43 },
      totalCharacters: 422,
      marketData: {
        totalListings: 1247,
        totalValue: 45623,
        avgPrice: 36,
        mostExpensiveItem: { name: "Legendary Sword", price: 2500, location: "Central Hub" },
        cheapestItem: { name: "Rusty Knife", price: 5, location: "Wasteland" },
        popularLocations: [
          { name: "Central Hub", listings: 347 },
          { name: "Trading Post", listings: 234 },
          { name: "Market Square", listings: 156 }
        ]
      },
      playerActivity: {
        onlineNow: 89,
        avgLevel: 12.4,
        avgEnergy: 67,
        avgHealth: 78,
        topLocations: [
          { name: "Central Hub", player_count: 23 },
          { name: "Mining Station", player_count: 18 },
          { name: "Wasteland", player_count: 12 }
        ]
      },
      resources: {
        mostValuable: [
          { name: "Quantum Core", rarity: "LEGENDARY", estimatedValue: 1500 },
          { name: "Plasma Cell", rarity: "EPIC", estimatedValue: 450 },
          { name: "Steel Ingot", rarity: "RARE", estimatedValue: 120 }
        ]
      }
    });

    setRustMarketData({
      currentRate: 186.45,
      change24h: -2.3,
      volume24h: 12.4,
      totalTrades: 67,
      totalTransactions: 156
    });

    // Mock dual-currency data
    setGameEconomyFlow({
      rustCirculation: {
        playerBalances: 45230,
        merchantFloat: 12500,
        tradingVelocity: 8940,
        burnedRust: 2340,
        totalMinted: 67890
      },
      solCirculation: {
        playerSOL: 12.456,
        directSOLTrades: 3.234,
        solAcceptingMerchants: 1.890,
        treasurySOL: 45.678
      },
      crossCurrencyFlow: {
        solToRustTrades: 8.234,
        rustToSolTrades: 2.456,
        preferenceShifts: {},
        arbitrageGaps: {}
      },
      totalEconomicValue: {
        rustEconomyUSD: 57730,
        solEconomyUSD: 11234,
        totalEconomyUSD: 68964,
        rustDominance: 0.837,
        solDominance: 0.163
      }
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number) => `${formatNumber(amount)} RUST`;

  const wealthChartData = economyData ? [
    { name: 'POOR', value: economyData.wealthDistribution.poor, color: '#ef4444' },
    { name: 'MIDDLE', value: economyData.wealthDistribution.middle, color: '#f59e0b' },
    { name: 'RICH', value: economyData.wealthDistribution.rich, color: '#10b981' }
  ] : [];

  const locationChartData = economyData ?
    economyData.playerActivity.topLocations.slice(0, 5).map(loc => ({
      name: loc.name.substring(0, 8),
      players: loc.player_count
    })) : [];

  return (
    <div className="w-full max-w-6xl mx-auto bg-background border border-primary/30 rounded-lg p-4 font-mono text-xs text-primary">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-primary font-bold">ECONOMIC OVERSIGHT SYSTEM v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 animate-pulse" />
          <span className="text-primary">MONITORING</span>
        </div>
      </div>

      {/* Core Economic Metrics */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">TOTAL WEALTH</div>
          <div className="text-primary text-lg font-bold">
            {economyData ? formatCurrency(economyData.totalWealth) : '--'}
          </div>
          <div className="text-muted-foreground text-xs">SYSTEM WIDE</div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">ACTIVE USERS</div>
          <div className="text-primary text-lg font-bold">
            {economyData ? economyData.totalCharacters : '--'}
          </div>
          <div className="text-muted-foreground text-xs">REGISTERED</div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">MARKET CAP</div>
          <div className="text-primary text-lg font-bold">
            {economyData ? formatCurrency(economyData.marketData.totalValue) : '--'}
          </div>
          <div className="text-muted-foreground text-xs">LISTINGS</div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">AVG WEALTH</div>
          <div className="text-primary text-lg font-bold">
            {economyData ? formatCurrency(economyData.avgWealth) : '--'}
          </div>
          <div className="text-muted-foreground text-xs">PER USER</div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">SOL/RUST</div>
          <div className="text-primary text-lg font-bold">
            {rustMarketData ? rustMarketData.currentRate.toFixed(2) : '--'}
          </div>
          <div className={`text-xs flex items-center gap-1 ${rustMarketData && rustMarketData.change24h >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {rustMarketData && rustMarketData.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {rustMarketData ? `${rustMarketData.change24h >= 0 ? '+' : ''}${rustMarketData.change24h.toFixed(2)}%` : '--'}
          </div>
        </div>
      </div>

      {/* Data Visualization Grid */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Wealth Distribution */}
        <div className="bg-muted/30 border border-primary/20 rounded p-4">
          <div className="text-muted-foreground text-xs mb-3">WEALTH DISTRIBUTION</div>
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Activity className="w-4 h-4 animate-spin mr-2" />
              ANALYZING...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={wealthChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={20}
                  outerRadius={50}
                  dataKey="value"
                >
                  {wealthChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(var(--primary))`} opacity={0.8 - index * 0.2} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="space-y-1 mt-2">
            {economyData && wealthChartData.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="text-primary">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Population Distribution */}
        <div className="bg-muted/30 border border-primary/20 rounded p-4">
          <div className="text-muted-foreground text-xs mb-3">POPULATION BY REGION</div>
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Activity className="w-4 h-4 animate-spin mr-2" />
              SCANNING...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={locationChartData}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis hide />
                <Bar
                  dataKey="players"
                  fill="hsl(var(--primary))"
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* System Health */}
        <div className="bg-muted/30 border border-primary/20 rounded p-4">
          <div className="text-muted-foreground text-xs mb-3">SYSTEM VITALS</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">ONLINE NOW</span>
              <span className="text-primary font-bold">
                {economyData ? economyData.playerActivity.onlineNow : '--'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <Zap className="w-3 h-3" />
                AVG ENERGY
              </span>
              <span className="text-primary font-bold">
                {economyData ? `${economyData.playerActivity.avgEnergy}%` : '--'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <Heart className="w-3 h-3" />
                AVG HEALTH
              </span>
              <span className="text-primary font-bold">
                {economyData ? `${economyData.playerActivity.avgHealth}%` : '--'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">AVG LEVEL</span>
              <span className="text-primary font-bold">
                {economyData ? economyData.playerActivity.avgLevel.toFixed(1) : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Market Intelligence */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Market Overview */}
        <div className="bg-muted/30 border border-primary/20 rounded p-4">
          <div className="text-muted-foreground text-xs mb-3">MARKET INTELLIGENCE</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">ACTIVE LISTINGS</span>
              <span className="text-primary">{economyData ? economyData.marketData.totalListings : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">AVG PRICE</span>
              <span className="text-primary">{economyData ? formatCurrency(economyData.marketData.avgPrice) : '--'}</span>
            </div>
            <div className="border-t border-primary/20 pt-2 mt-2">
              <div className="text-xs text-muted-foreground mb-1">HIGH VALUE TARGET</div>
              <div className="text-xs text-primary font-bold">
                {economyData ? economyData.marketData.mostExpensiveItem.name : '--'}
              </div>
              <div className="text-xs text-green-500">
                {economyData ? formatCurrency(economyData.marketData.mostExpensiveItem.price) : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Exchange Activity - Now with Dual Currency Data */}
        <div className="bg-muted/30 border border-primary/20 rounded p-4">
          <div className="text-muted-foreground text-xs mb-3">DUAL-CURRENCY ECONOMY</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">RUST CIRCULATION</span>
              <span className="text-primary">
                {gameEconomyFlow ? formatCurrency(gameEconomyFlow.rustCirculation.playerBalances) : '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">SOL IN GAME</span>
              <span className="text-primary">
                {gameEconomyFlow ? `${gameEconomyFlow.solCirculation.playerSOL.toFixed(3)} SOL` : '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">TOTAL ECONOMY</span>
              <span className="text-primary">
                {gameEconomyFlow ? `$${formatNumber(gameEconomyFlow.totalEconomicValue.totalEconomyUSD)}` : '--'}
              </span>
            </div>
            <div className="border-t border-primary/20 pt-2 mt-2">
              <div className="text-xs text-muted-foreground mb-1">CURRENCY DOMINANCE</div>
              <div className="text-xs">
                <span className="text-orange-500">RUST: {gameEconomyFlow ? `${(gameEconomyFlow.totalEconomicValue.rustDominance * 100).toFixed(1)}%` : '--'}</span>
                <span className="text-muted-foreground mx-1">|</span>
                <span className="text-blue-500">SOL: {gameEconomyFlow ? `${(gameEconomyFlow.totalEconomicValue.solDominance * 100).toFixed(1)}%` : '--'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Dual Currency Analytics Section */}
      {gameEconomyFlow && (
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* RUST Economy Health */}
          <div className="bg-muted/30 border border-primary/20 rounded p-4">
            <div className="text-muted-foreground text-xs mb-3">RUST ECONOMY</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">PLAYER BALANCES</span>
                <span className="text-primary">{formatCurrency(gameEconomyFlow.rustCirculation.playerBalances)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">NPC RESERVES</span>
                <span className="text-primary">{formatCurrency(gameEconomyFlow.rustCirculation.merchantFloat)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">TOTAL MINTED</span>
                <span className="text-primary">{formatCurrency(gameEconomyFlow.rustCirculation.totalMinted)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">BURNED</span>
                <span className="text-red-500">{formatCurrency(gameEconomyFlow.rustCirculation.burnedRust)}</span>
              </div>
            </div>
          </div>

          {/* SOL Economy Health */}
          <div className="bg-muted/30 border border-primary/20 rounded p-4">
            <div className="text-muted-foreground text-xs mb-3">SOL ECONOMY</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">PLAYER SOL</span>
                <span className="text-primary">{gameEconomyFlow.solCirculation.playerSOL.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">TREASURY SOL</span>
                <span className="text-primary">{gameEconomyFlow.solCirculation.treasurySOL.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">DIRECT TRADES</span>
                <span className="text-primary">{gameEconomyFlow.solCirculation.directSOLTrades.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">MERCHANT USE</span>
                <span className="text-primary">{gameEconomyFlow.solCirculation.solAcceptingMerchants.toFixed(3)} SOL</span>
              </div>
            </div>
          </div>

          {/* Cross-Currency Flow */}
          <div className="bg-muted/30 border border-primary/20 rounded p-4">
            <div className="text-muted-foreground text-xs mb-3">CURRENCY EXCHANGE</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">SOL→RUST</span>
                <span className="text-green-500">{gameEconomyFlow.crossCurrencyFlow.solToRustTrades.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">RUST→SOL</span>
                <span className="text-red-500">{gameEconomyFlow.crossCurrencyFlow.rustToSolTrades.toFixed(3)} SOL</span>
              </div>
              <div className="border-t border-primary/20 pt-2 mt-2">
                <div className="text-xs text-muted-foreground mb-1">EXCHANGE ACTIVITY</div>
                <div className="text-xs text-primary">
                  Net Flow: {((gameEconomyFlow.crossCurrencyFlow.solToRustTrades - gameEconomyFlow.crossCurrencyFlow.rustToSolTrades) >= 0 ? '+' : '')}{(gameEconomyFlow.crossCurrencyFlow.solToRustTrades - gameEconomyFlow.crossCurrencyFlow.rustToSolTrades).toFixed(3)} SOL
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resource Intelligence */}
      <div className="mb-4">
        <div className="text-muted-foreground text-xs mb-2">RESOURCE INTELLIGENCE</div>
        <div className="bg-muted/30 border border-primary/20 rounded p-2 max-h-24 overflow-y-auto">
          {economyData?.resources.mostValuable.slice(0, 5).map((resource, idx) => (
            <div key={idx} className="flex justify-between items-center py-1 border-b border-border/30 last:border-b-0">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">{resource.name}</span>
                <span className={`text-xs px-1 rounded ${resource.rarity === 'LEGENDARY' ? 'bg-yellow-500/20 text-yellow-600' :
                  resource.rarity === 'EPIC' ? 'bg-purple-500/20 text-purple-600' :
                    resource.rarity === 'RARE' ? 'bg-blue-500/20 text-blue-600' :
                      'bg-gray-500/20 text-gray-600'
                  }`}>
                  {resource.rarity}
                </span>
              </div>
              <div className="text-xs text-primary">{formatCurrency(resource.estimatedValue)}</div>
            </div>
          )) || <div className="text-muted-foreground text-xs">NO DATA AVAILABLE</div>}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-primary/20 pt-2 flex justify-between text-xs text-muted-foreground/60">
        <span>ECONOMIC_MONITOR_v2089 | DUAL_CURRENCY_ANALYTICS</span>
        <span>LAST_SCAN: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default EconomyView;
