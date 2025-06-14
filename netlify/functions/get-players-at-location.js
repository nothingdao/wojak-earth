// netlify/functions/get-players-at-location.js - FIXED
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
    const { location_id } = event.queryStringParameters || {}

    if (!location_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameter',
          message: 'Location ID is required'
        })
      }
    }

    // Get all active characters at the specified location
    const { data: characters, error: charactersError } = await supabaseAdmin
      .from('characters')
      .select(`
        id,
        name,
        level,
        experience,
        wallet_address,
        location:locations(
          *,
          parent:locations(*),
          resource_nodes:location_resources(
            id,
            item:items(*)
          )
        ),
        equipped_items:character_inventory!character_id(
          id,
          item:items(*),
          quantity,
          is_equipped
        )
      `)
      .eq('current_location_id', location_id)
      .eq('status', 'ACTIVE')
      .order('name')

    if (charactersError) throw charactersError

    // Transform the data for the frontend
    const transformedCharacters = characters.map(character => ({
      id: character.id,
      name: character.name,
      level: character.level,
      experience: character.experience,
      wallet_address: character.wallet_address,
      location: character.location ? {
        ...character.location,
        parent: character.location.parent || null,
        resources: character.location.resource_nodes.map(node => ({
          id: node.id,
          resource: node.item,
          available: true // Assuming resources are always available if respawn_time/last_harvested are not in schema
        }))
      } : null,
      equipped_items: character.equipped_items
        .filter(item => item.is_equipped)
        .map(item => ({
          id: item.id,
          item: item.item,
          quantity: item.quantity
        }))
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        players: transformedCharacters
      })
    }

  } catch (error) {
    console.error('Error in get-players-at-location:', error)
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
