// netlify/functions/get-leaderboards.js - UPDATED
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
    // Get top characters by level
    const { data: levelLeaders, error: levelError } = await supabaseAdmin
      .from('characters')
      .select(`
        id,
        name,
        level,
        experience,
        character_type,
        location:locations!current_location_id(*)
      `)
      .eq('status', 'ACTIVE')
      .order('level', { ascending: false })
      .order('experience', { ascending: false })
      .limit(10)

    if (levelError) throw levelError

    // Get top characters by wealth
    const { data: wealthLeaders, error: wealthError } = await supabaseAdmin
      .from('characters')
      .select(`
        id,
        name,
        level,
        coins,
        character_type,
        location:locations!current_location_id(*)
      `)
      .eq('status', 'ACTIVE')
      .order('coins', { ascending: false })
      .limit(10)

    if (wealthError) throw wealthError

    // Get top characters by mining
    const { data: miningLeaders, error: miningError } = await supabaseAdmin
      .from('characters')
      .select(`
        id,
        name,
        level,
        character_type,
        location:locations!current_location_id(*)
      `)
      .eq('status', 'ACTIVE')
      .order('level', { ascending: false })
      .limit(10)

    if (miningError) throw miningError

    // Transform the data for the frontend
    const transformLeader = leader => ({
      id: leader.id,
      name: leader.name,
      level: leader.level,
      character_type: leader.character_type,
      location: leader.location?.name || 'Unknown',
      value: leader.experience || leader.coins || 0
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        leaderboards: {
          level: levelLeaders.map(transformLeader),
          wealth: wealthLeaders.map(transformLeader),
          mining: miningLeaders.map(transformLeader)
        },
        last_updated: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error in get-leaderboards:', error)
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
