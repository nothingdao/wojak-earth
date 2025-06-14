// netlify/functions/buy-item.js - FIXED: Actually deduct coins!
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
    const { wallet_address, marketListingId, quantity = 1 } = JSON.parse(event.body || '{}')

    if (!wallet_address || !marketListingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Wallet address and market listing ID are required' })
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

    // Get market listing with item details
    const { data: marketListing, error: listingError } = await supabaseAdmin
      .from('market_listings')
      .select('*')
      .eq('id', marketListingId)
      .single()

    if (listingError) throw listingError

    if (!marketListing) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Market listing not found' })
      }
    }

    // Get the item details separately
    const { data: item, error: itemError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', marketListing.item_id)
      .single()

    if (itemError) throw itemError

    // Get the location details separately
    const { data: location, error: locationError } = await supabaseAdmin
      .from('locations')
      .select('*')
      .eq('id', marketListing.location_id)
      .single()

    if (locationError) throw locationError

    // Get seller if exists
    let seller = null
    if (marketListing.seller_id) {
      const { data: sellerData, error: sellerError } = await supabaseAdmin
        .from('characters')
        .select('*')
        .eq('id', marketListing.seller_id)
        .single()

      if (!sellerError) {
        seller = sellerData
      }
    }

    // Combine the data
    marketListing.item = item
    marketListing.location = location
    marketListing.seller = seller

    // Check if enough quantity available
    if (quantity > marketListing.quantity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Insufficient quantity',
          message: `Only ${marketListing.quantity} available, you requested ${quantity}`
        })
      }
    }

    // Calculate total cost
    const totalCost = marketListing.price * quantity

    // CRITICAL FIX: Check if character has enough coins
    if (character.coins < totalCost) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Insufficient funds',
          message: `You need ${totalCost} coins but only have ${character.coins}`,
          required: totalCost,
          available: character.coins
        })
      }
    }

    // CRITICAL FIX: Deduct coins from character
    const newCoinBalance = character.coins - totalCost
    const { data: updatedCharacter, error: coinDeductError } = await supabaseAdmin
      .from('characters')
      .update({ coins: newCoinBalance })
      .eq('id', character.id)
      .select('*')
      .single()

    if (coinDeductError) {
      console.error('Failed to deduct coins:', coinDeductError)
      throw coinDeductError
    }

    console.log(`💰 Deducted ${totalCost} coins from ${character.name}: ${character.coins} → ${newCoinBalance}`)

    // Add item to character inventory
    const { data: existingInventory } = await supabaseAdmin
      .from('character_inventory')
      .select('*')
      .eq('character_id', character.id)
      .eq('item_id', marketListing.item_id)
      .single()

    let inventoryItem
    if (existingInventory) {
      // Update existing inventory
      const { data: updatedInventory, error: updateError } = await supabaseAdmin
        .from('character_inventory')
        .update({ quantity: existingInventory.quantity + quantity })
        .eq('id', existingInventory.id)
        .select('*')
        .single()

      if (updateError) throw updateError
      inventoryItem = updatedInventory
      inventoryItem.item = item
    } else {
      // Generate a unique ID for the new inventory item
      const inventoryId = randomUUID()

      // Create new inventory entry
      const { data: newInventory, error: createError } = await supabaseAdmin
        .from('character_inventory')
        .insert({
          id: inventoryId,
          character_id: character.id,
          item_id: marketListing.item_id,
          quantity: quantity,
          is_equipped: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (createError) throw createError
      inventoryItem = newInventory
      inventoryItem.item = item
    }

    // Update market listing quantity
    const newQuantity = marketListing.quantity - quantity
    const { error: updateListingError } = await supabaseAdmin
      .from('market_listings')
      .update({ quantity: newQuantity })
      .eq('id', marketListingId)

    if (updateListingError) throw updateListingError

    // If quantity is now 0, delete the listing
    if (newQuantity <= 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('market_listings')
        .delete()
        .eq('id', marketListingId)

      if (deleteError) throw deleteError
    }

    // Log the transaction
    const transactionId = randomUUID()
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        id: transactionId,
        character_id: character.id,
        type: 'BUY',
        item_id: marketListing.item_id,
        quantity: quantity,
        amount: totalCost,
        description: `Bought ${quantity}x ${item.name} for ${totalCost} coins`
      })

    if (transactionError) {
      console.error('Failed to log transaction:', transactionError)
      // Don't throw, just log - transaction logging is not critical
    }

    // If there's a seller, give them the coins
    if (seller) {
      const sellerNewBalance = seller.coins + totalCost
      const { error: sellerUpdateError } = await supabaseAdmin
        .from('characters')
        .update({ coins: sellerNewBalance })
        .eq('id', seller.id)

      if (sellerUpdateError) {
        console.error('Failed to update seller balance:', sellerUpdateError)
        // Don't throw, just log - seller payment is not critical
      }

      // Log seller's transaction
      const sellerTransactionId = randomUUID()
      const { error: sellerTransactionError } = await supabaseAdmin
        .from('transactions')
        .insert({
          id: sellerTransactionId,
          character_id: seller.id,
          type: 'SELL',
          item_id: marketListing.item_id,
          quantity: quantity,
          amount: totalCost,
          description: `Sold ${quantity}x ${item.name} for ${totalCost} coins`
        })

      if (sellerTransactionError) {
        console.error('Failed to log seller transaction:', sellerTransactionError)
        // Don't throw, just log - transaction logging is not critical
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        character: updatedCharacter,
        inventory: inventoryItem,
        transaction: {
          id: transactionId,
          type: 'BUY',
          item: item,
          quantity: quantity,
          amount: totalCost
        }
      })
    }

  } catch (error) {
    console.error('Error in buy-item:', error)
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
