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
    const { characterId = 'hardcoded-demo', marketListingId, quantity = 1 } = JSON.parse(event.body || '{}')

    if (!marketListingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Market listing ID is required' })
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

    // Get market listing with item details
    const marketListing = await prisma.marketListing.findUnique({
      where: { id: marketListingId },
      include: {
        item: true,
        seller: true,
        location: true
      }
    })

    if (!marketListing) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Market listing not found' })
      }
    }

    // Check if enough quantity available
    if (quantity > marketListing.quantity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Insufficient quantity',
          message: `Only ${marketListing.quantity} available, you requested ${quantity}`
        })
      }
    }

    // Calculate total cost
    const totalCost = marketListing.price * quantity

    // For MVP: Skip currency check (assume player has enough)
    // TODO: Implement currency system
    // if (character.coins < totalCost) {
    //   return {
    //     statusCode: 400,
    //     headers,
    //     body: JSON.stringify({
    //       error: 'Insufficient funds',
    //       message: `Item costs ${totalCost} coins, you have ${character.coins}`
    //     })
    //   }
    // }

    // Perform transaction
    const result = await prisma.$transaction(async (tx) => {
      // Add item to character inventory
      const existingInventory = await tx.characterInventory.findUnique({
        where: {
          characterId_itemId: {
            characterId: character.id,
            itemId: marketListing.itemId
          }
        }
      })

      let inventoryItem
      if (existingInventory) {
        // Update existing inventory
        inventoryItem = await tx.characterInventory.update({
          where: { id: existingInventory.id },
          data: { quantity: existingInventory.quantity + quantity },
          include: { item: true }
        })
      } else {
        // Create new inventory entry
        inventoryItem = await tx.characterInventory.create({
          data: {
            characterId: character.id,
            itemId: marketListing.itemId,
            quantity: quantity
          },
          include: { item: true }
        })
      }

      // Update or remove market listing
      if (marketListing.quantity === quantity && !marketListing.isSystemItem) {
        // Only remove player listings when sold out
        await tx.marketListing.delete({
          where: { id: marketListingId }
        })
      } else {
        // Reduce quantity (system items can go to 0 but stay in DB)
        await tx.marketListing.update({
          where: { id: marketListingId },
          data: { quantity: marketListing.quantity - quantity }
        })
      }

      // TODO: Handle currency transfer
      // if (!marketListing.isSystemItem && marketListing.seller) {
      //   // Transfer coins to seller
      //   await tx.character.update({
      //     where: { id: marketListing.sellerId },
      //     data: { coins: { increment: totalCost } }
      //   })
      // }
      // 
      // // Deduct coins from buyer
      // await tx.character.update({
      //   where: { id: character.id },
      //   data: { coins: { decrement: totalCost } }
      // })

      // Log the transaction
      const transaction = await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'BUY',
          itemId: marketListing.itemId,
          quantity: quantity,
          description: `Bought ${quantity}x ${marketListing.item.name} for ${totalCost} coins from ${marketListing.location.name} market`
        }
      })

      return {
        inventoryItem,
        transaction,
        totalCost,
        remainingQuantity: marketListing.quantity - quantity
      }
    })

    // Prepare response
    const responseData = {
      success: true,
      message: `Successfully purchased ${quantity}x ${marketListing.item.name}!`,
      purchase: {
        itemName: marketListing.item.name,
        itemRarity: marketListing.item.rarity,
        quantity: quantity,
        totalCost: totalCost,
        newInventoryQuantity: result.inventoryItem.quantity
      },
      marketListing: {
        id: marketListingId,
        remainingQuantity: result.remainingQuantity,
        wasRemoved: result.remainingQuantity === 0
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    }

  } catch (error) {
    console.error('Error purchasing item:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Purchase failed'
      })
    }
  } finally {
    await prisma.$disconnect()
  }
}
