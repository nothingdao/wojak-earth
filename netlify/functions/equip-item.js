import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    const { characterId = 'hardcoded-demo', inventoryId, equip = true } = JSON.parse(event.body || '{}')

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

    // Check if item is equippable
    const equipableCategories = ['HAT', 'CLOTHING', 'ACCESSORY', 'TOOL']
    if (!equipableCategories.includes(inventoryItem.item.category)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Item not equippable',
          message: `${inventoryItem.item.category} items cannot be equipped`
        })
      }
    }

    // Perform equipment action within transaction
    const result = await prisma.$transaction(async (tx) => {
      if (equip) {
        // If equipping, first unequip any other items of the same layer type
        if (inventoryItem.item.layerType) {
          await tx.characterInventory.updateMany({
            where: {
              characterId: character.id,
              isEquipped: true,
              item: {
                layerType: inventoryItem.item.layerType
              }
            },
            data: { isEquipped: false }
          })
        }

        // Equip the item
        const updatedItem = await tx.characterInventory.update({
          where: { id: inventoryId },
          data: { isEquipped: true },
          include: { item: true }
        })

        // Log the transaction
        await tx.transaction.create({
          data: {
            characterId: character.id,
            type: 'EQUIP',
            itemId: inventoryItem.itemId,
            description: `Equipped ${inventoryItem.item.name}`
          }
        })

        return { action: 'equipped', item: updatedItem }

      } else {
        // Unequip the item
        const updatedItem = await tx.characterInventory.update({
          where: { id: inventoryId },
          data: { isEquipped: false },
          include: { item: true }
        })

        // Log the transaction
        await tx.transaction.create({
          data: {
            characterId: character.id,
            type: 'UNEQUIP',
            itemId: inventoryItem.itemId,
            description: `Unequipped ${inventoryItem.item.name}`
          }
        })

        return { action: 'unequipped', item: updatedItem }
      }
    })

    // Calculate stat effects (for future implementation)
    const statEffects = {
      energy: inventoryItem.item.energyEffect || 0,
      health: inventoryItem.item.healthEffect || 0
    }

    // Prepare response
    const responseData = {
      success: true,
      message: `${inventoryItem.item.name} ${result.action} successfully!`,
      item: {
        id: result.item.id,
        name: result.item.item.name,
        category: result.item.item.category,
        rarity: result.item.item.rarity,
        isEquipped: result.item.isEquipped,
        layerType: result.item.item.layerType
      },
      action: result.action,
      statEffects: equip ? statEffects : { energy: -statEffects.energy, health: -statEffects.health }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    }

  } catch (error) {
    console.error('Error equipping/unequipping item:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Equipment action failed'
      })
    }
  } finally {
    await prisma.$disconnect()
  }
}
