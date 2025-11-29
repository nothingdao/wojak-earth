// Script to populate the database with the complete male storyline using ID-based chaining
// Run with: node scripts/populate-male-story-id-based.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { maleStorylineData } from '../lore-and-story/male-storyline-data.js'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function populateStoryWithIds() {
  console.log('Starting to populate male storyline with ID-based chaining...')
  console.log(`Found ${maleStorylineData.chapters.length} chapters to populate`)

  let storyId = null
  let createdChapters = 0
  let createdEvents = 0
  let createdChoices = 0
  let createdConsequences = 0

  // Map to store event_key -> database_id mappings
  const eventIdMap = new Map()

  try {
    // Step 1: Create or get story
    const { data: existingStory } = await supabase
      .from('stories')
      .select('*')
      .eq('title', maleStorylineData.title)
      .eq('character_path', maleStorylineData.character_path)
      .single()

    if (existingStory) {
      console.log('Story already exists, using existing story ID:', existingStory.id)
      storyId = existingStory.id
    } else {
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          title: maleStorylineData.title,
          character_path: maleStorylineData.character_path,
          description: maleStorylineData.description
        })
        .select()
        .single()

      if (storyError) {
        console.error('Error creating story:', storyError)
        return
      }

      storyId = story.id
      console.log('Created story:', story.title, 'with ID:', story.id)
    }

    // Step 2: Create all chapters and events first (to get database IDs)
    for (const chapterData of maleStorylineData.chapters) {
      console.log(`\\nProcessing Chapter ${chapterData.chapter_number}: ${chapterData.title}`)

      // Create or get chapter
      const { data: existingChapter } = await supabase
        .from('chapters')
        .select('*')
        .eq('story_id', storyId)
        .eq('chapter_number', chapterData.chapter_number)
        .single()

      let chapterId = null
      if (existingChapter) {
        console.log(`Chapter ${chapterData.chapter_number} already exists, using existing ID:`, existingChapter.id)
        chapterId = existingChapter.id
      } else {
        const { data: chapter, error: chapterError } = await supabase
          .from('chapters')
          .insert({
            story_id: storyId,
            chapter_number: chapterData.chapter_number,
            title: chapterData.title,
            description: chapterData.description
          })
          .select()
          .single()

        if (chapterError) {
          console.error(`Error creating chapter ${chapterData.chapter_number}:`, chapterError)
          continue
        }

        chapterId = chapter.id
        createdChapters++
        console.log(`Created chapter ${chapter.chapter_number}: ${chapter.title}`)
      }

      // Create events for this chapter
      for (const eventData of chapterData.events) {
        console.log(`  Processing event: ${eventData.title}`)

        // Check if event already exists by title
        const { data: existingEvent } = await supabase
          .from('events')
          .select('*')
          .eq('chapter_id', chapterId)
          .eq('title', eventData.title)
          .single()

        let eventId = null
        if (existingEvent) {
          console.log(`    Event "${eventData.title}" already exists, using existing ID:`, existingEvent.id)
          eventId = existingEvent.id
        } else {
          const { data: event, error: eventError } = await supabase
            .from('events')
            .insert({
              chapter_id: chapterId,
              title: eventData.title,
              description: eventData.description,
              order_index: eventData.order_index,
              // Still include event_key for reference but it's not required for chaining
              event_key: eventData.event_key
            })
            .select()
            .single()

          if (eventError) {
            console.error(`    Error creating event ${eventData.title}:`, eventError)
            continue
          }

          eventId = event.id
          createdEvents++
          console.log(`    Created event: ${event.title}`)
        }

        // Store the mapping from event_key to database ID
        eventIdMap.set(eventData.event_key, eventId)
      }
    }

    console.log(`\\n=== EVENT ID MAPPING ===`)
    console.log('Event Key -> Database ID mappings:')
    for (const [key, id] of eventIdMap.entries()) {
      console.log(`  ${key} -> ${id}`)
    }

    // Step 3: Now create choices and consequences with proper ID references
    for (const chapterData of maleStorylineData.chapters) {
      console.log(`\\nCreating choices for Chapter ${chapterData.chapter_number}: ${chapterData.title}`)

      for (const eventData of chapterData.events) {
        const eventId = eventIdMap.get(eventData.event_key)
        if (!eventId) {
          console.error(`    Event ID not found for ${eventData.event_key}`)
          continue
        }

        console.log(`  Processing choices for event: ${eventData.title}`)

        for (const choiceData of eventData.choices) {
          console.log(`      Processing choice: ${choiceData.text.substring(0, 50)}...`)

          // Check if choice already exists
          const { data: existingChoice } = await supabase
            .from('choices')
            .select('*')
            .eq('event_id', eventId)
            .eq('text', choiceData.text)
            .single()

          let choiceId = null
          if (existingChoice) {
            console.log(`        Choice already exists, using existing ID:`, existingChoice.id)
            choiceId = existingChoice.id
          } else {
            const { data: choice, error: choiceError } = await supabase
              .from('choices')
              .insert({
                event_id: eventId,
                choice_key: choiceData.choice_key,
                text: choiceData.text,
                order_index: choiceData.order_index
              })
              .select()
              .single()

            if (choiceError) {
              console.error(`        Error creating choice:`, choiceError)
              continue
            }

            choiceId = choice.id
            createdChoices++
            console.log(`        Created choice: ${choice.text.substring(0, 50)}...`)
          }

          // Create consequence with proper ID-based chaining
          const { data: existingConsequence } = await supabase
            .from('consequences')
            .select('*')
            .eq('choice_id', choiceId)
            .single()

          if (!existingConsequence) {
            // Convert next_event_id from key to actual database ID
            let consequenceData = { ...choiceData.consequences }
            if (consequenceData.next_event_id && eventIdMap.has(consequenceData.next_event_id)) {
              const nextEventDbId = eventIdMap.get(consequenceData.next_event_id)
              console.log(`        Converting next_event_id: ${consequenceData.next_event_id} -> ${nextEventDbId}`)
              consequenceData.next_event_id = nextEventDbId
            }

            const { data: consequence, error: consequenceError } = await supabase
              .from('consequences')
              .insert({
                choice_id: choiceId,
                consequence_data: consequenceData
              })
              .select()
              .single()

            if (consequenceError) {
              console.error(`        Error creating consequence:`, consequenceError)
              continue
            }

            createdConsequences++
            console.log(`        Created consequence with proper ID chaining`)
          } else {
            console.log(`        Consequence already exists for choice`)
          }
        }
      }
    }

    console.log('\\n=== POPULATION SUMMARY ===')
    console.log(`Story ID: ${storyId}`)
    console.log(`Chapters created: ${createdChapters}`)
    console.log(`Events created: ${createdEvents}`)
    console.log(`Choices created: ${createdChoices}`)
    console.log(`Consequences created: ${createdConsequences}`)
    console.log(`Event ID mappings created: ${eventIdMap.size}`)
    console.log('Successfully populated male storyline with ID-based chaining!')

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the population script
populateStoryWithIds()