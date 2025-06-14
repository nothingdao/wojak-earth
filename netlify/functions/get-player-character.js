// netlify/functions/get-player-character.js - FIXED
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

    // console.log('🔍 Character Query Result:', {
    //   found: !!character,
    //   error: characterError,
    //   wallet: wallet_address
    // })

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

    // Transform the data for the frontend
    const transformedCharacter = {
      ...character,
      currentLocation: character.location ? {
        ...character.location,
        parent: character.location.parent || null,
        resources: [] // Temporarily set to empty array to avoid errors
      } : null,
      inventory: [], // Temporarily set to empty array
      equipped_items: [] // Temporarily set to empty array
    }

    const response = {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        hasCharacter: true,
        character: transformedCharacter
      })
    }

    // console.log('📤 Final Response:', {
    //   statusCode: response.statusCode,
    //   characterFound: !!transformedCharacter,
    //   hasLocation: !!transformedCharacter.currentLocation,
    //   inventoryCount: transformedCharacter.inventory.length
    // })

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
