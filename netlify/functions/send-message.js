import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
      characterId = 'hardcoded-demo',
      locationId,
      message,
      messageType = 'CHAT'
    } = JSON.parse(event.body || '{}')

    if (!locationId || !message?.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          message: 'Location ID and message content are required'
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

    // Get character
    let character
    if (characterId === 'hardcoded-demo') {
      character = await prisma.character.findFirst({
        where: { name: "Wojak #1337" }
      })
    } else {
      character = await prisma.character.findUnique({
        where: { id: characterId }
      })
    }

    if (!character) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Character not found' })
      }
    }

    // Get location to verify it exists and has chat enabled
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    })

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
      // Check if character is in a sub-location or parent location
      const characterLocation = await prisma.location.findUnique({
        where: { id: character.currentLocationId }
      })

      if (characterLocation) {
        // Check if character's location is a parent of the chat location
        if (characterLocation.id === location.parentLocationId) {
          canChat = true
        }
        // Check if character's location has the same parent as chat location
        else if (characterLocation.parentLocationId === location.parentLocationId && location.parentLocationId) {
          canChat = true
        }
        // Check if chat location is a sub-location of character's location
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

    // Basic content filtering (expand as needed)
    const bannedWords = ['spam', 'scam', 'hack'] // Add more as needed
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

    // Rate limiting check (simple version)
    const recentMessages = await prisma.chatMessage.findMany({
      where: {
        characterId: character.id,
        createdAt: {
          gte: new Date(Date.now() - 60000) // Last minute
        }
      }
    })

    if (recentMessages.length >= 10) {
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
    const chatMessage = await prisma.chatMessage.create({
      data: {
        locationId: locationId,
        characterId: character.id,
        message: message.trim(),
        messageType: messageType,
        isSystem: false
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
      }
    })

    // Update location last active timestamp
    await prisma.location.update({
      where: { id: locationId },
      data: { lastActive: new Date() }
    })

    // Transform message for response
    const transformedMessage = {
      id: chatMessage.id,
      message: chatMessage.message,
      messageType: chatMessage.messageType,
      isSystem: chatMessage.isSystem,
      timeAgo: 'now',
      createdAt: chatMessage.createdAt,
      character: {
        id: chatMessage.character.id,
        name: chatMessage.character.name,
        characterType: chatMessage.character.characterType,
        imageUrl: chatMessage.character.currentImageUrl
      },
      location: {
        id: chatMessage.location.id,
        name: chatMessage.location.name,
        locationType: chatMessage.location.locationType
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
  } finally {
    await prisma.$disconnect()
  }
}
