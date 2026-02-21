// netlify/functions/game-economy.ts - Enhanced with Real Data

import supabaseAdmin from '../../src/utils/supabase-admin'

const supabase = supabaseAdmin

/**
 * WASTELAND DUAL-CURRENCY ECONOMIC SYSTEM
 *
 * CORE CONCEPT:
 * We operate a realistic dual-currency economy similar to countries that accept both
 * local fiat and foreign crypto. Players can use either EARTH (our game fiat) or SOL
 * (real crypto) depending on merchant preferences and player choice.
 *
 * CURRENCY ROLES:
 * - EARTH: Primary game currency, stable value (1 EARTH = 1 USDC), universal acceptance
 * - SOL: Alternative currency, volatile value, selective acceptance, real crypto
 *
 * REAL WORLD ANALOGY:
 * Like a country where you can pay with local currency (EARTH) or Bitcoin (SOL).
 * Some vendors only take local currency, others accept both, creates natural dynamics.
 */

export const handler = async (event: any, context: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    console.log('🏦 Starting dual-currency economy analysis...')

    // ✅ NEW: Check for NPC inclusion parameter
    const includeNPCs = event.queryStringParameters?.includeNPCs === 'true'
    console.log(
      `📊 Analysis mode: ${includeNPCs ? 'ALL_ENTITIES' : 'HUMANS_ONLY'}`
    )

    // Get current SOL/USDC rate for economic calculations
    const currentSOLPrice = await getCurrentSOLPrice()

    // ✅ NEW: Pass NPC toggle to analysis functions
    const playerStats = await getPlayerVitalStats(includeNPCs)
    const locationStats = await getLocationPopulations(includeNPCs)
    const marketStats = await getMarketOverview()

    // Analyze the dual-currency economy
    const gameEconomyFlow = await analyzeGameEconomy(currentSOLPrice)

    console.log('✅ Economic analysis complete:', {
      playerStats: playerStats.totalCharacters,
      locationStats: locationStats.topLocations.length,
      marketStats: marketStats.totalListings,
      includeNPCs,
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        economicSystem: 'DUAL_CURRENCY_MODEL',
        timestamp: new Date().toISOString(),
        solUsdcRate: currentSOLPrice,
        gameEconomyFlow,

        // ✅ Add analysis mode info
        analysisMode: {
          includeNPCs,
          description: includeNPCs
            ? 'All entities (humans + NPCs)'
            : 'Human players only',
        },

        // ✅ Add the "Big 4" real data
        playerStats,
        locationStats,
        marketStats,

        documentation: getEconomicDocumentation(),
        insights: generateEconomicInsights(gameEconomyFlow, currentSOLPrice),
      }),
    }
  } catch (error) {
    console.error('Game economy analysis error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to analyze game economy',
        message: error.message,
      }),
    }
  }
}

// ✅ UPDATED: Real Player Vital Statistics with NPC toggle
async function getPlayerVitalStats(includeNPCs: boolean = false): Promise<any> {
  console.log(
    `📊 Analyzing player vital statistics... (NPCs: ${
      includeNPCs ? 'INCLUDED' : 'EXCLUDED'
    })`
  )

  const query = supabase
    .from('characters')
    .select(
      'earth, level, energy, health, updated_at, current_location_id, character_type'
    )

  // ✅ Filter based on NPC toggle
  const { data: characters, error } = includeNPCs
    ? await query // Include all characters
    : await query.neq('character_type', 'NPC') // Exclude NPCs

  if (error) {
    console.error('Error fetching characters:', error)
    throw error
  }

  const totalCharacters = characters?.length || 0

  if (totalCharacters === 0) {
    return {
      totalCharacters: 0,
      onlineNow: 0,
      avgLevel: 0,
      avgEnergy: 0,
      avgHealth: 0,
      avgWealth: 0,
      totalWealth: 0,
      wealthDistribution: { poor: 0, middle: 0, rich: 0 },
      entityBreakdown: includeNPCs ? { humans: 0, npcs: 0 } : { humans: 0 },
    }
  }

  // Calculate recently active (updated in last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentlyActive = characters.filter(
    (c) => new Date(c.updated_at) > oneHourAgo
  ).length

  // Calculate averages
  const avgLevel =
    characters.reduce((sum, c) => sum + (c.level || 0), 0) / totalCharacters
  const avgEnergy =
    characters.reduce((sum, c) => sum + (c.energy || 0), 0) / totalCharacters
  const avgHealth =
    characters.reduce((sum, c) => sum + (c.health || 0), 0) / totalCharacters
  const totalWealth = characters.reduce((sum, c) => sum + (c.earth || 0), 0)
  const avgWealth = totalWealth / totalCharacters

  // Calculate wealth distribution
  const wealthDistribution = {
    poor: characters.filter((c) => (c.earth || 0) < 100).length,
    middle: characters.filter(
      (c) => (c.earth || 0) >= 100 && (c.earth || 0) <= 1000
    ).length,
    rich: characters.filter((c) => (c.earth || 0) > 1000).length,
  }

  // ✅ NEW: Entity breakdown for transparency
  const entityBreakdown = includeNPCs
    ? {
        humans: characters.filter((c) => c.character_type !== 'NPC').length,
        npcs: characters.filter((c) => c.character_type === 'NPC').length,
      }
    : {
        humans: totalCharacters,
      }

  console.log('✅ Player stats calculated:', {
    totalCharacters,
    recentlyActive,
    avgWealth: Math.round(avgWealth),
    wealthDistribution,
    entityBreakdown,
  })

  return {
    totalCharacters,
    onlineNow: recentlyActive,
    avgLevel: Math.round(avgLevel * 10) / 10,
    avgEnergy: Math.round(avgEnergy),
    avgHealth: Math.round(avgHealth),
    avgWealth: Math.round(avgWealth),
    totalWealth: Math.round(totalWealth),
    wealthDistribution,
    entityBreakdown, // ✅ NEW: Show human/NPC breakdown
  }
}

// ✅ UPDATED: Real Location Population Analysis with NPC toggle
async function getLocationPopulations(
  includeNPCs: boolean = false
): Promise<any> {
  console.log(
    `🗺️ Analyzing location populations... (NPCs: ${
      includeNPCs ? 'INCLUDED' : 'EXCLUDED'
    })`
  )

  const { data: locations, error: locError } = await supabase
    .from('locations')
    .select('id, name, has_market, has_mining, has_chat')

  if (locError) {
    console.error('Error fetching locations:', locError)
    throw locError
  }

  const query = supabase
    .from('characters')
    .select('current_location_id, character_type')

  // ✅ Filter based on NPC toggle
  const { data: characters, error: charError } = includeNPCs
    ? await query // Include all characters
    : await query.neq('character_type', 'NPC') // Exclude NPCs

  if (charError) {
    console.error('Error fetching character locations:', charError)
    throw charError
  }

  // Count characters by location
  const locationCounts: Record<string, number> = {}
  characters?.forEach((char) => {
    const locId = char.current_location_id
    if (locId) {
      locationCounts[locId] = (locationCounts[locId] || 0) + 1
    }
  })

  // Combine location data with character counts
  const topLocations =
    locations
      ?.map((loc) => ({
        id: loc.id,
        name: loc.name,
        player_count: locationCounts[loc.id] || 0,
        has_market: loc.has_market,
        has_mining: loc.has_mining,
        has_chat: loc.has_chat,
      }))
      .sort((a, b) => b.player_count - a.player_count)
      .slice(0, 10) || []

  console.log('✅ Location stats calculated:', {
    totalLocations: locations?.length || 0,
    populatedLocations: topLocations.filter((l) => l.player_count > 0).length,
    topLocation: topLocations[0]?.name,
    includeNPCs,
  })

  return { topLocations }
}

// ✅ UPDATED: Enhanced market overview with true economy size
async function getMarketOverview(): Promise<any> {
  console.log('💰 Analyzing market overview...')

  const { data: marketListings, error: marketError } = await supabase.from(
    'market_listings'
  ).select(`
      id,
      price,
      quantity,
      location_id,
      item:items(name, rarity),
      location:locations(name)
    `)

  if (marketError) {
    console.error('Error fetching market listings:', marketError)
    throw marketError
  }

  // Calculate market listings value (what was previously "market cap")
  const totalListingsValue =
    marketListings?.reduce(
      (sum, listing) => sum + listing.price * listing.quantity,
      0
    ) || 0

  // Get current SOL price for economy calculation
  const currentSOLPrice = await getCurrentSOLPrice()

  // ✅ NEW: Calculate true total economy size
  const totalEconomyValue = await calculateTotalEconomicValue(currentSOLPrice)

  if (!marketListings || marketListings.length === 0) {
    return {
      totalListings: 0,
      totalListingsValue: 0,
      totalEconomyValue, // ✅ NEW: True economy size
      avgPrice: 0,
      mostExpensiveItem: { name: '--', price: 0, location: '--' },
      cheapestItem: { name: '--', price: 0, location: '--' },
      popularLocations: [],
    }
  }

  // Calculate market statistics
  const totalListings = marketListings.length
  const avgPrice =
    marketListings.reduce((sum, listing) => sum + listing.price, 0) /
    totalListings

  // Find most/least expensive items
  const sortedByPrice = [...marketListings].sort((a, b) => b.price - a.price)
  const mostExpensiveItem = {
    name: sortedByPrice[0]?.item?.name || '--',
    price: sortedByPrice[0]?.price || 0,
    location: sortedByPrice[0]?.location?.name || '--',
  }
  const cheapestItem = {
    name: sortedByPrice[sortedByPrice.length - 1]?.item?.name || '--',
    price: sortedByPrice[sortedByPrice.length - 1]?.price || 0,
    location: sortedByPrice[sortedByPrice.length - 1]?.location?.name || '--',
  }

  // Calculate popular market locations
  const locationCounts: Record<string, number> = {}
  marketListings.forEach((listing) => {
    const locName = listing.location?.name
    if (locName) {
      locationCounts[locName] = (locationCounts[locName] || 0) + 1
    }
  })

  const popularLocations = Object.entries(locationCounts)
    .map(([name, listings]) => ({ name, listings }))
    .sort((a, b) => b.listings - a.listings)
    .slice(0, 5)

  console.log('✅ Market stats calculated:', {
    totalListings,
    totalListingsValue: Math.round(totalListingsValue),
    totalEconomyValue: Math.round(totalEconomyValue),
    avgPrice: Math.round(avgPrice),
    mostExpensive: mostExpensiveItem.name,
  })

  return {
    totalListings,
    totalListingsValue: Math.round(totalListingsValue), // Old "market cap"
    totalEconomyValue: Math.round(totalEconomyValue), // ✅ NEW: True economy size
    avgPrice: Math.round(avgPrice),
    mostExpensiveItem,
    cheapestItem,
    popularLocations,
  }
}

// ✅ SIMPLIFIED: Remove complex cross-currency calculations for now
async function analyzeGameEconomy(currentSOLPrice: number) {
  // EARTH CIRCULATION ANALYSIS (simplified)
  const earthCirculation = {
    // Total EARTH held by all players
    playerBalances: await getEarthInWallets(),
    // EARTH held by NPCs
    merchantFloat: await getEarthInNPCRegisters(),
    // Simplified - remove complex transaction tracking for now
    tradingVelocity: 0,
    burnedEarth: 0,
    totalMinted: 0,
  }

  // SOL CIRCULATION ANALYSIS (simplified)
  const solCirculation = {
    // Real treasury SOL from actual wallet
    treasurySOL: await getTreasurySOLReserves(),
    // Simplified - remove complex tracking for now
    playerSOL: 0,
    directSOLTrades: 0,
    solAcceptingMerchants: 0,
  }

  // CROSS-CURRENCY FLOW ANALYSIS (simplified)
  const crossCurrencyFlow = {
    // Simplified - remove complex exchange tracking for now
    solToEarthTrades: 0,
    earthToSolTrades: 0,
    preferenceShifts: {},
    arbitrageGaps: {},
  }

  // Calculate real total economic value
  const totalEconomicValue = await calculateTotalEconomicValue(currentSOLPrice)

  return {
    earthCirculation, // ✅ Updated naming
    solCirculation,
    crossCurrencyFlow,
    totalEconomicValue: {
      totalEconomyUSD: totalEconomicValue,
      earthEconomyUSD:
        earthCirculation.playerBalances + earthCirculation.merchantFloat,
      solEconomyUSD: solCirculation.treasurySOL * currentSOLPrice,
      earthDominance:
        (earthCirculation.playerBalances + earthCirculation.merchantFloat) /
        totalEconomicValue,
      solDominance:
        (solCirculation.treasurySOL * currentSOLPrice) / totalEconomicValue,
    },
  }
}

// ✅ RENAMED: Earth circulation functions
async function getEarthInWallets(): Promise<number> {
  const { data } = await supabase
    .from('characters')
    .select('earth')
    .neq('character_type', 'NPC')

  return data?.reduce((sum, char) => sum + (char.earth || 0), 0) || 0
}

async function getEarthInNPCRegisters(): Promise<number> {
  const { data } = await supabase
    .from('characters')
    .select('earth')
    .eq('character_type', 'NPC')

  return data?.reduce((sum, npc) => sum + (npc.earth || 0), 0) || 0
}

// ✅ UPDATED: Get real SOL balance from actual treasury wallet
async function getTreasurySOLReserves(): Promise<number> {
  // Your actual treasury wallet address
  const TREASURY_WALLET = process.env.TREASURY_WALLET_ADDRESS

  if (!TREASURY_WALLET) {
    console.warn('⚠️ No treasury wallet address configured, using fallback')
    return 0
  }

  try {
    console.log(
      `🏦 Checking real treasury balance for: ${TREASURY_WALLET.slice(0, 8)}...`
    )

    // Query actual Solana blockchain for wallet balance
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [TREASURY_WALLET],
      }),
    })

    if (!response.ok) {
      throw new Error(`Solana RPC error: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`Solana RPC error: ${data.error.message}`)
    }

    // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
    const solBalance = data.result.value / 1000000000

    console.log(`✅ Real treasury balance: ${solBalance.toFixed(6)} SOL`)
    return solBalance
  } catch (error) {
    console.error('❌ Failed to get treasury balance:', error)

    // Fallback to environment variable if blockchain query fails
    const fallbackBalance = parseFloat(process.env.TREASURY_SOL_FALLBACK || '0')
    console.log(`🔄 Using fallback balance: ${fallbackBalance} SOL`)
    return fallbackBalance
  }
}

// ✅ UPDATED: Simplified total economic value calculation
async function calculateTotalEconomicValue(
  currentSOLPrice: number
): Promise<number> {
  // Get total EARTH in circulation (all characters)
  const { data: allCharacters } = await supabase
    .from('characters')
    .select('earth')

  const totalEarthInCirculation =
    allCharacters?.reduce((sum, char) => sum + (char.earth || 0), 0) || 0

  // Get real treasury SOL backing
  const treasurySOL = await getTreasurySOLReserves()

  // Calculate total economy value in USD
  const earthValueUSD = totalEarthInCirculation * 1 // 1 EARTH = 1 USD (stable)
  const solValueUSD = treasurySOL * currentSOLPrice

  console.log('💰 Economic calculation (REAL WALLET):', {
    totalEarthInCirculation,
    treasurySOL: `${treasurySOL.toFixed(6)} SOL`,
    treasurySOLUSD: `$${solValueUSD.toFixed(2)}`,
    earthValueUSD: `$${earthValueUSD.toFixed(2)}`,
    totalEconomyUSD: `$${(earthValueUSD + solValueUSD).toFixed(2)}`,
    economyBacking: `${(
      (solValueUSD / (earthValueUSD + solValueUSD)) *
      100
    ).toFixed(1)}% SOL`,
  })

  return earthValueUSD + solValueUSD
}

async function getCurrentSOLPrice(): Promise<number> {
  // Reuse price fetching logic from your other endpoint
  try {
    const response = await fetch(
      'https://quote-api.jup.ag/v6/quote?' +
        new URLSearchParams({
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          amount: '1000000000',
          slippageBps: '50',
        })
    )

    if (response.ok) {
      const data = await response.json()
      return data.outAmount ? parseInt(data.outAmount) / 1000000 : 150
    }
  } catch (error) {
    console.warn('Price fetch failed, using fallback')
  }

  return 150 // Fallback
}

function getEconomicDocumentation(): any {
  return {
    systemType: 'DUAL_CURRENCY_ECONOMY',
    description:
      'Players can use either EARTH (game currency) or SOL (real crypto) for transactions',
    currencies: {
      EARTH: {
        role: 'PRIMARY_GAME_CURRENCY',
        stability: 'PEGGED_TO_USDC',
        acceptance: 'UNIVERSAL',
        backing: 'SOL_RESERVES',
        characteristics: ['stable_value', 'instant_transfers', 'zero_gas_fees'],
      },
      SOL: {
        role: 'ALTERNATIVE_CURRENCY',
        stability: 'MARKET_VOLATILE',
        acceptance: 'MERCHANT_CHOICE',
        backing: 'REAL_CRYPTO_ASSET',
        characteristics: ['price_volatile', 'real_world_value', 'direct_usage'],
      },
    },
    realWorldAnalogy:
      'Like a country that accepts both local currency and Bitcoin',
    economicDynamics: [
      'Players hoard SOL if expecting price appreciation',
      'Merchants choose which currencies to accept',
      'Natural arbitrage opportunities emerge',
      'Currency preferences drive exchange demand',
      'Some transactions bypass exchange entirely',
    ],
    monetaryPolicy: {
      earthSupply: 'CONTROLLED_BY_SOL_TRADING',
      solSupply: 'CONTROLLED_BY_PLAYER_DEPOSITS',
      exchangeRate: 'DETERMINED_BY_SOL_USD_ORACLE',
      reserveRequirement: 'FULL_SOL_BACKING_FOR_EARTH',
    },
  }
}

// 🔧 Fix 3: Update generateEconomicInsights to handle new structure
function generateEconomicInsights(economyData: any, solPrice: number): any {
  const earthCirc = economyData.earthCirculation
  const solCirc = economyData.solCirculation
  const crossFlow = economyData.crossCurrencyFlow

  return {
    monetaryHealth: {
      earthCirculation: earthCirc.playerBalances,
      solBacking: solCirc.treasurySOL * solPrice,
      backingRatio:
        earthCirc.totalMinted > 0
          ? (solCirc.treasurySOL * solPrice) / earthCirc.totalMinted
          : 0,
      status:
        solCirc.treasurySOL * solPrice >= earthCirc.totalMinted
          ? 'FULLY_BACKED'
          : 'UNDER_BACKED',
    },
    currencyUsage: {
      // ✅ FIX: Use the new totalEconomicValue structure
      earthDominance: economyData.totalEconomicValue.earthDominance || 0,
      solUsage: economyData.totalEconomicValue.solDominance || 0,
      exchangeActivity: crossFlow.solToEarthTrades + crossFlow.earthToSolTrades,
      directSOLUsage: solCirc.directSOLTrades,
    },
    economicTrends: {
      earthVelocity:
        earthCirc.playerBalances > 0
          ? earthCirc.tradingVelocity / earthCirc.playerBalances
          : 0,
      monetaryExpansion: earthCirc.totalMinted - earthCirc.burnedEarth,
      currencyPreferences: crossFlow.preferenceShifts,
    },
  }
}
