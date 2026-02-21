// netlify/functions/earth-market.ts - COMPLETE FILE

import supabaseAdmin from '../../src/utils/supabase-admin'

const supabase = supabaseAdmin

export const handler = async (event: any, context: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    // Get SOL price
    const solPrice = await getSOLPrice()

    // Get transactions from YOUR table - DEBUG VERSION
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'EXCHANGE')
      .order('wasteland_block', { ascending: false })
      .limit(50)

    console.log('🔍 Database query result:', {
      error,
      transactionCount: transactions?.length || 0,
      firstTransaction: transactions?.[0] || null,
    })

    // Also get ALL transactions to see what's in there
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('type')
      .limit(10)

    console.log(
      '🔍 All transaction types:',
      allTransactions?.map((t) => t.type) || []
    )

    if (error) {
      console.error('Database error:', error)
    }

    const earthPerSOL = solPrice // Since 1 EARTH = 1 USDC

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          solUsdcPrice: solPrice,
          earthPerSOL: earthPerSOL,
          earthUsdcPeg: 1.0,
          timestamp: new Date().toISOString(),
          source: 'Jupiter/CoinGecko',
        },
        transactions: transactions || [],
        transactionCount: transactions?.length || 0,
      }),
    }
  } catch (error) {
    console.error('Earth market endpoint error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch market data',
        message: error.message,
      }),
    }
  }
}

async function getSOLPrice(): Promise<number> {
  try {
    const jupiterPrice = await getJupiterSOLPrice()
    if (jupiterPrice && jupiterPrice > 0) {
      console.log(`✅ Jupiter SOL price: $${jupiterPrice}`)
      return jupiterPrice
    }
  } catch (error) {
    console.warn('Jupiter API failed:', error.message)
  }

  try {
    const coingeckoPrice = await getCoinGeckoSOLPrice()
    if (coingeckoPrice && coingeckoPrice > 0) {
      console.log(`✅ CoinGecko SOL price: $${coingeckoPrice}`)
      return coingeckoPrice
    }
  } catch (error) {
    console.warn('CoinGecko API failed:', error.message)
  }

  console.warn('⚠️ Using fallback SOL price: $150')
  return 150
}

async function getJupiterSOLPrice(): Promise<number | null> {
  const response = await fetch(
    'https://quote-api.jup.ag/v6/quote?' +
      new URLSearchParams({
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '1000000000',
        slippageBps: '50',
      })
  )

  if (!response.ok) {
    throw new Error(`Jupiter API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.outAmount) {
    return parseInt(data.outAmount) / 1000000
  }

  return null
}

async function getCoinGeckoSOLPrice(): Promise<number | null> {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
  )

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`)
  }

  const data = await response.json()
  return data.solana?.usd || null
}
