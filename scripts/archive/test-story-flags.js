// Script to test story flags system using experience_logs table
// Run with: node scripts/test-story-flags.js

import { createClient } from '@supabase/supabase-js'
import { recordStoryChoice } from '../src/utils/story-flags.js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testStoryFlags() {
  console.log('Testing story flags system with experience_logs...')

  try {
    // Get the first character to test with
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('id, name, experience, level')
      .limit(1)

    if (charError || !characters || characters.length === 0) {
      console.error('No characters found to test with:', charError)
      return
    }

    const testCharacter = characters[0]
    console.log(`Testing with character: ${testCharacter.name} (ID: ${testCharacter.id})`)
    console.log(`Current level: ${testCharacter.level}, XP: ${testCharacter.experience || 0}`)

    // Add some test story choices from the male storyline
    const testChoices = [
      {
        story_flag: 'peaceful_contact',
        choice_id: 'm1_e1_c1',
        choice_key: 'm1_e1_c1',
        event_key: 'm1_e1',
        chapter_number: 1,
        story_id: 'road_warrior_path',
        experience_gained: 15,
        response_text: 'The settlers are wary but willing to trade. You get clean water and some basic supplies.',
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
        response_text: 'You immediately respond to the rescue signal, earning respect from survivors.',
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
        experience_gained: 25,
        response_text: 'You observe the mysterious signals, uncovering hidden truths about the wasteland.',
        health: 0,
        energy: -10,
        credits: 10
      }
    ]

    console.log('\nAdding test story choices...')
    for (const choice of testChoices) {
      const { data, error } = await recordStoryChoice(testCharacter.id, choice)
      
      if (error) {
        console.error(`Error recording choice ${choice.choice_key}:`, error)
      } else {
        console.log(`✅ Recorded choice: ${choice.choice_key} -> ${choice.story_flag} (+${choice.experience_gained} XP)`)
      }
    }

    // Test retrieving story flags
    console.log('\nTesting story flag retrieval...')
    const { getCharacterFlags, getStoryFlagStats } = await import('../src/utils/story-flags.js')
    
    const { data: flags, error: flagsError } = await getCharacterFlags(testCharacter.id)
    if (flagsError) {
      console.error('Error getting flags:', flagsError)
    } else {
      console.log(`\nFound ${flags?.length || 0} story flags:`)
      flags?.forEach(flag => {
        console.log(`  - ${flag.flag_name} (Chapter ${flag.chapter_acquired})`)
      })
    }

    const { data: stats, error: statsError } = await getStoryFlagStats(testCharacter.id)
    if (statsError) {
      console.error('Error getting stats:', statsError)
    } else {
      console.log(`\nStory Flag Statistics:`)
      console.log(`  Total flags: ${stats?.totalFlags}`)
      console.log(`  Stories: ${Object.keys(stats?.flagsByStory || {}).length}`)
      console.log(`  Chapters: ${Object.keys(stats?.flagsByChapter || {}).length}`)
    }

    // Check updated character
    const { data: updatedChar, error: updateError } = await supabase
      .from('characters')
      .select('id, name, experience, level')
      .eq('id', testCharacter.id)
      .single()

    if (!updateError && updatedChar) {
      console.log(`\nCharacter after story choices:`)
      console.log(`  Level: ${testCharacter.level} -> ${updatedChar.level}`)
      console.log(`  XP: ${testCharacter.experience || 0} -> ${updatedChar.experience}`)
      if (updatedChar.level > testCharacter.level) {
        console.log(`  🎉 LEVELED UP!`)
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

// Run the test
testStoryFlags()