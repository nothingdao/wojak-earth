// scripts/seed-layer-items.js
// Simple script to sync manifest layer items to database
import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔍 Environment check:')
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET')

// Only these layers become items
const LAYER_TO_CATEGORY_MAP = {
  '3-undergarments': 'CLOTHING',
  '4-clothing': 'CLOTHING',
  '5-outerwear': 'CLOTHING',
  '7-face-accessories': 'ACCESSORY',
  '8-headwear': 'HAT',
  '9-misc-accessories': 'ACCESSORY'
}

// Map manifest layer names to database LayerType enum values
const LAYER_TO_LAYERTYPE_MAP = {
  '3-undergarments': 'CLOTHING',
  '4-clothing': 'CLOTHING',
  '5-outerwear': 'CLOTHING',
  '7-face-accessories': 'FACE_COVERING',
  '8-headwear': 'HAT',
  '9-misc-accessories': 'ACCESSORY'
}

async function seedLayerItems() {
  console.log('🌱 Seeding layer-based items from manifest...')

  try {
    // Load the manifest
    const manifestPath = path.join(process.cwd(), 'public/layers/manifest.json')

    if (!fs.existsSync(manifestPath)) {
      console.error('❌ Manifest not found at:', manifestPath)
      return
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

    console.log('📖 Loaded manifest successfully')
    console.log('🔍 Will process layers:', Object.keys(LAYER_TO_CATEGORY_MAP))

    const itemsToCreate = []
    const itemsToUpdate = []
    const processedGenderlessItems = new Set() // Track genderless items by itemId

    // Process only the 6 item-eligible layer types
    for (const [layerType, layerData] of Object.entries(manifest)) {
      if (!LAYER_TO_CATEGORY_MAP[layerType]) {
        console.log(`⏭️  Skipping ${layerType} (not an item layer)`)
        continue
      }

      console.log(`🔍 Processing ${layerType}...`)
      const category = LAYER_TO_CATEGORY_MAP[layerType]
      const dbLayerType = LAYER_TO_LAYERTYPE_MAP[layerType]

      // Process each gender/neutral group
      for (const [genderType, items] of Object.entries(layerData)) {
        if (!Array.isArray(items)) continue

        for (const item of items) {
          // Skip if it's just a string (no item data)
          if (typeof item === 'string') {
            console.log(`  ⏭️  Skipping ${item} (no item metadata)`)
            continue
          }

          // Must have itemName to be considered an item
          if (!item.itemName || !item.file) {
            console.log(`  ⏭️  Skipping ${item.file || 'unknown'} (missing itemName)`)
            continue
          }

          // Check if item is genderless (has itemId)
          const isGenderless = !!item.itemId

          // For genderless items, only process once (skip duplicates across gender arrays)
          if (isGenderless) {
            if (processedGenderlessItems.has(item.itemId)) {
              console.log(`  ⏭️  Skipping ${item.itemName} (already processed genderless item)`)
              continue
            }
            processedGenderlessItems.add(item.itemId)
          }

          // Check if item already exists (use itemId for genderless, layerfile for gendered)
          const existingQuery = isGenderless
            ? supabase.from('items').select('id, name').eq('name', item.itemName).eq('layergender', null)
            : supabase.from('items').select('id, name, layerfile').eq('layerfile', item.file)

          const { data: existingItem } = await existingQuery.single()

          const itemData = {
            name: item.itemName,
            description: item.itemDescription || `A ${item.itemName.toLowerCase()} from character generation`,
            category: category,
            layerType: dbLayerType,
            imageUrl: `/layers/${layerType}/${item.file}`,
            rarity: item.rarity || 'COMMON',
            energyEffect: item.energyEffect || 0,
            healthEffect: item.healthEffect || 0,
            durability: item.durability || null,
            layerfile: isGenderless ? null : item.file, // Only set layerfile for gendered items
            layergender: isGenderless ? null : genderType.toUpperCase(), // Only set gender for gendered items
            updatedAt: new Date().toISOString()
          }

          if (existingItem) {
            // Update existing item
            itemsToUpdate.push({
              id: existingItem.id,
              ...itemData
            })
            console.log(`  🔄 Will update: ${item.itemName}${isGenderless ? ' (genderless)' : ` (${genderType})`}`)
          } else {
            // Create new item
            itemsToCreate.push({
              id: randomUUID(),
              createdAt: new Date().toISOString(),
              ...itemData
            })
            console.log(`  ➕ Will create: ${item.itemName}${isGenderless ? ' (genderless)' : ` (${genderType})`}`)
          }
        }
      }
    }

    // Create new items
    if (itemsToCreate.length > 0) {
      console.log(`\n📦 Creating ${itemsToCreate.length} new items...`)

      const { error: createError } = await supabase
        .from('items')
        .insert(itemsToCreate)

      if (createError) {
        console.error('❌ Error creating items:', createError)
        return
      }

      console.log('✅ New items created successfully!')
    }

    // Update existing items
    if (itemsToUpdate.length > 0) {
      console.log(`\n🔄 Updating ${itemsToUpdate.length} existing items...`)

      for (const item of itemsToUpdate) {
        const { id, ...updateData } = item
        const { error: updateError } = await supabase
          .from('items')
          .update(updateData)
          .eq('id', id)

        if (updateError) {
          console.error(`❌ Error updating item ${item.name}:`, updateError)
        }
      }

      console.log('✅ Existing items updated successfully!')
    }

    // Summary
    console.log('\n🎉 Seeding complete!')
    console.log(`📊 Summary:`)
    console.log(`  ➕ Created: ${itemsToCreate.length} items`)
    console.log(`  🔄 Updated: ${itemsToUpdate.length} items`)
    console.log(`  🚫 Processed genderless items: ${processedGenderlessItems.size}`)

    // Show created items by type
    if (itemsToCreate.length > 0) {
      console.log('\n📋 New items by type:')
      const genderless = itemsToCreate.filter(item => item.layergender === null)
      const gendered = itemsToCreate.filter(item => item.layergender !== null)

      if (genderless.length > 0) {
        console.log(`  🚫 Genderless: ${genderless.map(item => item.name).join(', ')}`)
      }
      if (gendered.length > 0) {
        console.log(`  👤 Gendered: ${gendered.map(item => `${item.name} (${item.layergender})`).join(', ')}`)
      }
    }

  } catch (error) {
    console.error('❌ Fatal error during seeding:', error)
  }
}

// Run the seeder
if (import.meta.url === `file://${process.argv[1]}`) {
  seedLayerItems()
    .then(() => {
      console.log('\n✅ Seeding script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Seeding script failed:', error)
      process.exit(1)
    })
}

export { seedLayerItems }
