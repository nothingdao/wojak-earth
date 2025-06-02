// netlify/functions/buy-item.js - UPDATED
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
    const { walletAddress, marketListingId, quantity = 1 } = JSON.parse(event.body || '{}')

    if (!walletAddress || !marketListingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Wallet address and market listing ID are required' })
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

    // Get market listing with item details
    const { data: marketListing, error: listingError } = await supabase
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
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', marketListing.itemId)
      .single()

    if (itemError) throw itemError

    // Get the location details separately
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('*')
      .eq('id', marketListing.locationId)
      .single()

    if (locationError) throw locationError

    // Get seller if exists
    let seller = null
    if (marketListing.sellerId) {
      const { data: sellerData, error: sellerError } = await supabase
        .from('characters')
        .select('*')
        .eq('id', marketListing.sellerId)
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

    // Add item to character inventory
    const { data: existingInventory } = await supabase
      .from('character_inventory')
      .select('*')
      .eq('characterId', character.id)
      .eq('itemId', marketListing.itemId)
      .single()

    let inventoryItem
    if (existingInventory) {
      // Update existing inventory
      const { data: updatedInventory, error: updateError } = await supabase
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
      const { data: newInventory, error: createError } = await supabase
        .from('character_inventory')
        .insert({
          id: inventoryId,
          characterId: character.id,
          itemId: marketListing.itemId,
          quantity: quantity,
          isEquipped: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select('*')
        .single()

      if (createError) throw createError
      inventoryItem = newInventory
      inventoryItem.item = item
    }

    // Update or remove market listing
    let remainingQuantity = marketListing.quantity - quantity

    if (marketListing.quantity === quantity && !marketListing.isSystemItem) {
      // Only remove player listings when sold out
      const { error: deleteError } = await supabase
        .from('market_listings')
        .delete()
        .eq('id', marketListingId)

      if (deleteError) throw deleteError
    } else {
      // Reduce quantity (system items can go to 0 but stay in DB)
      const { error: updateError } = await supabase
        .from('market_listings')
        .update({ quantity: remainingQuantity })
        .eq('id', marketListingId)

      if (updateError) throw updateError
    }

    // Log the transaction
    const transactionId = randomUUID()
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        characterId: character.id,
        type: 'BUY',
        itemId: marketListing.itemId,
        quantity: quantity,
        description: `Bought ${quantity}x ${marketListing.item.name} for ${totalCost} coins from ${marketListing.location.name} market`
      })
      .select('*')
      .single()

    if (transactionError) throw transactionError

    const responseData = {
      success: true,
      message: `Successfully purchased ${quantity}x ${marketListing.item.name}!`,
      purchase: {
        itemName: marketListing.item.name,
        itemRarity: marketListing.item.rarity,
        quantity: quantity,
        totalCost: totalCost,
        newInventoryQuantity: inventoryItem.quantity
      },
      marketListing: {
        id: marketListingId,
        remainingQuantity: remainingQuantity,
        wasRemoved: remainingQuantity === 0 && !marketListing.isSystemItem
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    }

  } catch (error) {
    console.error('Error purchasing item:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Purchase failed'
      })
    }
  }
}
