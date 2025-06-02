// netlify/functions/use-item.js - UPDATED
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
    const { walletAddress, inventoryId } = JSON.parse(event.body || '{}')

    if (!walletAddress || !inventoryId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Wallet address and inventory ID are required' })
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

    // Get inventory item
    const { data: inventoryItem, error: inventoryError } = await supabase
      .from('character_inventory')
      .select('*')
      .eq('id', inventoryId)
      .single()

    if (inventoryError) throw inventoryError

    if (!inventoryItem) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Inventory item not found' })
      }
    }

    // Get item details
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', inventoryItem.itemId)
      .single()

    if (itemError) throw itemError

    inventoryItem.item = item

    // Verify ownership
    if (inventoryItem.characterId !== character.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Item does not belong to this character' })
      }
    }

    // Check if item is consumable
    if (inventoryItem.item.category !== 'CONSUMABLE') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Item not consumable',
          message: `${inventoryItem.item.name} cannot be consumed`
        })
      }
    }

    // Check if there's quantity to consume
    if (inventoryItem.quantity <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No items to use',
          message: `You don't have any ${inventoryItem.item.name} to use`
        })
      }
    }

    // Calculate effects (capped at 100)
    const energyEffect = inventoryItem.item.energyEffect || 0
    const healthEffect = inventoryItem.item.healthEffect || 0

    const newEnergy = Math.min(100, character.energy + energyEffect)
    const newHealth = Math.min(100, character.health + healthEffect)

    const actualEnergyGain = newEnergy - character.energy
    const actualHealthGain = newHealth - character.health

    // Check if effects would be wasted
    if (actualEnergyGain === 0 && actualHealthGain === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No effect',
          message: `Using ${inventoryItem.item.name} would have no effect - you're already at full health and energy`
        })
      }
    }

    // Update character stats
    const { data: updatedCharacter, error: updateError } = await supabase
      .from('characters')
      .update({
        energy: newEnergy,
        health: newHealth
      })
      .eq('id', character.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    // Reduce inventory quantity or remove item
    let updatedInventory = null
    if (inventoryItem.quantity === 1) {
      // Remove item completely
      const { error: deleteError } = await supabase
        .from('character_inventory')
        .delete()
        .eq('id', inventoryId)

      if (deleteError) throw deleteError
    } else {
      // Reduce quantity
      const { data: reducedInventory, error: reduceError } = await supabase
        .from('character_inventory')
        .update({ quantity: inventoryItem.quantity - 1 })
        .eq('id', inventoryId)
        .select('*')
        .single()

      if (reduceError) throw reduceError
      updatedInventory = reducedInventory
      updatedInventory.item = item
    }

    // Log the transaction
    const transactionId = randomUUID()
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        characterId: character.id,
        type: 'MINE', // We can add 'USE' to the enum later, using MINE for now
        itemId: inventoryItem.itemId,
        quantity: 1,
        description: `Used ${inventoryItem.item.name}${actualEnergyGain > 0 || actualHealthGain > 0 ?
          ` (${[
            actualEnergyGain > 0 ? `+${actualEnergyGain} energy` : null,
            actualHealthGain > 0 ? `+${actualHealthGain} health` : null
          ].filter(Boolean).join(', ')})` : ''
          }`
      })
      .select('*')
      .single()

    if (transactionError) throw transactionError

    const responseData = {
      success: true,
      message: `Used ${inventoryItem.item.name}!`,
      effects: {
        energy: actualEnergyGain,
        health: actualHealthGain
      },
      newStats: {
        energy: updatedCharacter.energy,
        health: updatedCharacter.health
      },
      inventory: {
        remainingQuantity: updatedInventory?.quantity || 0,
        wasRemoved: !updatedInventory
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    }

  } catch (error) {
    console.error('Error using item:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to use item'
      })
    }
  }
}
