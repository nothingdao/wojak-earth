// netlify/functions/equip-item.js - UPDATED
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
    const { walletAddress, inventoryId, equip = true } = JSON.parse(event.body || '{}')

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

    // Check if item is equippable
    const equipableCategories = ['HAT', 'CLOTHING', 'ACCESSORY', 'TOOL']
    if (!equipableCategories.includes(inventoryItem.item.category)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Item not equippable',
          message: `${inventoryItem.item.category} items cannot be equipped`
        })
      }
    }

    let replacedItems = []
    let result

    if (equip) {
      // Find conflicting items in the same category to auto-unequip
      const { data: conflictingItems, error: conflictError } = await supabase
        .from('character_inventory')
        .select(`
          *,
          item:items(*)
        `)
        .eq('characterId', character.id)
        .eq('isEquipped', true)
        .neq('id', inventoryId)

      if (conflictError) throw conflictError

      // Filter for same category items
      const sameCategory = conflictingItems?.filter(ci => ci.item.category === inventoryItem.item.category) || []

      // Unequip conflicting items
      if (sameCategory.length > 0) {
        for (const conflictItem of sameCategory) {
          const { error: unequipError } = await supabase
            .from('character_inventory')
            .update({ isEquipped: false })
            .eq('id', conflictItem.id)

          if (unequipError) throw unequipError

          const unequipTransactionId = randomUUID()
          const { error: unequipTxError } = await supabase
            .from('transactions')
            .insert({
              id: unequipTransactionId,
              characterId: character.id,
              type: 'UNEQUIP',
              itemId: conflictItem.itemId,
              description: `Auto-unequipped ${conflictItem.item.name} (replaced by ${inventoryItem.item.name})`
            })

          if (unequipTxError) throw unequipTxError
        }

        replacedItems = sameCategory.map(item => item.item.name)
      }

      // Equip the new item
      const { data: updatedItem, error: equipError } = await supabase
        .from('character_inventory')
        .update({ isEquipped: true })
        .eq('id', inventoryId)
        .select('*')
        .single()

      if (equipError) throw equipError

      updatedItem.item = item

      const equipTransactionId = randomUUID()
      const { error: equipTxError } = await supabase
        .from('transactions')
        .insert({
          id: equipTransactionId,
          characterId: character.id,
          type: 'EQUIP',
          itemId: inventoryItem.itemId,
          description: `Equipped ${inventoryItem.item.name}`
        })

      if (equipTxError) throw equipTxError

      result = {
        action: 'equipped',
        item: updatedItem,
        replacedItems: replacedItems
      }

    } else {
      // Unequip the item
      const { data: updatedItem, error: unequipError } = await supabase
        .from('character_inventory')
        .update({ isEquipped: false })
        .eq('id', inventoryId)
        .select('*')
        .single()

      if (unequipError) throw unequipError

      updatedItem.item = item

      const unequipTransactionId = randomUUID()
      const { error: unequipTxError } = await supabase
        .from('transactions')
        .insert({
          id: unequipTransactionId,
          characterId: character.id,
          type: 'UNEQUIP',
          itemId: inventoryItem.itemId,
          description: `Unequipped ${inventoryItem.item.name}`
        })

      if (unequipTxError) throw unequipTxError

      result = { action: 'unequipped', item: updatedItem, replacedItems: [] }
    }

    const statEffects = {
      energy: inventoryItem.item.energyEffect || 0,
      health: inventoryItem.item.healthEffect || 0
    }

    let message = `${inventoryItem.item.name} ${result.action} successfully!`
    if (result.replacedItems.length > 0) {
      message += ` (Replaced: ${result.replacedItems.join(', ')})`
    }

    const responseData = {
      success: true,
      message: message,
      item: {
        id: result.item.id,
        name: result.item.item.name,
        category: result.item.item.category,
        rarity: result.item.item.rarity,
        isEquipped: result.item.isEquipped,
        layerType: result.item.item.layerType
      },
      action: result.action,
      replacedItems: result.replacedItems,
      statEffects: equip ? statEffects : { energy: -statEffects.energy, health: -statEffects.health }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    }

  } catch (error) {
    console.error('Error equipping/unequipping item:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Equipment action failed',
        details: error.message
      })
    }
  }
}
