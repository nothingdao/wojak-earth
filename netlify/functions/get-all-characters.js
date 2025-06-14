// netlify/functions/get-all-characters.js - UPDATED
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
    // Get all active characters with their location and equipped items
    const { data: characters, error: charactersError } = await supabaseAdmin
      .from('characters')
      .select(`
        id,
        name,
        level,
        experience,
        wallet_address,
        current_image_url,
        location:locations(*),
        equipped_items:character_inventory!character_id(
          id,
          item:items(*),
          quantity,
          is_equipped
        )
      `)
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
      current_image_url: character.current_image_url,
      location: character.location,
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
        characters: transformedCharacters
      })
    }

  } catch (error) {
    console.error('Error in get-all-characters:', error)
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
