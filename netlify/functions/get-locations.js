// netlify/functions/get-locations.js - RESTORED WITH NESTED SELECTS
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
    // Get all locations with their parent information and resource nodes
    const { data: locations, error: locationsError } = await supabaseAdmin
      .from('locations')
      .select(`
        *,
        parent:locations!parent_location_id(*),
        resource_nodes:location_resources(
          id,
          item:items(*),
          spawn_rate,
          difficulty
        )
      `)
      .order('name')

    if (locationsError) {
      console.error('Supabase Locations Error Details:', locationsError)
      throw locationsError
    }

    // Transform the data for the frontend
    const transformedLocations = locations.map(location => ({
      ...location,
      parent: location.parent || null,
      resources: location.resource_nodes.map(node => ({
        id: node.id,
        item_id: node.item.id,
        itemName: node.item.name,
        itemRarity: node.item.rarity,
        spawn_rate: node.spawn_rate,
        difficulty: node.difficulty,
        available: true
      }))
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        locations: transformedLocations
      })
    }

  } catch (error) {
    console.error('Error in get-locations:', error)
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
