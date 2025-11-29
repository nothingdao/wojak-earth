// Script to populate the database with the complete male storyline
// Run with: node scripts/populate-male-story.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { maleStorylineData } from '../lore-and-story/male-storyline-data.js'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function populateStory() {
  console.log('Starting to populate male storyline...')
  console.log(`Found ${maleStorylineData.chapters.length} chapters to populate`)

  let storyId = null
  let createdChapters = 0
  let createdEvents = 0
  let createdChoices = 0
  let createdConsequences = 0

  try {
    // Check if story already exists
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
      // Create the story
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

    // Create chapters
    for (const chapterData of maleStorylineData.chapters) {
      console.log(`\nProcessing Chapter ${chapterData.chapter_number}: ${chapterData.title}`)

      // Check if chapter already exists
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

      // Create events
      for (const eventData of chapterData.events) {
        console.log(`  Processing event: ${eventData.title}`)

        // Check if event already exists
        const { data: existingEvent } = await supabase
          .from('events')
          .select('*')
          .eq('chapter_id', chapterId)
          .eq('event_key', eventData.event_key)
          .single()

        let eventId = null
        if (existingEvent) {
          console.log(`    Event ${eventData.event_key} already exists, using existing ID:`, existingEvent.id)
          eventId = existingEvent.id
        } else {
          const { data: event, error: eventError } = await supabase
            .from('events')
            .insert({
              chapter_id: chapterId,
              event_key: eventData.event_key,
              title: eventData.title,
              description: eventData.description,
              order_index: eventData.order_index
            })
            .select()
            .single()

          if (eventError) {
            console.error(`    Error creating event ${eventData.event_key}:`, eventError)
            continue
          }

          eventId = event.id
          createdEvents++
          console.log(`    Created event: ${event.title}`)
        }

        // Create choices
        for (const choiceData of eventData.choices) {
          console.log(`      Processing choice: ${choiceData.text.substring(0, 50)}...`)

          // Check if choice already exists
          const { data: existingChoice } = await supabase
            .from('choices')
            .select('*')
            .eq('event_id', eventId)
            .eq('choice_key', choiceData.choice_key)
            .single()

          let choiceId = null
          if (existingChoice) {
            console.log(`        Choice ${choiceData.choice_key} already exists, using existing ID:`, existingChoice.id)
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
              console.error(`        Error creating choice ${choiceData.choice_key}:`, choiceError)
              continue
            }

            choiceId = choice.id
            createdChoices++
            console.log(`        Created choice: ${choice.text.substring(0, 50)}...`)
          }

          // Create consequence
          const { data: existingConsequence } = await supabase
            .from('consequences')
            .select('*')
            .eq('choice_id', choiceId)
            .single()

          if (!existingConsequence) {
            const { data: consequence, error: consequenceError } = await supabase
              .from('consequences')
              .insert({
                choice_id: choiceId,
                consequence_data: choiceData.consequences
              })
              .select()
              .single()

            if (consequenceError) {
              console.error(`        Error creating consequence for choice ${choiceData.choice_key}:`, consequenceError)
              continue
            }

            createdConsequences++
            console.log(`        Created consequence for choice`)
          } else {
            console.log(`        Consequence already exists for choice`)
          }
        }
      }
    }

    console.log('\n=== POPULATION SUMMARY ===')
    console.log(`Story ID: ${storyId}`)
    console.log(`Chapters created: ${createdChapters}`)
    console.log(`Events created: ${createdEvents}`)
    console.log(`Choices created: ${createdChoices}`)
    console.log(`Consequences created: ${createdConsequences}`)
    console.log('Successfully populated male storyline!')

    // Verify the data
    console.log('\n=== VERIFICATION ===')
    const { data: storyCount } = await supabase
      .from('stories')
      .select('*', { count: 'exact' })
      .eq('character_path', 'male')

    const { data: chapterCount } = await supabase
      .from('chapters')
      .select('*', { count: 'exact' })
      .eq('story_id', storyId)

    const { data: eventCount } = await supabase
      .from('events')
      .select('*', { count: 'exact' })
      .eq('chapter_id', chapterCount?.[0]?.id || '')

    console.log(`Total male stories in database: ${storyCount?.length || 0}`)
    console.log(`Total chapters for this story: ${chapterCount?.length || 0}`)
    console.log(`Total events for first chapter: ${eventCount?.length || 0}`)

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the population script
populateStory() 
