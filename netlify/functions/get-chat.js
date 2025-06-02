// netlify/functions/get-chat.js
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

  try {
    const locationId = event.queryStringParameters?.locationId
    const limit = parseInt(event.queryStringParameters?.limit || '50')

    if (!locationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Location ID is required' })
      }
    }

    // Get the location to understand chat scope
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

    // Get parent location if exists
    let parentLocation = null
    if (location.parentLocationId) {
      const { data: parent, error: parentError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', location.parentLocationId)
        .single()

      if (!parentError) {
        parentLocation = parent
      }
    }

    // Get sub-locations if this is a parent
    const { data: subLocations, error: subError } = await supabase
      .from('locations')
      .select('*')
      .eq('parentLocationId', locationId)

    if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows returned, which is fine
      throw subError
    }

    let chatLocationIds = [locationId]

    // Handle chat scope - REGIONAL chat includes parent and sub-locations
    if (location.chatScope === 'REGIONAL') {
      // If this is a parent location, include all sub-locations
      if (subLocations?.length > 0) {
        chatLocationIds.push(...subLocations.map(sub => sub.id))
      }
      // If this is a sub-location, include the parent
      if (location.parentLocationId) {
        chatLocationIds.push(location.parentLocationId)
        // Also include sibling sub-locations
        const { data: siblings, error: siblingsError } = await supabase
          .from('locations')
          .select('*')
          .eq('parentLocationId', location.parentLocationId)
          .neq('id', locationId)

        if (!siblingsError && siblings?.length > 0) {
          chatLocationIds.push(...siblings.map(sib => sib.id))
        }
      }
    }

    // Get chat messages for the relevant locations
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .in('locationId', chatLocationIds)
      .order('createdAt', { ascending: false })
      .limit(limit)

    if (messagesError) throw messagesError

    // Get character and location details for each message
    const transformedMessages = []

    for (const msg of messages || []) {
      let character = null
      if (!msg.isSystem) {
        const { data: charData, error: charError } = await supabase
          .from('characters')
          .select('id, name, characterType, currentImageUrl')
          .eq('id', msg.characterId)
          .single()

        if (!charError) {
          character = charData
        }
      }

      // Get location details
      const { data: msgLocation, error: msgLocError } = await supabase
        .from('locations')
        .select('id, name, locationType')
        .eq('id', msg.locationId)
        .single()

      if (msgLocError) throw msgLocError

      // Calculate time ago
      const timeAgo = getTimeAgo(new Date(msg.createdAt))

      transformedMessages.push({
        id: msg.id,
        message: msg.message,
        messageType: msg.messageType,
        isSystem: msg.isSystem,
        timeAgo: timeAgo,
        createdAt: msg.createdAt,
        character: msg.isSystem ? null : character ? {
          id: character.id,
          name: character.name,
          characterType: character.characterType,
          imageUrl: character.currentImageUrl
        } : null,
        location: {
          id: msgLocation.id,
          name: msgLocation.name,
          locationType: msgLocation.locationType
        }
      })
    }

    // Reverse to get chronological order (oldest first)
    transformedMessages.reverse()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        messages: transformedMessages,
        totalCount: transformedMessages.length,
        locationId: locationId,
        chatScope: location.chatScope,
        locationName: location.name,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching chat messages:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to fetch chat messages'
      })
    }
  }
}

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  }
}
