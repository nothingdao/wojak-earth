// netlify/functions/send-message.js - UPDATED
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    const {
      walletAddress,
      locationId,
      message,
      messageType = 'CHAT'
    } = JSON.parse(event.body || '{}')

    if (!walletAddress || !locationId || !message?.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          message: 'Wallet address, location ID and message content are required'
        })
      }
    }

    // Validate message length
    if (message.length > 500) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Message too long',
          message: 'Messages must be 500 characters or less'
        })
      }
    }

    // Get character by wallet address
    const { data: character, error } = await supabase
      .from('characters')
      .select('*')
      .eq('walletAddress', walletAddress)
      .eq('status', 'ACTIVE')
      .single()

    if (error || !character) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Character not found',
          message: 'No active character found for this wallet address'
        })
      }
    }

    // Get location to verify it exists and has chat enabled
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('*')
      .eq('id', locationId)
      .single()

    if (locationError) throw locationError

    if (!location) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Location not found' })
      }
    }

    if (!location.hasChat) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Chat not available',
          message: 'This location does not support chat'
        })
      }
    }

    // Verify character is at this location or a related location (for regional chat)
    let canChat = false

    if (character.currentLocationId === locationId) {
      canChat = true
    } else if (location.chatScope === 'REGIONAL') {
      const { data: characterLocation, error: charLocError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', character.currentLocationId)
        .single()

      if (!charLocError && characterLocation) {
        if (characterLocation.id === location.parentLocationId) {
          canChat = true
        }
        else if (characterLocation.parentLocationId === location.parentLocationId && location.parentLocationId) {
          canChat = true
        }
        else if (location.parentLocationId === characterLocation.id) {
          canChat = true
        }
      }
    }

    if (!canChat) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Cannot chat here',
          message: 'You must be at this location to participate in chat'
        })
      }
    }

    // Basic content filtering
    const bannedWords = ['spam', 'scam', 'hack']
    const lowercaseMessage = message.toLowerCase()
    const hasBannedWords = bannedWords.some(word => lowercaseMessage.includes(word))

    if (hasBannedWords) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Message blocked',
          message: 'Your message contains prohibited content'
        })
      }
    }

    // Rate limiting check
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
    const { data: recentMessages, error: rateError } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('characterId', character.id)
      .gte('createdAt', oneMinuteAgo)

    if (rateError) throw rateError

    if (recentMessages?.length >= 10) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'Rate limited',
          message: 'Please wait before sending another message'
        })
      }
    }

    // Create chat message
    const messageId = randomUUID()
    const { data: chatMessage, error: createError } = await supabase
      .from('chat_messages')
      .insert({
        id: messageId,
        locationId: locationId,
        characterId: character.id,
        message: message.trim(),
        messageType: messageType,
        isSystem: false
      })
      .select('*')
      .single()

    if (createError) throw createError

    // Update location last active timestamp
    const { error: updateError } = await supabase
      .from('locations')
      .update({ lastActive: new Date().toISOString() })
      .eq('id', locationId)

    if (updateError) throw updateError

    // Get character and location details for response
    const { data: characterDetails, error: charError } = await supabase
      .from('characters')
      .select('id, name, characterType, currentImageUrl')
      .eq('id', character.id)
      .single()

    if (charError) throw charError

    const { data: locationDetails, error: locError } = await supabase
      .from('locations')
      .select('id, name, locationType')
      .eq('id', locationId)
      .single()

    if (locError) throw locError

    const transformedMessage = {
      id: chatMessage.id,
      message: chatMessage.message,
      messageType: chatMessage.messageType,
      isSystem: chatMessage.isSystem,
      timeAgo: 'now',
      createdAt: chatMessage.createdAt,
      character: {
        id: characterDetails.id,
        name: characterDetails.name,
        characterType: characterDetails.characterType,
        imageUrl: characterDetails.currentImageUrl
      },
      location: {
        id: locationDetails.id,
        name: locationDetails.name,
        locationType: locationDetails.locationType
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Message sent successfully',
        chatMessage: transformedMessage,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error sending message:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to send message'
      })
    }
  }
}
