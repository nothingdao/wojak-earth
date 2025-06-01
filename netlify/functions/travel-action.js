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
    const prisma = getPrismaClient()
    const { characterId = 'hardcoded-demo', destinationId } = JSON.parse(event.body || '{}')

    if (!destinationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Destination ID is required' })
      }
    }

    // Get character
    let character
    if (characterId === 'hardcoded-demo') {
      character = await prisma.character.findFirst({
        where: { name: "Wojak #1337" },
        include: { currentLocation: true }
      })
    } else {
      character = await prisma.character.findUnique({
        where: { id: characterId },
        include: { currentLocation: true }
      })
    }

    if (!character) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Character not found' })
      }
    }

    // Get destination location
    const destination = await prisma.location.findUnique({
      where: { id: destinationId },
      include: {
        subLocations: true,
        parentLocation: true
      }
    })

    if (!destination) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Destination not found' })
      }
    }

    // Check if already at destination
    if (character.currentLocationId === destinationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Already at destination',
          message: `You are already in ${destination.name}`
        })
      }
    }

    // TODO: Future travel requirements check
    // const requirements = getTravelRequirements(character.currentLocation, destination)
    // const canTravel = checkTravelRequirements(character, requirements)
    // if (!canTravel.allowed) {
    //   return { statusCode: 400, body: JSON.stringify({ error: canTravel.reason }) }
    // }

    // For MVP: Instant travel with no cost
    const result = await prisma.$transaction(async (tx) => {
      // Update character location
      const updatedCharacter = await tx.character.update({
        where: { id: character.id },
        data: {
          currentLocationId: destinationId
        },
        include: {
          currentLocation: true
        }
      })

      // Log the travel transaction
      const transaction = await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'TRAVEL',
          description: `Traveled from ${character.currentLocation.name} to ${destination.name}`
        }
      })

      // Update player counts (decrement old location, increment new location)
      await tx.location.update({
        where: { id: character.currentLocationId },
        data: {
          playerCount: { decrement: 1 }
        }
      })

      await tx.location.update({
        where: { id: destinationId },
        data: {
          playerCount: { increment: 1 },
          lastActive: new Date()
        }
      })

      return {
        character: updatedCharacter,
        transaction
      }
    })

    // Prepare response
    const responseData = {
      success: true,
      message: `Welcome to ${destination.name}!`,
      newLocation: {
        id: destination.id,
        name: destination.name,
        description: destination.description,
        locationType: destination.locationType,
        biome: destination.biome,
        welcomeMessage: destination.welcomeMessage,
        lore: destination.lore,
        hasMarket: destination.hasMarket,
        hasMining: destination.hasMining,
        hasChat: destination.hasChat
      },
      previousLocation: {
        id: character.currentLocation.id,
        name: character.currentLocation.name
      },
      // Future: costs incurred
      costs: {
        time: 0,      // minutes
        energy: 0,    // energy points
        money: 0,     // SOL
        status: []    // required items used
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    }

  } catch (error) {
    console.error('Error during travel:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Travel failed'
      })
    }
  }
}

// Future: Travel requirements calculation
function getTravelRequirements(origin, destination) {
  // Calculate based on:
  // - Distance (map coordinates)
  // - Difficulty difference
  // - Location type (REGION vs BUILDING vs ROOM)
  // - Special requirements per location

  return {
    time: 0,        // Will calculate based on distance/difficulty
    energy: 0,      // Will calculate based on terrain/difficulty  
    money: 0,       // Will be location-specific
    status: []      // Will check location.minLevel, required items, etc.
  }
}

function checkTravelRequirements(character, requirements) {
  // Check if character meets all requirements
  // - Has enough energy
  // - Can afford SOL cost
  // - Has required status items in inventory
  // - Meets level requirements

  return {
    allowed: true,
    reason: null
  }
}
