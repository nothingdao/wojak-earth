// netlify/functions/sell-item.js - Universal item selling system
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
    const { wallet_address, inventoryId, quantity = 1 } = JSON.parse(event.body || '{}')

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

    // Get inventory item with item details
    const { data: inventoryItem, error: inventoryError } = await supabaseAdmin
      .from('character_inventory')
      .select(`
        *,
        item:items(*)
      `)
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

    // Verify ownership
    if (inventoryItem.character_id !== character.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Item does not belong to this character' })
      }
    }

    // Check if enough quantity to sell
    if (quantity > inventoryItem.quantity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Insufficient quantity',
          message: `You only have ${inventoryItem.quantity} of this item, cannot sell ${quantity}`
        })
      }
    }

    // Check if item can be sold (equipped items cannot be sold)
    if (inventoryItem.is_equipped) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Cannot sell equipped item',
          message: 'Please unequip the item before selling'
        })
      }
    }

    // Calculate sell price based on item properties
    const sellPrice = calculateSellPrice(inventoryItem.item, quantity)

    console.log(`💰 ${character.name} selling ${quantity}x ${inventoryItem.item.name} for ${sellPrice} coins`)

    // Add coins to character
    const newCoinBalance = character.coins + sellPrice
    const { data: updatedCharacter, error: coinUpdateError } = await supabaseAdmin
      .from('characters')
      .update({ coins: newCoinBalance })
      .eq('id', character.id)
      .select('*')
      .single()

    if (coinUpdateError) {
      console.error('Failed to add coins:', coinUpdateError)
      throw coinUpdateError
    }

    // Update or remove inventory item
    let updatedInventory = null
    if (inventoryItem.quantity === quantity) {
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
        .update({
          quantity: inventoryItem.quantity - quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', inventoryId)
        .select('*')
        .single()

      if (reduceError) throw reduceError
      updatedInventory = reducedInventory
      updatedInventory.item = inventoryItem.item
    }

    // Log the sale transaction
    const transactionId = randomUUID()
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        id: transactionId,
        character_id: character.id,
        type: 'SELL',
        item_id: inventoryItem.item.id,
        quantity: quantity,
        amount: sellPrice,
        description: `Sold ${quantity}x ${inventoryItem.item.name} for ${sellPrice} coins`
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
          type: 'SELL',
          item: inventoryItem.item,
          quantity: quantity,
          amount: sellPrice
        }
      })
    }

  } catch (error) {
    console.error('Error in sell-item:', error)
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

// Helper function to calculate sell price based on item properties
function calculateSellPrice(item, quantity = 1) {
  // Base price multipliers by rarity
  const rarityMultipliers = {
    'COMMON': 0.5,
    'UNCOMMON': 0.6,
    'RARE': 0.7,
    'EPIC': 0.8,
    'LEGENDARY': 0.9
  }

  // Base price by category
  const categoryBasePrices = {
    'WEAPON': 100,
    'ARMOR': 80,
    'MATERIAL': 20,
    'CONSUMABLE': 15,
    'QUEST': 50,
    'MISC': 10
  }

  // Get base price for item category
  const basePrice = categoryBasePrices[item.category] || 10

  // Apply rarity multiplier
  const rarityMultiplier = rarityMultipliers[item.rarity] || 0.5

  // Calculate final price
  const pricePerItem = Math.floor(basePrice * rarityMultiplier)
  return pricePerItem * quantity
}
