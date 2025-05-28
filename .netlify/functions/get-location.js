import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    // Fetch all top-level locations (no parent) with their sub-locations
    const locations = await prisma.location.findMany({
      where: {
        parentLocationId: null // Only top-level locations
      },
      include: {
        subLocations: {
          orderBy: {
            name: 'asc'
          }
        },
        _count: {
          select: {
            characters: true // Get actual player count
          }
        }
      },
      orderBy: {
        difficulty: 'asc' // Easier locations first
      }
    })

    // Transform data for frontend
    const responseData = locations.map(location => ({
      id: location.id,
      name: location.name,
      description: location.description,
      locationType: location.locationType,
      biome: location.biome,
      difficulty: location.difficulty,
      playerCount: location._count.characters, // Real player count
      lastActive: location.lastActive,
      hasMarket: location.hasMarket,
      hasMining: location.hasMining,
      hasChat: location.hasChat,
      welcomeMessage: location.welcomeMessage,
      lore: location.lore,

      subLocations: location.subLocations.map(subLoc => ({
        id: subLoc.id,
        name: subLoc.name,
        description: subLoc.description,
        locationType: subLoc.locationType,
        difficulty: subLoc.difficulty,
        playerCount: subLoc.playerCount, // This might be cached for performance
        hasMarket: subLoc.hasMarket,
        hasMining: subLoc.hasMining,
        hasChat: subLoc.hasChat,
        welcomeMessage: subLoc.welcomeMessage,
        parentLocationId: subLoc.parentLocationId
      }))
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        locations: responseData,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching locations:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to fetch locations'
      })
    }
  } finally {
    await prisma.$disconnect()
  }
}
