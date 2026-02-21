#!/usr/bin/env node

/**
 * Run the location-based story system migration
 * This script checks if the migration is needed and applies it if so
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// ES module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkIfMigrationNeeded() {
  console.log('Checking if migration is needed...')

  // Try to query story_progress table
  const { data, error } = await supabase
    .from('story_progress')
    .select('id')
    .limit(1)

  if (error) {
    if (error.message.includes('relation "public.story_progress" does not exist')) {
      console.log('✅ Migration needed - story_progress table does not exist')
      return true
    }
    console.error('Error checking table:', error)
    return false
  }

  console.log('⚠️ story_progress table already exists - migration may have been run')

  // Check if stories table has new columns
  const { data: storyData, error: storyError } = await supabase
    .from('stories')
    .select('location_id, min_level, first_event_id')
    .limit(1)

  if (storyError) {
    console.log('✅ Migration needed - stories table missing new columns')
    return true
  }

  console.log('✅ Migration appears to be complete already')
  return false
}

async function runMigration() {
  console.log('\n🚀 Running location-based story system migration...\n')

  const migrationPath = path.join(__dirname, 'create-story-location-system.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  try {
    // Use the rpc method to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If exec_sql doesn't exist, we need to use a different approach
      if (error.message.includes('function public.exec_sql')) {
        console.log('\n⚠️ Cannot run SQL directly via Supabase client.')
        console.log('Please run the migration manually:\n')
        console.log('1. Go to your Supabase dashboard')
        console.log('2. Navigate to SQL Editor')
        console.log('3. Copy and paste the contents of:')
        console.log(`   ${migrationPath}`)
        console.log('4. Execute the SQL\n')
        process.exit(1)
      }
      throw error
    }

    console.log('✅ Migration completed successfully!')
    return true
  } catch (error) {
    console.error('❌ Migration failed:', error)
    return false
  }
}

async function main() {
  try {
    const needsMigration = await checkIfMigrationNeeded()

    if (needsMigration) {
      await runMigration()
    } else {
      console.log('\n✅ No migration needed - database is up to date')
    }
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
