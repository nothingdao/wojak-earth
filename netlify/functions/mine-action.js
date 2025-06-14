// netlify/functions/mine-action.js - UPDATED
import supabaseAdmin from '../../src/utils/supabase-admin'
import { randomUUID } from 'crypto'

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
    const { wallet_address, location_id } = JSON.parse(event.body || '{}')

    if (!wallet_address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Wallet address is required' })
      }
    }

    // Get character by wallet address
    const { data: character, error } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('wallet_address', wallet_address)
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
    const mininglocation_id = location_id || character.current_location_id

    // Get location to verify mining is available
    const { data: location, error: locationError } = await supabaseAdmin
      .from('locations')
      .select('*')
      .eq('id', mininglocation_id)
      .single()

    if (locationError) throw locationError

    if (!location) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Location not found' })
      }
    }

    if (!location.has_mining) {
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
    const { data: updatedCharacter, error: updateError } = await supabaseAdmin
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
      const { data: availableItems, error: itemsError } = await supabaseAdmin
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
        const { data: existingInventory } = await supabaseAdmin
          .from('character_inventory')
          .select('*')
          .eq('character_id', character.id)
          .eq('item_id', foundItem.id)
          .single()

        if (existingInventory) {
          // Update existing inventory
          const { error: updateInvError } = await supabaseAdmin
            .from('character_inventory')
            .update({ quantity: existingInventory.quantity + 1 })
            .eq('id', existingInventory.id)

          if (updateInvError) throw updateInvError
        } else {
          // Create new inventory entry
          const inventoryId = randomUUID()
          const { error: createInvError } = await supabaseAdmin
            .from('character_inventory')
            .insert({
              id: inventoryId,
              character_id: character.id,
              item_id: foundItem.id,
              quantity: 1,
              is_equipped: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (createInvError) throw createInvError
        }

        // Log the mining transaction
        const transactionId = randomUUID()
        const { data: transaction, error: transactionError } = await supabaseAdmin
          .from('transactions')
          .insert({
            id: transactionId,
            character_id: character.id,
            type: 'MINE',
            item_id: foundItem.id,
            quantity: 1,
            description: `Mined ${foundItem.name} at ${location.name}`
          })
          .select('*')
          .single()

        if (transactionError) throw transactionError

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            character: updatedCharacter,
            found: {
              item: foundItem,
              quantity: 1
            },
            transaction: transaction,
            energyCost: energyCost
          })
        }
      }
    }

    // If nothing was found, still return success but with no item
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        character: updatedCharacter,
        found: null,
        energyCost: energyCost,
        message: 'No resources found this time'
      })
    }

  } catch (error) {
    console.error('Error in mine-action:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}
