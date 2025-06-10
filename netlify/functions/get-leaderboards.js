// netlify/functions/get-leaderboards.js
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
    console.log('🏆 Generating leaderboards...')

    // Fetch all active characters with their data
    const { data: characters, error: charactersError } = await supabase
      .from('characters')
      .select(`
        id,
        name,
        coins,
        level,
        energy,
        health,
        character_type,
        current_image_url,
        current_location_id,
        created_at,
        inventory:character_inventory(
          quantity,
          item:items(category)
        ),
        transactions(
          type,
          created_at
        )
      `)
      .eq('status', 'ACTIVE')

    if (charactersError) throw charactersError

    // Get location visits for exploration leaderboard
    const { data: travels, error: travelsError } = await supabase
      .from('transactions')
      .select('character_id, description')
      .eq('type', 'TRAVEL')

    if (travelsError) throw travelsError

    // Calculate leaderboards
    const leaderboards = calculateLeaderboards(characters || [], travels || [])

    console.log('📊 Leaderboards generated successfully')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        leaderboards,
        stats: {
          totalPlayers: characters?.length || 0,
          lastUpdated: new Date().toISOString(),
          period: 'alltime'
        },
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error generating leaderboards:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate leaderboards',
        message: error.message
      })
    }
  }
}

function calculateLeaderboards(characters, travels) {
  // Helper to create leaderboard entries
  const createLeaderboardEntry = (character, value, type) => {
    // Add some mock position changes for demo purposes
    const change = Math.random() > 0.7 ? Math.floor(Math.random() * 5) - 2 : null

    return {
      id: `${character.id}_${type}`,
      character_id: character.id,
      character_name: character.name,
      character_image_url: character.current_image_url,
      character_type: character.character_type,
      value: value,
      change: change,
      badge: getBadgeForCharacter(character, type)
    }
  }

  // 1. WEALTH LEADERBOARD (by coins)
  const wealthEntries = characters
    .map(char => createLeaderboardEntry(char, char.coins || 0, 'wealth'))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  // 2. LEVEL LEADERBOARD
  const levelEntries = characters
    .map(char => createLeaderboardEntry(char, char.level || 1, 'level'))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  // 3. COLLECTION LEADERBOARD (by total items)
  const itemEntries = characters
    .map(char => {
      const totalItems = char.inventory?.reduce((sum, inv) => sum + (inv.quantity || 0), 0) || 0
      return createLeaderboardEntry(char, totalItems, 'items')
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 50)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  // 4. EXPLORATION LEADERBOARD (by unique locations visited)
  const locationVisits = travels.reduce((acc, travel) => {
    const character_id = travel.character_id
    if (!acc[character_id]) acc[character_id] = new Set()

    // Extract location from travel description
    const locationMatch = travel.description.match(/to (.+)$/)
    if (locationMatch) {
      acc[character_id].add(locationMatch[1])
    }
    return acc
  }, {})

  const explorationEntries = characters
    .map(char => {
      const uniqueLocations = locationVisits[char.id]?.size || 0
      return createLeaderboardEntry(char, uniqueLocations, 'exploration')
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 50)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  // 5. TRADING LEADERBOARD (by transaction volume)
  const tradingVolume = characters.reduce((acc, char) => {
    const buyTransactions = char.transactions?.filter(t => t.type === 'BUY') || []
    const sellTransactions = char.transactions?.filter(t => t.type === 'SELL') || []

    // Estimate trading volume (this is simplified - you could extract actual amounts from descriptions)
    const volume = (buyTransactions.length * 50) + (sellTransactions.length * 30)
    acc[char.id] = volume
    return acc
  }, {})

  const tradingEntries = characters
    .map(char => createLeaderboardEntry(char, tradingVolume[char.id] || 0, 'trading'))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  // 6. ENERGY LEADERBOARD (by current energy)
  const energyEntries = characters
    .map(char => createLeaderboardEntry(char, char.energy || 0, 'energy'))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  return {
    wealth: wealthEntries,
    level: levelEntries,
    items: itemEntries,
    exploration: explorationEntries,
    trading: tradingEntries,
    energy: energyEntries
  }
}

function getBadgeForCharacter(character, type) {
  // Award special badges based on achievements
  const badges = []

  // Wealth badges
  if (type === 'wealth') {
    if (character.coins >= 10000) badges.push('💰 Tycoon')
    else if (character.coins >= 5000) badges.push('💎 Rich')
    else if (character.coins >= 1000) badges.push('🪙 Wealthy')
  }

  // Level badges
  if (type === 'level') {
    if (character.level >= 50) badges.push('⭐ Master')
    else if (character.level >= 25) badges.push('🌟 Expert')
    else if (character.level >= 10) badges.push('✨ Veteran')
  }

  // Collection badges
  if (type === 'items') {
    const totalItems = character.inventory?.reduce((sum, inv) => sum + (inv.quantity || 0), 0) || 0
    if (totalItems >= 100) badges.push('📦 Hoarder')
    else if (totalItems >= 50) badges.push('🎒 Collector')
  }

  // Special type badges
  if (character.character_type === 'NPC') {
    badges.push('🤖 NPC')
  }

  // Return first badge or null
  return badges[0] || null
}
