// netlify/functions/mine-action.js - UPDATED
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    const { walletAddress, locationId } = JSON.parse(event.body || '{}')

    if (!walletAddress) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Wallet address is required' })
      }
    }

    // Get character by wallet address
    const { data: character, error } = await supabase
      .from('characters')
      .select('*')
      .eq('walletAddress', walletAddress)
      .eq('status', 'ACTIVE')
      .single()

    if (error || !character) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Character not found',
          message: 'No active character found for this wallet address'
        })
      }
    }

    // Check energy requirement
    const energyCost = 10
    if (character.energy < energyCost) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Insufficient energy',
          message: `You need at least ${energyCost} energy to mine. Current: ${character.energy}`
        })
      }
    }

    // Use current location if none specified
    const miningLocationId = locationId || character.currentLocationId

    // Get location to verify mining is available
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('*')
      .eq('id', miningLocationId)
      .single()

    if (locationError) throw locationError

    if (!location) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Location not found' })
      }
    }

    if (!location.hasMining) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Mining not available',
          message: `Mining is not available in ${location.name}`
        })
      }
    }

    // Deduct energy
    const newEnergyLevel = character.energy - energyCost
    const { data: updatedCharacter, error: updateError } = await supabase
      .from('characters')
      .update({ energy: newEnergyLevel })
      .eq('id', character.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    // Mining success rate and item finding logic
    const miningSuccessRate = 0.7 // 70% chance to find something
    const foundSomething = Math.random() < miningSuccessRate

    let foundItem = null

    if (foundSomething) {
      // Get available items for this location's biome/difficulty
      const { data: availableItems, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('category', 'MATERIAL') // Focus on mining materials
        .order('rarity')

      if (itemsError) throw itemsError

      // Simple rarity-based selection
      const rarityWeights = {
        'COMMON': 60,
        'UNCOMMON': 25,
        'RARE': 10,
        'EPIC': 4,
        'LEGENDARY': 1
      }

      // Create weighted array
      const weightedItems = []
      availableItems?.forEach(item => {
        const weight = rarityWeights[item.rarity] || 10
        for (let i = 0; i < weight; i++) {
          weightedItems.push(item)
        }
      })

      if (weightedItems.length > 0) {
        const randomIndex = Math.floor(Math.random() * weightedItems.length)
        foundItem = weightedItems[randomIndex]

        // Add item to character inventory
        const { data: existingInventory } = await supabase
          .from('character_inventory')
          .select('*')
          .eq('characterId', character.id)
          .eq('itemId', foundItem.id)
          .single()

        if (existingInventory) {
          // Update existing inventory
          const { error: updateInvError } = await supabase
            .from('character_inventory')
            .update({ quantity: existingInventory.quantity + 1 })
            .eq('id', existingInventory.id)

          if (updateInvError) throw updateInvError
        } else {
          // Create new inventory entry
          const inventoryId = randomUUID()
          const { error: createInvError } = await supabase
            .from('character_inventory')
            .insert({
              id: inventoryId,
              characterId: character.id,
              itemId: foundItem.id,
              quantity: 1,
              isEquipped: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })

          if (createInvError) throw createInvError
        }

        // Log the mining transaction
        const transactionId = randomUUID()
        const { data: transaction, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            id: transactionId,
            characterId: character.id,
            type: 'MINE',
            itemId: foundItem.id,
            quantity: 1,
            description: `Mined ${foundItem.name} at ${location.name}`
          })
          .select('*')
          .single()

        if (transactionError) throw transactionError
      }
    }

    // Prepare response
    const responseData = {
      success: true,
      message: foundItem ? `Found ${foundItem.name}!` : 'Nothing found this time...',
      newEnergyLevel: newEnergyLevel,
      energyCost: energyCost,
      foundItem: foundItem ? {
        id: foundItem.id,
        name: foundItem.name,
        description: foundItem.description,
        rarity: foundItem.rarity,
        category: foundItem.category
      } : null,
      location: {
        id: location.id,
        name: location.name
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    }

  } catch (error) {
    console.error('Error during mining:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Mining failed'
      })
    }
  }
}
