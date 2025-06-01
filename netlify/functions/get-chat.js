import { PrismaClient } from '@prisma/client'

let prisma

if (!globalThis.prisma) {
  globalThis.prisma = new PrismaClient()
}
prisma = globalThis.prisma

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
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        parentLocation: true,
        subLocations: true
      }
    })

    if (!location) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Location not found' })
      }
    }

    let chatLocationIds = [locationId]

    // Handle chat scope - REGIONAL chat includes parent and sub-locations
    if (location.chatScope === 'REGIONAL') {
      // If this is a parent location, include all sub-locations
      if (location.subLocations?.length > 0) {
        chatLocationIds.push(...location.subLocations.map(sub => sub.id))
      }
      // If this is a sub-location, include the parent
      if (location.parentLocationId) {
        chatLocationIds.push(location.parentLocationId)
        // Also include sibling sub-locations
        const siblings = await prisma.location.findMany({
          where: {
            parentLocationId: location.parentLocationId,
            id: { not: locationId }
          }
        })
        chatLocationIds.push(...siblings.map(sib => sib.id))
      }
    }

    // Get chat messages for the relevant locations
    const messages = await prisma.chatMessage.findMany({
      where: {
        locationId: { in: chatLocationIds }
      },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            characterType: true,
            currentImageUrl: true
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            locationType: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Transform messages for frontend
    const transformedMessages = messages.reverse().map(msg => {
      // Calculate time ago
      const timeAgo = getTimeAgo(msg.createdAt)

      return {
        id: msg.id,
        message: msg.message,
        messageType: msg.messageType,
        isSystem: msg.isSystem,
        timeAgo: timeAgo,
        createdAt: msg.createdAt,
        character: msg.isSystem ? null : {
          id: msg.character.id,
          name: msg.character.name,
          characterType: msg.character.characterType,
          imageUrl: msg.character.currentImageUrl
        },
        location: {
          id: msg.location.id,
          name: msg.location.name,
          locationType: msg.location.locationType
        }
      }
    })

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
