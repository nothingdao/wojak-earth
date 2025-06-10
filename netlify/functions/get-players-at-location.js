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
    // Get location_id from query parameters
    const location_id = event.queryStringParameters?.location_id

    if (!location_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing location_id parameter'
        })
      }
    }

    console.log('🔍 Fetching players for location_id:', location_id)

    // Query characters at the specified location
    const { data: characters, error } = await supabase
      .from('characters')
      .select(`
        id,
        name,
        character_type,
        level,
        experience,
        current_image_url,
        current_location_id,
        wallet_address,
        energy,
        health
      `)
      .eq('current_location_id', location_id)

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
      character_type: char.character_type,
      level: char.level,
      experience: char.experience,
      image_url: char.current_image_url,
      current_location_id: char.current_location_id,
      wallet_address: char.wallet_address,
      energy: char.energy,
      health: char.health,
    })) || []

    console.log(`✅ Found ${players.length} players at location ${location_id}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        players,
        location_id,
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
