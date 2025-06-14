// netlify/functions/send-message.js - UPDATED
import supabaseAdmin from '../../src/utils/supabase-admin'
import { randomUUID } from 'crypto'

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { wallet_address, location_id, content } = JSON.parse(event.body || '{}')

    if (!wallet_address || !location_id || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          message: 'Wallet address, location ID, and content are required'
        })
      }
    }

    // Get character by wallet address
    const { data: character, error: characterError } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('status', 'ACTIVE')
      .single()

    if (characterError) {
      if (characterError.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Character not found',
            message: 'No active character found for this wallet address'
          })
        }
      }
      throw characterError
    }

    // Verify character is at the specified location
    if (character.location_id !== location_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid location',
          message: 'You must be at the location to send messages there'
        })
      }
    }

    // Create the message
    const messageId = randomUUID()
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        id: messageId,
        character_id: character.id,
        location_id: location_id,
        content: content
      })
      .select(`
        id,
        content,
        created_at,
        character:characters(
          id,
          name,
          level,
          character_type
        )
      `)
      .single()

    if (messageError) throw messageError

    // Transform the data for the frontend
    const transformedMessage = {
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      character: message.character ? {
        id: message.character.id,
        name: message.character.name,
        level: message.character.level,
        type: message.character.character_type
      } : null
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: transformedMessage
      })
    }

  } catch (error) {
    console.error('Error in send-message:', error)
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
