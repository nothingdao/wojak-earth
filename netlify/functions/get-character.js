// netlify/functions/get-character.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const character_id = event.queryStringParameters?.character_id || 'hardcoded-demo'

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
      .eq('name', 'Wojak #1337')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Character not found',
          message: error.message
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(character)
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
