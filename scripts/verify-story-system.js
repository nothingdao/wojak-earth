#!/usr/bin/env node

/**
 * Verify the story system is set up correctly
 * Shows current stories, locations, and new fields
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('📖 Story System Verification\n')
  console.log('═'.repeat(60))

  // Check stories
  const { data: stories, error: storiesError } = await supabase
    .from('stories')
    .select('id, title, character_path, location_ids, min_level, max_level, first_event_id, is_active, display_order')
    .order('created_at', { ascending: false })

  if (storiesError) {
    console.error('❌ Error loading stories:', storiesError)
    return
  }

  console.log(`\n📚 Stories (${stories.length} total):`)
  console.log('─'.repeat(60))
  for (const story of stories) {
    console.log(`\n  🔖 ${story.title} (${story.character_path})`)
    const locDesc = !story.location_ids || story.location_ids.length === 0
      ? 'All locations'
      : `${story.location_ids.length} location(s): ${story.location_ids.slice(0, 3).join(', ')}${story.location_ids.length > 3 ? '...' : ''}`
    console.log(`     Locations: ${locDesc}`)
    console.log(`     Level Range: ${story.min_level}${story.max_level ? `-${story.max_level}` : '+'}`)
    console.log(`     First Event: ${story.first_event_id || 'Not set'}`)
    console.log(`     Active: ${story.is_active ? '✅' : '❌'}`)
    console.log(`     Display Order: ${story.display_order}`)
  }

  // Check locations
  const { data: locations, error: locationsError } = await supabase
    .from('locations')
    .select('id, name')
    .order('name')

  if (locationsError) {
    console.error('\n❌ Error loading locations:', locationsError)
    return
  }

  console.log(`\n\n🗺️  Locations (${locations.length} total):`)
  console.log('─'.repeat(60))
  for (const loc of locations) {
    console.log(`  📍 ${loc.name} (ID: ${loc.id})`)
  }

  // Check story progress
  const { data: progress, error: progressError } = await supabase
    .from('story_progress')
    .select('character_id, story_id, is_completed, started_at')
    .limit(5)

  if (progressError) {
    console.error('\n❌ Error loading story progress:', progressError)
    return
  }

  console.log(`\n\n📊 Recent Story Progress (showing ${progress.length} records):`)
  console.log('─'.repeat(60))
  if (progress.length === 0) {
    console.log('  (No story progress yet)')
  } else {
    for (const p of progress) {
      console.log(`  Character: ${p.character_id}`)
      console.log(`  Story: ${p.story_id}`)
      console.log(`  Status: ${p.is_completed ? 'Completed' : 'In Progress'}`)
      console.log(`  Started: ${p.started_at}`)
      console.log()
    }
  }

  console.log('\n' + '═'.repeat(60))
  console.log('✅ Story system verified successfully!')
  console.log('\nNext steps:')
  console.log('  1. Run the app with: npm run dev')
  console.log('  2. Navigate to Admin panel')
  console.log('  3. Open Story Editor')
  console.log('  4. Select a story to edit and configure location/requirements')
  console.log('═'.repeat(60) + '\n')
}

main()
