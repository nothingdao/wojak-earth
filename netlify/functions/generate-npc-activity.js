// netlify/functions/generate-npc-activity.js
import { PrismaClient } from '@prisma/client'

let prisma

if (!globalThis.prisma) {
  globalThis.prisma = new PrismaClient()
}
prisma = globalThis.prisma

// NPC Personality configurations
const NPC_PERSONALITIES = {
  casual: {
    name: 'Casual Explorer',
    activityFrequency: 0.7,
    preferences: {
      TRAVEL: 0.25,
      MINE: 0.3,
      BUY: 0.25,
      SELL: 0.1,
      EQUIP: 0.1
    },
    energyThreshold: 30,
    riskTolerance: 0.3,
    spendingHabits: 0.6 // How likely to spend money
  },
  hardcore: {
    name: 'Hardcore Miner',
    activityFrequency: 1.2,
    preferences: {
      MINE: 0.5,
      TRAVEL: 0.2,
      BUY: 0.15,
      SELL: 0.1,
      EQUIP: 0.05
    },
    energyThreshold: 10,
    riskTolerance: 0.9,
    spendingHabits: 0.8
  },
  social: {
    name: 'Social Butterfly',
    activityFrequency: 0.9,
    preferences: {
      TRAVEL: 0.35,
      BUY: 0.3,
      MINE: 0.15,
      SELL: 0.1,
      EQUIP: 0.1
    },
    energyThreshold: 50,
    riskTolerance: 0.4,
    spendingHabits: 0.9
  },
  merchant: {
    name: 'Shrewd Trader',
    activityFrequency: 0.8,
    preferences: {
      BUY: 0.25,
      SELL: 0.3,
      TRAVEL: 0.25,
      MINE: 0.15,
      EQUIP: 0.05
    },
    energyThreshold: 40,
    riskTolerance: 0.6,
    spendingHabits: 0.7
  },
  explorer: {
    name: 'Wandering Explorer',
    activityFrequency: 1.0,
    preferences: {
      TRAVEL: 0.4,
      MINE: 0.25,
      BUY: 0.2,
      SELL: 0.1,
      EQUIP: 0.05
    },
    energyThreshold: 25,
    riskTolerance: 0.8,
    spendingHabits: 0.5
  }
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
    // Parse configuration
    const config = JSON.parse(event.body || '{}')

    const {
      activityCount = 5,
      activityTypes = ['TRAVEL', 'MINE', 'BUY'],
      locationBias = 'random',
      npcPersonalities = ['casual', 'hardcore', 'social'],
      marketVolatility = 0.3,
      forceActions = false // If true, NPCs will act even with low energy
    } = config

    // Get all characters (potential NPCs)
    const allCharacters = await prisma.character.findMany({
      include: {
        currentLocation: true,
        inventory: {
          include: { item: true }
        }
      }
    })

    // Filter to get NPCs (exclude the main player character)
    const npcCharacters = allCharacters.filter(char =>
      char.name !== "Wojak #1337" && // Exclude main demo character
      char.id !== 'char_wojak_1337' // Exclude by ID too
    )

    if (npcCharacters.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No NPC characters available',
          message: 'Need non-player characters to generate activity'
        })
      }
    }

    // Get game world data
    const [locations, items, marketListings] = await Promise.all([
      prisma.location.findMany({
        include: {
          resources: {
            include: { item: true }
          },
          subLocations: true,
          marketListings: {
            where: { quantity: { gt: 0 } },
            include: { item: true }
          }
        }
      }),
      prisma.item.findMany(),
      prisma.marketListing.findMany({
        where: { quantity: { gt: 0 } },
        include: { item: true, location: true }
      })
    ])

    const results = []
    const usedCharacters = new Set()

    // Generate actual NPC actions
    for (let i = 0; i < Math.min(activityCount, npcCharacters.length); i++) {
      // Select character (avoid reusing)
      let character
      let attempts = 0
      do {
        character = npcCharacters[Math.floor(Math.random() * npcCharacters.length)]
        attempts++
      } while (usedCharacters.has(character.id) && attempts < 20)

      if (usedCharacters.has(character.id)) continue
      usedCharacters.add(character.id)

      // Assign random personality if not configured
      const personalityKey = npcPersonalities[Math.floor(Math.random() * npcPersonalities.length)]
      const personality = NPC_PERSONALITIES[personalityKey]

      // Choose action type based on personality and current state
      const actionType = chooseActionType(activityTypes, personality, character, forceActions)

      if (!actionType) continue

      // Execute the action
      const result = await executeNPCAction(
        character,
        actionType,
        personality,
        locations,
        items,
        marketListings,
        config
      )

      if (result) {
        results.push({
          characterId: character.id,
          characterName: character.name,
          action: actionType,
          success: result.success,
          description: result.description,
          changes: result.changes
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Generated ${results.length} NPC actions`,
        actions: results,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error generating NPC activity:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate NPC activity',
        message: error.message
      })
    }
  }
}

function chooseActionType(allowedTypes, personality, character, forceActions) {
  // Check if character can act based on energy
  if (!forceActions && character.energy < 5) {
    return null // Too tired to act
  }

  // Filter allowed types and weight by personality
  const weights = allowedTypes.map(type =>
    personality.preferences[type] || 0.05
  )

  // Adjust weights based on character state
  const adjustedWeights = weights.map((weight, index) => {
    const actionType = allowedTypes[index]

    // Low energy = avoid energy-draining activities
    if (character.energy < personality.energyThreshold) {
      if (actionType === 'MINE' || actionType === 'TRAVEL') {
        return weight * 0.2
      }
      if (actionType === 'BUY') {
        // More likely to buy energy items
        return weight * 1.5
      }
    }

    // High energy = more active
    if (character.energy > 80) {
      if (actionType === 'MINE' || actionType === 'TRAVEL') {
        return weight * 1.5
      }
    }

    return weight
  })

  // Weighted random selection
  const totalWeight = adjustedWeights.reduce((sum, w) => sum + w, 0)
  if (totalWeight === 0) return null

  let random = Math.random() * totalWeight

  for (let i = 0; i < adjustedWeights.length; i++) {
    random -= adjustedWeights[i]
    if (random <= 0) {
      return allowedTypes[i]
    }
  }

  return allowedTypes[0]
}

async function executeNPCAction(character, actionType, personality, locations, items, marketListings, config) {
  try {
    switch (actionType) {
      case 'TRAVEL':
        return await executeTravel(character, personality, locations, config)

      case 'MINE':
        return await executeMining(character, personality, locations)

      case 'BUY':
        return await executeBuy(character, personality, marketListings)

      case 'SELL':
        return await executeSell(character, personality, items)

      case 'EQUIP':
        return await executeEquip(character)

      case 'UNEQUIP':
        return await executeUnequip(character)

      default:
        return null
    }
  } catch (error) {
    console.error(`Failed to execute ${actionType} for ${character.name}:`, error)
    return null
  }
}

async function executeTravel(character, personality, locations, config) {
  // Choose destination based on personality and config
  let destination

  if (config.locationBias === 'popular') {
    const sortedLocations = locations.sort((a, b) => b.playerCount - a.playerCount)
    destination = sortedLocations[Math.floor(Math.random() * Math.min(5, sortedLocations.length))]
  } else if (config.locationBias === 'difficulty-based') {
    const suitableLocations = locations.filter(loc => {
      const difficultyScore = loc.difficulty / 6
      return Math.abs(difficultyScore - personality.riskTolerance) < 0.4
    })
    destination = suitableLocations[Math.floor(Math.random() * suitableLocations.length)] || locations[0]
  } else {
    destination = locations[Math.floor(Math.random() * locations.length)]
  }

  if (!destination || destination.id === character.currentLocationId) {
    return null
  }

  return await prisma.$transaction(async (tx) => {
    // Update character location
    await tx.character.update({
      where: { id: character.id },
      data: { currentLocationId: destination.id }
    })

    // Update location player counts
    await tx.location.update({
      where: { id: character.currentLocationId },
      data: { playerCount: { decrement: 1 } }
    })

    await tx.location.update({
      where: { id: destination.id },
      data: {
        playerCount: { increment: 1 },
        lastActive: new Date()
      }
    })

    // Log transaction
    await tx.transaction.create({
      data: {
        characterId: character.id,
        type: 'TRAVEL',
        description: `Traveled from ${character.currentLocation?.name || 'somewhere'} to ${destination.name}`
      }
    })

    return {
      success: true,
      description: `${character.name} traveled to ${destination.name}`,
      changes: {
        newLocation: destination.name,
        previousLocation: character.currentLocation?.name
      }
    }
  })
}

async function executeMining(character, personality, locations) {
  const currentLocation = locations.find(loc => loc.id === character.currentLocationId)

  if (!currentLocation?.hasMining || !currentLocation.resources?.length) {
    return null
  }

  if (character.energy < 10) {
    return null // Not enough energy
  }

  return await prisma.$transaction(async (tx) => {
    // Reduce energy
    await tx.character.update({
      where: { id: character.id },
      data: { energy: Math.max(0, character.energy - 10) }
    })

    // Check if found something
    const resources = currentLocation.resources
    const foundResource = resources[Math.floor(Math.random() * resources.length)]
    const found = Math.random() < foundResource.spawnRate

    if (found && foundResource.item) {
      // Add item to inventory
      const existingInventory = await tx.characterInventory.findUnique({
        where: {
          characterId_itemId: {
            characterId: character.id,
            itemId: foundResource.itemId
          }
        }
      })

      if (existingInventory) {
        await tx.characterInventory.update({
          where: { id: existingInventory.id },
          data: { quantity: existingInventory.quantity + 1 }
        })
      } else {
        await tx.characterInventory.create({
          data: {
            characterId: character.id,
            itemId: foundResource.itemId,
            quantity: 1
          }
        })
      }

      // Log successful mining
      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'MINE',
          itemId: foundResource.itemId,
          quantity: 1,
          description: `Found ${foundResource.item.name} while mining in ${currentLocation.name}`
        }
      })

      return {
        success: true,
        description: `${character.name} found ${foundResource.item.name} while mining`,
        changes: {
          foundItem: foundResource.item.name,
          energyLost: 10
        }
      }
    } else {
      // Log unsuccessful mining
      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'MINE',
          description: `Mining attempt in ${currentLocation.name} - nothing found`
        }
      })

      return {
        success: true,
        description: `${character.name} mined but found nothing`,
        changes: {
          energyLost: 10
        }
      }
    }
  })
}

async function executeBuy(character, personality, marketListings) {
  if (!marketListings.length) return null

  // Filter by affordability and personality preferences
  const affordableItems = marketListings.filter(listing =>
    listing.quantity > 0 &&
    listing.price <= 100 // Assume NPCs have reasonable budgets
  )

  if (!affordableItems.length) return null

  // Bias towards items the personality would want
  let preferredItems = affordableItems

  if (personality.name === 'Hardcore Miner') {
    preferredItems = affordableItems.filter(item =>
      item.item.category === 'TOOL' || item.item.category === 'HAT'
    )
  } else if (personality.name === 'Social Butterfly') {
    preferredItems = affordableItems.filter(item =>
      item.item.category === 'CONSUMABLE' || item.item.category === 'ACCESSORY'
    )
  }

  if (!preferredItems.length) preferredItems = affordableItems

  const listing = preferredItems[Math.floor(Math.random() * preferredItems.length)]

  return await prisma.$transaction(async (tx) => {
    // Add item to character inventory
    const existingInventory = await tx.characterInventory.findUnique({
      where: {
        characterId_itemId: {
          characterId: character.id,
          itemId: listing.itemId
        }
      }
    })

    if (existingInventory) {
      await tx.characterInventory.update({
        where: { id: existingInventory.id },
        data: { quantity: existingInventory.quantity + 1 }
      })
    } else {
      await tx.characterInventory.create({
        data: {
          characterId: character.id,
          itemId: listing.itemId,
          quantity: 1
        }
      })
    }

    // Update market listing
    if (listing.quantity === 1) {
      await tx.marketListing.delete({
        where: { id: listing.id }
      })
    } else {
      await tx.marketListing.update({
        where: { id: listing.id },
        data: { quantity: listing.quantity - 1 }
      })
    }

    // Log transaction
    await tx.transaction.create({
      data: {
        characterId: character.id,
        type: 'BUY',
        itemId: listing.itemId,
        quantity: 1,
        description: `Bought ${listing.item.name} for ${listing.price} coins at ${listing.location.name}`
      }
    })

    return {
      success: true,
      description: `${character.name} bought ${listing.item.name}`,
      changes: {
        itemPurchased: listing.item.name,
        price: listing.price,
        location: listing.location.name
      }
    }
  })
}

async function executeSell(character, personality, items) {
  // Find sellable items in inventory
  const sellableItems = character.inventory?.filter(inv =>
    inv.item.category === 'MATERIAL' && inv.quantity > 0 && !inv.isEquipped
  ) || []

  if (!sellableItems.length) return null

  const inventoryItem = sellableItems[Math.floor(Math.random() * sellableItems.length)]
  const basePrice = getItemBasePrice(inventoryItem.item)
  const salePrice = Math.floor(basePrice * (0.6 + Math.random() * 0.4)) // 60-100% of base price

  return await prisma.$transaction(async (tx) => {
    // Remove item from inventory
    if (inventoryItem.quantity === 1) {
      await tx.characterInventory.delete({
        where: { id: inventoryItem.id }
      })
    } else {
      await tx.characterInventory.update({
        where: { id: inventoryItem.id },
        data: { quantity: inventoryItem.quantity - 1 }
      })
    }

    // Log transaction
    await tx.transaction.create({
      data: {
        characterId: character.id,
        type: 'SELL',
        itemId: inventoryItem.itemId,
        quantity: 1,
        description: `Sold ${inventoryItem.item.name} for ${salePrice} coins`
      }
    })

    return {
      success: true,
      description: `${character.name} sold ${inventoryItem.item.name}`,
      changes: {
        itemSold: inventoryItem.item.name,
        price: salePrice
      }
    }
  })
}

async function executeEquip(character) {
  // Find unequipped equipment
  const unequippedItems = character.inventory?.filter(inv =>
    !inv.isEquipped && ['HAT', 'CLOTHING', 'ACCESSORY', 'TOOL'].includes(inv.item.category)
  ) || []

  if (!unequippedItems.length) return null

  const item = unequippedItems[Math.floor(Math.random() * unequippedItems.length)]

  return await prisma.$transaction(async (tx) => {
    // Unequip items in same category
    await tx.characterInventory.updateMany({
      where: {
        characterId: character.id,
        isEquipped: true,
        item: { category: item.item.category }
      },
      data: { isEquipped: false }
    })

    // Equip the new item
    await tx.characterInventory.update({
      where: { id: item.id },
      data: { isEquipped: true }
    })

    // Log transaction
    await tx.transaction.create({
      data: {
        characterId: character.id,
        type: 'EQUIP',
        itemId: item.itemId,
        description: `Equipped ${item.item.name}`
      }
    })

    return {
      success: true,
      description: `${character.name} equipped ${item.item.name}`,
      changes: {
        equippedItem: item.item.name,
        category: item.item.category
      }
    }
  })
}

async function executeUnequip(character) {
  // Find equipped items
  const equippedItems = character.inventory?.filter(inv => inv.isEquipped) || []

  if (!equippedItems.length) return null

  const item = equippedItems[Math.floor(Math.random() * equippedItems.length)]

  return await prisma.$transaction(async (tx) => {
    // Unequip the item
    await tx.characterInventory.update({
      where: { id: item.id },
      data: { isEquipped: false }
    })

    // Log transaction
    await tx.transaction.create({
      data: {
        characterId: character.id,
        type: 'UNEQUIP',
        itemId: item.itemId,
        description: `Unequipped ${item.item.name}`
      }
    })

    return {
      success: true,
      description: `${character.name} unequipped ${item.item.name}`,
      changes: {
        unequippedItem: item.item.name,
        category: item.item.category
      }
    }
  })
}

function getItemBasePrice(item) {
  const rarityPrices = {
    COMMON: 15,
    UNCOMMON: 35,
    RARE: 75,
    EPIC: 150,
    LEGENDARY: 500
  }
  return rarityPrices[item.rarity] || 25
}
