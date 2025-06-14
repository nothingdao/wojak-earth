// netlify/functions/get-market.js - UPDATED
import supabaseAdmin from '../../src/utils/supabase-admin'

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
    // Get all items with their current market prices
    const { data: items, error } = await supabaseAdmin
      .from('items')
      .select('*')
      .order('name')

    if (error) throw error

    // Get current market prices
    const { data: marketPrices, error: priceError } = await supabaseAdmin
      .from('market_prices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (priceError && priceError.code !== 'PGRST116') throw priceError

    // Get recent transactions for price history
    const { data: recentTransactions, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .in('type', ['BUY', 'SELL'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (transactionError) throw transactionError

    // Calculate price history and trends
    const priceHistory = items.map(item => {
      const itemTransactions = recentTransactions.filter(t => t.item_id === item.id)
      const buyTransactions = itemTransactions.filter(t => t.type === 'BUY')
      const sellTransactions = itemTransactions.filter(t => t.type === 'SELL')

      const avgBuyPrice = buyTransactions.length > 0
        ? buyTransactions.reduce((sum, t) => sum + t.price, 0) / buyTransactions.length
        : null

      const avgSellPrice = sellTransactions.length > 0
        ? sellTransactions.reduce((sum, t) => sum + t.price, 0) / sellTransactions.length
        : null

      const currentPrice = marketPrices?.prices?.[item.id] || item.base_price

      return {
        ...item,
        current_price: currentPrice,
        price_history: {
          avg_buy_price: avgBuyPrice,
          avg_sell_price: avgSellPrice,
          recent_transactions: itemTransactions.length,
          last_updated: marketPrices?.created_at || new Date().toISOString()
        }
      }
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        market: {
          items: priceHistory,
          last_updated: marketPrices?.created_at || new Date().toISOString()
        }
      })
    }

  } catch (error) {
    console.error('Error in get-market:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}
