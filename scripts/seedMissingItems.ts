// scripts/seedMissingItems.ts - Add missing items to database
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { WORLD_ITEMS } from '../data/worldItems'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

// Items that are missing from the database based on the restocking errors
const MISSING_ITEMS = [
  'Ration Pack',
  'Hot Cocoa',
  'Ironwood Planks',
  'Frost Crystal',
  'Mushroom Stew',
  'Network Interface',
  'Spore Mask',
  'Data Chip',
  'Bandwidth Booster',
  'Error Handler',
  'Water Purification Tablet',
  'Dune Boots',
  'Time Shard',
  'Temporal Stabilizer',
  'Chronometer Watch',
  'Bone Meal',
  'Marrow Extract',
  'Fossil Fragment',
  'Radio Wave',
  'Static Shock Drink',
]

async function seedMissingItems() {
  console.log('🌱 Seeding missing items to database...')
  console.log('='.repeat(50))

  let added = 0
  let skipped = 0

  for (const itemName of MISSING_ITEMS) {
    // Check if item already exists
    const { data: existingItem } = await supabase
      .from('items')
      .select('id')
      .eq('name', itemName)
      .single()

    if (existingItem) {
      console.log(`  ⏭️  ${itemName} - Already exists`)
      skipped++
      continue
    }

    // Find item in worldItems
    const worldItem = WORLD_ITEMS.find((item) => item.name === itemName)
    if (!worldItem) {
      console.log(`  ❌ ${itemName} - Not found in worldItems.ts`)
      continue
    }

    // Create the item
    const { error } = await supabase.from('items').insert({
      id: randomUUID(),
      name: worldItem.name,
      description: worldItem.description,
      category: worldItem.category,
      layerType: worldItem.layerType || null,
      rarity: worldItem.rarity,
      durability: worldItem.durability || null,
      energyEffect: worldItem.energyEffect || null,
      healthEffect: worldItem.healthEffect || null,
      imageUrl: `/items/${worldItem.name
        .toLowerCase()
        .replace(/\s+/g, '-')}.png`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (error) {
      console.log(`  ❌ ${itemName} - Failed to add: ${error.message}`)
    } else {
      console.log(`  ✅ ${itemName} - Added successfully`)
      added++
    }
  }

  console.log('\n📊 SEEDING SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Items added: ${added}`)
  console.log(`⏭️  Items skipped: ${skipped}`)
  console.log(`🎯 Total processed: ${added + skipped}`)

  if (added > 0) {
    console.log('\n🏪 Run restocking again to populate markets with new items:')
    console.log('npm run restock full')
  }
}

async function seedAllMissingWorldItems() {
  console.log('🌍 Seeding ALL missing items from worldItems.ts...')
  console.log('='.repeat(60))

  // Get all existing items from database
  const { data: existingItems, error } = await supabase
    .from('items')
    .select('name')

  if (error) {
    console.error('❌ Failed to fetch existing items:', error)
    return
  }

  const existingItemNames = new Set(
    existingItems?.map((item) => item.name) || []
  )
  let added = 0
  let skipped = 0

  for (const worldItem of WORLD_ITEMS) {
    if (existingItemNames.has(worldItem.name)) {
      console.log(`  ⏭️  ${worldItem.name} - Already exists`)
      skipped++
      continue
    }

    // Add the missing item
    const { error } = await supabase.from('items').insert({
      id: randomUUID(),
      name: worldItem.name,
      description: worldItem.description,
      category: worldItem.category,
      layerType: worldItem.layerType || null,
      rarity: worldItem.rarity,
      durability: worldItem.durability || null,
      energyEffect: worldItem.energyEffect || null,
      healthEffect: worldItem.healthEffect || null,
      imageUrl: `/items/${worldItem.name
        .toLowerCase()
        .replace(/\s+/g, '-')}.png`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (error) {
      console.log(`  ❌ ${worldItem.name} - Failed: ${error.message}`)
    } else {
      console.log(`  ✅ ${worldItem.name} - Added (${worldItem.rarity})`)
      added++
    }
  }

  console.log('\n📊 COMPLETE SEEDING SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ New items added: ${added}`)
  console.log(`⏭️  Items already existed: ${skipped}`)
  console.log(`📦 Total items in worldItems.ts: ${WORLD_ITEMS.length}`)
  console.log(`🎯 Database should now have: ${skipped + added} items`)

  if (added > 0) {
    console.log('\n🏪 Your database is now fully stocked!')
    console.log('Run: npm run restock full')
  }
}

async function main() {
  const mode = process.argv[2] || 'missing'

  try {
    switch (mode) {
      case 'missing':
        await seedMissingItems()
        break
      case 'all':
        await seedAllMissingWorldItems()
        break
      default:
        console.log('📋 Available commands:')
        console.log(
          '  npm run script seed-missing missing  - Add only the missing items from restock errors'
        )
        console.log(
          '  npm run script seed-missing all      - Add ALL items from worldItems.ts'
        )
        break
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error)
  }
}

// Export for external use
export { seedMissingItems, seedAllMissingWorldItems }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
