// netlify/functions/get-global-activity.js
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

  console.log('Function called with:', {
    method: event.httpMethod,
    query: event.queryStringParameters,
    path: event.path
  })

  try {
    const limit = parseInt(event.queryStringParameters?.limit || '20')
    const timeWindow = parseInt(event.queryStringParameters?.timeWindow || '60')
    const includePlayer = event.queryStringParameters?.includePlayer === 'true'

    console.log('Query parameters:', { limit, timeWindow, includePlayer })

    const timeThreshold = new Date(Date.now() - timeWindow * 60 * 1000).toISOString()
    console.log('Time threshold:', timeThreshold)

    // Get recent transactions
    console.log('Querying transactions...')
    let query = supabase
      .from('transactions')
      .select('*')
      .gte('created_at', timeThreshold)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Optionally exclude the main player character
    if (!includePlayer) {
      // Get the player character ID first
      const { data: playerChar } = await supabase
        .from('characters')
        .select('id')
        .eq('name', 'Wojak #1337')
        .single()

      if (playerChar) {
        query = query.neq('character_id', playerChar.id)
      }
    }

    const { data: transactions, error: transactionsError } = await query

    if (transactionsError) throw transactionsError

    console.log(`Found ${transactions?.length || 0} transactions`)

    if (!transactions || transactions.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          activities: [],
          summary: {
            totalActivities: 0,
            timeWindow: timeWindow,
            activeCharacters: 0,
            npcActions: 0,
            playerActions: 0,
            activityBreakdown: {},
            locationActivity: {},
            characterActivity: [],
            timestamp: new Date().toISOString()
          },
          pagination: {
            limit,
            returned: 0,
            hasMore: false
          }
        })
      }
    }

    // Get character details for all transactions
    const character_ids = [...new Set(transactions.map(t => t.character_id))]
    const { data: characters, error: charactersError } = await supabase
      .from('characters')
      .select(`
        id,
        name,
        character_type,
        current_location_id,
        currentLocation:locations(
          id,
          name,
          location_type,
          biome
        )
      `)
      .in('id', character_ids)

    if (charactersError) throw charactersError

    // Create character lookup map
    const characterMap = characters?.reduce((acc, char) => {
      acc[char.id] = char
      return acc
    }, {}) || {}

    // Get unique item IDs to fetch item details separately
    const item_ids = [...new Set(transactions.filter(t => t.item_id).map(t => t.item_id))]
    console.log(`Found ${item_ids.length} unique items to fetch`)

    // Fetch item details separately
    let items = []
    if (item_ids.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('id, name, description, category, rarity, image_url')
        .in('id', item_ids)

      if (itemsError) throw itemsError
      items = itemsData || []
    }

    // Create item lookup map
    const itemMap = items.reduce((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})

    console.log(`Created item map with ${Object.keys(itemMap).length} items`)

    // Transform transactions into activity format
    const activities = transactions.map(transaction => {
      const timeAgo = getTimeAgo(new Date(transaction.created_at))
      const character = characterMap[transaction.character_id]

      // Parse additional details from description if it's an NPC action
      const isNPCAction = transaction.description.startsWith('[NPC]')
      const cleanDescription = isNPCAction
        ? transaction.description.replace('[NPC] ', '')
        : transaction.description

      // Get item details from our map
      const item = transaction.item_id ? itemMap[transaction.item_id] : null

      // Extract location from description if available
      let location = character?.currentLocation?.name
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
        timestamp: transaction.created_at,
        characterName: character?.name || 'Unknown',
        character_type: character?.character_type || 'HUMAN',
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
