// scripts/simple-seed.js
import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function seedSolanaSeeker() {
  console.log('Creating Solana Seeker item...')

  // Delete existing Solana Seeker if it exists
  await supabase.from('items').delete().eq('name', 'Solana Seeker')

  // Create the item
  const { data, error } = await supabase
    .from('items')
    .insert({
      id: randomUUID(),
      name: 'Solana Seeker',
      description: 'Revolutionary phone built for the Solana ecosystem',
      category: 'ACCESSORY',
      layerType: 'ACCESSORY',
      imageUrl: '/layers/9-misc-accessories/solana-seeker.png',
      rarity: 'LEGENDARY',
      energyEffect: 15,
      healthEffect: 0,
      layerfile: null,
      layergender: null,
      baselayerfile: 'solana-seeker.png',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('✅ Created Solana Seeker:', data)
  }
}

seedSolanaSeeker()
