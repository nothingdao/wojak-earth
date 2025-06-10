// netlify/functions/game-economy.ts - Dual Currency Economic Analytics

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * WASTELAND DUAL-CURRENCY ECONOMIC SYSTEM
 *
 * CORE CONCEPT:
 * We operate a realistic dual-currency economy similar to countries that accept both
 * local fiat and foreign crypto. Players can use either RUST (our game fiat) or SOL
 * (real crypto) depending on merchant preferences and player choice.
 *
 * CURRENCY ROLES:
 * - RUST: Primary game currency, stable value (1 RUST = 1 USDC), universal acceptance
 * - SOL: Alternative currency, volatile value, selective acceptance, real crypto
 *
 * REAL WORLD ANALOGY:
 * Like a country where you can pay with local currency (RUST) or Bitcoin (SOL).
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
    // Get current SOL/USDC rate for economic calculations
    const currentSOLPrice = await getCurrentSOLPrice()

    // Analyze the dual-currency economy
    const gameEconomyFlow = await analyzeGameEconomy(currentSOLPrice)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        economicSystem: 'DUAL_CURRENCY_MODEL',
        timestamp: new Date().toISOString(),
        solUsdcRate: currentSOLPrice,
        gameEconomyFlow,
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

async function analyzeGameEconomy(currentSOLPrice: number) {
  // RUST CIRCULATION ANALYSIS
  const rustCirculation = {
    // Total RUST held by all players (excludes NPCs and system accounts)
    playerBalances: await getRustInWallets(),

    // RUST held by NPCs for making change, rewards, etc (merchant cash registers)
    merchantFloat: await getRustInNPCRegisters(),

    // How fast RUST moves through the economy (transactions per day)
    tradingVelocity: await getRustTransactionVolume(),

    // RUST that has been burned through purchases (removed from circulation)
    burnedRust: await getTotalRustBurned(),

    // Total RUST ever minted through SOL trades
    totalMinted: await getTotalRustMinted(),
  }

  // SOL CIRCULATION ANALYSIS
  const solCirculation = {
    // SOL balances held by players in-game (not in treasury)
    playerSOL: await getSOLInGameWallets(),

    // Direct SOL-for-goods transactions (bypassing RUST entirely)
    directSOLTrades: await getSOLToSOLTransactions(),

    // Volume of SOL accepted by merchants for purchases
    solAcceptingMerchants: await getSOLTransactionVolume(),

    // SOL held in treasury backing RUST
    treasurySOL: await getTreasurySOLReserves(),
  }

  // CROSS-CURRENCY FLOW ANALYSIS
  const crossCurrencyFlow = {
    // SOL → RUST exchanges via trading terminal
    solToRustTrades: await getExchangeVolume('SOL_TO_RUST'),

    // RUST → SOL exchanges via trading terminal
    rustToSolTrades: await getExchangeVolume('RUST_TO_SOL'),

    // Are players preferring RUST or SOL for purchases over time?
    preferenceShifts: await getCurrencyUsagePatterns(),

    // Arbitrage opportunities between direct SOL use vs exchange
    arbitrageGaps: await calculateArbitrageOpportunities(currentSOLPrice),
  }

  return {
    rustCirculation,
    solCirculation,
    crossCurrencyFlow,
    totalEconomicValue: calculateTotalEconomicValue(
      rustCirculation,
      solCirculation,
      currentSOLPrice
    ),
  }
}

// RUST CIRCULATION FUNCTIONS
async function getRustInWallets(): Promise<number> {
  const { data } = await supabase
    .from('characters')
    .select('coins')
    .neq('character_type', 'NPC') // Exclude NPCs

  return data?.reduce((sum, char) => sum + (char.coins || 0), 0) || 0
}

async function getRustInNPCRegisters(): Promise<number> {
  const { data } = await supabase
    .from('characters')
    .select('coins')
    .eq('character_type', 'NPC')

  return data?.reduce((sum, npc) => sum + (npc.coins || 0), 0) || 0
}

async function getRustTransactionVolume(): Promise<number> {
  const { data } = await supabase
    .from('transactions')
    .select('from_units, to_units')
    .or('from_vault.eq.RUST_COIN,to_vault.eq.RUST_COIN')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  return (
    data?.reduce((sum, tx) => {
      return sum + (tx.from_vault === 'RUST_COIN' ? tx.from_units : tx.to_units)
    }, 0) || 0
  )
}

async function getTotalRustBurned(): Promise<number> {
  // RUST spent on game items (leaves circulation permanently)
  const { data } = await supabase
    .from('transactions')
    .select('from_units')
    .eq('from_vault', 'RUST_COIN')
    .eq('type', 'PURCHASE') // Assuming you have purchase transactions

  return data?.reduce((sum, tx) => sum + tx.from_units, 0) || 0
}

async function getTotalRustMinted(): Promise<number> {
  // RUST created through SOL exchanges
  const { data } = await supabase
    .from('transactions')
    .select('to_units')
    .eq('to_vault', 'RUST_COIN')
    .eq('type', 'EXCHANGE')

  return data?.reduce((sum, tx) => sum + tx.to_units, 0) || 0
}

// SOL CIRCULATION FUNCTIONS
async function getSOLInGameWallets(): Promise<number> {
  // This would need a sol_balance column in characters table
  const { data } = await supabase
    .from('characters')
    .select('sol_balance')
    .neq('character_type', 'NPC')

  return data?.reduce((sum, char) => sum + (char.sol_balance || 0), 0) || 0
}

async function getSOLToSOLTransactions(): Promise<number> {
  // Direct SOL trades between players or SOL purchases
  const { data } = await supabase
    .from('transactions')
    .select('from_units')
    .eq('from_vault', 'SCRAP_SOL')
    .neq('type', 'EXCHANGE') // Exclude SOL→RUST exchanges
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  return data?.reduce((sum, tx) => sum + tx.from_units, 0) || 0
}

async function getSOLTransactionVolume(): Promise<number> {
  // All SOL movement in 24h
  const { data } = await supabase
    .from('transactions')
    .select('from_units, to_units')
    .or('from_vault.eq.SCRAP_SOL,to_vault.eq.SCRAP_SOL')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  return (
    data?.reduce((sum, tx) => {
      return sum + (tx.from_vault === 'SCRAP_SOL' ? tx.from_units : tx.to_units)
    }, 0) || 0
  )
}

async function getTreasurySOLReserves(): Promise<number> {
  // This would be your actual treasury wallet balance
  // For now, calculate from exchange transactions
  const { data } = await supabase
    .from('transactions')
    .select('from_units, to_units, from_vault')
    .eq('type', 'EXCHANGE')

  let treasuryBalance = 0
  data?.forEach((tx) => {
    if (tx.from_vault === 'SCRAP_SOL') {
      treasuryBalance += tx.from_units // SOL came in
    } else {
      treasuryBalance -= tx.to_units // SOL went out
    }
  })

  return Math.max(treasuryBalance, 0)
}

// CROSS-CURRENCY FUNCTIONS
async function getExchangeVolume(
  direction: 'SOL_TO_RUST' | 'RUST_TO_SOL'
): Promise<number> {
  const isSOLToRust = direction === 'SOL_TO_RUST'

  const { data } = await supabase
    .from('transactions')
    .select('from_units')
    .eq('type', 'EXCHANGE')
    .eq('from_vault', isSOLToRust ? 'SCRAP_SOL' : 'RUST_COIN')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  return data?.reduce((sum, tx) => sum + tx.from_units, 0) || 0
}

async function getCurrencyUsagePatterns(): Promise<any> {
  // Analyze whether players are increasingly using SOL vs RUST
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const recentRustUsage = await getRustTransactionVolume()
  const recentSOLUsage = await getSOLTransactionVolume()

  // Calculate weekly averages for comparison
  const { data: weekData } = await supabase
    .from('transactions')
    .select('from_vault, from_units')
    .gte('created_at', weekAgo.toISOString())
    .lt('created_at', yesterday.toISOString())

  const weeklyRustAvg =
    weekData
      ?.filter((tx) => tx.from_vault === 'RUST_COIN')
      .reduce((sum, tx) => sum + tx.from_units, 0) / 7 || 0

  const weeklySOLAvg =
    weekData
      ?.filter((tx) => tx.from_vault === 'SCRAP_SOL')
      .reduce((sum, tx) => sum + tx.from_units, 0) / 7 || 0

  return {
    rustPreference: {
      recent24h: recentRustUsage,
      weeklyAverage: weeklyRustAvg,
      trend: recentRustUsage > weeklyRustAvg ? 'INCREASING' : 'DECREASING',
    },
    solPreference: {
      recent24h: recentSOLUsage,
      weeklyAverage: weeklySOLAvg,
      trend: recentSOLUsage > weeklySOLAvg ? 'INCREASING' : 'DECREASING',
    },
  }
}

async function calculateArbitrageOpportunities(
  currentSOLPrice: number
): Promise<any> {
  // Compare direct SOL spending vs SOL→RUST→purchase paths
  return {
    directSOLValue: currentSOLPrice,
    rustExchangeRate: currentSOLPrice, // 1 SOL gets currentSOLPrice RUST
    arbitrageSpread: 0, // In a perfect peg, should be minimal
    opportunityExists: false,
  }
}

function calculateTotalEconomicValue(
  rustCirc: any,
  solCirc: any,
  solPrice: number
): any {
  const totalRustValue = (rustCirc.playerBalances + rustCirc.merchantFloat) * 1 // USDC value
  const totalSOLValue = (solCirc.playerSOL + solCirc.treasurySOL) * solPrice

  return {
    rustEconomyUSD: totalRustValue,
    solEconomyUSD: totalSOLValue,
    totalEconomyUSD: totalRustValue + totalSOLValue,
    rustDominance: totalRustValue / (totalRustValue + totalSOLValue),
    solDominance: totalSOLValue / (totalRustValue + totalSOLValue),
  }
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
      'Players can use either RUST (game fiat) or SOL (real crypto) for transactions',
    currencies: {
      RUST: {
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
      rustSupply: 'CONTROLLED_BY_SOL_TRADING',
      solSupply: 'CONTROLLED_BY_PLAYER_DEPOSITS',
      exchangeRate: 'DETERMINED_BY_SOL_USD_ORACLE',
      reserveRequirement: 'FULL_SOL_BACKING_FOR_RUST',
    },
  }
}

function generateEconomicInsights(economyData: any, solPrice: number): any {
  const rustCirc = economyData.rustCirculation
  const solCirc = economyData.solCirculation
  const crossFlow = economyData.crossCurrencyFlow

  return {
    monetaryHealth: {
      rustCirculation: rustCirc.playerBalances,
      solBacking: solCirc.treasurySOL * solPrice,
      backingRatio: (solCirc.treasurySOL * solPrice) / rustCirc.totalMinted,
      status:
        solCirc.treasurySOL * solPrice >= rustCirc.totalMinted
          ? 'FULLY_BACKED'
          : 'UNDER_BACKED',
    },
    currencyUsage: {
      rustDominance: economyData.totalEconomicValue.rustDominance,
      solUsage: economyData.totalEconomicValue.solDominance,
      exchangeActivity: crossFlow.solToRustTrades + crossFlow.rustToSolTrades,
      directSOLUsage: solCirc.directSOLTrades,
    },
    economicTrends: {
      rustVelocity: rustCirc.tradingVelocity / rustCirc.playerBalances,
      monetaryExpansion: rustCirc.totalMinted - rustCirc.burnedRust,
      currencyPreferences: crossFlow.preferenceShifts,
    },
  }
}
