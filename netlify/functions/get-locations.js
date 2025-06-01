import { PrismaClient } from '@prisma/client'

let prisma

function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

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
    const prisma = getPrismaClient()  // Initialize Prisma client
    // Fetch all top-level locations (no parent) with their sub-locations
    const locations = await prisma.location.findMany({
      where: {
        parentLocationId: null // Only top-level locations
      },
      include: {
        subLocations: {
          include: {
            _count: {
              select: {
                characters: true // Count characters in each sub-location
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        },
        _count: {
          select: {
            characters: true // Count characters directly in parent location
          }
        }
      },
      orderBy: {
        difficulty: 'asc' // Easier locations first
      }
    })

    // Transform data for frontend with aggregated player counts
    const responseData = locations.map(location => {
      // Calculate total players: direct + all sub-locations
      const directPlayerCount = location._count.characters
      const subLocationPlayerCount = location.subLocations.reduce((total, subLoc) => {
        return total + subLoc._count.characters
      }, 0)
      const totalPlayerCount = directPlayerCount + subLocationPlayerCount

      return {
        id: location.id,
        name: location.name,
        description: location.description,
        locationType: location.locationType,
        biome: location.biome,
        difficulty: location.difficulty,
        playerCount: totalPlayerCount, // Aggregated count
        directPlayerCount: directPlayerCount, // Players directly at this location
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
          playerCount: subLoc._count.characters, // Real player count for sub-location
          hasMarket: subLoc.hasMarket,
          hasMining: subLoc.hasMining,
          hasChat: subLoc.hasChat,
          welcomeMessage: subLoc.welcomeMessage,
          parentLocationId: subLoc.parentLocationId
        }))
      }
    })

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
  }
}
