// netlify/functions/npc-exchange.js - NPCs trade coins for SOL at market rates
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
    const { wallet_address, npc_id, item_id, quantity = 1 } = JSON.parse(event.body || '{}')

    if (!wallet_address || !npc_id || !item_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          message: 'Wallet address, NPC ID, and item ID are required'
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

    // Get NPC
    const { data: npc, error: npcError } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('id', npc_id)
      .eq('character_type', 'NPC')
      .single()

    if (npcError) {
      if (npcError.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'NPC not found',
            message: 'This NPC does not exist or is not available'
          })
        }
      }
      throw npcError
    }

    // Get item details
    const { data: item, error: itemError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', item_id)
      .single()

    if (itemError) {
      if (itemError.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Item not found',
            message: 'This item does not exist'
          })
        }
      }
      throw itemError
    }

    // Check if NPC has the item
    const { data: npcInventory, error: inventoryError } = await supabaseAdmin
      .from('character_inventory')
      .select('*')
      .eq('character_id', npc_id)
      .eq('item_id', item_id)
      .single()

    if (inventoryError) {
      if (inventoryError.code === 'PGRST116') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Item not available',
            message: 'This NPC does not have this item'
          })
        }
      }
      throw inventoryError
    }

    // Check if NPC has enough quantity
    if (npcInventory.quantity < quantity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Insufficient quantity',
          message: `NPC only has ${npcInventory.quantity} of this item`
        })
      }
    }

    // Calculate exchange value
    const exchangeValue = item.base_price * quantity

    // Check if character has enough coins
    if (character.coins < exchangeValue) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Insufficient funds',
          message: `You need ${exchangeValue} coins to make this exchange`
        })
      }
    }

    // Start transaction
    const { error: transactionError } = await supabaseAdmin.rpc('npc_exchange', {
      p_character_id: character.id,
      p_npc_id: npc_id,
      p_item_id: item_id,
      p_quantity: quantity,
      p_exchange_value: exchangeValue
    })

    if (transactionError) throw transactionError

    // Log the transaction
    const transactionId = randomUUID()
    const { error: logError } = await supabaseAdmin
      .from('transactions')
      .insert({
        id: transactionId,
        character_id: character.id,
        type: 'EXCHANGE',
        item_id: item_id,
        quantity: quantity,
        price: exchangeValue,
        description: `Exchanged ${quantity}x ${item.name} with ${npc.name} for ${exchangeValue} coins`
      })

    if (logError) {
      console.error('Failed to log exchange transaction:', logError)
      // Don't throw, just log - transaction logging is not critical
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully exchanged ${quantity}x ${item.name} with ${npc.name}`,
        exchange: {
          item: item,
          quantity: quantity,
          value: exchangeValue
        }
      })
    }

  } catch (error) {
    console.error('Error in npc-exchange:', error)
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
