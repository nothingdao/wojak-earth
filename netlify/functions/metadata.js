// netlify/functions/metadata.js - UPDATED
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
    const { token_id } = event.queryStringParameters || {}

    if (!token_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameter',
          message: 'Token ID is required'
        })
      }
    }

    // Get character by token ID
    const { data: character, error: characterError } = await supabaseAdmin
      .from('characters')
      .select(`
        id,
        name,
        level,
        experience,
        character_type,
        wallet_address,
        nft_address,
        location:locations(*),
        equipped_items:inventory(
          id,
          item:items(*),
          quantity
        )
      `)
      .eq('nft_address', token_id)
      .eq('status', 'ACTIVE')
      .single()

    if (characterError) {
      if (characterError.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Character not found',
            message: 'No active character found for this token ID'
          })
        }
      }
      throw characterError
    }

    // Transform the data for NFT metadata
    const metadata = {
      name: `${character.name} (Level ${character.level})`,
      description: `A level ${character.level} ${character.character_type.toLowerCase()} in the Wojak Earth game.`,
      image: `https://wojak-earth.netlify.app/api/character-image/${character.nft_address}`,
      attributes: [
        {
          trait_type: 'Level',
          value: character.level
        },
        {
          trait_type: 'Experience',
          value: character.experience
        },
        {
          trait_type: 'Type',
          value: character.character_type
        },
        {
          trait_type: 'Location',
          value: character.location?.name || 'Unknown'
        }
      ]
    }

    // Add equipped items as attributes
    character.equipped_items
      .filter(item => item.equipped)
      .forEach(item => {
        metadata.attributes.push({
          trait_type: item.item.category,
          value: item.item.name
        })
      })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(metadata)
    }

  } catch (error) {
    console.error('Error in metadata:', error)
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
