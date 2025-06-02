// netlify/functions/travel-action.js - UPDATED
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
    const { walletAddress, destinationId } = JSON.parse(event.body || '{}')

    if (!walletAddress || !destinationId) {
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

    // Get current location details
    const { data: currentLocation, error: currentError } = await supabase
      .from('locations')
      .select('*')
      .eq('id', character.currentLocationId)
      .single()

    if (currentError) throw currentError

    // Get destination location
    const { data: destination, error: destError } = await supabase
      .from('locations')
      .select(`
        *,
        subLocations:locations!parentLocationId(*),
        parentLocation:locations!parentLocationId(*)
      `)
      .eq('id', destinationId)
      .single()

    if (destError) throw destError

    if (!destination) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Destination not found' })
      }
    }

    // Check if already at destination
    if (character.currentLocationId === destinationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Already at destination',
          message: `You are already in ${destination.name}`
        })
      }
    }

    // Update character location
    const { data: updatedCharacter, error: updateError } = await supabase
      .from('characters')
      .update({ currentLocationId: destinationId })
      .eq('id', character.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    // Log the travel transaction
    const transactionId = randomUUID()
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        characterId: character.id,
        type: 'TRAVEL',
        description: `Traveled from ${currentLocation.name} to ${destination.name}`
      })
      .select('*')
      .single()

    if (transactionError) throw transactionError

    // Update player counts
    const { error: decrementError } = await supabase
      .from('locations')
      .update({
        playerCount: Math.max(0, (currentLocation.playerCount || 1) - 1)
      })
      .eq('id', character.currentLocationId)

    if (decrementError) throw decrementError

    const { error: incrementError } = await supabase
      .from('locations')
      .update({
        playerCount: (destination.playerCount || 0) + 1,
        lastActive: new Date().toISOString()
      })
      .eq('id', destinationId)

    if (incrementError) throw incrementError

    // Attach current location to character for response
    updatedCharacter.currentLocation = destination

    const responseData = {
      success: true,
      message: `Welcome to ${destination.name}!`,
      newLocation: {
        id: destination.id,
        name: destination.name,
        description: destination.description,
        locationType: destination.locationType,
        biome: destination.biome,
        welcomeMessage: destination.welcomeMessage,
        lore: destination.lore,
        hasMarket: destination.hasMarket,
        hasMining: destination.hasMining,
        hasChat: destination.hasChat
      },
      previousLocation: {
        id: currentLocation.id,
        name: currentLocation.name
      },
      costs: {
        time: 0,
        energy: 0,
        money: 0,
        status: []
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
        message: 'Travel failed'
      })
    }
  }
}
