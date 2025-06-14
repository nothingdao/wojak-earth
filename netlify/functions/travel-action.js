// netlify/functions/travel-action.js - FIXED VERSION
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
    const { wallet_address, destinationId } = JSON.parse(event.body || '{}')

    if (!wallet_address || !destinationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Wallet address and destination ID are required' })
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

    // Get current location details - SIMPLIFIED QUERY
    const { data: currentLocation, error: currentError } = await supabaseAdmin
      .from('locations')
      .select('*')
      .eq('id', character.current_location_id)
      .single()

    if (currentError) {
      console.error('Error fetching current location:', currentError)
      throw currentError
    }

    // Get destination location - SIMPLIFIED QUERY (no self-joins)
    const { data: destination, error: destError } = await supabaseAdmin
      .from('locations')
      .select('*')
      .eq('id', destinationId)
      .single()

    if (destError) {
      console.error('Error fetching destination:', destError)
      throw destError
    }

    if (!destination) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Destination not found' })
      }
    }

    // Check if already at destination
    if (character.current_location_id === destinationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Already at destination',
          message: `You are already in ${destination.name}`
        })
      }
    }

    // Check level requirement
    if (destination.min_level && character.level < destination.min_level) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Level requirement not met',
          message: `${destination.name} requires level ${destination.min_level}. You are level ${character.level}.`,
          required: destination.min_level,
          current: character.level
        })
      }
    }

    // Check entry cost
    if (destination.entry_cost && character.coins < destination.entry_cost) {
      return {
        statusCode: 402,
        headers,
        body: JSON.stringify({
          error: 'Insufficient funds for entry',
          message: `${destination.name} costs ${destination.entry_cost} coins to enter. You have ${character.coins}.`,
          cost: destination.entry_cost,
          available: character.coins
        })
      }
    }

    // Check if private location (could require special access)
    if (destination.is_private) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Private location',
          message: `${destination.name} is a private location. Access restricted.`
        })
      }
    }

    // Calculate travel difficulty/distance health cost
    const travelHealthCost = Math.max(1, destination.difficulty - currentLocation.difficulty)
    const newHealth = Math.max(0, character.health - travelHealthCost)

    // Calculate new coin balance after entry cost
    const newCoins = destination.entry_cost ? character.coins - destination.entry_cost : character.coins

    // Update character location, health, and coins in a single query
    const { data: updatedCharacter, error: updateError } = await supabaseAdmin
      .from('characters')
      .update({
        current_location_id: destinationId,
        health: newHealth,
        coins: newCoins
      })
      .eq('id', character.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating character:', updateError)
      throw updateError
    }

    // Log the travel transaction
    const transactionId = randomUUID()
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        id: transactionId,
        character_id: character.id,
        type: 'TRAVEL',
        description: `Traveled from ${currentLocation.name} to ${destination.name}`,
        amount: destination.entry_cost || 0
      })

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
      // Don't throw here, just log - transaction logging is not critical
    }

    // Update player counts for both locations
    try {
      // Decrement old location
      await supabaseAdmin
        .from('locations')
        .update({
          player_count: Math.max(0, (currentLocation.player_count || 1) - 1)
        })
        .eq('id', character.current_location_id)

      // Increment new location
      await supabaseAdmin
        .from('locations')
        .update({
          player_count: (destination.player_count || 0) + 1,
          last_active: new Date().toISOString()
        })
        .eq('id', destinationId)
    } catch (countError) {
      console.error('Error updating location counts:', countError)
      // Don't throw here, just log - count updates are not critical
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        character: updatedCharacter,
        transaction: {
          id: transactionId,
          type: 'TRAVEL',
          description: `Traveled from ${currentLocation.name} to ${destination.name}`,
          amount: destination.entry_cost || 0
        },
        healthCost: travelHealthCost,
        entryCost: destination.entry_cost || 0
      })
    }

  } catch (error) {
    console.error('Error in travel-action:', error)
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
