// netlify/functions/equip-item.js - UPDATED FOR 6-SLOT SYSTEM
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Define slot mapping for each item type
const getSlotForItem = (item) => {
  // Tools use category, others use layerType
  if (item.category === 'TOOL') return 'tool'

  switch (item.layerType) {
    case 'CLOTHING': return 'clothing'
    case 'OUTERWEAR': return 'outerwear'
    case 'FACE_ACCESSORY': return 'face_accessory'
    case 'HAT': return 'headwear'
    case 'ACCESSORY': return 'misc_accessory'
    default: return null
  }
}

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
    const { walletAddress, inventoryId, equip = true, targetSlot } = JSON.parse(event.body || '{}')

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

    // Determine the slot for this item
    const itemSlot = getSlotForItem(inventoryItem.item)

    // Check if item is equippable
    if (!itemSlot) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Item not equippable',
          message: `${inventoryItem.item.category} items cannot be equipped`
        })
      }
    }

    // Use provided targetSlot or auto-detect
    const finalTargetSlot = targetSlot || itemSlot

    let replacedItems = []
    let result

    if (equip) {
      // Check for conflicting items in the target slot
      const { data: conflictingItems, error: conflictError } = await supabase
        .from('character_inventory')
        .select(`
          *,
          item:items(*)
        `)
        .eq('characterId', character.id)
        .eq('isEquipped', true)
        .eq('equippedSlot', finalTargetSlot)
        .neq('id', inventoryId)

      if (conflictError) throw conflictError

      // Unequip conflicting items in the same slot
      if (conflictingItems && conflictingItems.length > 0) {
        for (const conflictItem of conflictingItems) {
          const { error: unequipError } = await supabase
            .from('character_inventory')
            .update({
              isEquipped: false,
              equippedSlot: null
            })
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

        replacedItems = conflictingItems.map(item => item.item.name)
      }

      // Equip the new item in the target slot
      const { data: updatedItem, error: equipError } = await supabase
        .from('character_inventory')
        .update({
          isEquipped: true,
          equippedSlot: finalTargetSlot
        })
        .eq('id', inventoryId)
        .select(`
          *,
          item:items(*)
        `)
        .single()

      if (equipError) throw equipError

      const equipTransactionId = randomUUID()
      const { error: equipTxError } = await supabase
        .from('transactions')
        .insert({
          id: equipTransactionId,
          characterId: character.id,
          type: 'EQUIP',
          itemId: inventoryItem.itemId,
          description: `Equipped ${inventoryItem.item.name} in ${finalTargetSlot} slot`
        })

      if (equipTxError) throw equipTxError

      result = {
        action: 'equipped',
        item: updatedItem,
        replacedItems: replacedItems,
        slot: finalTargetSlot
      }

    } else {
      // Unequip the item
      const { data: updatedItem, error: unequipError } = await supabase
        .from('character_inventory')
        .update({
          isEquipped: false,
          equippedSlot: null
        })
        .eq('id', inventoryId)
        .select(`
          *,
          item:items(*)
        `)
        .single()

      if (unequipError) throw unequipError

      const unequipTransactionId = randomUUID()
      const { error: unequipTxError } = await supabase
        .from('transactions')
        .insert({
          id: unequipTransactionId,
          characterId: character.id,
          type: 'UNEQUIP',
          itemId: inventoryItem.itemId,
          description: `Unequipped ${inventoryItem.item.name} from ${inventoryItem.equippedSlot || 'unknown'} slot`
        })

      if (unequipTxError) throw unequipTxError

      result = {
        action: 'unequipped',
        item: updatedItem,
        replacedItems: [],
        slot: null
      }
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
        layerType: result.item.item.layerType,
        equippedSlot: result.item.equippedSlot
      },
      action: result.action,
      replacedItems: result.replacedItems,
      slot: result.slot,
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
