// netlify/functions/render-character.js
import { PrismaClient } from '@prisma/client'

// For now, let's create a simple version without Sharp since it might be causing issues
const prisma = new PrismaClient()

// Configuration
const ASSET_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://earth.ndao.computer'
  : process.env.URL || 'http://localhost:8888'

/**
 * Generate character layers from database data
 */
function generateCharacterLayers(character) {
  const layers = []

  // Background layer
  const backgroundName = character.currentLocation?.biome || 'mining-plains'
  layers.push({
    type: 'backgrounds',
    name: backgroundName,
    url: `${ASSET_BASE_URL}/layers/backgrounds/${backgroundName}.png`,
    visible: true,
    zIndex: 0
  })

  // Base layer
  const baseName = character.gender?.toLowerCase() || 'male'
  layers.push({
    type: 'bases',
    name: baseName,
    url: `${ASSET_BASE_URL}/layers/bases/${baseName}.png`,
    visible: true,
    zIndex: 1
  })

  // Equipment layers from inventory
  if (character.inventory) {
    character.inventory
      .filter(inv => inv.isEquipped)
      .forEach(inv => {
        const item = inv.item
        let layerType, layerName

        // Map items to layers
        switch (item.category) {
          case 'HAT':
            if (item.name === 'Miners Hat') {
              layerType = 'accessories'
              layerName = 'miners-hat'
            }
            break
          case 'CLOTHING':
            if (item.name === 'Cyber Jacket') {
              layerType = 'clothing'
              layerName = 'cyber-jacket'
            } else if (item.name === 'Work Gloves') {
              layerType = 'accessories'
              layerName = 'work-gloves'
            }
            break
          case 'ACCESSORY':
            if (item.name === 'Lucky Charm') {
              layerType = 'accessories'
              layerName = 'lucky-charm'
            }
            break
        }

        if (layerType && layerName) {
          layers.push({
            type: layerType,
            name: layerName,
            url: `${ASSET_BASE_URL}/layers/${layerType}/${layerName}.png`,
            visible: true,
            zIndex: layerType === 'clothing' ? 2 : 3
          })
        }
      })
  }

  // Sort by z-index
  return layers.sort((a, b) => a.zIndex - b.zIndex)
}

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Extract character ID from path
    const pathParts = event.path.split('/')
    const characterParam = pathParts[pathParts.length - 1]
    const characterId = characterParam.replace('.png', '')

    if (!characterId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Character ID required' })
      }
    }

    // Get character data
    let character

    if (characterId === 'demo' || characterId === '1337') {
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
      // Real character by ID
      character = await prisma.character.findUnique({
        where: { id: characterId },
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

    // For now, just return the layer information as JSON until we get Sharp working
    // Generate layers
    const layers = generateCharacterLayers(character)

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        character: {
          id: character.id,
          name: character.name,
          location: character.currentLocation?.name
        },
        layers: layers,
        message: 'Layer composition ready - PNG rendering coming soon!'
      })
    }

  } catch (error) {
    console.error('Error rendering character:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Rendering failed',
        message: error.message
      })
    }
  } finally {
    await prisma.$disconnect()
  }
}
