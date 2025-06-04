// netlify/functions/nuke-character.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
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
    const { characterId, walletAddress, burnSignature } = JSON.parse(event.body)

    if (!characterId || !walletAddress || !burnSignature) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing characterId, walletAddress, or burnSignature' })
      }
    }

    // 1. Verify character exists and belongs to wallet
    const { data: character, error: fetchError } = await supabase
      .from('characters')
      .select('id, name, nftAddress, walletAddress')
      .eq('id', characterId)
      .eq('walletAddress', walletAddress)
      .single()

    if (fetchError || !character) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Character not found' })
      }
    }

    // 2. Delete all related records first, then character
    console.log('Cleaning up all character data for:', character.name)

    // Delete in proper order to avoid foreign key violations
    const deleteQueries = [
      // Delete transactions first
      supabase.from('transactions').delete().eq('characterId', characterId),

      // Delete character inventory
      supabase.from('character_inventory').delete().eq('characterId', characterId),

      // Delete any other character-related records
      // Add more tables here as needed based on your schema

      // Finally delete the character
      supabase.from('characters').delete().eq('id', characterId)
    ]

    // Execute deletions in sequence
    for (let i = 0; i < deleteQueries.length; i++) {
      const { error } = await deleteQueries[i]
      if (error) {
        throw new Error(`Failed to delete character data: ${error.message}`)
      }
    }

    console.log('Character nuked successfully:', character.name, 'Burn signature:', burnSignature)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${character.name} has been permanently destroyed`
      })
    }

  } catch (error) {
    console.error('Error cleaning up character:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to clean up character'
      })
    }
  }
}
