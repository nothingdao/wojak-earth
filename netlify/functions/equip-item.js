// netlify/functions/equip-item.js - UPDATED
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
    const { wallet_address, inventory_id } = JSON.parse(event.body || '{}')

    if (!wallet_address || !inventory_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          message: 'Wallet address and inventory ID are required'
        })
      }
    }

    // Get character by wallet address
    const { data: character, error: characterError } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('status', 'ACTIVE')
      .single()

    if (characterError) {
      if (characterError.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Character not found',
            message: 'No active character found for this wallet address'
          })
        }
      }
      throw characterError
    }

    // Get inventory item
    const { data: inventoryItem, error: inventoryError } = await supabaseAdmin
      .from('character_inventory')
      .select(`
        *,
        item:items(*)
      `)
      .eq('id', inventory_id)
      .single()

    if (inventoryError) {
      if (inventoryError.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Item not found',
            message: 'This item is not in your inventory'
          })
        }
      }
      throw inventoryError
    }

    // Verify ownership
    if (inventoryItem.character_id !== character.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Not your item',
          message: 'This item does not belong to your character'
        })
      }
    }

    // Check if item is equippable
    if (!['HAT', 'CLOTHING', 'ACCESSORY'].includes(inventoryItem.item.category)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Item not equippable',
          message: `${inventoryItem.item.name} cannot be equipped`
        })
      }
    }

    // Get current equipment
    const { data: currentEquipment, error: equipmentError } = await supabaseAdmin
      .from('character_equipment')
      .select('*')
      .eq('character_id', character.id)

    if (equipmentError) throw equipmentError

    // Determine slot based on item category
    let slot
    switch (inventoryItem.item.category) {
      case 'HAT': slot = 'head'; break
      case 'CLOTHING': slot = 'body'; break
      case 'ACCESSORY': slot = 'accessory'; break
      default: slot = 'misc'
    }

    // Check if slot is already occupied
    const existingItem = currentEquipment.find(eq => eq.slot === slot)

    // Start transaction
    const { error: transactionError } = await supabaseAdmin.rpc('equip_item', {
      p_character_id: character.id,
      p_inventory_id: inventory_id,
      p_slot: slot,
      p_existing_item_id: existingItem?.id || null
    })

    if (transactionError) throw transactionError

    // Log the transaction
    const transactionId = randomUUID()
    const { error: logError } = await supabaseAdmin
      .from('transactions')
      .insert({
        id: transactionId,
        character_id: character.id,
        type: 'EQUIP',
        item_id: inventoryItem.item_id,
        description: `Equipped ${inventoryItem.item.name} in ${slot} slot`
      })

    if (logError) {
      console.error('Failed to log equip transaction:', logError)
      // Don't throw, just log - transaction logging is not critical
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Equipped ${inventoryItem.item.name}`,
        slot,
        item: inventoryItem.item
      })
    }

  } catch (error) {
    console.error('Error in equip-item:', error)
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
