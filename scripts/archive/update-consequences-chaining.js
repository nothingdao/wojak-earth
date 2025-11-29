// Script to update existing consequences with next_event_id chaining
// Run with: node scripts/update-consequences-chaining.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function updateConsequencesWithChaining() {
  console.log('Updating consequences with chaining...')

  // Define the updates we want to make
  const updates = [
    {
      choice_key: 'm1_e1_c1', 
      update: {
        response_text: "The settlers are wary but willing to trade. You get clean water and some basic supplies, plus a reputation for being reasonable. One of them mentions strange signals coming from an old tech facility nearby.",
        next_event_id: "m2_e1"
      }
    },
    {
      choice_key: 'm1_e1_c2',
      update: {
        response_text: "You find some supplies in the settlement's outskirts, but the exertion costs you. You remain unseen, maintaining your independence. While scavenging, you notice Consor patrol drones in the distance.",
        next_event_id: "m3_e1"
      }
    },
    {
      choice_key: 'm2_e1_c1',
      update: {
        response_text: "You successfully interface with the AI, gaining access to valuable data and some control over the facility's systems. The mental strain is significant. The AI warns you about raiders approaching the area.",
        next_event_id: "m4_e1"
      }
    },
    {
      choice_key: 'm3_e1_c2',
      update: {
        response_text: "The patrol responds to your signal. They offer you a job - dangerous but well-paid. You're now on their radar. However, this arrangement leads to complications with your past associates.",
        next_event_id: "m5_e1"
      }
    },
    {
      choice_key: 'm4_e1_c1',
      update: {
        response_text: "You engage the raiders head-on, taking significant damage but emerging victorious. The traveler is grateful and shares their supplies. However, your aggressive actions have consequences - word spreads about your violent methods.",
        next_event_id: "m6_e1"
      }
    }
  ]

  for (const { choice_key, update } of updates) {
    console.log(`\nUpdating consequence for choice: ${choice_key}`)
    
    try {
      // First, find the choice by choice_key
      const { data: choice } = await supabase
        .from('choices')
        .select('id')
        .eq('choice_key', choice_key)
        .single()

      if (!choice) {
        console.log(`  Choice ${choice_key} not found`)
        continue
      }

      // Then find the consequence for that choice
      const { data: consequence } = await supabase
        .from('consequences')
        .select('id, consequence_data')
        .eq('choice_id', choice.id)
        .single()

      if (!consequence) {
        console.log(`  Consequence for choice ${choice_key} not found`)
        continue
      }

      // Update the consequence data
      const updatedData = {
        ...consequence.consequence_data,
        ...update
      }

      const { error } = await supabase
        .from('consequences')
        .update({ consequence_data: updatedData })
        .eq('id', consequence.id)

      if (error) {
        console.error(`  Error updating consequence for ${choice_key}:`, error)
      } else {
        console.log(`  ✓ Updated consequence for ${choice_key}`)
      }
    } catch (err) {
      console.error(`  Unexpected error for ${choice_key}:`, err)
    }
  }

  console.log('\n✓ Consequence chaining update complete!')
}

// Run the update
updateConsequencesWithChaining()