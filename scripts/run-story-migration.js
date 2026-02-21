#!/usr/bin/env node

/**
 * Verify story system migration was applied
 *
 * INSTRUCTIONS:
 * 1. Open your Supabase Dashboard
 * 2. Go to SQL Editor
 * 3. Copy and paste the contents of add-story-system-fields.sql
 * 4. Click "Run" to execute the migration
 * 5. Run this script to verify it worked: node scripts/run-story-migration.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyMigration() {
  console.log('🔍 Verifying story system migration...\n')
  console.log('If you have not run the migration yet:')
  console.log('1. Open Supabase Dashboard → SQL Editor')
  console.log('2. Copy/paste contents of: scripts/add-story-system-fields.sql')
  console.log('3. Click "Run"\n')
  console.log('Checking database...\n')

  let allGood = true

  try {
    // Check events table
    console.log('📋 Events table:')
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('required_location_id, required_items, required_flags')
      .limit(1)

    if (eventsError) {
      console.log('  ❌ Missing columns:', eventsError.message)
      allGood = false
    } else {
      console.log('  ✅ required_location_id')
      console.log('  ✅ required_items')
      console.log('  ✅ required_flags')
    }

    // Check chapters table
    console.log('\n📚 Chapters table:')
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('min_level')
      .limit(1)

    if (chaptersError) {
      console.log('  ❌ Missing column:', chaptersError.message)
      allGood = false
    } else {
      console.log('  ✅ min_level')
    }

    // Check stories table
    console.log('\n📖 Stories table:')
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('min_level')
      .limit(1)

    if (storiesError) {
      console.log('  ❌ Missing column:', storiesError.message)
      allGood = false
    } else {
      console.log('  ✅ min_level')
    }

    // Check characters table
    console.log('\n👤 Characters table:')
    const { data: characters, error: charactersError } = await supabase
      .from('characters')
      .select('completed_stories, completed_chapters, story_flags, inventory')
      .limit(1)

    if (charactersError) {
      console.log('  ❌ Missing columns:', charactersError.message)
      allGood = false
    } else {
      console.log('  ✅ completed_stories')
      console.log('  ✅ completed_chapters')
      console.log('  ✅ story_flags')
      console.log('  ✅ inventory')
    }

    if (allGood) {
      console.log('\n✨ Story system migration verified successfully!')
      console.log('You can now use the story system in-game.')
    } else {
      console.log('\n⚠️  Migration not complete - please run the SQL migration first.')
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message)
    console.log('\nMake sure you have run the migration SQL in Supabase Dashboard.')
  }
}

verifyMigration()

