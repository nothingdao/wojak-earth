// scripts/restockMarkets.ts - Selective market restocking with multiple modes
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { MARKET_SEED_DATA } from '../config/seedData'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY! // Using anon key for now
)

interface ItemRestockConfig {
  itemName: string
  locations: string[]
  quantity: number
  price?: number // Optional - will use existing price if not specified
  mode: 'add' | 'replace' | 'update' // How to handle existing stock
}

interface GeneralRestockConfig {
  minQuantity: number // Restock when below this
  maxQuantity: number // Restock up to this amount
  priceVariation: number // ±% price variation from base
}

// ============================================================================
// RESTOCKING CONFIGURATIONS
// ============================================================================

const ITEM_RESTOCK_CONFIGS: ItemRestockConfig[] = [
  {
    itemName: 'Energy Drink',
    locations: [
      'Mining Plains',
      'Crystal Caves',
      'Frostpine Reaches',
      'Fungi Networks',
      'Underland',
    ],
    quantity: 25, // Add 25 to each location
    mode: 'add', // Add to existing stock
  },
  {
    itemName: 'Health Potion',
    locations: ['Crystal Caves', 'Frostpine Reaches', 'Fungi Networks'],
    quantity: 15,
    mode: 'add',
  },
  {
    itemName: 'Basic Pickaxe',
    locations: ['Mining Plains', 'Frostpine Reaches'],
    quantity: 10,
    price: 20, // Override price
    mode: 'replace',
  },
]

const GENERAL_RESTOCK_CONFIG: GeneralRestockConfig = {
  minQuantity: 2, // Restock when quantity drops below 2
  maxQuantity: 15, // Don't exceed 15 of any item
  priceVariation: 0.15, // ±15% price variation
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function applyPriceMultiplier(basePrice: number, locationName: string): number {
  // Price multipliers based on location difficulty/remoteness
  const priceMultipliers: Record<string, number> = {
    'Mining Plains': 1.0,
    'Crystal Caves': 1.1,
    'Frostpine Reaches': 1.2,
    'Fungi Networks': 1.1,
    Underland: 1.15,
    Retardia: 1.3,
  }

  const multiplier = priceMultipliers[locationName] || 1.0
  return Math.round(basePrice * multiplier)
}

async function getMarketListingsNeedingRestock() {
  console.log('🔍 Checking market listings that need restocking...')

  const { data: lowStockListings, error } = await supabase
    .from('market_listings')
    .select(
      `
      id,
      quantity,
      price,
      isSystemItem,
      locations:locationId(id, name),
      items:itemId(id, name)
    `
    )
    .eq('isSystemItem', true)
    .lt('quantity', GENERAL_RESTOCK_CONFIG.minQuantity)

  if (error) {
    console.error('❌ Failed to fetch market listings:', error)
    throw error
  }

  return lowStockListings || []
}

// ============================================================================
// SPECIFIC ITEM RESTOCKING
// ============================================================================

async function restockSpecificItems() {
  console.log('🔄 Starting specific item restocking...')
  console.log('='.repeat(50))

  let totalUpdates = 0
  let totalAdded = 0
  let totalReplaced = 0

  for (const config of ITEM_RESTOCK_CONFIGS) {
    console.log(`\n📦 Processing ${config.itemName}...`)

    // Find the item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, name')
      .eq('name', config.itemName)
      .single()

    if (itemError || !item) {
      console.log(`  ❌ Item '${config.itemName}' not found`)
      continue
    }

    // Process each location
    for (const locationName of config.locations) {
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('id, name, hasMarket')
        .eq('name', locationName)
        .single()

      if (locationError || !location) {
        console.log(`  ❌ Location '${locationName}' not found`)
        continue
      }

      if (!location.hasMarket) {
        console.log(`  ⚠️  Location '${locationName}' has no market`)
        continue
      }

      // Check for existing listing
      const { data: existingListing } = await supabase
        .from('market_listings')
        .select('id, quantity, price')
        .eq('locationId', location.id)
        .eq('itemId', item.id)
        .eq('isSystemItem', true)
        .single()

      const basePrice = config.price || 8 // Default price
      const adjustedPrice = applyPriceMultiplier(basePrice, locationName)

      if (existingListing) {
        // Handle existing listing based on mode
        switch (config.mode) {
          case 'add': {
            const { error: addError } = await supabase
              .from('market_listings')
              .update({
                quantity: existingListing.quantity + config.quantity,
                updatedAt: new Date().toISOString(),
              })
              .eq('id', existingListing.id)

            if (!addError) {
              console.log(
                `  ✅ Added ${
                  config.quantity
                } to existing stock in ${locationName} (total: ${
                  existingListing.quantity + config.quantity
                })`
              )
              totalAdded++
            }
            break
          }

          case 'replace': {
            const { error: replaceError } = await supabase
              .from('market_listings')
              .update({
                quantity: config.quantity,
                price: adjustedPrice,
                updatedAt: new Date().toISOString(),
              })
              .eq('id', existingListing.id)

            if (!replaceError) {
              console.log(
                `  🔄 Replaced stock in ${locationName} (new quantity: ${config.quantity})`
              )
              totalReplaced++
            }
            break
          }

          case 'update': {
            const { error: updateError } = await supabase
              .from('market_listings')
              .update({
                quantity: Math.max(existingListing.quantity, config.quantity),
                price: adjustedPrice,
                updatedAt: new Date().toISOString(),
              })
              .eq('id', existingListing.id)

            if (!updateError) {
              console.log(
                `  ⬆️  Updated stock in ${locationName} (quantity: ${Math.max(
                  existingListing.quantity,
                  config.quantity
                )})`
              )
              totalUpdates++
            }
            break
          }
        }
      } else {
        // Create new listing
        const { error: createError } = await supabase
          .from('market_listings')
          .insert({
            id: randomUUID(),
            sellerId: null,
            locationId: location.id,
            itemId: item.id,
            quantity: config.quantity,
            price: adjustedPrice,
            isSystemItem: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })

        if (!createError) {
          console.log(
            `  🆕 Created new listing in ${locationName} (quantity: ${config.quantity}, price: ${adjustedPrice})`
          )
          totalAdded++
        }
      }
    }
  }

  console.log('\n📊 SPECIFIC ITEM RESTOCKING SUMMARY')
  console.log('='.repeat(50))
  console.log(`📈 Items added: ${totalAdded}`)
  console.log(`🔄 Items replaced: ${totalReplaced}`)
  console.log(`⬆️  Items updated: ${totalUpdates}`)
  console.log(
    `🎯 Total operations: ${totalAdded + totalReplaced + totalUpdates}`
  )
}

// ============================================================================
// ENERGY DRINK QUICK RESTOCK
// ============================================================================

async function restockEnergyDrinksOnly(quantity: number = 50) {
  console.log(`⚡ Quick-restocking Energy Drinks (+${quantity} each location)`)
  console.log('='.repeat(50))

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('id')
    .eq('name', 'Energy Drink')
    .single()

  if (itemError || !item) {
    console.log('❌ Energy Drink item not found!')
    return
  }

  // Get all market locations
  const { data: marketLocations, error: locationsError } = await supabase
    .from('locations')
    .select('id, name')
    .eq('hasMarket', true)

  if (locationsError || !marketLocations) {
    console.log('❌ Failed to fetch market locations!')
    return
  }

  let restocked = 0

  for (const location of marketLocations) {
    const { data: existingListing } = await supabase
      .from('market_listings')
      .select('id, quantity')
      .eq('locationId', location.id)
      .eq('itemId', item.id)
      .eq('isSystemItem', true)
      .single()

    const adjustedPrice = applyPriceMultiplier(8, location.name) // Base price 8

    if (existingListing) {
      // Add to existing stock
      const { error } = await supabase
        .from('market_listings')
        .update({
          quantity: existingListing.quantity + quantity,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', existingListing.id)

      if (!error) {
        console.log(
          `  ✅ ${location.name}: ${existingListing.quantity} → ${
            existingListing.quantity + quantity
          }`
        )
        restocked++
      }
    } else {
      // Create new listing
      const { error } = await supabase.from('market_listings').insert({
        id: randomUUID(),
        sellerId: null,
        locationId: location.id,
        itemId: item.id,
        quantity: quantity,
        price: adjustedPrice,
        isSystemItem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      if (!error) {
        console.log(`  🆕 ${location.name}: Created with ${quantity} drinks`)
        restocked++
      }
    }
  }

  console.log(`\n✅ Restocked Energy Drinks in ${restocked} locations`)
}

// ============================================================================
// GENERAL MARKET RESTOCKING (Low Stock Items)
// ============================================================================

async function restockSystemItems() {
  console.log('📦 Restocking system market items (low stock)...')

  const lowStockListings = await getMarketListingsNeedingRestock()

  if (lowStockListings.length === 0) {
    console.log('✅ No items need restocking')
    return
  }

  const updates = []

  for (const listing of lowStockListings) {
    const locationName = listing.locations?.name
    const itemName = listing.items?.name

    // Find the base configuration for this item
    const baseConfig = MARKET_SEED_DATA[locationName]?.find(
      (item) => item.itemName === itemName
    )

    if (!baseConfig) {
      console.warn(`⚠️ No base config found for ${itemName} in ${locationName}`)
      continue
    }

    // Calculate new quantity (random between current and max)
    const currentQuantity = listing.quantity
    const targetQuantity = Math.min(
      baseConfig.quantity,
      GENERAL_RESTOCK_CONFIG.maxQuantity
    )
    const newQuantity = Math.max(
      currentQuantity,
      Math.floor(Math.random() * (targetQuantity - currentQuantity + 1)) +
        currentQuantity
    )

    // Calculate price variation (±15% from base price)
    const basePrice = baseConfig.basePrice
    const priceVariation =
      (Math.random() - 0.5) * 2 * GENERAL_RESTOCK_CONFIG.priceVariation
    const adjustedBasePrice = applyPriceMultiplier(basePrice, locationName)
    const newPrice = Math.round(adjustedBasePrice * (1 + priceVariation))

    updates.push({
      id: listing.id,
      quantity: newQuantity,
      price: newPrice,
      updatedAt: new Date().toISOString(),
    })

    console.log(
      `  📈 ${locationName}: ${itemName} ${currentQuantity} → ${newQuantity} (${newPrice} coins)`
    )
  }

  if (updates.length > 0) {
    const { error } = await supabase
      .from('market_listings')
      .upsert(updates, { onConflict: 'id' })

    if (error) {
      console.error('❌ Failed to update market listings:', error)
      throw error
    }
  }

  console.log(`✅ Restocked ${updates.length} items`)
}

async function addMissingSystemItems() {
  console.log('🔍 Checking for missing system items...')

  const missingItems = []

  for (const [locationName, items] of Object.entries(MARKET_SEED_DATA)) {
    // Get location
    const { data: location } = await supabase
      .from('locations')
      .select('id')
      .eq('name', locationName)
      .single()

    if (!location) continue

    for (const marketItem of items) {
      // Get item
      const { data: item } = await supabase
        .from('items')
        .select('id')
        .eq('name', marketItem.itemName)
        .single()

      if (!item) continue

      // Check if this item already exists in this location's market
      const { data: existingListing } = await supabase
        .from('market_listings')
        .select('id')
        .eq('locationId', location.id)
        .eq('itemId', item.id)
        .eq('isSystemItem', true)
        .single()

      if (!existingListing) {
        const adjustedPrice = applyPriceMultiplier(
          marketItem.basePrice,
          locationName
        )

        missingItems.push({
          id: crypto.randomUUID(),
          sellerId: null,
          locationId: location.id,
          itemId: item.id,
          price: adjustedPrice,
          quantity: marketItem.quantity,
          isSystemItem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        console.log(
          `  ➕ Adding missing: ${marketItem.itemName} to ${locationName}`
        )
      }
    }
  }

  if (missingItems.length > 0) {
    const { error } = await supabase
      .from('market_listings')
      .insert(missingItems)

    if (error) {
      console.error('❌ Failed to add missing items:', error)
      throw error
    }
  }

  console.log(`✅ Added ${missingItems.length} missing system items`)
}

async function removeOverstockedItems() {
  console.log('📉 Checking for overstocked items...')

  const { data: overstockedListings, error } = await supabase
    .from('market_listings')
    .select(
      `
      id, 
      quantity, 
      locations:locationId(name), 
      items:itemId(name)
    `
    )
    .eq('isSystemItem', true)
    .gt('quantity', GENERAL_RESTOCK_CONFIG.maxQuantity)

  if (error) {
    console.error('❌ Failed to fetch overstocked listings:', error)
    throw error
  }

  if (!overstockedListings || overstockedListings.length === 0) {
    console.log('✅ No overstocked items found')
    return
  }

  const updates = overstockedListings.map((listing) => ({
    id: listing.id,
    quantity: GENERAL_RESTOCK_CONFIG.maxQuantity,
    updatedAt: new Date().toISOString(),
  }))

  const { error: updateError } = await supabase
    .from('market_listings')
    .upsert(updates, { onConflict: 'id' })

  if (updateError) {
    console.error('❌ Failed to reduce overstocked items:', updateError)
    throw updateError
  }

  console.log(`✅ Reduced quantity for ${updates.length} overstocked items`)
}

// ============================================================================
// MARKET ANALYSIS TOOLS
// ============================================================================

async function analyzeCurrentStock() {
  console.log('📊 CURRENT MARKET ANALYSIS')
  console.log('='.repeat(50))

  const { data: marketListings, error } = await supabase
    .from('market_listings')
    .select(
      `
      quantity,
      price,
      items:itemId(name),
      locations:locationId(name)
    `
    )
    .eq('isSystemItem', true)
    .order('items(name)')

  if (error || !marketListings) {
    console.error('❌ Failed to fetch market listings:', error)
    return
  }

  // Group by item
  const itemStock = new Map<
    string,
    Array<{ location: string; quantity: number; price: number }>
  >()

  for (const listing of marketListings) {
    const itemName = listing.items?.name
    if (!itemName) continue

    if (!itemStock.has(itemName)) {
      itemStock.set(itemName, [])
    }
    itemStock.get(itemName)!.push({
      location: listing.locations?.name || 'Unknown',
      quantity: listing.quantity,
      price: listing.price,
    })
  }

  // Display analysis
  for (const [itemName, locations] of itemStock) {
    const totalStock = locations.reduce((sum, loc) => sum + loc.quantity, 0)
    const avgPrice = Math.round(
      locations.reduce((sum, loc) => sum + loc.price, 0) / locations.length
    )

    console.log(`\n📦 ${itemName}:`)
    console.log(
      `   Total Stock: ${totalStock} across ${locations.length} locations`
    )
    console.log(`   Average Price: ${avgPrice} coins`)

    if (totalStock < 10) {
      console.log(`   ⚠️  LOW STOCK WARNING`)
    }

    // Show top 3 locations by stock
    const topLocations = locations
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3)

    topLocations.forEach((loc, i) => {
      console.log(
        `   ${i + 1}. ${loc.location}: ${loc.quantity} @ ${loc.price}c`
      )
    })
  }
}

// ============================================================================
// MAIN EXECUTION OPTIONS
// ============================================================================

// Main restocking function
export async function restockMarkets() {
  console.log('🏪 Starting comprehensive market restocking...\n')

  try {
    await addMissingSystemItems() // Add any items that are completely missing
    await restockSystemItems() // Restock items that are low
    await removeOverstockedItems() // Cap items that are too high

    console.log('\n🎉 Market restocking completed successfully!')
  } catch (error) {
    console.error('\n💥 Market restocking failed:', error)
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'energy'

  try {
    switch (command) {
      case 'energy': {
        const quantity = parseInt(args[1]) || 50
        await restockEnergyDrinksOnly(quantity)
        break
      }

      case 'specific': {
        await restockSpecificItems()
        break
      }

      case 'full': {
        await restockMarkets()
        break
      }

      case 'analyze': {
        await analyzeCurrentStock()
        break
      }

      default: {
        console.log('📋 Available commands:')
        console.log(
          '  npm run restock energy [quantity]  - Restock energy drinks (default: 50)'
        )
        console.log(
          '  npm run restock specific           - Run specific item configs'
        )
        console.log(
          '  npm run restock full              - Run full restocking system'
        )
        console.log(
          '  npm run restock analyze           - Analyze current market stock'
        )
        break
      }
    }
  } catch (error) {
    console.error('❌ Restocking failed:', error)
  }
}

// Export configuration for external use
export {
  GENERAL_RESTOCK_CONFIG,
  restockEnergyDrinksOnly,
  restockSpecificItems,
  analyzeCurrentStock,
}

// Run if called directly
if (require.main === module) {
  main()
}
