// netlify/functions/get-economy-overview.js - UPDATED
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
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('items')
      .select(`
        id,
        name,
        description
      `)
      .order('name')

    if (itemsError) throw itemsError

    // Get recent transactions for price history
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('transactions')
      .select(`
        id,
        type,
        item_id,
        quantity,
        from_units,
        to_units,
        created_at
      `)
      .in('type', ['BUY', 'SELL'])
      .order('created_at', { ascending: false })
      .limit(100)

    if (transactionsError) throw transactionsError

    // Transform the data for the frontend
    const transformedItems = items.map(item => {
      // Calculate current prices from recent transactions
      const recentTransactions = transactions.filter(t =>
        t.item_id === item.id &&
        ['BUY', 'SELL'].includes(t.type)
      ).slice(0, 5) // Get last 5 transactions

      const currentBuyPrice = recentTransactions
        .filter(t => t.type === 'BUY')
        .reduce((sum, t) => sum + t.from_units, 0) /
        Math.max(recentTransactions.filter(t => t.type === 'BUY').length, 1)

      const currentSellPrice = recentTransactions
        .filter(t => t.type === 'SELL')
        .reduce((sum, t) => sum + t.to_units, 0) /
        Math.max(recentTransactions.filter(t => t.type === 'SELL').length, 1)

      const currentPrice = {
        buy_price: currentBuyPrice || 100, // Default price if no transactions
        sell_price: currentSellPrice || 80, // Default price if no transactions
        last_updated: new Date().toISOString()
      }

      const itemTransactions = transactions.filter(t =>
        t.item_id === item.id &&
        ['BUY', 'SELL'].includes(t.type)
      )

      const priceHistory = itemTransactions.map(t => ({
        type: t.type,
        price: t.type === 'BUY' ? t.from_units : t.to_units,
        quantity: t.quantity || 1,
        timestamp: t.created_at
      }))

      const buyTransactions = priceHistory.filter(t => t.type === 'BUY')
      const sellTransactions = priceHistory.filter(t => t.type === 'SELL')

      const averageBuyPrice = buyTransactions.length > 0
        ? buyTransactions.reduce((sum, t) => sum + (t.price * t.quantity), 0) /
        buyTransactions.reduce((sum, t) => sum + t.quantity, 0)
        : currentPrice.buy_price

      const averageSellPrice = sellTransactions.length > 0
        ? sellTransactions.reduce((sum, t) => sum + (t.price * t.quantity), 0) /
        sellTransactions.reduce((sum, t) => sum + t.quantity, 0)
        : currentPrice.sell_price

      return {
        id: item.id,
        name: item.name,
        description: item.description,
        current_price: {
          buy: currentPrice.buy_price,
          sell: currentPrice.sell_price,
          last_updated: currentPrice.last_updated
        },
        price_history: priceHistory,
        average_prices: {
          buy: averageBuyPrice,
          sell: averageSellPrice
        }
      }
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        items: transformedItems,
        last_updated: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error in get-economy-overview:', error)
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
