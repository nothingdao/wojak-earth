// Script to remove the NOT NULL constraint from event_key column
// Run with: node scripts/remove-event-key-constraint.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function removeEventKeyConstraint() {
  console.log('Removing NOT NULL constraint from event_key column...')

  try {
    // Execute the SQL to alter the table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE events ALTER COLUMN event_key DROP NOT NULL;'
    })

    if (error) {
      console.error('Error removing constraint:', error)
      console.log('\nTrying alternative approach...')
      
      // Alternative: Use the SQL editor approach
      console.log('Please run this SQL command in your Supabase SQL editor:')
      console.log('ALTER TABLE events ALTER COLUMN event_key DROP NOT NULL;')
    } else {
      console.log('✅ Successfully removed NOT NULL constraint from event_key column')
      console.log('New events can now be created without providing event_key values')
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    console.log('\nPlease run this SQL command manually in your Supabase SQL editor:')
    console.log('ALTER TABLE events ALTER COLUMN event_key DROP NOT NULL;')
  }
}

// Run the constraint removal
removeEventKeyConstraint()