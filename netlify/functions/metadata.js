// netlify/functions/metadata.js
// Solana-compatible NFT Metadata endpoint for character NFTs

import supabaseAdmin from '../../src/utils/supabase-admin'

const supabase = supabaseAdmin

export const handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache' // Important for dynamic updates
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
    // Extract character ID from path
    const pathParts = event.path.split('/')
    const character_id = pathParts[pathParts.length - 1]

    if (!character_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Character ID required' })
      }
    }

    console.log('📋 Fetching metadata for character:', character_id)

    // Get comprehensive character data
    const { data: character, error } = await supabase
      .from('characters')
      .select(`
        id,
        name,
        gender,
        character_type,
        level,
        energy,
        health,
        earth,
        experience,
        current_location_id,
        current_image_url,
        birth_image_url,
        nft_address,
        wallet_address,
        created_at,
        updated_at,
        status
      `)
      .eq('id', character_id)
      .single()

    if (error || !character) {
      console.error('Character not found:', character_id)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          name: "Unknown Character",
          description: "Character data not found",
          image: "https://earth.ndao.computer/earth.png"
        })
      }
    }

    // Get character's current location
    const { data: location } = await supabase
      .from('locations')
      .select('name, biome')
      .eq('id', character.current_location_id)
      .single()

    // Get equipped items count
    const { count: equippedCount } = await supabase
      .from('character_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('character_id', character_id)
      .eq('is_equipped', true)

    // Calculate character age in days
    const createdDate = new Date(character.created_at)
    const now = new Date()
    const ageInDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

    // Determine rarity based on level and stats
    let rarity = "Common"
    if (character.level >= 50) rarity = "Legendary"
    else if (character.level >= 25) rarity = "Epic"
    else if (character.level >= 10) rarity = "Rare"
    else if (character.level >= 5) rarity = "Uncommon"

    // Generate Solana-compatible metadata
    const metadata = {
      name: character.name,
      symbol: "PLAYER",
      description: `${character.name} - A ${character.gender.toLowerCase()} survivor in the wasteland of Earth 2089. Level ${character.level} ${character.character_type.toLowerCase()} with ${character.health}/100 health and ${character.energy}/100 energy. Currently located in ${location?.name || 'Unknown'}. Forged ${ageInDays} days ago in the post-apocalyptic world.`,

      // Primary image - uses current appearance or birth certificate
      image: character.current_image_url || character.birth_image_url || "https://earth.ndao.computer/earth.png",

      // Solana standard fields
      external_url: `https://earth.ndao.computer/character/${character.id}`,
      animation_url: null,
      youtube_url: null,

      // Comprehensive attributes for Solana marketplaces
      attributes: [
        // Core character stats
        {
          trait_type: "Name",
          value: character.name
        },
        {
          trait_type: "Gender",
          value: character.gender
        },
        {
          trait_type: "Character Type",
          value: character.character_type
        },
        {
          trait_type: "Level",
          value: character.level,
          display_type: "number"
        },
        {
          trait_type: "Health",
          value: character.health,
          max_value: 100,
          display_type: "number"
        },
        {
          trait_type: "Energy",
          value: character.energy,
          max_value: 100,
          display_type: "number"
        },
        {
          trait_type: "Experience",
          value: character.experience || 0,
          display_type: "number"
        },
        {
          trait_type: "Earths",
          value: character.earth,
          display_type: "number"
        },

        // Location and world data
        {
          trait_type: "Current Location",
          value: location?.name || "Unknown"
        },
        {
          trait_type: "Biome",
          value: location?.biome || "Unknown"
        },

        // Equipment and progression
        {
          trait_type: "Equipped Items",
          value: equippedCount || 0,
          display_type: "number"
        },
        {
          trait_type: "Rarity",
          value: rarity
        },

        // Timestamps and history
        {
          trait_type: "Age (Days)",
          value: ageInDays,
          display_type: "number"
        },
        {
          trait_type: "Generation",
          value: "Genesis"
        },
        {
          trait_type: "Status",
          value: character.status || "Active"
        },

        // Blockchain data
        {
          trait_type: "Wallet",
          value: character.wallet_address
        },
        {
          trait_type: "NFT Address",
          value: character.nft_address || "Pending"
        }
      ],

      // Solana-specific properties
      properties: {
        category: "image",
        creators: [
          {
            address: process.env.TREASURY_WALLET_ADDRESS || "11111111111111111111111111111111",
            verified: true,
            share: 100
          }
        ],
        files: [
          {
            uri: character.current_image_url || character.birth_image_url || "https://earth.ndao.computer/earth.png",
            type: "image/png"
          }
        ]
      },

      // Collection information
      collection: {
        name: "EARTH 2089 Players",
        family: "Earth 2089"
      },

      // Additional metadata for game integration
      game_data: {
        character_id: character.id,
        level: character.level,
        health: character.health,
        energy: character.energy,
        earth: character.earth,
        location_id: character.current_location_id,
        last_updated: character.updated_at
      }
    }

    console.log('✅ Metadata generated for:', character.name)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(metadata, null, 2)
    }

  } catch (error) {
    console.error('❌ Metadata error:', error)

    // Return fallback metadata on error
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        name: "Earth 2089 Character",
        symbol: "PLAYER",
        description: "A character from Earth 2089 - Post-Apocalyptic Web3 MMORPG",
        image: "https://earth.ndao.computer/earth.png",
        attributes: [
          {
            trait_type: "Status",
            value: "Error Loading"
          }
        ],
        properties: {
          category: "image",
          creators: [
            {
              address: process.env.TREASURY_WALLET_ADDRESS || "11111111111111111111111111111111",
              verified: true,
              share: 100
            }
          ]
        },
        collection: {
          name: "EARTH 2089 Players",
          family: "Earth 2089"
        }
      }, null, 2)
    }
  }
}
