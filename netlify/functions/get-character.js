// netlify/functions/get-character.js
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const prisma = getPrismaClient()  // ADD THIS LINE

    // For MVP, we'll use hardcoded character ID
    const characterId = event.queryStringParameters?.characterId || 'hardcoded-demo'

    let character

    if (characterId === 'hardcoded-demo') {
      // Return our seeded test character
      character = await prisma.character.findFirst({
        where: {
          name: "Wojak #1337"
        },
        include: {
          currentLocation: true,
          inventory: {
            include: {
              item: true
            }
          },
          imageHistory: {
            orderBy: {
              version: 'desc'
            },
            take: 5
          },
          transactions: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
            // Remove the item include since Transaction doesn't have a direct relation
          }
        }
      })
    } else {
      character = await prisma.character.findUnique({
        where: { id: characterId },
        include: {
          currentLocation: true,
          inventory: {
            include: {
              item: true
            }
          },
          imageHistory: {
            orderBy: {
              version: 'desc'
            },
            take: 5
          },
          transactions: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
          }
        }
      })
    }

    if (!character) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Character not found',
          message: 'No character exists with the provided ID'
        })
      }
    }

    // For transactions with itemId, we'll fetch the item separately if needed
    const transactionsWithItems = []
    for (const tx of character.transactions) {
      if (tx.itemId) {
        const item = await prisma.item.findUnique({
          where: { id: tx.itemId }
        })
        transactionsWithItems.push({
          ...tx,
          item: item ? { name: item.name, rarity: item.rarity } : null
        })
      } else {
        transactionsWithItems.push({ ...tx, item: null })
      }
    }

    // Transform the data for frontend consumption
    const responseData = {
      id: character.id,
      name: character.name,
      gender: character.gender,
      characterType: character.characterType,
      energy: character.energy,
      health: character.health,
      currentImageUrl: character.currentImageUrl,
      currentVersion: character.currentVersion,
      nftAddress: character.nftAddress,
      tokenId: character.tokenId,

      currentLocation: {
        id: character.currentLocation.id,
        name: character.currentLocation.name,
        description: character.currentLocation.description,
        locationType: character.currentLocation.locationType,
        biome: character.currentLocation.biome,
        welcomeMessage: character.currentLocation.welcomeMessage
      },

      inventory: character.inventory.map(inv => ({
        id: inv.id,
        quantity: inv.quantity,
        isEquipped: inv.isEquipped,
        item: {
          id: inv.item.id,
          name: inv.item.name,
          description: inv.item.description,
          category: inv.item.category,
          rarity: inv.item.rarity,
          imageUrl: inv.item.imageUrl,
          layerType: inv.item.layerType
        }
      })),

      imageHistory: character.imageHistory.map(img => ({
        version: img.version,
        imageUrl: img.imageUrl,
        description: img.description,
        createdAt: img.createdAt
      })),

      recentActivity: transactionsWithItems.map(tx => ({
        id: tx.id,
        type: tx.type,
        description: tx.description,
        quantity: tx.quantity,
        createdAt: tx.createdAt,
        item: tx.item
      }))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    }

  } catch (error) {
    console.error('Error fetching character:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to fetch character data'
      })
    }
  }
}
