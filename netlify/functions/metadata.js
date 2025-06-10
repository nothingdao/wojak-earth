// netlify/functions/metadata.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Extract character ID from path: /metadata/{character_id}
    const pathParts = event.path.split('/')
    const character_id = pathParts[pathParts.length - 1]

    if (!character_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Character ID is required' })
      }
    }

    // Get character with full details
    const { data: character, error: characterError } = await supabase
      .from('characters')
      .select(`
        *,
        currentLocation:locations(
          id,
          name,
          location_type,
          biome
        ),
        inventory:character_inventory(
          quantity,
          is_equipped,
          item:items(
            name,
            category,
            rarity
          )
        )
      `)
      .eq('id', character_id)
      .eq('status', 'ACTIVE') // Only return metadata for active characters
      .single()

    if (characterError || !character) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Character not found',
          message: 'Character does not exist or is not active'
        })
      }
    }

    // Calculate derived stats
    const stats = calculateCharacterStats(character)

    // Build attributes array
    const attributes = [
      { trait_type: "Level", value: character.level.toString() },
      { trait_type: "Gender", value: character.gender },
      { trait_type: "Type", value: character.character_type },
      { trait_type: "Current_Location", value: character.currentLocation?.name || "Unknown" },
      { trait_type: "Energy", value: character.energy.toString() },
      { trait_type: "Health", value: character.health.toString() },
      { trait_type: "Coins", value: character.coins.toString() },
      { trait_type: "Character_Version", value: character.current_version.toString() },

      // Location attributes
      ...(character.currentLocation?.biome ? [{
        trait_type: "Current_Biome",
        value: character.currentLocation.biome
      }] : []),

      // Equipped items as traits
      ...getEquippedItemTraits(character.inventory),

      // Derived stats
      { trait_type: "Total_Items", value: stats.totalItems.toString() },
      { trait_type: "Equipped_Items", value: stats.equippedItems.toString() },
      { trait_type: "Inventory_Value", value: stats.inventoryValue.toString() },

      // Rarity distribution
      ...getRarityTraits(character.inventory),

      // Timestamps
      { trait_type: "Created", value: new Date(character.created_at).toISOString().split('T')[0] },
      { trait_type: "Last_Updated", value: new Date(character.updated_at).toISOString().split('T')[0] }
    ]

    // Generate dynamic description
    const description = generateCharacterDescription(character, stats)

    // Build NFT metadata
    const metadata = {
      name: character.name,
      description: description,
      image: character.current_image_url || "https://earth.ndao.computer/layers/bases/male.png",
      external_url: `https://earth.ndao.computer/character/${character.id}`,

      attributes: attributes.filter(attr => attr.value !== null && attr.value !== undefined),

      properties: {
        files: [
          {
            uri: character.current_image_url || "https://earth.ndao.computer/layers/bases/male.png",
            type: "image/png"
          }
        ],
        category: "image",
        creators: [
          {
            address: process.env.SERVER_KEYPAIR_PUBLIC || "",
            share: 100
          }
        ]
      },

      // Custom game data (not standard but useful)
      game_data: {
        character_id: character.id,
        wallet_address: character.wallet_address,
        nft_address: character.nft_address,
        current_location_id: character.currentlocation_id,
        stats: {
          level: character.level,
          energy: character.energy,
          health: character.health,
          coins: character.coins
        },
        version: character.current_version,
        last_updated: character.updated_at
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(metadata, null, 2)
    }

  } catch (error) {
    console.error('Error generating metadata:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate metadata',
        message: error.message
      })
    }
  }
}

// Helper: Calculate derived character stats
function calculateCharacterStats(character) {
  const inventory = character.inventory || []

  const totalItems = inventory.reduce((sum, inv) => sum + inv.quantity, 0)
  const equippedItems = inventory.filter(inv => inv.is_equipped).length

  // Simple inventory value calculation (based on rarity)
  const rarityValues = {
    'COMMON': 10,
    'UNCOMMON': 25,
    'RARE': 50,
    'EPIC': 100,
    'LEGENDARY': 250
  }

  const inventoryValue = inventory.reduce((sum, inv) => {
    const itemValue = rarityValues[inv.item?.rarity || 'COMMON'] || 10
    return sum + (itemValue * inv.quantity)
  }, 0)

  return {
    totalItems,
    equippedItems,
    inventoryValue
  }
}

// Helper: Get equipped items as traits
function getEquippedItemTraits(inventory) {
  const equippedItems = inventory?.filter(inv => inv.is_equipped) || []

  return equippedItems.map(inv => ({
    trait_type: `Equipped_${inv.item.category}`,
    value: inv.item.name
  }))
}

// Helper: Get rarity distribution traits
function getRarityTraits(inventory) {
  const rarityCount = {}

  inventory?.forEach(inv => {
    const rarity = inv.item?.rarity || 'COMMON'
    rarityCount[rarity] = (rarityCount[rarity] || 0) + inv.quantity
  })

  return Object.entries(rarityCount).map(([rarity, count]) => ({
    trait_type: `${rarity}_Items`,
    value: count.toString()
  }))
}

// Helper: Generate dynamic character description
function generateCharacterDescription(character, stats) {
  const location = character.currentLocation?.name || "an unknown location"
  const level = character.level
  const type = character.character_type.toLowerCase()
  const gender = character.gender.toLowerCase()

  let description = `${character.name} is a level ${level} ${gender} ${type} currently exploring ${location}.`

  // Add stats context
  if (character.energy < 30) {
    description += " They appear tired and need rest."
  } else if (character.energy > 90) {
    description += " They are full of energy and ready for adventure."
  }

  // Add inventory context
  if (stats.equippedItems > 0) {
    description += ` Currently equipped with ${stats.equippedItems} item${stats.equippedItems > 1 ? 's' : ''}.`
  }

  // Add wealth context
  if (character.coins > 1000) {
    description += " A wealthy adventurer with substantial resources."
  } else if (character.coins > 100) {
    description += " An experienced traveler with modest savings."
  } else {
    description += " A humble explorer just starting their journey."
  }

  return description
}

// Helper: Handle different character lookup methods
async function findCharacterByIdentifier(identifier) {
  // Try by character ID first
  let { data: character, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', identifier)
    .eq('status', 'ACTIVE')
    .single()

  if (!character && !error) {
    // Try by NFT address
    const result = await supabase
      .from('characters')
      .select('*')
      .eq('nft_address', identifier)
      .eq('status', 'ACTIVE')
      .single()

    character = result.data
    error = result.error
  }

  return { data: character, error }
}
