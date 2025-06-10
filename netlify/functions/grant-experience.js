// netlify/functions/grant-experience.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const LEVEL_SYSTEM = {
  1: { xpRequired: 0, achievements: [] },
  2: { xpRequired: 100, achievements: [] },
  3: { xpRequired: 300, achievements: [] },
  4: { xpRequired: 600, achievements: [] },
  5: { xpRequired: 1000, achievements: ['miningActions:20'] },
  6: { xpRequired: 1500, achievements: ['uniqueLocations:5'] },
  7: { xpRequired: 2200, achievements: ['itemsPurchased:15'] },
  8: { xpRequired: 3000, achievements: ['equipmentChanges:10'] },
  9: { xpRequired: 4000, achievements: ['consumablesUsed:20'] },
  10: { xpRequired: 5200, achievements: ['coinsSpent:2000', 'miningActions:50'] },
  11: { xpRequired: 6600, achievements: [] },
  12: { xpRequired: 8200, achievements: [] },
  13: { xpRequired: 10000, achievements: [] },
  14: { xpRequired: 12000, achievements: [] },
  15: { xpRequired: 14500, achievements: [] },
  // Continue as needed...
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

  try {
    const { wallet_address, experience, source, details = {} } = JSON.parse(event.body)

    if (!wallet_address || !experience || !source) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing wallet_address, experience, or source' })
      }
    }

    // Get character
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
        body: JSON.stringify({ error: 'Character not found' })
      }
    }

    // Calculate new XP and level
    const currentXP = character.experience || 0
    const newTotalXP = currentXP + experience
    const oldLevel = character.level

    // Check what level they qualify for
    const { newLevel, canLevelUp, missingAchievements } = await calculateEligibleLevel(
      newTotalXP,
      oldLevel,
      character.id
    )

    // Update character
    const updated_ata = {
      experience: newTotalXP,
      updated_at: new Date().toISOString()
    }

    if (canLevelUp && newLevel > oldLevel) {
      updated_ata.level = newLevel
    }

    const { data: updatedCharacter, error: updateError } = await supabase
      .from('characters')
      .update(updated_ata)
      .eq('id', character.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log XP gain to the dedicated experience_logs table
    await supabase
      .from('experience_logs')
      .insert({
        character_id: character.id,
        experience_gained: experience,
        experience_total: newTotalXP,
        source: source,
        level_before: oldLevel,
        level_after: canLevelUp ? newLevel : oldLevel,
        leveled_up: canLevelUp && newLevel > oldLevel,
        details: details,
        created_at: new Date().toISOString()
      })

    // Calculate progress to next level
    const currentLevelXP = LEVEL_SYSTEM[newLevel]?.xpRequired || 0
    const nextLevelXP = LEVEL_SYSTEM[newLevel + 1]?.xpRequired
    const progressToNext = nextLevelXP ? newTotalXP - currentLevelXP : 0
    const xpNeededForNext = nextLevelXP ? nextLevelXP - newTotalXP : 0

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        experienceGained: experience,
        totalExperience: newTotalXP,
        oldLevel,
        newLevel: canLevelUp ? newLevel : oldLevel,
        leveledUp: canLevelUp && newLevel > oldLevel,
        source,
        details,

        // Progress bar data
        progressToNext,
        xpNeededForNext,
        canLevelUp,
        missingAchievements,

        // Next level info
        nextLevelRequirements: LEVEL_SYSTEM[newLevel + 1] || null
      })
    }

  } catch (error) {
    console.error('Error granting experience:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to grant experience' })
    }
  }
}

async function calculateEligibleLevel(totalXP, currentLevel, character_id) {
  // Get character's achievements from transaction history
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, description, created_at')
    .eq('character_id', character_id)

  const achievements = calculateAchievements(transactions || [])

  // Find highest level they qualify for
  let eligibleLevel = currentLevel
  let canLevelUp = false
  let missingAchievements = []

  for (let level = currentLevel + 1; level <= 20; level++) {
    const requirements = LEVEL_SYSTEM[level]
    if (!requirements) break

    // Check XP requirement
    if (totalXP < requirements.xpRequired) break

    // Check achievement requirements
    const achievementsMet = requirements.achievements.every(req => {
      const [achievementType, requiredValue] = req.split(':')
      return achievements[achievementType] >= parseInt(requiredValue)
    })

    if (achievementsMet) {
      eligibleLevel = level
      canLevelUp = true
    } else {
      // Note missing achievements for this level
      missingAchievements = requirements.achievements.filter(req => {
        const [achievementType, requiredValue] = req.split(':')
        return achievements[achievementType] < parseInt(requiredValue)
      })
      break // Can't skip levels
    }
  }

  return { newLevel: eligibleLevel, canLevelUp, missingAchievements }
}

function calculateAchievements(transactions) {
  return {
    miningActions: transactions.filter(t => t.type === 'MINE').length,
    travelActions: transactions.filter(t => t.type === 'TRAVEL').length,
    itemsPurchased: transactions.filter(t => t.type === 'BUY').length,
    equipmentChanges: transactions.filter(t => t.type === 'EQUIP' || t.type === 'UNEQUIP').length,
    consumablesUsed: transactions.filter(t => t.description.includes('Used ')).length,
    uniqueLocations: new Set(
      transactions
        .filter(t => t.type === 'TRAVEL')
        .map(t => t.description.match(/to (.+)$/)?.[1])
        .filter(Boolean)
    ).size,
    coinsSpent: transactions
      .filter(t => t.description.includes('for ') && t.description.includes('coins'))
      .reduce((sum, t) => {
        const match = t.description.match(/for (\d+) coins/)
        return sum + (match ? parseInt(match[1]) : 0)
      }, 0)
  }
}
