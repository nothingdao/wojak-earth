#!/usr/bin/env node

/**
 * Check for orphaned data after bulk deletions
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('🔍 Checking for orphaned data...\n')

  // Get all chapters
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title, chapter_number, story_id')

  const chapterIds = new Set((chapters || []).map(c => c.id))
  console.log(`✅ Found ${chapterIds.size} chapters`)

  // Get all events
  const { data: events } = await supabase
    .from('events')
    .select('id, title, chapter_id')

  console.log(`📊 Found ${events?.length || 0} events total`)

  // Check for orphaned events
  const orphanedEvents = (events || []).filter(e => !chapterIds.has(e.chapter_id))

  if (orphanedEvents.length > 0) {
    console.log(`\n❌ Found ${orphanedEvents.length} ORPHANED EVENTS:`)
    orphanedEvents.forEach(e => {
      console.log(`   • "${e.title}" (id: ${e.id.substring(0, 8)}..., chapter_id: ${e.chapter_id?.substring(0, 8)}...)`)
    })
  } else {
    console.log('✅ No orphaned events found')
  }

  // Get all choices
  const { data: choices } = await supabase
    .from('choices')
    .select('id, text, event_id')

  const eventIds = new Set((events || []).map(e => e.id))
  console.log(`\n📊 Found ${choices?.length || 0} choices total`)

  // Check for orphaned choices
  const orphanedChoices = (choices || []).filter(c => !eventIds.has(c.event_id))

  if (orphanedChoices.length > 0) {
    console.log(`❌ Found ${orphanedChoices.length} ORPHANED CHOICES:`)
    orphanedChoices.forEach(c => {
      console.log(`   • "${c.text}" (id: ${c.id.substring(0, 8)}..., event_id: ${c.event_id?.substring(0, 8)}...)`)
    })
  } else {
    console.log('✅ No orphaned choices found')
  }

  // Get all consequences
  const { data: consequences } = await supabase
    .from('consequences')
    .select('id, choice_id')

  const choiceIds = new Set((choices || []).map(c => c.id))
  console.log(`\n📊 Found ${consequences?.length || 0} consequences total`)

  // Check for orphaned consequences
  const orphanedConsequences = (consequences || []).filter(c => !choiceIds.has(c.choice_id))

  if (orphanedConsequences.length > 0) {
    console.log(`❌ Found ${orphanedConsequences.length} ORPHANED CONSEQUENCES:`)
    orphanedConsequences.forEach(c => {
      console.log(`   • id: ${c.id.substring(0, 8)}..., choice_id: ${c.choice_id?.substring(0, 8)}...`)
    })
  } else {
    console.log('✅ No orphaned consequences found')
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  const totalOrphans = orphanedEvents.length + orphanedChoices.length + orphanedConsequences.length

  if (totalOrphans === 0) {
    console.log('✅ DATABASE IS CLEAN - No orphaned data!')
  } else {
    console.log(`⚠️  Found ${totalOrphans} orphaned records total`)
    console.log('\nTo clean up, run: node scripts/clean-orphans.js')
  }
  console.log('='.repeat(60) + '\n')

  // Show chapter summary
  console.log('\nCurrent Chapters:')
  if (chapters && chapters.length > 0) {
    chapters.forEach(c => {
      const chapterEvents = (events || []).filter(e => e.chapter_id === c.id)
      console.log(`  • Chapter ${c.chapter_number}: "${c.title}" - ${chapterEvents.length} events`)
    })
  } else {
    console.log('  (none)')
  }
}

main()
