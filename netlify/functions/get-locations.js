// netlify/functions/get-locations.js
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

  try {
    // Fetch all top-level locations (no parent) with their sub-locations
    const { data: locations, error } = await supabase
      .from('locations')
      .select(`
        *,
        subLocations:locations!parentLocationId(
          *,
          characterCount:characters(count)
        ),
        characterCount:characters(count)
      `)
      .is('parentLocationId', null)
      .order('difficulty', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    // Transform data for frontend with aggregated player counts
    const responseData = locations.map(location => {
      // Calculate total players: direct + all sub-locations
      const directPlayerCount = location.characterCount?.[0]?.count || 0
      const subLocationPlayerCount = location.subLocations?.reduce((total, subLoc) => {
        return total + (subLoc.characterCount?.[0]?.count || 0)
      }, 0) || 0
      const totalPlayerCount = directPlayerCount + subLocationPlayerCount

      return {
        id: location.id,
        name: location.name,
        description: location.description,
        locationType: location.locationType,
        biome: location.biome,
        difficulty: location.difficulty,
        playerCount: totalPlayerCount, // Aggregated count
        directPlayerCount: directPlayerCount, // Players directly at this location
        lastActive: location.lastActive,
        hasMarket: location.hasMarket,
        hasMining: location.hasMining,
        hasChat: location.hasChat,
        welcomeMessage: location.welcomeMessage,
        lore: location.lore,

        subLocations: location.subLocations?.map(subLoc => ({
          id: subLoc.id,
          name: subLoc.name,
          description: subLoc.description,
          locationType: subLoc.locationType,
          difficulty: subLoc.difficulty,
          playerCount: subLoc.characterCount?.[0]?.count || 0, // Real player count for sub-location
          hasMarket: subLoc.hasMarket,
          hasMining: subLoc.hasMining,
          hasChat: subLoc.hasChat,
          welcomeMessage: subLoc.welcomeMessage,
          parentLocationId: subLoc.parentLocationId
        })) || []
      }
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        locations: responseData,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching locations:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to fetch locations'
      })
    }
  }
}
