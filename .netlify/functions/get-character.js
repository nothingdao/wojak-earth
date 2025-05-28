import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  try {
    // For MVP, we'll use hardcoded character ID
    // In production, this would come from wallet authentication
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
            take: 5 // Last 5 versions
          },
          transactions: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 10, // Last 10 transactions
            include: {
              item: true
            }
          }
        }
      })
    } else {
      // In the future, look up by actual wallet address or NFT address
      character = await prisma.character.findUnique({
        where: {
          id: characterId
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
            take: 10,
            include: {
              item: true
            }
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

      recentActivity: character.transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        description: tx.description,
        quantity: tx.quantity,
        createdAt: tx.createdAt,
        item: tx.item ? {
          name: tx.item.name,
          rarity: tx.item.rarity
        } : null
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
  } finally {
    await prisma.$disconnect()
  }
}
