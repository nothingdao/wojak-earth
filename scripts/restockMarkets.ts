// scripts/restockMarkets.ts - Biome-aware market restocking with themed items
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

// ============================================================================
// BIOME-SPECIFIC MARKET CONFIGURATIONS
// ============================================================================

interface MarketItem {
  itemName: string
  basePrice: number
  quantity: number
  restockFrequency: 'high' | 'medium' | 'low' // How often to restock
}

const BIOME_MARKET_CONFIGS: Record<string, MarketItem[]> = {
  // ===== PLAINS BIOME =====
  plains: [
    // Basic supplies for beginners
    {
      itemName: 'Energy Drink',
      basePrice: 8,
      quantity: 30,
      restockFrequency: 'high',
    },
    {
      itemName: 'Health Potion',
      basePrice: 15,
      quantity: 20,
      restockFrequency: 'high',
    },
    {
      itemName: 'Ration Pack',
      basePrice: 12,
      quantity: 25,
      restockFrequency: 'high',
    },
    {
      itemName: 'Basic Pickaxe',
      basePrice: 25,
      quantity: 15,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Miners Hat',
      basePrice: 30,
      quantity: 10,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Work Gloves',
      basePrice: 20,
      quantity: 12,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Multi-Tool',
      basePrice: 45,
      quantity: 8,
      restockFrequency: 'low',
    },
    {
      itemName: 'Survival Pack Harness',
      basePrice: 35,
      quantity: 6,
      restockFrequency: 'low',
    },
  ],

  // ===== ALPINE BIOME =====
  alpine: [
    // Cold weather gear and mountain supplies
    {
      itemName: 'Hot Cocoa',
      basePrice: 10,
      quantity: 25,
      restockFrequency: 'high',
    },
    {
      itemName: 'Thermal Undersuit',
      basePrice: 120,
      quantity: 5,
      restockFrequency: 'low',
    },
    {
      itemName: 'Ice Walker Boots',
      basePrice: 60,
      quantity: 8,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Frostbite Cloak',
      basePrice: 90,
      quantity: 6,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Ironwood Planks',
      basePrice: 40,
      quantity: 15,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Frost Crystal',
      basePrice: 75,
      quantity: 8,
      restockFrequency: 'low',
    },
    {
      itemName: 'Energy Drink',
      basePrice: 10,
      quantity: 20,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Health Potion',
      basePrice: 18,
      quantity: 15,
      restockFrequency: 'medium',
    },
  ],

  // ===== UNDERGROUND BIOME =====
  underground: [
    // Mining and fungal network items
    {
      itemName: 'Crystal Shard',
      basePrice: 50,
      quantity: 12,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Neural Spores',
      basePrice: 25,
      quantity: 20,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Mycelium Thread',
      basePrice: 15,
      quantity: 25,
      restockFrequency: 'high',
    },
    {
      itemName: 'Mushroom Stew',
      basePrice: 20,
      quantity: 18,
      restockFrequency: 'high',
    },
    {
      itemName: 'Network Interface',
      basePrice: 80,
      quantity: 6,
      restockFrequency: 'low',
    },
    {
      itemName: 'Spore Mask',
      basePrice: 35,
      quantity: 10,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Symbiotic Armor',
      basePrice: 150,
      quantity: 4,
      restockFrequency: 'low',
    },
    {
      itemName: 'Miners Hat',
      basePrice: 35,
      quantity: 8,
      restockFrequency: 'medium',
    },
  ],

  // ===== URBAN BIOME =====
  urban: [
    // High-tech city gear
    {
      itemName: 'Data Chip',
      basePrice: 30,
      quantity: 20,
      restockFrequency: 'high',
    },
    {
      itemName: 'Bandwidth Booster',
      basePrice: 45,
      quantity: 15,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Cyber Jacket',
      basePrice: 100,
      quantity: 8,
      restockFrequency: 'low',
    },
    {
      itemName: 'Cyberpunk Shades',
      basePrice: 70,
      quantity: 10,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Neon Visor',
      basePrice: 85,
      quantity: 6,
      restockFrequency: 'low',
    },
    {
      itemName: 'Hacking Toolkit',
      basePrice: 120,
      quantity: 5,
      restockFrequency: 'low',
    },
    {
      itemName: 'Energy Drink',
      basePrice: 12,
      quantity: 25,
      restockFrequency: 'high',
    },
    {
      itemName: 'Multi-Tool',
      basePrice: 50,
      quantity: 12,
      restockFrequency: 'medium',
    },
  ],

  // ===== DIGITAL BIOME =====
  digital: [
    // Glitch realm artifacts
    {
      itemName: 'Pixel Dust',
      basePrice: 8,
      quantity: 30,
      restockFrequency: 'high',
    },
    {
      itemName: 'Fragmented Code',
      basePrice: 60,
      quantity: 12,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Buffer Overflow Potion',
      basePrice: 200,
      quantity: 3,
      restockFrequency: 'low',
    },
    {
      itemName: 'Glitch Goggles',
      basePrice: 75,
      quantity: 8,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Error Handler',
      basePrice: 90,
      quantity: 6,
      restockFrequency: 'low',
    },
    {
      itemName: 'Rare Floppy Disk',
      basePrice: 500,
      quantity: 1,
      restockFrequency: 'low',
    },
    {
      itemName: 'Data Armor Plating',
      basePrice: 180,
      quantity: 4,
      restockFrequency: 'low',
    },
  ],

  // ===== DESERT BIOME =====
  desert: [
    // Survival gear for harsh conditions
    {
      itemName: 'Water Purification Tablet',
      basePrice: 25,
      quantity: 20,
      restockFrequency: 'high',
    },
    {
      itemName: 'Desert Wrap',
      basePrice: 30,
      quantity: 15,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Sandstorm Goggles',
      basePrice: 40,
      quantity: 12,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Heat Dispersal Vest',
      basePrice: 85,
      quantity: 8,
      restockFrequency: 'low',
    },
    {
      itemName: 'Dune Boots',
      basePrice: 35,
      quantity: 10,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Ancient Artifact',
      basePrice: 750,
      quantity: 1,
      restockFrequency: 'low',
    },
    {
      itemName: 'Energy Drink',
      basePrice: 15,
      quantity: 18,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Ration Pack',
      basePrice: 18,
      quantity: 15,
      restockFrequency: 'medium',
    },
  ],

  // ===== TEMPORAL BIOME =====
  temporal: [
    // Time-related artifacts
    {
      itemName: 'Time Shard',
      basePrice: 80,
      quantity: 8,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Temporal Stabilizer',
      basePrice: 40,
      quantity: 12,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Chronometer Watch',
      basePrice: 120,
      quantity: 5,
      restockFrequency: 'low',
    },
    {
      itemName: 'Causality Loop',
      basePrice: 200,
      quantity: 3,
      restockFrequency: 'low',
    },
    {
      itemName: 'Paradox Engine',
      basePrice: 1000,
      quantity: 1,
      restockFrequency: 'low',
    },
    {
      itemName: 'Temporal Flux',
      basePrice: 1500,
      quantity: 1,
      restockFrequency: 'low',
    },
  ],

  // ===== OSSUARY BIOME =====
  ossuary: [
    // Bone and calcium items
    {
      itemName: 'Calcium Crystals',
      basePrice: 35,
      quantity: 18,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Bone Meal',
      basePrice: 20,
      quantity: 25,
      restockFrequency: 'high',
    },
    {
      itemName: 'Marrow Extract',
      basePrice: 65,
      quantity: 10,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Living Bone Tools',
      basePrice: 95,
      quantity: 6,
      restockFrequency: 'low',
    },
    {
      itemName: 'Skeletal Framework',
      basePrice: 110,
      quantity: 5,
      restockFrequency: 'low',
    },
    {
      itemName: 'Fossil Fragment',
      basePrice: 150,
      quantity: 4,
      restockFrequency: 'low',
    },
    {
      itemName: 'Health Potion',
      basePrice: 22,
      quantity: 12,
      restockFrequency: 'medium',
    },
  ],

  // ===== ELECTROMAGNETIC BIOME =====
  electromagnetic: [
    // Static and signal items
    {
      itemName: 'Static Cling',
      basePrice: 12,
      quantity: 20,
      restockFrequency: 'high',
    },
    {
      itemName: 'Radio Wave',
      basePrice: 28,
      quantity: 15,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Static Shock Drink',
      basePrice: 18,
      quantity: 20,
      restockFrequency: 'high',
    },
    {
      itemName: 'White Noise Generator',
      basePrice: 75,
      quantity: 8,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Frequency Modulator',
      basePrice: 120,
      quantity: 5,
      restockFrequency: 'low',
    },
    {
      itemName: 'Signal Booster Helmet',
      basePrice: 90,
      quantity: 6,
      restockFrequency: 'low',
    },
    {
      itemName: 'Energy Drink',
      basePrice: 14,
      quantity: 18,
      restockFrequency: 'medium',
    },
  ],

  // ===== VOLCANIC BIOME =====
  volcanic: [
    // Extreme heat survival items
    {
      itemName: 'Magma Shard',
      basePrice: 200,
      quantity: 5,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Heat Shield',
      basePrice: 400,
      quantity: 2,
      restockFrequency: 'low',
    },
    {
      itemName: 'Lava Tube Map',
      basePrice: 100,
      quantity: 3,
      restockFrequency: 'low',
    },
    {
      itemName: 'Adaptive Respirator',
      basePrice: 110,
      quantity: 4,
      restockFrequency: 'low',
    },
    {
      itemName: 'Heat Dispersal Vest',
      basePrice: 120,
      quantity: 3,
      restockFrequency: 'low',
    },
    {
      itemName: 'Health Potion',
      basePrice: 25,
      quantity: 8,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Energy Drink',
      basePrice: 20,
      quantity: 10,
      restockFrequency: 'medium',
    },
  ],

  // ===== WILDERNESS BIOME =====
  wilderness: [
    // General survival and exploration items
    {
      itemName: 'Ration Pack',
      basePrice: 15,
      quantity: 20,
      restockFrequency: 'high',
    },
    {
      itemName: 'Ancient Coin',
      basePrice: 45,
      quantity: 12,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Lucky Charm',
      basePrice: 25,
      quantity: 10,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Survival Pack Harness',
      basePrice: 40,
      quantity: 8,
      restockFrequency: 'medium',
    },
    {
      itemName: 'Climate Sensor Bracelet',
      basePrice: 55,
      quantity: 6,
      restockFrequency: 'low',
    },
    {
      itemName: 'Adaptive Respirator',
      basePrice: 85,
      quantity: 5,
      restockFrequency: 'low',
    },
    {
      itemName: 'Energy Drink',
      basePrice: 10,
      quantity: 25,
      restockFrequency: 'high',
    },
    {
      itemName: 'Health Potion',
      basePrice: 18,
      quantity: 15,
      restockFrequency: 'medium',
    },
  ],

  // ===== OCEAN BIOME =====
  ocean: [
    // Basic items for ocean areas (usually not markets)
    {
      itemName: 'Energy Drink',
      basePrice: 12,
      quantity: 5,
      restockFrequency: 'low',
    },
    {
      itemName: 'Ration Pack',
      basePrice: 15,
      quantity: 5,
      restockFrequency: 'low',
    },
  ],
}

// ============================================================================
// LOCATION TO BIOME MAPPING
// ============================================================================

const LOCATION_BIOME_MAP: Record<string, string> = {
  // Plains
  'Mining Plains': 'plains',
  'Rusty Pickaxe Inn': 'plains',

  // Alpine
  'Frostpine Reaches': 'alpine',
  'Ironwood Trading Post': 'alpine',
  'Rimeglass Lake': 'alpine',
  'The Old Cairns': 'alpine',

  // Underground
  'Crystal Caves': 'underground',
  'Fungi Networks': 'underground',
  'Spore Exchange': 'underground',
  'The Great Mycelium': 'underground',

  // Urban
  'Cyber City': 'urban',
  'Central Exchange': 'urban',
  'The Glitch Club': 'urban',

  // Digital
  'The Glitch Wastes': 'digital',
  'Error 404 Oasis': 'digital',
  'Corrupted Data Mines': 'digital',

  // Desert
  'Desert Outpost': 'desert',

  // Temporal
  'Temporal Rift Zone': 'temporal',
  "Yesterday's Tomorrow": 'temporal',
  'Clock Tower Ruins': 'temporal',

  // Ossuary
  'The Bone Markets': 'ossuary',
  'Calcium Exchange': 'ossuary',
  'Ossuary Club': 'ossuary',

  // Electromagnetic
  'Static Fields': 'electromagnetic',
  'Channel 0': 'electromagnetic',
  'Dead Air Tavern': 'electromagnetic',

  // Volcanic
  Retardia: 'volcanic',

  // Wilderness
  Underland: 'wilderness',

  // Ocean (usually no markets)
  Ocean: 'ocean',
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getLocationBiome(locationName: string): string {
  return LOCATION_BIOME_MAP[locationName] || 'plains'
}

function applyPriceMultiplier(basePrice: number, locationName: string): number {
  // Price multipliers based on location difficulty/remoteness
  const priceMultipliers: Record<string, number> = {
    // Plains - cheapest
    'Mining Plains': 0.9,
    'Rusty Pickaxe Inn': 0.95,

    // Alpine - cold weather premium
    'Frostpine Reaches': 1.15,
    'Ironwood Trading Post': 1.1,
    'Rimeglass Lake': 1.2,
    'The Old Cairns': 1.25,

    // Underground - mining premium
    'Crystal Caves': 1.1,
    'Fungi Networks': 1.15,
    'Spore Exchange': 1.12,
    'The Great Mycelium': 1.18,

    // Urban - high tech premium
    'Cyber City': 1.05,
    'Central Exchange': 1.0, // Main exchange, competitive prices
    'The Glitch Club': 1.08,

    // Digital - rare items premium
    'The Glitch Wastes': 1.3,
    'Error 404 Oasis': 1.25,
    'Corrupted Data Mines': 1.35,

    // Desert - survival premium
    'Desert Outpost': 1.4,

    // Temporal - extreme rarity premium
    'Temporal Rift Zone': 1.5,
    "Yesterday's Tomorrow": 1.45,
    'Clock Tower Ruins': 1.6,

    // Ossuary - specialty premium
    'The Bone Markets': 1.2,
    'Calcium Exchange': 1.15,
    'Ossuary Club': 1.25,

    // Electromagnetic - tech premium
    'Static Fields': 1.3,
    'Channel 0': 1.35,
    'Dead Air Tavern': 1.25,

    // Volcanic - extreme danger premium
    Retardia: 2.0,

    // Wilderness - moderate premium
    Underland: 1.1,

    // Ocean - basic
    Ocean: 1.0,
  }

  const multiplier = priceMultipliers[locationName] || 1.0
  return Math.round(basePrice * multiplier)
}

async function getLocationInfo(locationName: string) {
  const { data: location, error } = await supabase
    .from('locations')
    .select('id, name, hasMarket, biome')
    .eq('name', locationName)
    .single()

  if (error || !location) {
    console.log(`  ❌ Location '${locationName}' not found`)
    return null
  }

  if (!location.hasMarket) {
    console.log(`  ⚠️  Location '${locationName}' has no market`)
    return null
  }

  return location
}

async function getItemInfo(itemName: string) {
  const { data: item, error } = await supabase
    .from('items')
    .select('id, name')
    .eq('name', itemName)
    .single()

  if (error || !item) {
    console.log(`  ❌ Item '${itemName}' not found`)
    return null
  }

  return item
}

// ============================================================================
// BIOME-BASED RESTOCKING
// ============================================================================

async function restockBiomeMarkets(biomes: string[] = []) {
  console.log('🌍 Starting biome-based market restocking...')
  console.log('='.repeat(60))

  const targetBiomes =
    biomes.length > 0 ? biomes : Object.keys(BIOME_MARKET_CONFIGS)
  let totalRestocked = 0
  let totalCreated = 0

  for (const biome of targetBiomes) {
    console.log(`\n🏔️  Processing ${biome.toUpperCase()} biome markets...`)

    const marketConfig = BIOME_MARKET_CONFIGS[biome]
    if (!marketConfig) {
      console.log(`  ❌ No market config found for biome: ${biome}`)
      continue
    }

    // Find all locations in this biome
    const biomeLocations = Object.entries(LOCATION_BIOME_MAP)
      .filter(([_, biomeName]) => biomeName === biome)
      .map(([locationName, _]) => locationName)

    console.log(
      `  📍 Found ${biomeLocations.length} locations: ${biomeLocations.join(
        ', '
      )}`
    )

    for (const locationName of biomeLocations) {
      console.log(`\n    🏪 Restocking ${locationName}...`)

      const location = await getLocationInfo(locationName)
      if (!location) continue

      for (const marketItem of marketConfig) {
        const item = await getItemInfo(marketItem.itemName)
        if (!item) continue

        // Check for existing listing
        const { data: existingListing } = await supabase
          .from('market_listings')
          .select('id, quantity, price')
          .eq('locationId', location.id)
          .eq('itemId', item.id)
          .eq('isSystemItem', true)
          .single()

        const adjustedPrice = applyPriceMultiplier(
          marketItem.basePrice,
          locationName
        )

        if (existingListing) {
          // Update existing listing based on restock frequency
          let shouldRestock = false
          let newQuantity = existingListing.quantity

          switch (marketItem.restockFrequency) {
            case 'high':
              shouldRestock =
                existingListing.quantity < marketItem.quantity * 0.3
              newQuantity = Math.min(
                existingListing.quantity +
                  Math.floor(marketItem.quantity * 0.5),
                marketItem.quantity
              )
              break
            case 'medium':
              shouldRestock =
                existingListing.quantity < marketItem.quantity * 0.2
              newQuantity = Math.min(
                existingListing.quantity +
                  Math.floor(marketItem.quantity * 0.3),
                marketItem.quantity
              )
              break
            case 'low':
              shouldRestock = existingListing.quantity === 0
              newQuantity = Math.min(
                existingListing.quantity +
                  Math.floor(marketItem.quantity * 0.2),
                marketItem.quantity
              )
              break
          }

          if (shouldRestock && newQuantity > existingListing.quantity) {
            const { error } = await supabase
              .from('market_listings')
              .update({
                quantity: newQuantity,
                price: adjustedPrice,
                updatedAt: new Date().toISOString(),
              })
              .eq('id', existingListing.id)

            if (!error) {
              console.log(
                `      ✅ ${marketItem.itemName}: ${existingListing.quantity} → ${newQuantity} (${adjustedPrice}c)`
              )
              totalRestocked++
            }
          }
        } else {
          // Create new listing
          const { error } = await supabase.from('market_listings').insert({
            id: randomUUID(),
            sellerId: null,
            locationId: location.id,
            itemId: item.id,
            quantity: marketItem.quantity,
            price: adjustedPrice,
            isSystemItem: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })

          if (!error) {
            console.log(
              `      🆕 ${marketItem.itemName}: Created with ${marketItem.quantity} (${adjustedPrice}c)`
            )
            totalCreated++
          }
        }
      }
    }
  }

  console.log('\n📊 BIOME RESTOCKING SUMMARY')
  console.log('='.repeat(60))
  console.log(`📈 Items restocked: ${totalRestocked}`)
  console.log(`🆕 New listings created: ${totalCreated}`)
  console.log(`🎯 Total operations: ${totalRestocked + totalCreated}`)
}

// ============================================================================
// ANALYSIS FUNCTIONS
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

// Legacy function for old energy drink restocking
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
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'help'

  try {
    switch (command) {
      case 'biome': {
        const biomes = args.slice(1)
        await restockBiomeMarkets(biomes)
        break
      }

      case 'location': {
        const locationName = args.slice(1).join(' ')
        if (!locationName) {
          console.log('❌ Please specify a location name')
          return
        }
        await restockSpecificLocation(locationName)
        break
      }

      case 'consumables': {
        await quickRestockConsumables()
        break
      }

      case 'full': {
        await restockBiomeMarkets()
        break
      }

      case 'help':
      default: {
        console.log('🏪 Market Restocking Commands:')
        console.log('='.repeat(50))
        console.log(
          '  npm run restock biome [biome1 biome2 ...]  - Restock specific biomes'
        )
        console.log(
          '  npm run restock location "Location Name"    - Restock specific location'
        )
        console.log(
          '  npm run restock consumables                 - Quick restock consumables'
        )
        console.log(
          '  npm run restock full                        - Restock all biome markets'
        )
        console.log('')
        console.log('Available biomes:')
        console.log('  plains, alpine, underground, urban, digital, desert,')
        console.log(
          '  temporal, ossuary, electromagnetic, volcanic, wilderness'
        )
        console.log('')
        console.log('Examples:')
        console.log(
          '  npm run restock biome urban digital        - Restock urban and digital'
        )
        console.log(
          '  npm run restock location "Cyber City"      - Restock Cyber City only'
        )
        break
      }
    }
  } catch (error) {
    console.error('❌ Restocking failed:', error)
  }
}

// Export for external use
export {
  restockBiomeMarkets,
  quickRestockConsumables,
  restockSpecificLocation,
  BIOME_MARKET_CONFIGS,
  LOCATION_BIOME_MAP,
}

// Run if called directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
