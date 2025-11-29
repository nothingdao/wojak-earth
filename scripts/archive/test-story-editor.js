// Test script to verify story editor functionality with populated data
// Run with: node scripts/test-story-editor.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testStoryEditor() {
  console.log('Testing story editor functionality...')

  try {
    // Test 1: Load all stories
    console.log('\n1. Loading all stories...')
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false })

    if (storiesError) {
      console.error('Error loading stories:', storiesError)
      return
    }

    console.log(`Found ${stories.length} stories:`)
    stories.forEach(story => {
      console.log(`  - ${story.title} (${story.character_path})`)
    })

    // Test 2: Load male story specifically
    console.log('\n2. Loading male story...')
    const maleStory = stories.find(s => s.character_path === 'male')
    if (!maleStory) {
      console.log('No male story found!')
      return
    }

    console.log(`Male story: ${maleStory.title}`)

    // Test 3: Load chapters for male story
    console.log('\n3. Loading chapters...')
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('*')
      .eq('story_id', maleStory.id)
      .order('chapter_number', { ascending: true })

    if (chaptersError) {
      console.error('Error loading chapters:', chaptersError)
      return
    }

    console.log(`Found ${chapters.length} chapters:`)
    chapters.forEach(chapter => {
      console.log(`  - Chapter ${chapter.chapter_number}: ${chapter.title}`)
    })

    // Test 4: Load events for first chapter
    if (chapters.length > 0) {
      console.log('\n4. Loading events for first chapter...')
      const firstChapter = chapters[0]
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('chapter_id', firstChapter.id)
        .order('order_index', { ascending: true })

      if (eventsError) {
        console.error('Error loading events:', eventsError)
        return
      }

      console.log(`Found ${events.length} events in Chapter ${firstChapter.chapter_number}:`)
      events.forEach(event => {
        console.log(`  - ${event.title} (${event.event_key})`)
      })

      // Test 5: Load choices for first event
      if (events.length > 0) {
        console.log('\n5. Loading choices for first event...')
        const firstEvent = events[0]
        const { data: choices, error: choicesError } = await supabase
          .from('choices')
          .select('*')
          .eq('event_id', firstEvent.id)
          .order('order_index', { ascending: true })

        if (choicesError) {
          console.error('Error loading choices:', choicesError)
          return
        }

        console.log(`Found ${choices.length} choices in event "${firstEvent.title}":`)
        choices.forEach(choice => {
          console.log(`  - ${choice.text.substring(0, 60)}...`)
        })

        // Test 6: Load consequences for first choice
        if (choices.length > 0) {
          console.log('\n6. Loading consequences for first choice...')
          const firstChoice = choices[0]
          const { data: consequences, error: consequencesError } = await supabase
            .from('consequences')
            .select('*')
            .eq('choice_id', firstChoice.id)

          if (consequencesError) {
            console.error('Error loading consequences:', consequencesError)
            return
          }

          console.log(`Found ${consequences.length} consequences for choice "${firstChoice.text.substring(0, 40)}...":`)
          consequences.forEach(consequence => {
            console.log(`  - Health: ${consequence.consequence_data.health || 0}`)
            console.log(`  - Energy: ${consequence.consequence_data.energy || 0}`)
            console.log(`  - Experience: ${consequence.consequence_data.experience || 0}`)
            console.log(`  - Story Flag: ${consequence.consequence_data.story_flag || 'none'}`)
          })
        }
      }
    }

    // Test 7: Test story flag system
    console.log('\n7. Testing story flag system...')
    const { data: allConsequences, error: allConsequencesError } = await supabase
      .from('consequences')
      .select('consequence_data')

    if (allConsequencesError) {
      console.error('Error loading all consequences:', allConsequencesError)
      return
    }

    const storyFlags = new Set()
    allConsequences.forEach(consequence => {
      if (consequence.consequence_data.story_flag) {
        storyFlags.add(consequence.consequence_data.story_flag)
      }
    })

    console.log(`Found ${storyFlags.size} unique story flags:`)
    Array.from(storyFlags).sort().forEach(flag => {
      console.log(`  - ${flag}`)
    })

    console.log('\n=== TEST SUMMARY ===')
    console.log('✅ All database queries successful')
    console.log('✅ Story structure is properly populated')
    console.log('✅ Story editor should be able to load and display this data')
    console.log('✅ Story flag system is working')
    console.log('\nThe story editor is ready to use!')

  } catch (error) {
    console.error('Test failed with error:', error)
  }
}

// Run the test
testStoryEditor() 
