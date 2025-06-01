// netlify/functions/metadata.js
import { PrismaClient } from '@prisma/client'

let prisma

function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

// Configuration
const ASSET_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://earth.ndao.computer'
  : process.env.URL || 'http://localhost:8888'

/**
 * Generate trait attributes from character data
 */
function generateAttributes(character) {
  const attributes = []

  // Basic character traits
  attributes.push({
    trait_type: "Gender",
    value: character.gender
  })

  attributes.push({
    trait_type: "Character Type",
    value: character.characterType
  })

  // Location-based traits
  if (character.currentLocation) {
    attributes.push({
      trait_type: "Current Location",
      value: character.currentLocation.name
    })

    if (character.currentLocation.biome) {
      attributes.push({
        trait_type: "Biome",
        value: character.currentLocation.biome.charAt(0).toUpperCase() +
          character.currentLocation.biome.slice(1)
      })
    }
  }

  // Equipment traits
  if (character.inventory) {
    const equippedItems = character.inventory.filter(inv => inv.isEquipped)

    equippedItems.forEach(inv => {
      const item = inv.item
      attributes.push({
        trait_type: item.category.charAt(0).toUpperCase() +
          item.category.slice(1).toLowerCase(),
        value: item.name
      })
    })

    // Equipment count
    attributes.push({
      trait_type: "Equipped Items",
      value: equippedItems.length,
      display_type: "number"
    })
  }

  // Stats
  attributes.push({
    trait_type: "Energy",
    value: character.energy,
    max_value: 100,
    display_type: "boost_percentage"
  })

  attributes.push({
    trait_type: "Health",
    value: character.health,
    max_value: 100,
    display_type: "boost_percentage"
  })

  // Game progression (could be calculated)
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(character.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  attributes.push({
    trait_type: "Days Active",
    value: daysSinceCreation,
    display_type: "number"
  })

  return attributes
}

/**
 * Generate visible layers data
 */
function generateLayerData(character) {
  const layers = []

  // Background
  const backgroundName = character.currentLocation?.biome || 'mining-plains'
  layers.push(`${ASSET_BASE_URL}/layers/backgrounds/${backgroundName}.png`)

  // Base
  const baseName = character.gender?.toLowerCase() || 'male'
  layers.push(`${ASSET_BASE_URL}/layers/bases/${baseName}.png`)

  // Equipment layers
  if (character.inventory) {
    character.inventory
      .filter(inv => inv.isEquipped)
      .forEach(inv => {
        const item = inv.item
        let layerPath

        // Map items to layer paths
        switch (item.name) {
          case 'Miners Hat':
            layerPath = 'accessories/miners-hat.png'
            break
          case 'Cyber Jacket':
            layerPath = 'clothing/cyber-jacket.png'
            break
          case 'Work Gloves':
            layerPath = 'accessories/work-gloves.png'
            break
          case 'Lucky Charm':
            layerPath = 'accessories/lucky-charm.png'
            break
          // Add more mappings as needed
        }

        if (layerPath) {
          layers.push(`${ASSET_BASE_URL}/layers/${layerPath}`)
        }
      })
  }

  return layers
}

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=1800' // Cache for 30 minutes
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const prisma = getPrismaClient() // Initialize Prisma client
    // Extract token ID from path
    const pathParts = event.path.split('/')
    const tokenId = pathParts[pathParts.length - 1]

    if (!tokenId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token ID required' })
      }
    }

    // Get character data
    let character

    if (tokenId === 'demo' || tokenId === '1337') {
      // Demo character
      character = await prisma.character.findFirst({
        where: { name: "Wojak #1337" },
        include: {
          currentLocation: true,
          inventory: {
            where: { isEquipped: true },
            include: { item: true }
          }
        }
      })
    } else {
      // Try to find by tokenId first, then by ID
      character = await prisma.character.findFirst({
        where: {
          OR: [
            { tokenId: tokenId },
            { id: tokenId }
          ]
        },
        include: {
          currentLocation: true,
          inventory: {
            where: { isEquipped: true },
            include: { item: true }
          }
        }
      })
    }

    if (!character) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Character not found' })
      }
    }

    // Generate metadata
    const metadata = {
      name: character.name,
      description: `${character.name} is a ${character.characterType.toLowerCase()} explorer currently in ${character.currentLocation?.name || 'Unknown Location'}. Energy: ${character.energy}/100, Health: ${character.health}/100.`,
      image: `${ASSET_BASE_URL}/.netlify/functions/render-character/${character.tokenId || character.id}.png`,
      external_url: `${ASSET_BASE_URL}/character/${character.tokenId || character.id}`,

      // Standard NFT metadata
      attributes: generateAttributes(character),

      // Wojak Earth specific data
      wojak_earth: {
        character_id: character.id,
        token_id: character.tokenId,
        nft_address: character.nftAddress,
        current_location: {
          id: character.currentLocation?.id,
          name: character.currentLocation?.name,
          type: character.currentLocation?.locationType,
          biome: character.currentLocation?.biome
        },
        stats: {
          energy: character.energy,
          health: character.health,
          level: Math.floor((Date.now() - new Date(character.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1 // Rough level calculation
        },
        assets: {
          layers: generateLayerData(character),
          last_updated: new Date().toISOString()
        }
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
        error: 'Metadata generation failed',
        message: error.message
      })
    }
  }
}
