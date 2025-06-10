// netlify/functions/get-economy-overview.js
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
    console.log('🏦 Fetching economy overview...')

    // Fetch character wealth data
    const { data: characters, error: charactersError } = await supabase
      .from('characters')
      .select(`
        coins,
        level,
        energy,
        health,
        status,
        current_location_id,
        currentLocation:locations(
          id,
          name,
          player_count
        )
      `)
      .eq('status', 'ACTIVE')

    if (charactersError) throw charactersError

    // Fetch market data
    const { data: marketListings, error: marketError } = await supabase
      .from('market_listings')
      .select(`
        id,
        price,
        quantity,
        location_id,
        item:items(
          id,
          name,
          rarity
        ),
        location:locations(
          id,
          name
        )
      `)
      .gt('quantity', 0)

    if (marketError) throw marketError

    // Fetch location player counts
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('id, name, player_count')
      .order('player_count', { ascending: false })
      .limit(10)

    if (locationsError) throw locationsError

    // Fetch items for resource valuation
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, name, rarity, category')
      .eq('category', 'MATERIAL')
      .order('rarity')

    if (itemsError) throw itemsError

    // Calculate economy metrics
    const economyData = calculateEconomyMetrics(
      characters || [],
      marketListings || [],
      locations || [],
      items || []
    )

    console.log('📊 Economy overview generated successfully')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        economy: economyData,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching economy overview:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch economy overview',
        message: error.message
      })
    }
  }
}

function calculateEconomyMetrics(characters, marketListings, locations, items) {
  // Character wealth analysis
  const totalWealth = characters.reduce((sum, char) => sum + (char.coins || 0), 0)
  const avgWealth = characters.length > 0 ? Math.round(totalWealth / characters.length) : 0

  // Wealth distribution
  const wealthDistribution = {
    poor: characters.filter(c => (c.coins || 0) < 50).length,
    middle: characters.filter(c => (c.coins || 0) >= 50 && (c.coins || 0) < 200).length,
    rich: characters.filter(c => (c.coins || 0) >= 200).length
  }

  // Market analysis
  const totalListings = marketListings.length
  const totalValue = marketListings.reduce((sum, listing) =>
    sum + (listing.price * listing.quantity), 0
  )
  const avgPrice = totalListings > 0 ? Math.round(totalValue / totalListings) : 0

  // Most expensive and cheapest items
  const sortedByPrice = [...marketListings].sort((a, b) => b.price - a.price)
  const mostExpensiveItem = sortedByPrice[0] ? {
    name: sortedByPrice[0].item?.name || 'Unknown',
    price: sortedByPrice[0].price,
    location: sortedByPrice[0].location?.name || 'Unknown'
  } : { name: 'None', price: 0, location: 'N/A' }

  const cheapestItem = sortedByPrice[sortedByPrice.length - 1] ? {
    name: sortedByPrice[sortedByPrice.length - 1].item?.name || 'Unknown',
    price: sortedByPrice[sortedByPrice.length - 1].price,
    location: sortedByPrice[sortedByPrice.length - 1].location?.name || 'Unknown'
  } : { name: 'None', price: 0, location: 'N/A' }

  // Popular market locations
  const locationListings = marketListings.reduce((acc, listing) => {
    const locationName = listing.location?.name || 'Unknown'
    acc[locationName] = (acc[locationName] || 0) + 1
    return acc
  }, {})

  const popularLocations = Object.entries(locationListings)
    .map(([name, listings]) => ({ name, listings }))
    .sort((a, b) => b.listings - a.listings)
    .slice(0, 5)

  // Player activity metrics
  const onlineNow = characters.filter(c => (c.energy || 0) > 50).length // Rough estimate
  const avgLevel = characters.length > 0 ?
    Math.round((characters.reduce((sum, c) => sum + (c.level || 1), 0) / characters.length) * 10) / 10 : 1
  const avgEnergy = characters.length > 0 ?
    Math.round(characters.reduce((sum, c) => sum + (c.energy || 0), 0) / characters.length) : 0
  const avgHealth = characters.length > 0 ?
    Math.round(characters.reduce((sum, c) => sum + (c.health || 0), 0) / characters.length) : 0

  // Top locations by player count
  const topLocations = locations
    .filter(loc => loc.player_count > 0)
    .map(loc => ({
      name: loc.name,
      player_count: loc.player_count
    }))
    .slice(0, 5)

  // Resource valuation (estimated based on rarity)
  const rarityValues = {
    'COMMON': 15,
    'UNCOMMON': 35,
    'RARE': 75,
    'EPIC': 150,
    'LEGENDARY': 500
  }

  const mostValuable = items
    .map(item => ({
      name: item.name,
      rarity: item.rarity,
      estimatedValue: rarityValues[item.rarity] || 25
    }))
    .sort((a, b) => b.estimatedValue - a.estimatedValue)
    .slice(0, 10)

  return {
    totalWealth,
    avgWealth,
    wealthDistribution,
    totalCharacters: characters.length,
    marketData: {
      totalListings,
      totalValue,
      avgPrice,
      mostExpensiveItem,
      cheapestItem,
      popularLocations
    },
    playerActivity: {
      onlineNow,
      avgLevel,
      avgEnergy,
      avgHealth,
      topLocations
    },
    resources: {
      totalMinable: items.length,
      mostValuable
    }
  }
}
