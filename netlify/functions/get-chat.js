// netlify/functions/get-chat.js - UPDATED
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
    const { location_id, limit = 50 } = event.queryStringParameters || {}

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

    // Get recent messages for the location
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
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
      .eq('location_id', location_id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (messagesError) throw messagesError

    // Transform the data for the frontend
    const transformedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      character: message.character ? {
        id: message.character.id,
        name: message.character.name,
        level: message.character.level,
        type: message.character.character_type
      } : null
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        messages: transformedMessages
      })
    }

  } catch (error) {
    console.error('Error in get-chat:', error)
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
