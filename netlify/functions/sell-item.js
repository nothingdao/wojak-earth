// netlify/functions/sell-item.js - Universal item selling system
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
    const { walletAddress, inventoryId, quantity = 1 } = JSON.parse(event.body || '{}')

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

    // Get inventory item with item details
    const { data: inventoryItem, error: inventoryError } = await supabase
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
    if (inventoryItem.characterId !== character.id) {
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
    if (inventoryItem.isEquipped) {
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
    const { data: updatedCharacter, error: coinUpdateError } = await supabase
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
      const { error: deleteError } = await supabase
        .from('character_inventory')
        .delete()
        .eq('id', inventoryId)

      if (deleteError) throw deleteError
    } else {
      // Reduce quantity
      const { data: reducedInventory, error: reduceError } = await supabase
        .from('character_inventory')
        .update({
          quantity: inventoryItem.quantity - quantity,
          updatedAt: new Date().toISOString()
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
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        characterId: character.id,
        type: 'SELL', // Add this to your transaction types if needed
        itemId: inventoryItem.item.id,
        quantity: quantity,
        description: `Sold ${quantity}x ${inventoryItem.item.name} for ${sellPrice} coins`,
        createdAt: new Date().toISOString()
      })
      .select('*')
      .single()

    if (transactionError) throw transactionError

    const responseData = {
      success: true,
      message: `Successfully sold ${quantity}x ${inventoryItem.item.name} for ${sellPrice} coins!`,
      sale: {
        itemName: inventoryItem.item.name,
        itemRarity: inventoryItem.item.rarity,
        itemCategory: inventoryItem.item.category,
        quantity: quantity,
        sellPrice: sellPrice,
        pricePerItem: Math.floor(sellPrice / quantity),
        newCoinBalance: newCoinBalance,
        previousCoinBalance: character.coins
      },
      inventory: {
        remainingQuantity: updatedInventory?.quantity || 0,
        wasRemoved: !updatedInventory
      },
      character: {
        id: character.id,
        coins: newCoinBalance,
        coinsEarned: sellPrice
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    }

  } catch (error) {
    console.error('Error selling item:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Sale failed',
        details: error.message
      })
    }
  }
}

// Calculate how much an item is worth when sold
function calculateSellPrice(item, quantity = 1) {
  let basePrice = 10 // Default base value

  // Base price by category
  const categoryPrices = {
    'MATERIAL': 15,      // Mining materials
    'CONSUMABLE': 8,     // Food, potions (less valuable used)
    'TOOL': 30,         // Tools, weapons
    'HAT': 20,          // Fashion items
    'CLOTHING': 25,     // Clothing
    'ACCESSORY': 35,    // Special accessories
    'OUTERWEAR': 40,    // Rare outerwear
  }

  basePrice = categoryPrices[item.category] || basePrice

  // Rarity multipliers (selling for less than retail)
  const rarityMultipliers = {
    'COMMON': 0.6,       // 60% of base value
    'UNCOMMON': 0.65,    // 65% of base value  
    'RARE': 0.7,         // 70% of base value
    'EPIC': 0.75,        // 75% of base value
    'LEGENDARY': 0.8     // 80% of base value
  }

  const rarityMultiplier = rarityMultipliers[item.rarity] || 0.6

  // Special bonuses for valuable items
  let specialBonus = 0
  if (item.energyEffect && item.energyEffect > 0) specialBonus += item.energyEffect * 0.5
  if (item.healthEffect && item.healthEffect > 0) specialBonus += item.healthEffect * 0.8

  // Calculate final price
  const itemValue = Math.floor((basePrice * rarityMultiplier) + specialBonus)
  const totalValue = itemValue * quantity

  // Minimum sell price (always get at least 3 coins per item)
  return Math.max(totalValue, quantity * 3)
}
