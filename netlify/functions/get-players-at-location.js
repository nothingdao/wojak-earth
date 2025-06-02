// netlify/functions/get-players-at-location.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // Get players at the location with their equipped items
    const { data: players, error } = await supabase
      .from('characters')
      .select(`
        id,
        name,
        gender,
        characterType,
        energy,
        health,
        currentImageUrl,
        createdAt,
        inventory:character_inventory!inner(
          isEquipped,
          item:items(
            name,
            category,
            rarity
          )
        )
      `)
      .eq('currentLocationId', locationId)
      .eq('inventory.isEquipped', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    // Also get players without equipped items
    const { data: allPlayers, error: allError } = await supabase
      .from('characters')
      .select(`
        id,
        name,
        gender,
        characterType,
        energy,
        health,
        currentImageUrl,
        createdAt
      `)
      .eq('currentLocationId', locationId)
      .order('name', { ascending: true })

    if (allError) {
      console.error('Supabase error:', allError)
      throw allError
    }

    const playersWithStatus = allPlayers.map(player => {
      let status = 'Idle'

      if (player.energy < 20) {
        status = 'Resting'
      } else if (player.energy > 90) {
        status = 'Energetic'
      } else if (players.some(p => p.id === player.id && p.inventory?.some(inv => inv.item.category === 'HAT'))) {
        status = 'Mining'
      } else if (player.energy < 50) {
        status = 'Tired'
      } else {
        const activities = ['Mining', 'Exploring', 'Trading', 'Chatting', 'Just Arrived']
        status = activities[Math.floor(Math.random() * activities.length)]
      }

      const daysSinceCreation = Math.floor((Date.now() - new Date(player.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      const level = Math.max(1, Math.floor(daysSinceCreation / 7) + Math.floor(Math.random() * 20) + 1)

      // Find equipped items for this player
      const playerWithItems = players.find(p => p.id === player.id)
      const equippedItems = playerWithItems?.inventory?.map(inv => ({
        name: inv.item.name,
        category: inv.item.category,
        rarity: inv.item.rarity
      })) || []

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
        equippedItems: equippedItems
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
