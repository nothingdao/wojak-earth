#!/usr/bin/env node

/**
 * Create the example "Mysterious Cave" chapter
 * Demonstrates all story system features
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('🏗️  Creating Example Chapter: "The Mysterious Cave"\n')

  // 1. Get or create the story
  console.log('📖 Finding "The Path" story...')
  const { data: story } = await supabase
    .from('stories')
    .select('id, title')
    .eq('title', 'The Path')
    .eq('character_path', 'male')
    .single()

  if (!story) {
    console.error('❌ Story "The Path" not found!')
    return
  }
  console.log(`✅ Found story: ${story.title}`)

  // 2. Create Chapter 99
  console.log('\n📚 Creating Chapter 99: "The Mysterious Cave"...')
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .insert({
      story_id: story.id,
      chapter_number: 99,
      title: 'The Mysterious Cave',
      description: 'A tutorial chapter demonstrating all story features'
    })
    .select()
    .single()

  if (chapterError) {
    console.error('❌ Error creating chapter:', chapterError)
    return
  }
  console.log(`✅ Chapter created: ${chapter.title}`)

  // 3. Create Events
  console.log('\n🎬 Creating 7 events...')

  const events = [
    {
      chapter_id: chapter.id,
      title: 'Discovery',
      description: 'You stumble upon a dark cave entrance hidden behind thick vines. Strange blue light emanates from within, and you hear the faint sound of dripping water echoing from deep inside.',
      event_type: 'text_event',
      order_index: 1
    },
    {
      chapter_id: chapter.id,
      title: 'Cave Entrance',
      description: 'You stand at the mouth of the cave. The blue light pulses rhythmically, almost like a heartbeat. Do you proceed with caution, or dive right in?',
      event_type: 'choice_event',
      order_index: 2
    },
    {
      chapter_id: chapter.id,
      title: 'Safe Path',
      description: 'The cave tunnel splits into two paths. The left path is well-worn and seems safer. You notice ancient markings on the wall that might provide clues if you search them.',
      event_type: 'choice_event',
      order_index: 3
    },
    {
      chapter_id: chapter.id,
      title: 'Dangerous Path',
      description: 'You find yourself face-to-face with a Cave Guardian - a massive crystalline creature blocking the path. Its eyes glow with the same blue light that fills the cave.',
      event_type: 'choice_event',
      order_index: 4
    },
    {
      chapter_id: chapter.id,
      title: 'Treasure Room',
      description: 'You\'ve found a hidden treasure room! Ancient coins and artifacts are scattered across stone pedestals. However, you notice a warning inscription: "Take only what you need, for greed awakens the curse."',
      event_type: 'choice_event',
      order_index: 5
    },
    {
      chapter_id: chapter.id,
      title: 'Victory',
      description: 'The Guardian crumbles into shimmering dust, revealing a path forward. You find a small pouch of coins among the remains - a reward for your bravery.',
      event_type: 'text_event',
      order_index: 6
    },
    {
      chapter_id: chapter.id,
      title: 'Cave Exit',
      description: 'You emerge from the cave into bright sunlight, your adventure complete. The experience has made you stronger and wiser.\n\n[END OF CHAPTER]',
      event_type: 'text_event',
      order_index: 7
    }
  ]

  const { data: createdEvents, error: eventsError } = await supabase
    .from('events')
    .insert(events)
    .select()

  if (eventsError) {
    console.error('❌ Error creating events:', eventsError)
    return
  }
  console.log(`✅ Created ${createdEvents.length} events`)

  // Map events by title for easy reference
  const eventMap = {}
  createdEvents.forEach(e => {
    eventMap[e.title] = e
  })

  // 4. Create Choices and Consequences
  console.log('\n🎯 Creating choices and consequences...')

  // Event 2: Cave Entrance
  const { data: choice2a } = await supabase
    .from('choices')
    .insert({
      event_id: eventMap['Cave Entrance'].id,
      text: 'Enter Carefully',
      choice_key: 'c1',
      order_index: 1
    })
    .select()
    .single()

  await supabase.from('consequences').insert({
    choice_id: choice2a.id,
    consequence_data: {
      response_text: 'You carefully step into the cave, your eyes adjusting to the dim light.',
      next_event_id: eventMap['Safe Path'].id,
      story_flag: 'entered_carefully'
    }
  })

  const { data: choice2b } = await supabase
    .from('choices')
    .insert({
      event_id: eventMap['Cave Entrance'].id,
      text: 'Rush In',
      choice_key: 'c2',
      order_index: 2
    })
    .select()
    .single()

  await supabase.from('consequences').insert({
    choice_id: choice2b.id,
    consequence_data: {
      response_text: 'You rush into the cave and immediately trip on a loose rock! You take damage but find yourself in a different part of the cave.',
      next_event_id: eventMap['Dangerous Path'].id,
      health: -10,
      story_flag: 'rushed_in'
    }
  })

  // Event 3: Safe Path
  const { data: choice3a } = await supabase
    .from('choices')
    .insert({
      event_id: eventMap['Safe Path'].id,
      text: 'Search the Markings',
      choice_key: 'c1',
      order_index: 1
    })
    .select()
    .single()

  await supabase.from('consequences').insert({
    choice_id: choice3a.id,
    consequence_data: {
      response_text: 'The ancient symbols reveal a map to a hidden treasure room! You gain wisdom from the discovery.',
      next_event_id: eventMap['Treasure Room'].id,
      experience: 50,
      energy: -5,
      story_flag: 'found_ancient_map'
    }
  })

  const { data: choice3b } = await supabase
    .from('choices')
    .insert({
      event_id: eventMap['Safe Path'].id,
      text: 'Continue Forward',
      choice_key: 'c2',
      order_index: 2
    })
    .select()
    .single()

  await supabase.from('consequences').insert({
    choice_id: choice3b.id,
    consequence_data: {
      response_text: 'You press on through the safe path, eventually finding the exit on the other side.',
      next_event_id: eventMap['Cave Exit'].id,
      energy: -3
    }
  })

  // Event 4: Dangerous Path
  const { data: choice4a } = await supabase
    .from('choices')
    .insert({
      event_id: eventMap['Dangerous Path'].id,
      text: 'Fight the Guardian',
      choice_key: 'c1',
      order_index: 1
    })
    .select()
    .single()

  await supabase.from('consequences').insert({
    choice_id: choice4a.id,
    consequence_data: {
      response_text: 'You engage in battle with the Guardian! After a fierce fight, you emerge victorious but wounded.',
      next_event_id: eventMap['Victory'].id,
      health: -20,
      energy: -15,
      experience: 100,
      credits: 50,
      story_flag: 'defeated_guardian'
    }
  })

  const { data: choice4b } = await supabase
    .from('choices')
    .insert({
      event_id: eventMap['Dangerous Path'].id,
      text: 'Flee Past It',
      choice_key: 'c2',
      order_index: 2
    })
    .select()
    .single()

  await supabase.from('consequences').insert({
    choice_id: choice4b.id,
    consequence_data: {
      response_text: 'You dodge around the Guardian and sprint deeper into the cave, discovering a hidden chamber!',
      next_event_id: eventMap['Treasure Room'].id,
      energy: -10,
      story_flag: 'fled_from_guardian'
    }
  })

  // Event 5: Treasure Room
  const { data: choice5a } = await supabase
    .from('choices')
    .insert({
      event_id: eventMap['Treasure Room'].id,
      text: 'Take All the Treasure',
      choice_key: 'c1',
      order_index: 1
    })
    .select()
    .single()

  await supabase.from('consequences').insert({
    choice_id: choice5a.id,
    consequence_data: {
      response_text: 'You greedily grab everything! The curse activates, draining your health but you\'re rich now.',
      next_event_id: eventMap['Cave Exit'].id,
      health: -30,
      credits: 500,
      story_flag: 'cursed_by_greed'
    }
  })

  const { data: choice5b } = await supabase
    .from('choices')
    .insert({
      event_id: eventMap['Treasure Room'].id,
      text: 'Take Only Some Treasure',
      choice_key: 'c2',
      order_index: 2
    })
    .select()
    .single()

  await supabase.from('consequences').insert({
    choice_id: choice5b.id,
    consequence_data: {
      response_text: 'You take a modest amount of treasure. The room glows warmly, blessing you with energy!',
      next_event_id: eventMap['Cave Exit'].id,
      credits: 150,
      energy: 20,
      story_flag: 'blessed_by_moderation'
    }
  })

  console.log('✅ All choices and consequences created')

  console.log('\n' + '='.repeat(60))
  console.log('✅ Example Chapter Complete!')
  console.log('='.repeat(60))
  console.log('\nChapter Details:')
  console.log(`  Story: ${story.title}`)
  console.log(`  Chapter: #99 - ${chapter.title}`)
  console.log(`  Events: 7`)
  console.log(`  Choices: 10`)
  console.log(`  Unique Paths: 5`)
  console.log('\nTo test:')
  console.log('  1. Open Story Editor in Admin panel')
  console.log('  2. Select "The Path" story')
  console.log('  3. Find Chapter 99: "The Mysterious Cave"')
  console.log('  4. Click "Test" to play through it!')
  console.log('\nSee: lore-and-story/example-chapter-outline.md for full details')
  console.log('='.repeat(60) + '\n')
}

main()
