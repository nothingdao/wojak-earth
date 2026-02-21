// netlify/functions/get-character-visual.js
// Simple JS API endpoint to get character visual data

import supabaseAdmin from '../../src/utils/supabase-admin'

const supabase = supabaseAdmin

export const handler = async (event) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    // Get character_id from query parameters
    const characterId = event.queryStringParameters?.character_id

    if (!characterId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing character_id parameter',
          message: 'Please provide character_id as a query parameter',
        }),
      }
    }

    console.log('🎨 Getting visual data for character:', characterId)

    // Get character base info
    const { data: character, error: characterError } = await supabase
      .from('characters')
      .select('id, name, gender, level')
      .eq('id', characterId)
      .single()

    if (characterError || !character) {
      console.error('Character not found:', characterError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Character not found',
          message: `No character found with id: ${characterId}`,
        }),
      }
    }

    // Get equipped items with layer info
    const { data: equippedItems, error: itemsError } = await supabase
      .from('character_inventory')
      .select(
        `
        id,
        equipped_slot,
        slot_index,
        is_primary,
        items (
          id,
          name,
          layer_type,
          layer_file,
          layer_gender,
          category,
          rarity
        )
      `
      )
      .eq('character_id', characterId)
      .eq('is_equipped', true)
      .order('equipped_slot')
      .order('slot_index')

    if (itemsError) {
      console.error('Items query error:', itemsError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Database error',
          message: itemsError.message,
        }),
      }
    }

    // Transform equipped items data
    const transformedItems = (equippedItems || []).map((item) => ({
      inventory_id: item.id,
      equipped_slot: item.equipped_slot || '',
      slot_index: item.slot_index || 1,
      is_primary: item.is_primary || false,
      item_name: item.items.name,
      layer_type: item.items.layer_type,
      layer_file: item.items.layer_file,
      layer_gender: item.items.layer_gender,
      layer_order: getLayerOrder(item.items.layer_type),
      category: item.items.category,
      rarity: item.items.rarity,
    }))

    const visualData = {
      character: {
        ...character,
        base_layer_file:
          character.gender === 'FEMALE' ? 'female.png' : 'male.png',
        base_gender: character.gender,
      },
      equipped_items: transformedItems,
    }

    console.log('✅ Visual data retrieved:', {
      characterId,
      characterName: visualData.character.name,
      equippedCount: visualData.equipped_items.length,
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: visualData,
        timestamp: new Date().toISOString(),
      }),
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message || 'Unknown error occurred',
      }),
    }
  }
}

// Helper function to get layer order for proper rendering
function getLayerOrder(layerType) {
  const layerOrders = {
    CLOTHING: 4,
    OUTERWEAR: 5,
    FACE_ACCESSORY: 7,
    HAT: 8,
    ACCESSORY: 9,
  }
  return layerOrders[layerType] || 0
}
