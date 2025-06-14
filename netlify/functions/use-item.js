// netlify/functions/use-item.js - UPDATED
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
    const { wallet_address, inventoryId } = JSON.parse(event.body || '{}')

    if (!wallet_address || !inventoryId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Wallet address and inventory ID are required' })
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

    // Get inventory item
    const { data: inventoryItem, error: inventoryError } = await supabaseAdmin
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
    const { data: item, error: itemError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', inventoryItem.item_id)
      .single()

    if (itemError) throw itemError

    inventoryItem.item = item

    // Verify ownership
    if (inventoryItem.character_id !== character.id) {
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
    const energy_effect = inventoryItem.item.energy_effect || 0
    const health_effect = inventoryItem.item.health_effect || 0

    const newEnergy = Math.min(100, character.energy + energy_effect)
    const newHealth = Math.min(100, character.health + health_effect)

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
    const { data: updatedCharacter, error: updateError } = await supabaseAdmin
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
      const { error: deleteError } = await supabaseAdmin
        .from('character_inventory')
        .delete()
        .eq('id', inventoryId)

      if (deleteError) throw deleteError
    } else {
      // Reduce quantity
      const { data: reducedInventory, error: reduceError } = await supabaseAdmin
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
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        id: transactionId,
        character_id: character.id,
        type: 'USE',
        item_id: inventoryItem.item_id,
        quantity: 1,
        description: `Used ${inventoryItem.item.name}${actualEnergyGain > 0 || actualHealthGain > 0 ?
          ` (${[
            actualEnergyGain > 0 ? `+${actualEnergyGain} energy` : null,
            actualHealthGain > 0 ? `+${actualHealthGain} health` : null
          ].filter(Boolean).join(', ')})` : ''
          }`
      })

    if (transactionError) {
      console.error('Failed to log transaction:', transactionError)
      // Don't throw, just log - transaction logging is not critical
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        character: updatedCharacter,
        inventory: updatedInventory,
        transaction: {
          id: transactionId,
          type: 'USE',
          item: item,
          quantity: 1,
          effects: {
            energy: actualEnergyGain,
            health: actualHealthGain
          }
        }
      })
    }

  } catch (error) {
    console.error('Error in use-item:', error)
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
