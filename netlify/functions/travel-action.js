// netlify/functions/travel-action.js - FIXED VERSION
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
    const { wallet_address, destinationId } = JSON.parse(event.body || '{}')

    if (!wallet_address || !destinationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Wallet address and destination ID are required' })
      }
    }

    // Get character by wallet address
    const { data: character, error } = await supabase
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
    const { data: currentLocation, error: currentError } = await supabase
      .from('locations')
      .select('*')
      .eq('id', character.current_location_id)
      .single()

    if (currentError) {
      console.error('Error fetching current location:', currentError)
      throw currentError
    }

    // Get destination location - SIMPLIFIED QUERY (no self-joins)
    const { data: destination, error: destError } = await supabase
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
    const { data: updatedCharacter, error: updateError } = await supabase
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
    const { error: transactionError } = await supabase
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
      await supabase
        .from('locations')
        .update({
          player_count: Math.max(0, (currentLocation.player_count || 1) - 1)
        })
        .eq('id', character.current_location_id)

      // Increment new location
      await supabase
        .from('locations')
        .update({
          player_count: (destination.player_count || 0) + 1,
          last_active: new Date().toISOString()
        })
        .eq('id', destinationId)
    } catch (locationUpdateError) {
      console.error('Error updating location player counts:', locationUpdateError)
      // Don't throw here, travel was successful
    }

    const responseData = {
      success: true,
      message: `Welcome to ${destination.name}!`,
      newLocation: {
        id: destination.id,
        name: destination.name,
        description: destination.description,
        location_type: destination.location_type,
        biome: destination.biome,
        welcome_message: destination.welcome_message,
        lore: destination.lore,
        has_market: destination.has_market,
        has_mining: destination.has_mining,
        has_chat: destination.has_chat
      },
      previousLocation: {
        id: currentLocation.id,
        name: currentLocation.name
      },
      costs: {
        time: 0,
        energy: 0,
        money: destination.entry_cost || 0,
        health: travelHealthCost,
        status: travelHealthCost > 0 ? [`Lost ${travelHealthCost} health from travel`] : []
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    }

  } catch (error) {
    console.error('Error during travel:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Travel failed',
        details: error.message
      })
    }
  }
}
