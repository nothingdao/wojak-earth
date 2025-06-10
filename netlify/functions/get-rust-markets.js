// netlify/functions/get-rust-markets.js - Real wasteland blockchain market data
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Get recent exchange transactions with blockchain fields
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        created_at,
        from_vault,
        to_vault,
        from_units,
        to_units,
        exchange_flux,
        wasteland_block,
        txn_shard,
        sender_shard,
        receiver_shard
      `)
      .eq('type', 'EXCHANGE')
      .not('exchange_flux', 'is', null)
      .order('wasteland_block', { ascending: false })
      .limit(100)

    if (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }

    // Process data into market statistics
    const marketStats = processMarketData(transactions || [])

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transactions: transactions || [],
        marketStats,
        timestamp: new Date().toISOString(),
        totalTransactions: transactions?.length || 0
      })
    }

  } catch (error) {
    console.error('Get rust markets error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch market data',
        message: error.message
      })
    }
  }
}

function processMarketData(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      currentRate: 180, // Fallback rate
      change24h: 0,
      volume24h: 0,
      totalTrades: 0,
      blocks: []
    }
  }

  // Group transactions by wasteland block
  const blockGroups = {}
  let totalVolume = 0

  transactions.forEach(tx => {
    const block = tx.wasteland_block
    if (!blockGroups[block]) {
      blockGroups[block] = {
        rates: [],
        volume: 0,
        trades: 0,
        time: tx.created_at,
        block: block
      }
    }

    // Convert rate to RUST per SOL format
    let rustPerSol
    if (tx.from_vault === 'RUST_COIN' && tx.to_vault === 'SCRAP_SOL') {
      // Buying SOL with RUST: exchange_flux is already RUST per SOL
      rustPerSol = tx.exchange_flux
    } else if (tx.from_vault === 'SCRAP_SOL' && tx.to_vault === 'RUST_COIN') {
      // Selling SOL for RUST: exchange_flux is RUST per SOL
      rustPerSol = tx.exchange_flux
    }

    if (rustPerSol && rustPerSol > 0) {
      blockGroups[block].rates.push(rustPerSol)

      // Calculate volume in SOL
      const solVolume = tx.from_vault === 'SCRAP_SOL' ? tx.from_units : tx.to_units
      blockGroups[block].volume += solVolume
      totalVolume += solVolume
      blockGroups[block].trades += 1
    }
  })

  // Convert to array and calculate averages
  const blocks = Object.values(blockGroups)
    .map(group => ({
      block: group.block,
      rate: group.rates.reduce((sum, r) => sum + r, 0) / group.rates.length,
      volume: group.volume,
      trades: group.trades,
      time: new Date(group.time).toLocaleTimeString()
    }))
    .sort((a, b) => a.block - b.block)

  // Calculate current rate and 24h change
  const currentRate = blocks.length > 0 ? blocks[blocks.length - 1].rate : 180
  const earliestRate = blocks.length > 0 ? blocks[0].rate : 180
  const change24h = earliestRate > 0 ? ((currentRate - earliestRate) / earliestRate) * 100 : 0

  return {
    currentRate: Math.round(currentRate * 100) / 100,
    change24h: Math.round(change24h * 100) / 100,
    volume24h: Math.round(totalVolume * 1000) / 1000,
    totalTrades: transactions.length,
    blocks: blocks.slice(-20), // Last 20 blocks for chart
    latestBlock: blocks.length > 0 ? Math.max(...blocks.map(b => b.block)) : 0
  }
}
