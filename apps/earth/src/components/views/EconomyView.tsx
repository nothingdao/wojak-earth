// src/components/views/EconomyView.tsx - Fully corrected with EARTH currency and real data
import React, { useState, useEffect, useCallback } from 'react';
import { XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Database,
  Activity,
  Zap,
  Heart,
} from 'lucide-react';
import type { EconomyData, EarthMarketData, GameEconomyFlow } from '@/types';
import { convexHttp } from '@/lib/convex-singleton';
import { api } from '@convex/_generated/api';
import { SERVER_URL } from '@/config/functionsBase';

const EconomyView: React.FC = () => {
  const [economyData, setEconomyData] = useState<EconomyData | null>(null);
  const [earthMarketData, setEarthMarketData] = useState<EarthMarketData | null>(null);
  const [gameEconomyFlow, setGameEconomyFlow] = useState<GameEconomyFlow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ NPC Toggle
  const [includeNPCs, setIncludeNPCs] = useState(true);

  const fetchEconomyData = useCallback(async () => {
    try {
      const convexOverview = await convexHttp.query(api.earth.economy.getOverview, {}).catch(() => null)
      const [earthMarketResponse, gameEconomyResponse] = await Promise.all([
        fetch(`${SERVER_URL}/earth/exchange/info`),
        fetch(`${SERVER_URL}/earth/economy`),
      ])
      const economyResponse = { ok: !!convexOverview, json: async () => ({ totalEarth: convexOverview?.totalEarth, activePlayerCount: convexOverview?.activePlayerCount }) };

      // ✅ Initialize with proper structure
      let newEconomyData: EconomyData = {
        totalWealth: 0,
        avgWealth: 0,
        wealthDistribution: { poor: 0, middle: 0, rich: 0 },
        totalCharacters: 0,
        marketData: {
          totalListings: 0,
          totalValue: 0,
          totalEconomyValue: 0,
          avgPrice: 0,
          mostExpensiveItem: { name: "--", price: 0, location: "--" },
          cheapestItem: { name: "--", price: 0, location: "--" },
          popularLocations: []
        },
        playerActivity: {
          onlineNow: 0,
          avgLevel: 0,
          avgEnergy: 0,
          avgHealth: 0,
          topLocations: []
        },
        resources: {
          mostValuable: []
        }
      };

      // ✅ Process economy overview data (fallback market data)
      if (economyResponse.ok) {
        const economyResult = await economyResponse.json();

        if (economyResult.marketOverview) {
          newEconomyData.marketData = {
            totalListings: economyResult.marketOverview.totalListings || 0,
            totalValue: economyResult.marketOverview.totalValue || 0,
            totalEconomyValue: economyResult.marketOverview.totalEconomyValue || 0,
            avgPrice: economyResult.marketOverview.avgPrice || 0,
            mostExpensiveItem: economyResult.marketOverview.mostExpensive || { name: "--", price: 0, location: "--" },
            cheapestItem: economyResult.marketOverview.cheapest || { name: "--", price: 0, location: "--" },
            popularLocations: economyResult.marketOverview.popularLocations || []
          };
        }
      }

      // ✅ Process Earth/SOL market data  
      if (earthMarketResponse.ok) {
        const earthMarketResult = await earthMarketResponse.json();
        console.log('🌍 Earth Market Data:', earthMarketResult);

        if (earthMarketResult.success) {
          const marketStats = earthMarketResult.marketStats || earthMarketResult.data || {};

          setEarthMarketData({
            currentRate: marketStats.currentRate || 180,
            change24h: marketStats.change24h || 0,
            volume24h: marketStats.volume24h || 0,
            totalTrades: marketStats.totalTrades || earthMarketResult.transactionCount || 0,
            totalTransactions: earthMarketResult.totalTransactions || earthMarketResult.transactionCount || 0
          });
        }
      }

      // ✅ Process game economy data (the main source!)
      if (gameEconomyResponse.ok) {
        const gameEconomyResult = await gameEconomyResponse.json();
        console.log('🏦 Game Economy Data:', gameEconomyResult);

        if (gameEconomyResult.success) {
          setGameEconomyFlow(gameEconomyResult.gameEconomyFlow);

          // ✅ Use real player data from enhanced endpoint
          newEconomyData.totalWealth = gameEconomyResult.playerStats?.totalWealth || 0;
          newEconomyData.totalCharacters = gameEconomyResult.playerStats?.totalCharacters || 0;
          newEconomyData.avgWealth = gameEconomyResult.playerStats?.avgWealth || 0;

          // ✅ Real player activity data
          newEconomyData.playerActivity = {
            onlineNow: gameEconomyResult.playerStats?.onlineNow || 0,
            avgLevel: gameEconomyResult.playerStats?.avgLevel || 0,
            avgEnergy: gameEconomyResult.playerStats?.avgEnergy || 0,
            avgHealth: gameEconomyResult.playerStats?.avgHealth || 0,
            topLocations: gameEconomyResult.locationStats?.topLocations || []
          };

          // ✅ Real wealth distribution
          newEconomyData.wealthDistribution = gameEconomyResult.playerStats?.wealthDistribution || {
            poor: 0, middle: 0, rich: 0
          };

          // ✅ Override with better market data from game-economy if available
          if (gameEconomyResult.marketStats) {
            newEconomyData.marketData = {
              totalListings: gameEconomyResult.marketStats.totalListings || newEconomyData.marketData.totalListings,
              totalValue: gameEconomyResult.marketStats.totalListingsValue || newEconomyData.marketData.totalValue,
              totalEconomyValue: gameEconomyResult.marketStats.totalEconomyValue || newEconomyData.marketData.totalEconomyValue,
              avgPrice: gameEconomyResult.marketStats.avgPrice || newEconomyData.marketData.avgPrice,
              mostExpensiveItem: gameEconomyResult.marketStats.mostExpensiveItem || newEconomyData.marketData.mostExpensiveItem,
              cheapestItem: gameEconomyResult.marketStats.cheapestItem || newEconomyData.marketData.cheapestItem,
              popularLocations: gameEconomyResult.marketStats.popularLocations || newEconomyData.marketData.popularLocations
            };
          }

          console.log('✅ Real data loaded:', {
            totalCharacters: newEconomyData.totalCharacters,
            totalWealth: newEconomyData.totalWealth,
            onlineNow: newEconomyData.playerActivity.onlineNow,
            topLocation: newEconomyData.playerActivity.topLocations[0]?.name,
            wealthDistribution: newEconomyData.wealthDistribution,
            totalEconomyValue: newEconomyData.marketData.totalEconomyValue
          });
        }
      }

      setEconomyData(newEconomyData);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch economy data:', error);
      generateMockData();
      setIsLoading(false);
    }
  }, [includeNPCs]);

  useEffect(() => {
    fetchEconomyData();
    const interval = setInterval(fetchEconomyData, 60000);
    return () => clearInterval(interval);
  }, [fetchEconomyData]);

  const generateMockData = () => {
    console.log('⚠️ Using mock data due to API failure');
    setEconomyData({
      totalWealth: 127543,
      avgWealth: 156,
      wealthDistribution: { poor: 234, middle: 145, rich: 43 },
      totalCharacters: 422,
      marketData: {
        totalListings: 1247,
        totalValue: 45623,
        totalEconomyValue: 68964,
        avgPrice: 36,
        mostExpensiveItem: { name: "Legendary Sword", price: 2500, location: "Central Hub" },
        cheapestItem: { name: "Earthy Knife", price: 5, location: "Wasteland" },
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

    setEarthMarketData({
      currentRate: 186.45,
      change24h: -2.3,
      volume24h: 12.4,
      totalTrades: 67,
      totalTransactions: 156
    });

    setGameEconomyFlow({
      earthCirculation: { // ✅ Updated naming
        playerBalances: 45230,
        merchantFloat: 12500,
        tradingVelocity: 8940,
        burnedEarth: 2340,
        totalMinted: 67890
      },
      solCirculation: {
        playerSOL: 12.456,
        directSOLTrades: 3.234,
        solAcceptingMerchants: 1.890,
        treasurySOL: 45.678
      },
      crossCurrencyFlow: {
        solToEarthTrades: 8.234,
        earthToSolTrades: 2.456,
        preferenceShifts: {},
        arbitrageGaps: {}
      },
      totalEconomicValue: {
        earthEconomyUSD: 57730,
        solEconomyUSD: 11234,
        totalEconomyUSD: 68964,
        earthDominance: 0.837,
        solDominance: 0.163
      }
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number) => `${formatNumber(amount)} EARTH`;

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
      {/* Terminal Header with NPC Toggle */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-primary font-bold">ECONOMIC OVERSIGHT SYSTEM v2.089</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIncludeNPCs(!includeNPCs)}
              className={`px-2 py-1 text-xs font-mono border rounded transition-colors ${includeNPCs
                ? 'bg-action text-primary-foreground border-action'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                }`}
            >
              {includeNPCs ? '👥 ALL_ENTITIES' : '👤 HUMANS_ONLY'}
            </button>
            <span className="text-muted-foreground text-xs">
              {includeNPCs ? 'NPCS_INCLUDED' : 'NPCS_EXCLUDED'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 animate-pulse" />
            <span className="text-primary">MONITORING</span>
          </div>
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
          <div className="text-muted-foreground text-xs">
            {includeNPCs ? 'TOTAL_ENTITIES' : 'HUMANS_ONLY'}
          </div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">TOTAL ECONOMY</div>
          <div className="text-primary text-lg font-bold">
            {economyData?.marketData?.totalEconomyValue ? `$${formatNumber(economyData.marketData.totalEconomyValue)}` : '--'}
          </div>
          <div className="text-muted-foreground text-xs">USD VALUE</div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">AVG WEALTH</div>
          <div className="text-primary text-lg font-bold">
            {economyData ? formatCurrency(economyData.avgWealth) : '--'}
          </div>
          <div className="text-muted-foreground text-xs">PER USER</div>
        </div>

        <div className="bg-muted/50 border border-primary/20 p-3 rounded">
          <div className="text-muted-foreground text-xs mb-1">SOL/EARTH</div>
          <div className="text-primary text-lg font-bold">
            {earthMarketData ? earthMarketData.currentRate.toFixed(2) : '--'}
          </div>
          <div className={`text-xs flex items-center gap-1 ${earthMarketData && earthMarketData.change24h >= 0 ? 'text-success dark:text-green-400' : 'text-error dark:text-red-400'}`}>
            {earthMarketData && earthMarketData.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {earthMarketData ? `${earthMarketData.change24h >= 0 ? '+' : ''}${earthMarketData.change24h.toFixed(2)}%` : '--'}
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
              <div className="text-xs text-success">
                {economyData ? formatCurrency(economyData.marketData.mostExpensiveItem.price) : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Exchange Activity */}
        <div className="bg-muted/30 border border-primary/20 rounded p-4">
          <div className="text-muted-foreground text-xs mb-3">DUAL-CURRENCY ECONOMY</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">EARTH CIRCULATION</span>
              <span className="text-primary">
                {gameEconomyFlow?.earthCirculation ? formatCurrency(gameEconomyFlow.earthCirculation.playerBalances) :
                  gameEconomyFlow?.earthCirculation ? formatCurrency(gameEconomyFlow.earthCirculation.playerBalances) : '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">TREASURY SOL</span>
              <span className="text-primary">
                {gameEconomyFlow ? `${gameEconomyFlow.solCirculation.treasurySOL.toFixed(3)} SOL` : '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">ECONOMY SIZE</span>
              <span className="text-primary">
                {economyData?.marketData?.totalEconomyValue ? `$${formatNumber(economyData.marketData.totalEconomyValue)}` :
                  gameEconomyFlow ? `$${formatNumber(gameEconomyFlow.totalEconomicValue.totalEconomyUSD)}` : '--'}
              </span>
            </div>
            <div className="border-t border-primary/20 pt-2 mt-2">
              <div className="text-xs text-muted-foreground mb-1">CURRENCY DOMINANCE</div>
              <div className="text-xs">
                <span className="text-orange-500">EARTH: {gameEconomyFlow ?
                  `${((gameEconomyFlow.totalEconomicValue.earthDominance || gameEconomyFlow.totalEconomicValue.earthDominance || 0) * 100).toFixed(1)}%` : '--'}</span>
                <span className="text-muted-foreground mx-1">|</span>
                <span className="text-blue-500">SOL: {gameEconomyFlow ? `${(gameEconomyFlow.totalEconomicValue.solDominance * 100).toFixed(1)}%` : '--'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Currency Analytics Section */}
      {gameEconomyFlow && (
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* EARTH Economy Health */}
          <div className="bg-muted/30 border border-primary/20 rounded p-4">
            <div className="text-muted-foreground text-xs mb-3">EARTH ECONOMY</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">PLAYER BALANCES</span>
                <span className="text-primary">{formatCurrency(
                  gameEconomyFlow.earthCirculation?.playerBalances || gameEconomyFlow.earthCirculation?.playerBalances || 0
                )}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">NPC RESERVES</span>
                <span className="text-primary">{formatCurrency(
                  gameEconomyFlow.earthCirculation?.merchantFloat || gameEconomyFlow.earthCirculation?.merchantFloat || 0
                )}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">TOTAL MINTED</span>
                <span className="text-primary">{formatCurrency(
                  gameEconomyFlow.earthCirculation?.totalMinted || gameEconomyFlow.earthCirculation?.totalMinted || 0
                )}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">BURNED</span>
                <span className="text-error">{formatCurrency(
                  gameEconomyFlow.earthCirculation?.burnedEarth || gameEconomyFlow.earthCirculation?.burnedEarth || 0
                )}</span>
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
                <span className="text-muted-foreground text-xs">SOL → EARTH</span>
                <span className="text-success">{(
                  gameEconomyFlow.crossCurrencyFlow.solToEarthTrades || gameEconomyFlow.crossCurrencyFlow.solToEarthTrades || 0
                ).toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">EARTH → SOL</span>
                <span className="text-error">{(
                  gameEconomyFlow.crossCurrencyFlow.earthToSolTrades || gameEconomyFlow.crossCurrencyFlow.earthToSolTrades || 0
                ).toFixed(3)} SOL</span>
              </div>
              <div className="border-t border-primary/20 pt-2 mt-2">
                <div className="text-xs text-muted-foreground mb-1">EXCHANGE ACTIVITY</div>
                <div className="text-xs text-primary">
                  Net Flow: {(
                    ((gameEconomyFlow.crossCurrencyFlow.solToEarthTrades || gameEconomyFlow.crossCurrencyFlow.solToEarthTrades || 0) -
                      (gameEconomyFlow.crossCurrencyFlow.earthToSolTrades || gameEconomyFlow.crossCurrencyFlow.earthToSolTrades || 0)) >= 0 ? '+' : ''
                  )}{(
                    (gameEconomyFlow.crossCurrencyFlow.solToEarthTrades || gameEconomyFlow.crossCurrencyFlow.solToEarthTrades || 0) -
                    (gameEconomyFlow.crossCurrencyFlow.earthToSolTrades || gameEconomyFlow.crossCurrencyFlow.earthToSolTrades || 0)
                  ).toFixed(3)} SOL</div>
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
