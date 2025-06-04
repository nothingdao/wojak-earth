// netlify/functions/get-market-preview.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const handler = async (event, context) => {
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
    const { locationId } = event.queryStringParameters || {}

    if (!locationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Location ID is required' }),
      }
    }

    // Verify location exists and has market
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id, name, hasMarket')
      .eq('id', locationId)
      .single()

    if (locationError || !location) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Location not found' }),
      }
    }

    if (!location.hasMarket) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          preview: null,
          message: 'No market available at this location',
        }),
      }
    }

    // Get market statistics
    const { data: marketStats, error: statsError } = await supabase
      .from('market_listings')
      .select(
        `
        id,
        price,
        quantity,
        items (
          id,
          name
        )
      `
      )
      .eq('locationId', locationId)

    if (statsError) {
      console.error('Error fetching market stats:', statsError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch market data' }),
      }
    }

    // Calculate preview data
    const totalListings = marketStats?.length || 0

    let cheapestItem = null
    let mostExpensive = null

    if (marketStats && marketStats.length > 0) {
      // Find cheapest item
      const cheapest = marketStats.reduce((min, current) =>
        current.price < min.price ? current : min
      )

      // Find most expensive item
      const expensive = marketStats.reduce((max, current) =>
        current.price > max.price ? current : max
      )

      cheapestItem = {
        name: cheapest.items.name,
        price: cheapest.price,
      }

      mostExpensive = {
        name: expensive.items.name,
        price: expensive.price,
      }
    }

    const preview = {
      totalListings,
      cheapestItem,
      mostExpensive,
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        preview,
        location: {
          id: location.id,
          name: location.name,
        },
      }),
    }
  } catch (error) {
    console.error('Error in get-market-preview:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
