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
    const { characterId = 'hardcoded-demo', locationId } = JSON.parse(event.body || '{}')

    // Get character
    let character
    if (characterId === 'hardcoded-demo') {
      character = await prisma.character.findFirst({
        where: { name: "Wojak #1337" },
        include: { currentLocation: true }
      })
    } else {
      character = await prisma.character.findUnique({
        where: { id: characterId },
        include: { currentLocation: true }
      })
    }

    if (!character) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Character not found' })
      }
    }

    // Use current location if none specified
    const targetLocationId = locationId || character.currentLocationId

    // Check if character has enough energy
    const ENERGY_COST = 10
    if (character.energy < ENERGY_COST) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Not enough energy',
          message: `Mining requires ${ENERGY_COST} energy. You have ${character.energy}.`,
          currentEnergy: character.energy,
          required: ENERGY_COST
        })
      }
    }

    // Get location and its available resources
    const location = await prisma.location.findUnique({
      where: { id: targetLocationId },
      include: {
        resources: {
          include: {
            item: true
          }
        }
      }
    })

    if (!location || !location.hasMining) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Cannot mine here',
          message: 'This location does not support mining'
        })
      }
    }

    if (location.resources.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No resources available',
          message: 'This location has no mineable resources'
        })
      }
    }

    // Mining logic - check each resource by spawn rate
    const roll = Math.random()
    let foundResource = null

    // Sort by spawn rate (highest first) for better user experience
    const sortedResources = location.resources.sort((a, b) => b.spawnRate - a.spawnRate)

    for (const resource of sortedResources) {
      if (roll < resource.spawnRate) {
        foundResource = resource
        break
      }
    }

    // Start transaction to update character and add item
    const result = await prisma.$transaction(async (tx) => {
      // Reduce character energy
      const updatedCharacter = await tx.character.update({
        where: { id: character.id },
        data: {
          energy: character.energy - ENERGY_COST
        }
      })

      let addedItem = null
      let transaction = null

      if (foundResource) {
        // Check if character already has this item in inventory
        const existingInventory = await tx.characterInventory.findUnique({
          where: {
            characterId_itemId: {
              characterId: character.id,
              itemId: foundResource.itemId
            }
          }
        })

        if (existingInventory) {
          // Update quantity
          addedItem = await tx.characterInventory.update({
            where: { id: existingInventory.id },
            data: { quantity: existingInventory.quantity + 1 },
            include: { item: true }
          })
        } else {
          // Create new inventory entry
          addedItem = await tx.characterInventory.create({
            data: {
              characterId: character.id,
              itemId: foundResource.itemId,
              quantity: 1
            },
            include: { item: true }
          })
        }

        // Log the transaction
        transaction = await tx.transaction.create({
          data: {
            characterId: character.id,
            type: 'MINE',
            itemId: foundResource.itemId,
            quantity: 1,
            description: `Found ${foundResource.item.name} while mining in ${location.name}`
          }
        })
      } else {
        // Log failed mining attempt
        transaction = await tx.transaction.create({
          data: {
            characterId: character.id,
            type: 'MINE',
            description: `Mining attempt in ${location.name} - nothing found`
          }
        })
      }

      return {
        character: updatedCharacter,
        foundItem: addedItem,
        transaction
      }
    })

    // Prepare response
    const responseData = {
      success: true,
      energyUsed: ENERGY_COST,
      newEnergyLevel: result.character.energy,
      location: {
        id: location.id,
        name: location.name
      }
    }

    if (result.foundItem) {
      responseData.foundItem = {
        name: result.foundItem.item.name,
        description: result.foundItem.item.description,
        rarity: result.foundItem.item.rarity,
        imageUrl: result.foundItem.item.imageUrl,
        newQuantity: result.foundItem.quantity
      }
      responseData.message = `You found: ${result.foundItem.item.name} (${result.foundItem.item.rarity})!`
    } else {
      responseData.message = "You dig around but find nothing useful..."
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    }

  } catch (error) {
    console.error('Error during mining:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Mining operation failed'
      })
    }
  }
}
