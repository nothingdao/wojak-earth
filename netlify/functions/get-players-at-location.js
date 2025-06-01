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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  try {
    const locationId = event.queryStringParameters?.locationId

    if (!locationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Location ID is required' })
      }
    }

    const players = await prisma.character.findMany({
      where: {
        currentLocationId: locationId
      },
      select: {
        id: true,
        name: true,
        gender: true,
        characterType: true,
        energy: true,
        health: true,
        currentImageUrl: true,
        createdAt: true,
        inventory: {
          where: { isEquipped: true },
          include: { item: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const playersWithStatus = players.map(player => {
      let status = 'Idle'

      if (player.energy < 20) {
        status = 'Resting'
      } else if (player.energy > 90) {
        status = 'Energetic'
      } else if (player.inventory.some(inv => inv.item.category === 'HAT')) {
        status = 'Mining'
      } else if (player.energy < 50) {
        status = 'Tired'
      } else {
        const activities = ['Mining', 'Exploring', 'Trading', 'Chatting', 'Just Arrived']
        status = activities[Math.floor(Math.random() * activities.length)]
      }

      const daysSinceCreation = Math.floor((Date.now() - player.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      const level = Math.max(1, Math.floor(daysSinceCreation / 7) + Math.floor(Math.random() * 20) + 1)

      return {
        id: player.id,
        name: player.name,
        gender: player.gender,
        characterType: player.characterType,
        level: level,
        energy: player.energy,
        health: player.health,
        status: status,
        currentImageUrl: player.currentImageUrl,
        equippedItems: player.inventory.map(inv => ({
          name: inv.item.name,
          category: inv.item.category,
          rarity: inv.item.rarity
        }))
      }
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        players: playersWithStatus,
        totalCount: playersWithStatus.length,
        locationId: locationId,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching players:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to fetch players at location'
      })
    }
  }
}
