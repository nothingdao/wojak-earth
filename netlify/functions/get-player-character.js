// netlify/functions/get-player-character.js
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const wallet_address = event.queryStringParameters?.wallet_address

    if (!wallet_address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Wallet address is required' })
      }
    }

    // Query character by wallet address
    const { data: character, error } = await supabase
      .from('characters')
      .select(`
        *,
        currentLocation:locations(*),
        inventory:character_inventory(
          *,
          item:items(*)
        ),
        imageHistory:character_images(*),
        transactions(*)
      `)
      .eq('wallet_address', wallet_address)
      .eq('status', 'ACTIVE')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Supabase error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Database error',
          message: error.message
        })
      }
    }

    if (!character) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          hasCharacter: false,
          character: null,
          message: 'No character found for this wallet'
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        hasCharacter: true,
        character: character
      })
    }

  } catch (error) {
    console.error('Error fetching character:', error)
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
