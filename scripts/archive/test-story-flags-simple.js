// Simple script to test story flags system by adding experience_logs entries
// Run with: node scripts/test-story-flags-simple.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function addStoryChoiceXP(characterId, choiceData) {
  try {
    // Get character's current experience
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('experience, level')
      .eq('id', characterId)
      .single()

    if (charError) {
      console.error('Error getting character:', charError)
      return { error: charError }
    }

    const currentExp = character?.experience || 0
    const newTotalExp = currentExp + choiceData.experience_gained
    const currentLevel = character?.level || 1
    const newLevel = Math.floor(newTotalExp / 100) + 1
    const leveledUp = newLevel > currentLevel

    // Add experience log entry with story flag data
    const { data, error } = await supabase
      .from('experience_logs')
      .insert({
        character_id: characterId,
        source: `story_${choiceData.story_id}`,
        experience_gained: choiceData.experience_gained,
        experience_total: newTotalExp,
        level_before: currentLevel,
        level_after: newLevel,
        leveled_up: leveledUp,
        details: {
          story_flag: choiceData.story_flag,
          flag_value: choiceData.flag_value || true,
          choice_id: choiceData.choice_id,
          choice_key: choiceData.choice_key,
          event_key: choiceData.event_key,
          chapter_number: choiceData.chapter_number,
          story_id: choiceData.story_id,
          response_text: choiceData.response_text,
          health: choiceData.health,
          energy: choiceData.energy,
          credits: choiceData.credits,
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding experience log:', error)
      return { error }
    }

    // Update character experience and level
    const { error: updateError } = await supabase
      .from('characters')
      .update({
        experience: newTotalExp,
        level: newLevel
      })
      .eq('id', characterId)

    if (updateError) {
      console.error('Error updating character:', updateError)
    }

    return { data, newLevel, leveledUp }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { error }
  }
}

async function testStoryFlags() {
  console.log('🧪 Testing Story Flags System with The Road Warrior\'s Path...\n')

  try {
    // Get the first character to test with
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('id, name, experience, level')
      .limit(1)

    if (charError || !characters || characters.length === 0) {
      console.error('❌ No characters found to test with:', charError)
      return
    }

    const testCharacter = characters[0]
    console.log(`🎯 Testing with character: ${testCharacter.name}`)
    console.log(`   Character ID: ${testCharacter.id}`)
    console.log(`   Current Level: ${testCharacter.level}`)
    console.log(`   Current XP: ${testCharacter.experience || 0}\n`)

    // Test story choices from The Road Warrior's Path with spiritual significance
    const testChoices = [
      {
        story_flag: 'peaceful_contact',
        choice_id: 'm1_e1_c1',
        choice_key: 'm1_e1_c1',
        event_key: 'm1_e1',
        chapter_number: 1,
        story_id: 'road_warrior_path',
        experience_gained: 15,
        response_text: 'The settlers are wary but willing to trade. You choose diplomacy over force.',
        health: 0,
        energy: -5,
        credits: 5
      },
      {
        story_flag: 'hero_instinct',
        choice_id: 'm2_e1_c1',
        choice_key: 'm2_e1_c1', 
        event_key: 'm2_e1',
        chapter_number: 2,
        story_id: 'road_warrior_path',
        experience_gained: 20,
        response_text: 'You immediately respond to the rescue signal, putting others before yourself.',
        health: -10,
        energy: -15,
        credits: 0
      },
      {
        story_flag: 'questioning_mind',
        choice_id: 'm3_e1_c2',
        choice_key: 'm3_e1_c2',
        event_key: 'm3_e1', 
        chapter_number: 3,
        story_id: 'road_warrior_path',
        experience_gained: 18,
        response_text: 'You observe the mysterious signals, seeking truth despite danger.',
        health: 0,
        energy: -10,
        credits: 10
      },
      {
        story_flag: 'stewardship_minded',
        choice_id: 'm4_e1_c1',
        choice_key: 'm4_e1_c1',
        event_key: 'm4_e1',
        chapter_number: 4,
        story_id: 'road_warrior_path', 
        experience_gained: 22,
        response_text: 'You share resources with struggling survivors, choosing generosity over hoarding.',
        health: 5,
        energy: -5,
        credits: -20
      },
      {
        story_flag: 'moral_courage',
        choice_id: 'm5_e1_c1',
        choice_key: 'm5_e1_c1',
        event_key: 'm5_e1',
        chapter_number: 5,
        story_id: 'road_warrior_path',
        experience_gained: 25,
        response_text: 'You stand up to injustice despite personal risk, choosing what\'s right over what\'s safe.',
        health: -15,
        energy: -10,
        credits: 0
      }
    ]

    console.log('📖 Adding story choices that reflect spiritual development...\n')
    
    let totalXPGained = 0
    for (const choice of testChoices) {
      const result = await addStoryChoiceXP(testCharacter.id, choice)
      
      if (result.error) {
        console.error(`❌ Error recording choice ${choice.choice_key}:`, result.error)
      } else {
        totalXPGained += choice.experience_gained
        console.log(`✅ Choice: ${choice.story_flag}`)
        console.log(`   Chapter ${choice.chapter_number}: +${choice.experience_gained} XP`)
        console.log(`   Response: ${choice.response_text}`)
        if (result.leveledUp) {
          console.log(`   🎉 LEVELED UP! (Level ${result.newLevel})`)
        }
        console.log('')
      }
    }

    // Check the results
    const { data: updatedChar, error: updateError } = await supabase
      .from('characters')
      .select('id, name, experience, level')
      .eq('id', testCharacter.id)
      .single()

    if (!updateError && updatedChar) {
      console.log('📊 CHARACTER PROGRESSION SUMMARY:')
      console.log(`   Level: ${testCharacter.level} → ${updatedChar.level}`)
      console.log(`   XP: ${testCharacter.experience || 0} → ${updatedChar.experience} (+${totalXPGained})`)
      console.log('')
    }

    // Show the story flags that were recorded
    const { data: expLogs, error: logsError } = await supabase
      .from('experience_logs')
      .select('*')
      .eq('character_id', testCharacter.id)
      .or('source.eq.story_choice,source.ilike.story_%')
      .not('details->>story_flag', 'is', null)
      .order('created_at', { ascending: false })

    if (!logsError && expLogs) {
      console.log('🏁 STORY FLAGS RECORDED:')
      expLogs.forEach(log => {
        const details = log.details
        console.log(`   • ${details.story_flag} (Chapter ${details.chapter_number})`)
      })
      console.log('')
      
      console.log('✨ Now check your CHARACTER MATRIX in the Profile tab to see')
      console.log('   how these moral choices affect your spiritual assessment!')
      console.log('')
      console.log('🔮 The hidden Christian allegory is beginning to take shape...')
      console.log('   Each choice contributes to your tollhouse journey assessment.')
    }

  } catch (err) {
    console.error('💥 Unexpected error:', err)
  }
}

// Run the test
testStoryFlags()