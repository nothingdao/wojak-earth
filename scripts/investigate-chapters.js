#!/usr/bin/env node

/**
 * Investigate why old chapters might be broken
 * Check for missing fields, broken references, etc.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('🔍 Investigating all chapters...\n')

  // Get all stories
  const { data: stories } = await supabase
    .from('stories')
    .select('id, title')
    .order('created_at', { ascending: false })

  for (const story of stories || []) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📖 Story: ${story.title}`)
    console.log('='.repeat(60))

    // Get chapters for this story
    const { data: chapters } = await supabase
      .from('chapters')
      .select('*')
      .eq('story_id', story.id)
      .order('chapter_number', { ascending: true })

    if (!chapters || chapters.length === 0) {
      console.log('  ❌ No chapters found')
      continue
    }

    for (const chapter of chapters) {
      console.log(`\n  📚 Chapter ${chapter.chapter_number}: ${chapter.title}`)

      // Get events for this chapter
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('chapter_id', chapter.id)
        .order('order_index', { ascending: true })

      console.log(`    Events: ${events?.length || 0}`)

      if (!events || events.length === 0) {
        console.log('    ❌ No events - chapter is empty!')
        continue
      }

      // Check for deprecated fields
      const hasEventKey = events.some(e => e.event_key !== null && e.event_key !== undefined)
      const hasEventType = events.some(e => e.event_type !== null && e.event_type !== undefined)

      if (hasEventKey) {
        console.log('    ⚠️  WARNING: Events still have event_key field (deprecated)')
      }
      if (hasEventType) {
        console.log('    ⚠️  WARNING: Events still have event_type field (deprecated)')
      }

      // Get all choices for all events in this chapter
      const eventIds = events.map(e => e.id)
      const { data: choices } = await supabase
        .from('choices')
        .select('*')
        .in('event_id', eventIds)

      console.log(`    Choices: ${choices?.length || 0}`)

      // Get all consequences
      const choiceIds = (choices || []).map(c => c.id)
      let consequences = []
      if (choiceIds.length > 0) {
        const { data: consData } = await supabase
          .from('consequences')
          .select('*')
          .in('choice_id', choiceIds)
        consequences = consData || []
      }

      console.log(`    Consequences: ${consequences.length}`)

      // Check for broken next_event_id references
      let brokenRefs = 0
      for (const cons of consequences) {
        const data = typeof cons.consequence_data === 'object' ? cons.consequence_data : {}
        if (data.next_event_id) {
          const targetExists = events.some(e => e.id === data.next_event_id)
          if (!targetExists) {
            brokenRefs++
          }
        }
      }

      if (brokenRefs > 0) {
        console.log(`    ❌ ${brokenRefs} broken next_event_id reference(s)!`)
      }

      // Check for events without choices that should have them
      const eventsWithoutChoices = events.filter(e => {
        return !choices?.some(c => c.event_id === e.id)
      })

      const eventsWithChoices = events.filter(e => {
        return choices?.some(c => c.event_id === e.id)
      })

      console.log(`    Text-only events: ${eventsWithoutChoices.length}`)
      console.log(`    Choice events: ${eventsWithChoices.length}`)

      // Check for choices without consequences
      const choicesWithoutConsequences = (choices || []).filter(choice => {
        return !consequences.some(c => c.choice_id === choice.id)
      })

      if (choicesWithoutConsequences.length > 0) {
        console.log(`    ⚠️  ${choicesWithoutConsequences.length} choice(s) without consequences!`)
      }

      // Summary
      const isHealthy =
        events.length > 0 &&
        brokenRefs === 0 &&
        choicesWithoutConsequences.length === 0 &&
        !hasEventKey &&
        !hasEventType

      if (isHealthy) {
        console.log(`    ✅ Chapter appears healthy`)
      } else {
        console.log(`    ⚠️  Chapter has issues`)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Investigation complete!')
  console.log('='.repeat(60) + '\n')
}

main()
