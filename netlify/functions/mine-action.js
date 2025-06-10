// netlify/functions/mine-action.js - UPDATED
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    const { data: character, error } = await supabase
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

    // Check energy requirement
    const energyCost = 10
    if (character.energy < energyCost) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Insufficient energy',
          message: `You need at least ${energyCost} energy to mine. Current: ${character.energy}`
        })
      }
    }

    // Use current location if none specified
    const mininglocation_id = location_id || character.current_location_id

    // Get location to verify mining is available
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('*')
      .eq('id', mininglocation_id)
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



    // Deduct energy
    const newEnergyLevel = character.energy - energyCost
    const { data: updatedCharacter, error: updateError } = await supabase
      .from('characters')
      .update({ energy: newEnergyLevel })
      .eq('id', character.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    // Mining success rate and item finding logic
    const miningSuccessRate = 0.7 // 70% chance to find something
    const foundSomething = Math.random() < miningSuccessRate

    let foundItem = null

    if (foundSomething) {
      // Get available items for this location's biome/difficulty
      const { data: availableItems, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('category', 'MATERIAL') // Focus on mining materials
        .order('rarity')

      if (itemsError) throw itemsError

      // Simple rarity-based selection
      const rarityWeights = {
        'COMMON': 60,
        'UNCOMMON': 25,
        'RARE': 10,
        'EPIC': 4,
        'LEGENDARY': 1
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
        const { data: existingInventory } = await supabase
          .from('character_inventory')
          .select('*')
          .eq('character_id', character.id)
          .eq('item_id', foundItem.id)
          .single()

        if (existingInventory) {
          // Update existing inventory
          const { error: updateInvError } = await supabase
            .from('character_inventory')
            .update({ quantity: existingInventory.quantity + 1 })
            .eq('id', existingInventory.id)

          if (updateInvError) throw updateInvError
        } else {
          // Create new inventory entry
          const inventoryId = randomUUID()
          const { error: createInvError } = await supabase
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

        // Log the mining transaction
        const transactionId = randomUUID()
        const { data: transaction, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            id: transactionId,
            character_id: character.id,
            type: 'MINE',
            item_id: foundItem.id,
            quantity: 1,
            description: `Mined ${foundItem.name} at ${location.name}`
          })
          .select('*')
          .single()

        if (transactionError) throw transactionError
      }
    }

    // Calculate health risk
    const healthRisk = Math.random() < 0.1 ? 5 : 0 // 10% chance of 5 health loss
    const newHealthLevel = Math.max(0, character.health - healthRisk)

    await supabase
      .from('characters')
      .update({
        energy: newEnergyLevel,
        health: newHealthLevel
      })
      .eq('id', character.id)




    let xpGained = 10 // Base mining XP

    if (foundItem) {
      xpGained += 15 // Item found bonus
      const rarityBonuses = { COMMON: 0, UNCOMMON: 5, RARE: 15, EPIC: 40, LEGENDARY: 100 }
      xpGained += rarityBonuses[foundItem.rarity] || 0
    }

    // Grant XP
    try {
      // Grant XP directly via database
      const currentXP = character.experience || 0
      const newTotalXP = currentXP + xpGained

      // Simple level calculation (you can make this more sophisticated later)
      let newLevel = character.level
      if (newTotalXP >= 100 && character.level === 1) newLevel = 2
      else if (newTotalXP >= 300 && character.level === 2) newLevel = 3
      else if (newTotalXP >= 600 && character.level === 3) newLevel = 4
      else if (newTotalXP >= 1000 && character.level === 4) newLevel = 5
      // Add more level thresholds as needed

      const leveledUp = newLevel > character.level

      // Update character with new XP and level
      const { error: xpError } = await supabase
        .from('characters')
        .update({
          experience: newTotalXP,
          level: newLevel
        })
        .eq('id', character.id)

      if (xpError) {
        console.error('Failed to update XP:', xpError)
      } else {
        // Log XP transaction
        await supabase
          .from('transactions')
          .insert({
            character_id: character.id,
            type: 'XP_GAIN',
            description: `Gained ${xpGained} XP from MINING${leveledUp ? ` - LEVEL UP! ${character.level} → ${newLevel}` : ''}`,
            created_at: new Date().toISOString()
          })

        if (leveledUp) {
          console.log(`🎉 LEVEL UP! ${character.name} reached Level ${newLevel}! (${newTotalXP} total XP)`)
        } else {
          console.log(`⭐ ${character.name} gained ${xpGained} XP from MINING (${newTotalXP} total XP)`)
        }
      }

    } catch (xpError) {
      console.warn('Failed to grant XP:', xpError.message)
    }

    // Prepare response
    const responseData = {
      success: true,
      message: foundItem ? `Found ${foundItem.name}!` : 'Nothing found this time...',
      newEnergyLevel: newEnergyLevel,
      newHealthLevel: newHealthLevel,
      healthLoss: healthRisk,
      energyCost: energyCost,
      foundItem: foundItem ? {
        id: foundItem.id,
        name: foundItem.name,
        description: foundItem.description,
        rarity: foundItem.rarity,
        category: foundItem.category
      } : null,
      location: {
        id: location.id,
        name: location.name
      }
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
        message: 'Mining failed'
      })
    }
  }
}
