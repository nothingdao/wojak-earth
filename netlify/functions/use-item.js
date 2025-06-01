// netlify/functions/use-item.js
import { PrismaClient } from '@prisma/client'

let prisma

function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

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
    const prisma = getPrismaClient()
    const { characterId = 'hardcoded-demo', inventoryId } = JSON.parse(event.body || '{}')

    if (!inventoryId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Inventory ID is required' })
      }
    }

    // Get character
    let character
    if (characterId === 'hardcoded-demo') {
      character = await prisma.character.findFirst({
        where: { name: "Wojak #1337" }
      })
    } else {
      character = await prisma.character.findUnique({
        where: { id: characterId }
      })
    }

    if (!character) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Character not found' })
      }
    }

    // Get inventory item with details
    const inventoryItem = await prisma.characterInventory.findUnique({
      where: { id: inventoryId },
      include: { item: true }
    })

    if (!inventoryItem) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Inventory item not found' })
      }
    }

    // Verify ownership
    if (inventoryItem.characterId !== character.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Item does not belong to this character' })
      }
    }

    // Check if item is consumable
    if (inventoryItem.item.category !== 'CONSUMABLE') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Item not consumable',
          message: `${inventoryItem.item.name} cannot be consumed`
        })
      }
    }

    // Check if there's quantity to consume
    if (inventoryItem.quantity <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No items to use',
          message: `You don't have any ${inventoryItem.item.name} to use`
        })
      }
    }

    // Calculate effects (capped at 100)
    const energyEffect = inventoryItem.item.energyEffect || 0
    const healthEffect = inventoryItem.item.healthEffect || 0

    const newEnergy = Math.min(100, character.energy + energyEffect)
    const newHealth = Math.min(100, character.health + healthEffect)

    const actualEnergyGain = newEnergy - character.energy
    const actualHealthGain = newHealth - character.health

    // Check if effects would be wasted
    if (actualEnergyGain === 0 && actualHealthGain === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No effect',
          message: `Using ${inventoryItem.item.name} would have no effect - you're already at full health and energy`
        })
      }
    }

    // Perform consumption within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update character stats
      const updatedCharacter = await tx.character.update({
        where: { id: character.id },
        data: {
          energy: newEnergy,
          health: newHealth
        }
      })

      // Reduce inventory quantity or remove item
      let updatedInventory
      if (inventoryItem.quantity === 1) {
        // Remove item completely
        await tx.characterInventory.delete({
          where: { id: inventoryId }
        })
        updatedInventory = null
      } else {
        // Reduce quantity
        updatedInventory = await tx.characterInventory.update({
          where: { id: inventoryId },
          data: { quantity: inventoryItem.quantity - 1 },
          include: { item: true }
        })
      }

      // Log the transaction
      const transaction = await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'MINE', // We can add 'USE' to the enum later, using MINE for now
          itemId: inventoryItem.itemId,
          quantity: 1,
          description: `Used ${inventoryItem.item.name}${actualEnergyGain > 0 || actualHealthGain > 0 ?
            ` (${[
              actualEnergyGain > 0 ? `+${actualEnergyGain} energy` : null,
              actualHealthGain > 0 ? `+${actualHealthGain} health` : null
            ].filter(Boolean).join(', ')})` : ''
            }`
        }
      })

      return {
        character: updatedCharacter,
        inventory: updatedInventory,
        transaction,
        effects: {
          energy: actualEnergyGain,
          health: actualHealthGain
        }
      }
    })

    // Prepare response
    const responseData = {
      success: true,
      message: `Used ${inventoryItem.item.name}!`,
      effects: result.effects,
      newStats: {
        energy: result.character.energy,
        health: result.character.health
      },
      inventory: {
        remainingQuantity: result.inventory?.quantity || 0,
        wasRemoved: !result.inventory
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    }

  } catch (error) {
    console.error('Error using item:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to use item'
      })
    }
  }
}
