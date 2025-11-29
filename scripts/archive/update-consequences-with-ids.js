// Script to update existing consequences to use database IDs instead of event_key
// Run with: node scripts/update-consequences-with-ids.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function updateConsequencesWithIds() {
  console.log('Updating consequences to use database IDs instead of event_key...')

  // Define the mapping from event_key to database ID (from the previous script output)
  const eventIdMap = new Map([
    ['m1_e1', 'c0594da6-c809-41c5-a556-41ff6ce82dd1'],
    ['m2_e1', '3d0802c1-6c74-46f7-9bb8-7e963519f69f'],
    ['m3_e1', 'eedd90de-a335-4a09-8f05-972c8d99a67d'],
    ['m4_e1', 'ae70ae53-db37-427a-ac2f-3ac9bad4fc52'],
    ['m5_e1', 'fb740bc2-0bd0-4a31-affd-f03464189acd'],
    ['m6_e1', 'e98b1405-9a6f-432c-aca2-f9cd23fb0200'],
    ['m7_e1', 'ccaee48b-892b-4021-8766-a67820935ff0'],
    ['m8_e1', '476b116c-e840-4595-913c-5e5691062b15'],
    ['m9_e1', 'a050fc94-64b0-4d63-8f9a-1867d759ee30'],
    ['m10_e1', '816192ba-89a8-40b6-b5da-e223dc072813']
  ])

  // Find all consequences that have next_event_id
  const { data: consequences, error } = await supabase
    .from('consequences')
    .select('*')

  if (error) {
    console.error('Error fetching consequences:', error)
    return
  }

  console.log(`Found ${consequences.length} consequences to check`)

  let updatedCount = 0

  for (const consequence of consequences) {
    try {
      const data = consequence.consequence_data
      
      // Check if this consequence has a next_event_id that needs updating
      if (data && data.next_event_id && typeof data.next_event_id === 'string') {
        // Check if it's currently an event_key (not already a UUID)
        if (eventIdMap.has(data.next_event_id)) {
          const newEventId = eventIdMap.get(data.next_event_id)
          console.log(`\\nUpdating consequence ${consequence.id}:`)
          console.log(`  Converting: ${data.next_event_id} -> ${newEventId}`)

          // Update the consequence data
          const updatedData = {
            ...data,
            next_event_id: newEventId
          }

          const { error: updateError } = await supabase
            .from('consequences')
            .update({ consequence_data: updatedData })
            .eq('id', consequence.id)

          if (updateError) {
            console.error(`  Error updating consequence ${consequence.id}:`, updateError)
          } else {
            console.log(`  ✓ Updated successfully`)
            updatedCount++
          }
        } else if (data.next_event_id.length === 36 && data.next_event_id.includes('-')) {
          // Looks like it's already a UUID
          console.log(`Consequence ${consequence.id} already has UUID format: ${data.next_event_id}`)
        } else {
          console.log(`Consequence ${consequence.id} has unknown next_event_id format: ${data.next_event_id}`)
        }
      }
    } catch (err) {
      console.error(`Error processing consequence ${consequence.id}:`, err)
    }
  }

  console.log(`\\n✓ Updated ${updatedCount} consequences with database IDs`)
  console.log('Consequence ID update complete!')
}

// Run the update
updateConsequencesWithIds()