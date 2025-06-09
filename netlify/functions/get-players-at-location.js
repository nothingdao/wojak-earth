// netlify/functions/get-players-at-location.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service key for server-side

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Get locationId from query parameters
    const locationId = event.queryStringParameters?.locationId

    if (!locationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing locationId parameter'
        })
      }
    }

    console.log('🔍 Fetching players for locationId:', locationId)

    // Query characters at the specified location
    const { data: characters, error } = await supabase
      .from('characters')
      .select(`
        id,
        name,
        characterType,
        level,
        experience,
        currentImageUrl,
        currentLocationId,
        walletAddress,
        energy,
        health,
        lastActiveAt
      `)
      .eq('currentLocationId', locationId)
    // .order('lastActiveAt', { ascending: false })

    if (error) {
      console.error('❌ Supabase error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to fetch players from database',
          details: error.message
        })
      }
    }

    // Transform the data to match your Player type
    const players = characters?.map(char => ({
      id: char.id,
      name: char.name,
      characterType: char.characterType,
      level: char.level,
      experience: char.experience,
      imageUrl: char.currentImageUrl,
      currentLocationId: char.currentLocationId,
      walletAddress: char.walletAddress,
      energy: char.energy,
      health: char.health,
      lastActiveAt: char.lastActiveAt
    })) || []

    console.log(`✅ Found ${players.length} players at location ${locationId}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        players,
        locationId,
        count: players.length,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('❌ Error fetching players at location:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch players at location',
        message: error.message
      })
    }
  }
}
