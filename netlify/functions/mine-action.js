// netlify/functions/mine-action.js - UPDATED with Dynamic Energy Cost
import supabaseAdmin from '../../src/utils/supabase-admin'
import { randomUUID } from 'crypto'
import {
  getMiningEnergyCost,
  getPowerCoreCapacity
} from '../../src/lib/game-logic/mining'

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
    const { wallet_address, location_id } = JSON.parse(event.body || '{}')

    if (!wallet_address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Wallet address is required' })
      }
    }

    // Get character by wallet address
    const { data: character, error } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('status', 'ACTIVE')
      .single()

    if (error || !character) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Character not found',
          message: 'No active character found for this wallet address'
        })
      }
    }

    // Calculate dynamic energy cost based on character stats
    const energyCost = getMiningEnergyCost(character)
    const maxEnergy = getPowerCoreCapacity(character)

    if (character.energy < energyCost) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Insufficient energy',
          message: `You need at least ${energyCost} energy to mine. Current: ${character.energy}`,
          energyCost: energyCost,
          maxEnergy: maxEnergy,
          healthStatus: character.health < 50 ? 'DAMAGED_SYSTEMS_INCREASE_COST' : 'OPTIMAL'
        })
      }
    }

    // Use current location if none specified
    const miningLocationId = location_id || character.current_location_id

    // Get location to verify mining is available
    const { data: location, error: locationError } = await supabaseAdmin
      .from('locations')
      .select('*')
      .eq('id', miningLocationId)
      .single()

    if (locationError) throw locationError

    if (!location) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Location not found' })
      }
    }

    if (!location.has_mining) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Mining not available',
          message: `Mining is not available in ${location.name}`
        })
      }
    }

    // Deduct dynamic energy cost
    const newEnergyLevel = character.energy - energyCost
    const { data: updatedCharacter, error: updateError } = await supabaseAdmin
      .from('characters')
      .update({
        energy: newEnergyLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', character.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    // Enhanced mining success rate based on character stats
    let baseMiningSuccessRate = 0.7 // 70% base chance

    // Level bonus: +1% success rate per level (up to +20%)
    const levelBonus = Math.min(character.level * 0.01, 0.20)

    // Health penalty: reduced success rate if injured
    const healthPenalty = character.health < 50 ? 0.1 : 0

    // Experience bonus: slight bonus for experienced miners
    const experienceBonus = Math.min(character.experience / 10000, 0.05) // Up to 5% bonus

    const finalSuccessRate = Math.max(baseMiningSuccessRate + levelBonus + experienceBonus - healthPenalty, 0.3)
    const foundSomething = Math.random() < finalSuccessRate

    let foundItem = null
    let miningDetails = {
      baseCost: 10,
      actualCost: energyCost,
      levelEfficiency: character.level >= 5 ? Math.floor(character.level / 5) : 0,
      healthPenalty: character.health < 50,
      successRate: Math.round(finalSuccessRate * 100),
      maxEnergy: maxEnergy
    }

    if (foundSomething) {
      // Get available items for this location's biome/difficulty
      const { data: availableItems, error: itemsError } = await supabaseAdmin
        .from('items')
        .select('*')
        .eq('category', 'MATERIAL') // Focus on mining materials
        .order('rarity')

      if (itemsError) throw itemsError

      // Enhanced rarity-based selection with character level influence
      const baseRarityWeights = {
        'COMMON': 60,
        'UNCOMMON': 25,
        'RARE': 10,
        'EPIC': 4,
        'LEGENDARY': 1
      }

      // Higher level characters have slightly better chance at rare items
      const levelRarityBonus = Math.min(character.level / 10, 2) // Up to 2x multiplier for rare+ items
      const rarityWeights = {
        'COMMON': baseRarityWeights.COMMON,
        'UNCOMMON': baseRarityWeights.UNCOMMON,
        'RARE': Math.floor(baseRarityWeights.RARE * (1 + levelRarityBonus * 0.3)),
        'EPIC': Math.floor(baseRarityWeights.EPIC * (1 + levelRarityBonus * 0.5)),
        'LEGENDARY': Math.floor(baseRarityWeights.LEGENDARY * (1 + levelRarityBonus))
      }

      // Create weighted array
      const weightedItems = []
      availableItems?.forEach(item => {
        const weight = rarityWeights[item.rarity] || 10
        for (let i = 0; i < weight; i++) {
          weightedItems.push(item)
        }
      })

      if (weightedItems.length > 0) {
        const randomIndex = Math.floor(Math.random() * weightedItems.length)
        foundItem = weightedItems[randomIndex]

        // Add item to character inventory
        const { data: existingInventory } = await supabaseAdmin
          .from('character_inventory')
          .select('*')
          .eq('character_id', character.id)
          .eq('item_id', foundItem.id)
          .single()

        if (existingInventory) {
          // Update existing inventory
          const { error: updateInvError } = await supabaseAdmin
            .from('character_inventory')
            .update({
              quantity: existingInventory.quantity + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingInventory.id)

          if (updateInvError) throw updateInvError
        } else {
          // Create new inventory entry
          const inventoryId = randomUUID()
          const { error: createInvError } = await supabaseAdmin
            .from('character_inventory')
            .insert({
              id: inventoryId,
              character_id: character.id,
              item_id: foundItem.id,
              quantity: 1,
              is_equipped: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (createInvError) throw createInvError
        }

        // Log the enhanced mining transaction with energy details
        const transactionId = randomUUID()
        const transactionDescription = `Mined ${foundItem.name} at ${location.name} (Cost: ${energyCost} energy, Success Rate: ${Math.round(finalSuccessRate * 100)}%)`

        const { data: transaction, error: transactionError } = await supabaseAdmin
          .from('transactions')
          .insert({
            id: transactionId,
            character_id: character.id,
            type: 'MINE',
            item_id: foundItem.id,
            quantity: 1,
            description: transactionDescription,
            energy_burn: energyCost // Store the energy cost in the transaction
          })
          .select('*')
          .single()

        if (transactionError) throw transactionError

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            character: updatedCharacter,
            found: {
              item: foundItem,
              quantity: 1
            },
            transaction: transaction,
            miningDetails: miningDetails,
            message: `Successfully mined ${foundItem.name}! Energy cost: ${energyCost}`
          })
        }
      }
    }

    // If nothing was found, still return success but with no item
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        character: updatedCharacter,
        found: null,
        miningDetails: miningDetails,
        message: `No resources found this time. Energy cost: ${energyCost} (${character.health < 50 ? 'increased due to system damage' : 'standard rate'})`
      })
    }

  } catch (error) {
    console.error('Error in mine-action:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}
