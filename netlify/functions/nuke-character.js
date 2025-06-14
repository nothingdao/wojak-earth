// netlify/functions/nuke-character.js - FIXED VERSION
import supabaseAdmin from '../../src/utils/supabase-admin'
import { randomUUID } from 'crypto'

export const handler = async (event, context) => {
  console.log('🔥 NUKE CHARACTER FUNCTION CALLED')
  console.log('📥 Event method:', event.httpMethod)
  console.log('📥 Event body:', event.body)

  const headers = {
    'Content-Type': 'application/json', // ✅ ADD THIS
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ OPTIONS request - returning CORS headers')
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    console.log('❌ Invalid method:', event.httpMethod)
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    console.log('📋 Parsing request body...')
    const { character_id, wallet_address, burnSignature } = JSON.parse(event.body || '{}') // ✅ ACCEPT ALL PARAMS

    console.log('📋 Parsed data:', { character_id, wallet_address, burnSignature })

    if (!character_id || !wallet_address) { // ✅ REQUIRE BOTH
      console.log('❌ Missing required fields')
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          message: 'character_id and wallet_address are required'
        })
      }
    }

    console.log('🔍 Looking up character...')
    // Get character by ID and verify ownership
    const { data: character, error: characterError } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('id', character_id) // ✅ USE CHARACTER_ID
      .eq('wallet_address', wallet_address) // ✅ VERIFY OWNERSHIP
      .single()

    if (characterError) {
      console.error('Character lookup error:', characterError)
      if (characterError.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Character not found',
            message: 'No character found with this ID for your wallet'
          })
        }
      }
      throw characterError
    }

    console.log('✅ Character found:', character.name)

    // ✅ MANUAL DELETION INSTEAD OF RPC FUNCTION
    console.log('🗑️ Starting manual cleanup...')

    // Delete related records first (to avoid foreign key constraints)

    // 1. Delete inventory
    console.log('📦 Deleting character inventory...')
    const { error: inventoryError } = await supabaseAdmin
      .from('character_inventory')
      .delete()
      .eq('character_id', character_id)

    if (inventoryError) {
      console.error('Failed to delete inventory:', inventoryError)
      // Don't throw - continue cleanup
    } else {
      console.log('✅ Deleted character inventory')
    }

    // 2. Delete chat messages
    console.log('💬 Deleting chat messages...')
    const { error: chatError } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .eq('character_id', character_id)

    if (chatError) {
      console.error('Failed to delete chat messages:', chatError)
      // Don't throw - continue cleanup
    } else {
      console.log('✅ Deleted chat messages')
    }

    // 3. Delete character images
    console.log('🖼️ Deleting character images...')
    const { error: imagesError } = await supabaseAdmin
      .from('character_images')
      .delete()
      .eq('character_id', character_id)

    if (imagesError) {
      console.error('Failed to delete character images:', imagesError)
      // Don't throw - continue cleanup
    } else {
      console.log('✅ Deleted character images')
    }

    // 4. Delete transactions
    console.log('📊 Deleting transactions...')
    const { error: transactionsError } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('character_id', character_id)

    if (transactionsError) {
      console.error('Failed to delete transactions:', transactionsError)
      // Don't throw - continue cleanup
    } else {
      console.log('✅ Deleted transactions')
    }

    // 5. Finally delete the character
    console.log('👤 Deleting character record...')
    const { error: deleteError } = await supabaseAdmin
      .from('characters')
      .delete()
      .eq('id', character_id)
      .eq('wallet_address', wallet_address) // Double-check ownership

    if (deleteError) {
      console.error('Failed to delete character:', deleteError)
      throw deleteError
    }

    console.log('✅ Character deleted successfully')

    // 6. Log the nuke action (optional)
    try {
      console.log('📝 Logging nuke action...')
      const transactionId = randomUUID()
      const { error: logError } = await supabaseAdmin
        .from('transactions')
        .insert({
          id: transactionId,
          character_id: character_id, // This will reference the deleted character
          type: 'NUKE',
          description: `Character ${character.name} nuked by wallet ${wallet_address}`,
          created_at: new Date().toISOString(),
          txn_shard: burnSignature
        })

      if (logError) {
        console.error('Failed to log nuke transaction:', logError)
        // Don't throw - character is already deleted
      } else {
        console.log('✅ Logged nuke action')
      }
    } catch (logErr) {
      console.error('Log error:', logErr)
      // Don't throw - character is already deleted
    }

    console.log('🎉 Character nuke complete!')
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Character ${character.name} has been permanently destroyed`,
        character_name: character.name,
        nft_address: character.nft_address,
        deleted_at: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('❌ Error in nuke-character:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message || 'Failed to delete character',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}
