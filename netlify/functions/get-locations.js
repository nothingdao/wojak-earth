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
        subLocations:locations!parent_location_id(
          *,
          characterCount:characters(count)
        ),
        characterCount:characters(count)
      `)
      .is('parent_location_id', null)
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
        location_type: location.location_type,
        biome: location.biome,
        difficulty: location.difficulty,
        player_count: totalPlayerCount, // Aggregated count
        direct_player_count: directPlayerCount, // Players directly at this location
        last_active: location.last_active,
        has_market: location.has_market,
        has_mining: location.has_mining,
        has_chat: location.has_chat,
        welcome_message: location.welcome_message,
        lore: location.lore,
        svg_path_id: location.svg_path_id,
        theme: location.theme,

        // Add missing fields that DatabaseMapStyling expects
        has_travel: location.has_travel ?? true, // Default to true if not set
        is_explored: location.is_explored ?? true, // Default to true if not set
        is_private: location.is_private ?? false, // Default to false if not set
        min_level: location.min_level || null, // Minimum level requirement
        entry_cost: location.entry_cost || null, // Entry cost in coins

        subLocations: location.subLocations?.map(subLoc => ({
          id: subLoc.id,
          name: subLoc.name,
          description: subLoc.description,
          location_type: subLoc.location_type,
          difficulty: subLoc.difficulty,
          player_count: subLoc.characterCount?.[0]?.count || 0, // Real player count for sub-location
          has_market: subLoc.has_market,
          has_mining: subLoc.has_mining,
          has_chat: subLoc.has_chat,
          welcome_message: subLoc.welcome_message,
          parent_location_id: subLoc.parent_location_id,

          // Add missing fields for sub-locations too
          has_travel: subLoc.has_travel ?? true,
          is_explored: subLoc.is_explored ?? true,
          is_private: subLoc.is_private ?? false,
          min_level: subLoc.min_level || null,
          entry_cost: subLoc.entry_cost || null,
          svg_path_id: subLoc.svg_path_id,
          theme: subLoc.theme,
          biome: subLoc.biome
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
        message: 'Failed to fetch locations',
        details: error.message
      })
    }
  }
}
