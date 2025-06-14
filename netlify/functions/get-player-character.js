// netlify/functions/get-player-character.js - FIXED with inventory
import supabaseAdmin from '../../src/utils/supabase-admin'

export const handler = async (event, context) => {

  console.log('🚀 GET-PLAYER-CHARACTER FUNCTION CALLED!', {
    method: event.httpMethod,
    wallet: event.queryStringParameters?.wallet_address
  })

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
    const { wallet_address } = event.queryStringParameters || {}

    if (!wallet_address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameter',
          message: 'Wallet address is required'
        })
      }
    }

    // Get character with all related data
    const { data: character, error: characterError } = await supabaseAdmin
      .from('characters')
      .select(`
        id,
        nft_address,
        token_id,
        wallet_address,
        name,
        gender,
        character_type,
        current_location_id,
        current_version,
        current_image_url,
        energy,
        health,
        created_at,
        updated_at,
        coins,
        level,
        status,
        payment_signature,
        experience,
        location:locations(
          *,
          parent:locations(*)
        )
      `)
      .eq('wallet_address', wallet_address)
      .eq('status', 'ACTIVE')
      .single()

    if (characterError) {
      console.error('Error fetching character:', characterError)
      if (characterError.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'NO_PROFILE_FOUND',
            message: 'No active character found for this wallet address'
          })
        }
      }
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Database error',
          message: characterError.message
        })
      }
    }

    // FIXED: Get actual inventory data instead of empty array
    const { data: inventoryData, error: inventoryError } = await supabaseAdmin
      .from('character_inventory')
      .select(`
        id,
        quantity,
        is_equipped,
        equipped_slot,
        slot_index,
        is_primary,
        created_at,
        updated_at,
        item:items(*)
      `)
      .eq('character_id', character.id)
      .order('created_at', { ascending: false })

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError)
      // Don't fail the whole request for inventory errors, just log it
    }

    console.log(`🎒 Loaded ${inventoryData?.length || 0} inventory items for character ${character.name}`)

    // Transform the data for the frontend
    const transformedCharacter = {
      ...character,
      currentLocation: character.location ? {
        ...character.location,
        parent: character.location.parent || null,
        resources: [] // Temporarily set to empty array to avoid errors
      } : null,
      inventory: inventoryData || [], // FIXED: Use actual inventory data
      equipped_items: inventoryData?.filter(item => item.is_equipped) || [] // FIXED: Filter equipped items
    }

    const response = {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        hasCharacter: true,
        character: transformedCharacter
      })
    }

    console.log('📤 Final Response:', {
      statusCode: response.statusCode,
      characterFound: !!transformedCharacter,
      hasLocation: !!transformedCharacter.currentLocation,
      inventoryCount: transformedCharacter.inventory.length,
      equippedCount: transformedCharacter.equipped_items.length
    })

    return response

  } catch (error) {
    console.error('Error in get-player-character:', error)
    const errorResponse = {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred'
      })
    }
    console.log('📤 Error Response:', JSON.stringify(errorResponse, null, 2))
    return errorResponse
  }
}
