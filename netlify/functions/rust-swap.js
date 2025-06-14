// netlify/functions/rust-swap.js - UPDATED
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
    const { wallet_address, item_id, quantity } = JSON.parse(event.body || '{}')

    if (!wallet_address || !item_id || !quantity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          message: 'Wallet address, item ID, and quantity are required'
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
            message: 'The specified item does not exist'
          })
        }
      }
      throw itemError
    }

    // Check if character has enough of the item
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('inventory')
      .select('*')
      .eq('character_id', character.id)
      .eq('item_id', item_id)
      .single()

    if (inventoryError) {
      if (inventoryError.code === 'PGRST116') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Insufficient items',
            message: 'You do not have any of this item'
          })
        }
      }
      throw inventoryError
    }

    if (!inventory || inventory.quantity < quantity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Insufficient items',
          message: 'You do not have enough of this item'
        })
      }
    }

    // Calculate rust value (base price * quantity * 0.8)
    const rustValue = Math.floor(item.base_price * quantity * 0.8)

    // Start transaction
    const { data: result, error: swapError } = await supabaseAdmin.rpc('rust_swap', {
      p_character_id: character.id,
      p_item_id: item_id,
      p_quantity: quantity,
      p_rust_value: rustValue
    })

    if (swapError) throw swapError

    // Log the transaction
    const transactionId = randomUUID()
    const { error: logError } = await supabaseAdmin
      .from('transactions')
      .insert({
        id: transactionId,
        character_id: character.id,
        type: 'RUST_SWAP',
        item_id: item_id,
        quantity: quantity,
        price: rustValue,
        description: `Swapped ${quantity} ${item.name} for ${rustValue} rust`
      })

    if (logError) {
      console.error('Failed to log rust swap transaction:', logError)
      // Don't throw, just log - transaction logging is not critical
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully swapped ${quantity} ${item.name} for ${rustValue} rust`,
        rust_value: rustValue
      })
    }

  } catch (error) {
    console.error('Error in rust-swap:', error)
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
