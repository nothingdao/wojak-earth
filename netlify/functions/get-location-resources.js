// netlify/functions/get-location-resources.js - UPDATED
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
    const location_id = event.queryStringParameters?.location_id

    if (!location_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Location ID is required' })
      }
    }

    // Get location resources with respawn info
    const { data: resources, error } = await supabaseAdmin
      .from('location_resources')
      .select(`
        *,
        location:locations(*),
        item:items(*)
      `)
      .eq('location_id', location_id)

    if (error) throw error

    // Transform the data for the frontend
    const transformedResources = resources.map(resource => ({
      id: resource.id,
      item_id: resource.item.id,
      itemName: resource.item.name,
      itemRarity: resource.item.rarity,
      spawn_rate: resource.spawn_rate,
      difficulty: resource.difficulty,
      location: {
        id: resource.location.id,
        name: resource.location.name,
        location_type: resource.location.location_type || resource.location.type
      },
      is_available: true
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        resources: transformedResources
      })
    }

  } catch (error) {
    console.error('Error in get-location-resources:', error)
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
