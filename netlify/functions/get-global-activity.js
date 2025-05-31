// netlify/functions/get-global-activity.js - Fixed for current schema
import { PrismaClient } from '@prisma/client'

let prisma

try {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  })
} catch (error) {
  console.error('Failed to initialize Prisma client:', error)
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

  console.log('Function called with:', {
    method: event.httpMethod,
    query: event.queryStringParameters,
    path: event.path
  })

  try {
    if (!prisma) {
      throw new Error('Prisma client not initialized')
    }

    await prisma.$connect()
    console.log('Database connected successfully')

    const limit = parseInt(event.queryStringParameters?.limit || '20')
    const timeWindow = parseInt(event.queryStringParameters?.timeWindow || '60')
    const includePlayer = event.queryStringParameters?.includePlayer === 'true'

    console.log('Query parameters:', { limit, timeWindow, includePlayer })

    const timeThreshold = new Date(Date.now() - timeWindow * 60 * 1000)
    console.log('Time threshold:', timeThreshold)

    // Build where clause
    const whereClause = {
      createdAt: {
        gte: timeThreshold
      }
    }

    // Optionally exclude the main player character
    if (!includePlayer) {
      whereClause.character = {
        NOT: {
          OR: [
            { name: "Wojak #1337" },
            { id: 'char_wojak_1337' }
          ]
        }
      }
    }

    console.log('Where clause:', JSON.stringify(whereClause, null, 2))

    // Get recent transactions - FIXED: Remove item include since relation doesn't exist
    console.log('Querying transactions...')
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        character: {
          select: {
            id: true,
            name: true,
            characterType: true,
            currentLocation: {
              select: {
                id: true,
                name: true,
                locationType: true,
                biome: true
              }
            }
          }
        }
        // REMOVED: item include since relation doesn't exist in schema
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    console.log(`Found ${transactions.length} transactions`)

    // Get unique item IDs to fetch item details separately
    const itemIds = [...new Set(transactions.filter(t => t.itemId).map(t => t.itemId))]
    console.log(`Found ${itemIds.length} unique items to fetch`)

    // Fetch item details separately
    const items = itemIds.length > 0 ? await prisma.item.findMany({
      where: {
        id: { in: itemIds }
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        rarity: true,
        imageUrl: true
      }
    }) : []

    // Create item lookup map
    const itemMap = items.reduce((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})

    console.log(`Created item map with ${Object.keys(itemMap).length} items`)

    // Transform transactions into activity format
    const activities = transactions.map(transaction => {
      const timeAgo = getTimeAgo(transaction.createdAt)

      // Parse additional details from description if it's an NPC action
      const isNPCAction = transaction.description.startsWith('[NPC]')
      const cleanDescription = isNPCAction
        ? transaction.description.replace('[NPC] ', '')
        : transaction.description

      // Get item details from our map
      const item = transaction.itemId ? itemMap[transaction.itemId] : null

      // Extract location from description if available
      let location = transaction.character?.currentLocation?.name
      const locationMatch = cleanDescription.match(/in ([^,]+)(?:,|$)/)
      if (locationMatch) {
        location = locationMatch[1]
      }

      // Determine activity details based on transaction type and description
      const details = {
        energyChange: null,
        healthChange: null,
        priceChange: null,
        fromLocation: null,
        toLocation: null,
        itemName: item?.name,
        itemRarity: item?.rarity,
        itemCategory: item?.category,
        quantity: transaction.quantity
      }

      // Extract more details from description
      if (transaction.type === 'TRAVEL') {
        const travelMatch = cleanDescription.match(/from (.+) to (.+)/)
        if (travelMatch) {
          details.fromLocation = travelMatch[1]
          details.toLocation = travelMatch[2]
          location = travelMatch[2]
        }
      } else if (transaction.type === 'MINE') {
        details.energyChange = -10 // Mining costs energy
      } else if (transaction.type === 'BUY') {
        const priceMatch = cleanDescription.match(/for (\d+) coins/)
        if (priceMatch) {
          details.priceChange = -parseInt(priceMatch[1])
        }
      } else if (transaction.type === 'SELL') {
        const priceMatch = cleanDescription.match(/for (\d+) coins/)
        if (priceMatch) {
          details.priceChange = parseInt(priceMatch[1])
        }
      }

      return {
        id: transaction.id,
        timestamp: transaction.createdAt.toISOString(),
        characterName: transaction.character?.name || 'Unknown',
        characterType: transaction.character?.characterType || 'HUMAN',
        actionType: transaction.type,
        description: cleanDescription,
        location: location,
        timeAgo: timeAgo,
        isNPCAction: isNPCAction,
        details: details
      }
    })

    // Generate summary statistics
    const summary = {
      totalActivities: activities.length,
      timeWindow: timeWindow,
      activeCharacters: new Set(activities.map(a => a.characterName)).size,
      npcActions: activities.filter(a => a.isNPCAction).length,
      playerActions: activities.filter(a => !a.isNPCAction).length,

      // Activity breakdown
      activityBreakdown: activities.reduce((acc, activity) => {
        acc[activity.actionType] = (acc[activity.actionType] || 0) + 1
        return acc
      }, {}),

      // Location activity
      locationActivity: activities
        .filter(a => a.location)
        .reduce((acc, activity) => {
          acc[activity.location] = (acc[activity.location] || 0) + 1
          return acc
        }, {}),

      // Most active characters
      characterActivity: Object.entries(
        activities.reduce((acc, activity) => {
          acc[activity.characterName] = (acc[activity.characterName] || 0) + 1
          return acc
        }, {})
      )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),

      timestamp: new Date().toISOString()
    }

    console.log('Returning response with', activities.length, 'activities')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        activities,
        summary,
        pagination: {
          limit,
          returned: activities.length,
          hasMore: activities.length === limit
        }
      })
    }

  } catch (error) {
    console.error('Detailed error in get-global-activity:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    })

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch global activity',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          code: error.code,
          stack: error.stack
        } : undefined
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
