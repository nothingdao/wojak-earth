// netlify/functions/grant-experience.js - UPDATED
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
    const { wallet_address, amount, reason } = JSON.parse(event.body || '{}')

    if (!wallet_address || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          message: 'Wallet address and amount are required'
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

    // Calculate new experience and level
    const newExperience = character.experience + amount
    const newLevel = Math.floor(Math.sqrt(newExperience / 100)) + 1

    // Update character
    const { data: updatedCharacter, error: updateError } = await supabaseAdmin
      .from('characters')
      .update({
        experience: newExperience,
        level: newLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', character.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    // Log the transaction
    const transactionId = randomUUID()
    const { error: logError } = await supabaseAdmin
      .from('transactions')
      .insert({
        id: transactionId,
        character_id: character.id,
        type: 'EXPERIENCE',
        amount: amount,
        description: reason || `Granted ${amount} experience points`
      })

    if (logError) {
      console.error('Failed to log experience transaction:', logError)
      // Don't throw, just log - transaction logging is not critical
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Granted ${amount} experience points`,
        character: updatedCharacter,
        level_up: newLevel > character.level
      })
    }

  } catch (error) {
    console.error('Error in grant-experience:', error)
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
