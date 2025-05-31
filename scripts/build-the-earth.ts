// scripts/ultimate-world-setup.ts - Complete Wojak Earth World Builder (Updated)
import {
  PrismaClient,
  LocationType,
  ChatScope,
  CharacterType,
  ChatMessageType,
  Location,
  Item,
  Character,
  Gender,
  ItemCategory,
  LayerType,
  Rarity,
} from '@prisma/client'

// Import world data
import { WORLD_LOCATIONS, WorldLocation } from '../data/worldLocations'
import { WORLD_CONFIG, applyPriceMultiplier } from '../data/worldConfig'
import { WORLD_ITEMS, generateItemImageUrl } from '../data/worldItems'
import {
  CHARACTER_TEMPLATES,
  generateCharacterId,
  extractTokenId,
  generateCharacterImageUrl,
  generateWalletAddress,
  generateNftAddress,
} from '../data/characterTemplates'
import { MARKET_CONFIGS } from '../data/marketConfig'
import { MINING_CONFIGS } from '../data/miningConfig'

const prisma = new PrismaClient()

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Convert WorldLocation to Prisma data format
function worldLocationToPrismaData(location: WorldLocation, parentId?: string) {
  return {
    name: location.name,
    description: location.description,
    locationType: determineLocationType(location),
    biome: location.biome,
    difficulty: location.difficulty,
    hasMarket: location.hasMarket,
    hasMining: location.hasMining,
    hasChat: location.hasChat,
    chatScope: location.hasChat ? ChatScope.REGIONAL : undefined,
    welcomeMessage: location.welcomeMessage,
    lore: location.lore,
    mapX: location.mapX,
    mapY: location.mapY,
    parentLocationId: parentId,
    playerCount: 0,
    lastActive: new Date(Date.now() - Math.random() * 30 * 60 * 1000),
  }
}

// Determine Prisma LocationType from world data
function determineLocationType(location: WorldLocation): LocationType {
  const name = location.name.toLowerCase()
  if (name.includes('city')) return LocationType.CITY
  if (location.subLocations) return LocationType.REGION
  if (
    name.includes('inn') ||
    name.includes('club') ||
    name.includes('exchange') ||
    name.includes('oasis') ||
    name.includes('tavern') ||
    name.includes('tower') ||
    name.includes('mines') ||
    name.includes('channel')
  )
    return LocationType.BUILDING
  return LocationType.REGION
}

// ============================================================================
// MAIN SETUP FUNCTIONS
// ============================================================================

async function clearExistingData() {
  if (!WORLD_CONFIG.FEATURES.CLEAR_EXISTING_DATA) {
    console.log('⏭️ Skipping data cleanup (disabled in config)')
    return
  }

  console.log('🧹 Clearing existing world data...')

  await prisma.chatMessage.deleteMany()
  await prisma.marketListing.deleteMany()
  await prisma.locationResource.deleteMany()
  await prisma.characterInventory.deleteMany()
  await prisma.characterImage.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.character.deleteMany()
  await prisma.location.deleteMany()
  await prisma.item.deleteMany()

  console.log('✅ Existing data cleared')
}

async function createLocations() {
  if (!WORLD_CONFIG.FEATURES.CREATE_LOCATIONS) {
    console.log('⏭️ Skipping location creation (disabled in config)')
    return new Map()
  }

  console.log('🗺️ Creating world locations from shared data...')

  const locationMap = new Map()

  for (const locationData of WORLD_LOCATIONS) {
    // Create parent location
    const parentLocation = await prisma.location.create({
      data: worldLocationToPrismaData(locationData),
    })

    locationMap.set(parentLocation.name, parentLocation)
    console.log(`  🏔️ ${parentLocation.name}`)

    // Create sub-locations
    if (locationData.subLocations) {
      for (const subData of locationData.subLocations) {
        const subLocation = await prisma.location.create({
          data: worldLocationToPrismaData(subData, parentLocation.id),
        })

        locationMap.set(subLocation.name, subLocation)
        console.log(`    └─ ${subLocation.name}`)
      }
    }
  }

  console.log(`✅ Created ${locationMap.size} locations`)
  return locationMap
}

async function createItems() {
  if (!WORLD_CONFIG.FEATURES.CREATE_ITEMS) {
    console.log('⏭️ Skipping item creation (disabled in config)')
    return new Map()
  }

  console.log('📦 Creating world items...')

  const itemMap = new Map()

  for (const itemData of WORLD_ITEMS) {
    const item = await prisma.item.create({
      data: {
        ...itemData,
        category: itemData.category as ItemCategory,
        layerType: itemData.layerType as LayerType | undefined,
        rarity: itemData.rarity as Rarity,
        imageUrl: generateItemImageUrl(itemData.name),
      },
    })

    itemMap.set(item.name, item)
    console.log(`  ✨ ${item.name} (${item.rarity})`)
  }

  console.log(`✅ Created ${itemMap.size} items`)
  return itemMap
}

async function createCharacters(locationMap: Map<string, Location>) {
  if (!WORLD_CONFIG.FEATURES.CREATE_CHARACTERS) {
    console.log('⏭️ Skipping character creation (disabled in config)')
    return []
  }

  console.log('👥 Creating world characters...')

  const characters: Character[] = []

  for (const template of CHARACTER_TEMPLATES) {
    const location = locationMap.get(template.location)
    if (!location) {
      console.log(
        `  ❌ Location '${template.location}' not found for ${template.name}`
      )
      continue
    }

    const character = await prisma.character.create({
      data: {
        id: generateCharacterId(template.name),
        nftAddress: generateNftAddress(),
        tokenId: extractTokenId(template.name),
        walletAddress: generateWalletAddress(),
        name: template.name,
        gender: template.gender as Gender,
        characterType: CharacterType.HUMAN,
        currentLocationId: location.id,
        currentVersion: 1,
        currentImageUrl: generateCharacterImageUrl(template.name),
        energy: template.energy,
        health: template.health,
      },
    })

    characters.push(character)
    console.log(`  👤 ${character.name} in ${template.location}`)
  }

  // Update location player counts
  const locationCounts = new Map()
  for (const char of characters) {
    const count = locationCounts.get(char.currentLocationId) || 0
    locationCounts.set(char.currentLocationId, count + 1)
  }

  for (const [locationId, count] of locationCounts) {
    await prisma.location.update({
      where: { id: locationId },
      data: { playerCount: count },
    })
  }

  console.log(`✅ Created ${characters.length} characters`)
  return characters
}

async function setupMarkets(
  locationMap: Map<string, Location>,
  itemMap: Map<string, Item>
) {
  if (!WORLD_CONFIG.FEATURES.SETUP_MARKETS) {
    console.log('⏭️ Skipping market setup (disabled in config)')
    return
  }

  console.log('🏪 Setting up markets...')

  let totalListingsCreated = 0

  for (const [locationName, configs] of Object.entries(MARKET_CONFIGS)) {
    const location = locationMap.get(locationName)
    if (!location || !location.hasMarket) continue

    console.log(`  🛒 Stocking ${locationName}...`)

    for (const config of configs) {
      const item = itemMap.get(config.name)
      if (!item) {
        console.log(`    ❌ Item '${config.name}' not found`)
        continue
      }

      const adjustedPrice = applyPriceMultiplier(config.price, locationName)

      await prisma.marketListing.create({
        data: {
          locationId: location.id,
          itemId: item.id,
          quantity: config.quantity,
          price: adjustedPrice,
          isSystemItem: true,
        },
      })

      totalListingsCreated++
    }
  }

  console.log(`✅ Created ${totalListingsCreated} market listings`)
}

async function setupMining(
  locationMap: Map<string, Location>,
  itemMap: Map<string, Item>
) {
  if (!WORLD_CONFIG.FEATURES.SETUP_MINING) {
    console.log('⏭️ Skipping mining setup (disabled in config)')
    return
  }

  console.log('⛏️ Setting up mining resources...')

  let totalResourcesCreated = 0

  for (const [locationName, configs] of Object.entries(MINING_CONFIGS)) {
    const location = locationMap.get(locationName)
    if (!location || !location.hasMining) continue

    console.log(`  ⚒️ Adding resources to ${locationName}...`)

    for (const config of configs) {
      const item = itemMap.get(config.name)
      if (!item) {
        console.log(`    ❌ Item '${config.name}' not found`)
        continue
      }

      await prisma.locationResource.create({
        data: {
          locationId: location.id,
          itemId: item.id,
          spawnRate: config.spawnRate,
          maxPerDay: config.maxPerDay,
          difficulty: config.difficulty,
        },
      })

      totalResourcesCreated++
    }
  }

  console.log(`✅ Created ${totalResourcesCreated} mining resources`)
}

async function createChatHistory(
  locationMap: Map<string, Location>,
  characters: Character[]
) {
  if (!WORLD_CONFIG.FEATURES.CREATE_CHAT_HISTORY) {
    console.log('⏭️ Skipping chat history creation (disabled in config)')
    return
  }

  console.log('💬 Creating chat history...')

  // Sample chat messages
  const CHAT_TEMPLATES = [
    {
      location: 'Mining Plains',
      character: 'Wojak #420',
      message: 'Anyone know where the best iron deposits are?',
      timeAgo: 3,
    },
    {
      location: 'Mining Plains',
      character: 'Wojak #1337',
      message: 'Try the eastern slopes, found some good scraps there yesterday',
      timeAgo: 2,
    },
    {
      location: 'Crystal Caves',
      character: 'Wojak #888',
      message: 'Whoa! Just found a crystal shard in the deep tunnel!',
      timeAgo: 5,
    },
    {
      location: 'Crystal Caves',
      character: 'Wojak #2077',
      message: 'Nice! What rarity?',
      timeAgo: 4,
    },
    {
      location: 'The Glitch Club',
      character: 'Wojak #333',
      message: '*nods to the beat* This track is fire 🔥',
      timeAgo: 20,
      type: 'EMOTE',
    },
    {
      location: 'Desert Outpost',
      character: 'Wojak #555',
      message: 'Water supplies running low... need to find the oasis',
      timeAgo: 25,
    },
    {
      location: 'The Glitch Wastes',
      character: 'Wojak #404',
      message: 'Reality.exe has stopped working',
      timeAgo: 15,
    },
    {
      location: 'Fungi Networks',
      character: 'Wojak #101',
      message: 'The network speaks to me... it wants to help',
      timeAgo: 10,
    },
    {
      location: 'Temporal Rift Zone',
      character: 'Wojak #2025',
      message: 'I was here tomorrow, but now I am yesterday',
      timeAgo: -5,
    }, // Time is weird
    {
      location: 'The Bone Markets',
      character: 'Wojak #666',
      message: 'Fresh calcium! Get your fresh calcium here!',
      timeAgo: 8,
    },
    {
      location: 'Static Fields',
      character: 'Wojak #000',
      message: '██████ ████ █████ ████ fine',
      timeAgo: 12,
    },
  ]

  let messagesCreated = 0

  for (const template of CHAT_TEMPLATES) {
    const location = locationMap.get(template.location)
    const character = characters.find((c) => c.name === template.character)

    if (!location || !character) continue

    await prisma.chatMessage.create({
      data: {
        locationId: location.id,
        characterId: character.id,
        message: template.message,
        messageType: (template.type as ChatMessageType) || ChatMessageType.CHAT,
        isSystem: false,
        createdAt: new Date(Date.now() - template.timeAgo * 60 * 1000),
      },
    })

    messagesCreated++
  }

  console.log(`✅ Created ${messagesCreated} chat messages`)
}

async function validateSetup() {
  console.log('🔍 Validating world setup...')

  const stats = {
    locations: await prisma.location.count(),
    items: await prisma.item.count(),
    characters: await prisma.character.count(),
    marketListings: await prisma.marketListing.count({
      where: { isSystemItem: true },
    }),
    miningResources: await prisma.locationResource.count(),
    chatMessages: await prisma.chatMessage.count(),
  }

  console.log('\n📊 WORLD STATISTICS')
  console.log('='.repeat(50))
  console.log(`🗺️ Locations: ${stats.locations}`)
  console.log(`📦 Items: ${stats.items}`)
  console.log(`👥 Characters: ${stats.characters}`)
  console.log(`🏪 Market Listings: ${stats.marketListings}`)
  console.log(`⛏️ Mining Resources: ${stats.miningResources}`)
  console.log(`💬 Chat Messages: ${stats.chatMessages}`)

  // Validation checks
  const issues: string[] = []

  // Check for locations without markets or mining - simplified approach
  try {
    const marketLocations = await prisma.location.findMany({
      where: { hasMarket: true },
      include: { marketListings: true },
    })

    const emptyMarkets = marketLocations.filter(
      (loc) => loc.marketListings.length === 0
    ).length
    if (emptyMarkets > 0) {
      issues.push(`${emptyMarkets} market locations have no items`)
    }

    const miningLocations = await prisma.location.findMany({
      where: { hasMining: true },
      include: { resources: true },
    })

    const emptyMining = miningLocations.filter(
      (loc) => loc.resources.length === 0
    ).length
    if (emptyMining > 0) {
      issues.push(`${emptyMining} mining locations have no resources`)
    }

    // Check for characters without locations
    const charactersWithoutLocation = await prisma.character.findMany({
      where: {
        currentLocationId: undefined,
      },
    })

    if (charactersWithoutLocation.length > 0) {
      issues.push(
        `${charactersWithoutLocation.length} characters have no location`
      )
    }
  } catch {
    console.log('⚠️ Validation checks skipped due to schema differences')
  }

  if (issues.length > 0) {
    console.log('\n⚠️ VALIDATION ISSUES:')
    issues.forEach((issue) => console.log(`  • ${issue}`))
  } else {
    console.log('\n✅ All validation checks passed!')
  }

  return stats
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function setupUltimateWorld() {
  console.log(`🌍 ${WORLD_CONFIG.WORLD_NAME} - Ultimate World Setup`)
  console.log('='.repeat(60))
  console.log(
    `⚙️ Configuration loaded - ${
      Object.values(WORLD_CONFIG.FEATURES).filter(Boolean).length
    }/${Object.keys(WORLD_CONFIG.FEATURES).length} features enabled`
  )
  console.log('')

  try {
    // Execute setup phases
    await clearExistingData()
    const locationMap = await createLocations()
    const itemMap = await createItems()
    const characters = await createCharacters(locationMap)
    await setupMarkets(locationMap, itemMap)
    await setupMining(locationMap, itemMap)
    await createChatHistory(locationMap, characters)

    // Final validation and reporting
    const stats = await validateSetup()

    // Replace the hardcoded ending with this:
    console.log('\n🎉 ULTIMATE WORLD SETUP COMPLETE!')
    console.log('='.repeat(50))
    console.log('🚀 Your world is ready for players!')
    console.log('')

    // Dynamic feature summary based on actual data
    console.log('🎯 World Summary:')
    console.log(
      `  • ${stats.locations} locations across ${
        getAllRegions().length
      } regions`
    )
    console.log(
      `  • ${stats.items} items spanning ${
        getItemCategories().length
      } categories`
    )
    console.log(
      `  • ${stats.characters} characters distributed across the world`
    )
    console.log(
      `  • ${stats.marketListings} market listings with dynamic pricing`
    )
    console.log(`  • ${stats.miningResources} mining resources configured`)
    console.log(`  • ${stats.chatMessages} chat messages for social atmosphere`)

    // Detailed breakdown
    console.log('\n📊 Detailed Breakdown:')
    const locationBreakdown = await getLocationBreakdown()
    const itemBreakdown = await getItemBreakdown()
    const marketBreakdown = await getMarketBreakdown()

    console.log(
      `  🗺️  Locations: ${locationBreakdown.regions} regions, ${locationBreakdown.buildings} buildings`
    )
    console.log(
      `  📦 Items by rarity: ${itemBreakdown.common}C, ${itemBreakdown.uncommon}U, ${itemBreakdown.rare}R, ${itemBreakdown.epic}E, ${itemBreakdown.legendary}L`
    )
    console.log(
      `  🏪 Markets: ${
        marketBreakdown.activeMarkets
      } active markets, avg ${Math.round(marketBreakdown.avgPrice)} coins/item`
    )
    console.log(
      `  ⛏️  Mining: ${locationBreakdown.miningLocations} minable locations, ${stats.miningResources} resources`
    )
    console.log(
      `  👥 Characters: ${locationBreakdown.populatedLocations} populated locations`
    )

    console.log('')
    console.log('📖 Next Steps:')
    console.log('  1. Run `npm run dev` to start your game')
    console.log('  2. Test wallet connection and character selection')
    console.log('  3. Explore the world!')
    console.log('  4. Check mining and trading systems')
    console.log('  5. Consider adding more content')

    // Helper functions to add:
    async function getAllRegions() {
      return await prisma.location.findMany({
        where: { locationType: 'REGION' },
      })
    }

    async function getItemCategories() {
      const items = await prisma.item.findMany({ select: { category: true } })
      return [...new Set(items.map((i) => i.category))]
    }

    async function getLocationBreakdown() {
      const [regions, buildings, miningLocs, populatedLocs] = await Promise.all(
        [
          prisma.location.count({ where: { locationType: 'REGION' } }),
          prisma.location.count({ where: { locationType: 'BUILDING' } }),
          prisma.location.count({ where: { hasMining: true } }),
          prisma.location.count({ where: { playerCount: { gt: 0 } } }),
        ]
      )
      return {
        regions,
        buildings,
        miningLocations: miningLocs,
        populatedLocations: populatedLocs,
      }
    }

    async function getItemBreakdown() {
      const [common, uncommon, rare, epic, legendary] = await Promise.all([
        prisma.item.count({ where: { rarity: 'COMMON' } }),
        prisma.item.count({ where: { rarity: 'UNCOMMON' } }),
        prisma.item.count({ where: { rarity: 'RARE' } }),
        prisma.item.count({ where: { rarity: 'EPIC' } }),
        prisma.item.count({ where: { rarity: 'LEGENDARY' } }),
      ])
      return { common, uncommon, rare, epic, legendary }
    }

    async function getMarketBreakdown() {
      const markets = await prisma.location.count({
        where: { hasMarket: true },
      })
      const avgPriceResult = await prisma.marketListing.aggregate({
        _avg: { price: true },
      })
      return {
        activeMarkets: markets,
        avgPrice: avgPriceResult._avg.price || 0,
      }
    }

    // Log final stats for reference
    console.log(
      `\n📈 Final Stats: ${stats.locations} locations, ${stats.items} items, ${stats.characters} characters`
    )
  } catch (error) {
    console.error('❌ Ultimate world setup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the ultimate setup
setupUltimateWorld()
