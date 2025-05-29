// scripts/add-new-regions.ts - Add 5 weird new locations
import {
  PrismaClient,
  ItemCategory,
  LayerType,
  Rarity,
  LocationType,
} from '@prisma/client'

const prisma = new PrismaClient()

// New Items for the weird regions
const NEW_ITEMS = [
  // === GLITCH WASTES ITEMS ===
  {
    name: 'Fragmented Code',
    description: 'Broken data fragments that shimmer with digital energy',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.RARE,
    imageUrl: '/items/fragmented-code.png',
  },
  {
    name: 'Pixel Dust',
    description: 'Granular reality particles from corrupted textures',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.COMMON,
    imageUrl: '/items/pixel-dust.png',
  },
  {
    name: 'Buffer Overflow Potion',
    description:
      'Dangerous digital brew that crashes your system... in a good way',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.EPIC,
    energyEffect: 150, // Overpowered but risky
    imageUrl: '/items/buffer-overflow-potion.png',
  },
  {
    name: 'Glitch Goggles',
    description: 'See through the matrix with corrupted vision',
    category: ItemCategory.ACCESSORY,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    energyEffect: 10,
    imageUrl: '/items/glitch-goggles.png',
  },

  // === FUNGI NETWORKS ITEMS ===
  {
    name: 'Neural Spores',
    description: 'Microscopic fungal networks that enhance thought',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.UNCOMMON,
    imageUrl: '/items/neural-spores.png',
  },
  {
    name: 'Decay Catalyst',
    description: 'Accelerates decomposition for rapid resource cycling',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    durability: 75,
    imageUrl: '/items/decay-catalyst.png',
  },
  {
    name: 'Symbiotic Armor',
    description: 'Living fungal protection that grows with you',
    category: ItemCategory.CLOTHING,
    layerType: LayerType.CLOTHING,
    rarity: Rarity.EPIC,
    healthEffect: 25,
    imageUrl: '/items/symbiotic-armor.png',
  },
  {
    name: 'Mycelium Thread',
    description: 'Natural fiber that connects all living things',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.COMMON,
    imageUrl: '/items/mycelium-thread.png',
  },

  // === TEMPORAL RIFT ZONE ITEMS ===
  {
    name: 'Temporal Flux',
    description: 'Crystallized time that bends around your fingers',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.LEGENDARY,
    imageUrl: '/items/temporal-flux.png',
  },
  {
    name: 'Paradox Engine',
    description: 'Mechanical device that exists in multiple timelines',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.LEGENDARY,
    durability: 999,
    energyEffect: 50,
    imageUrl: '/items/paradox-engine.png',
  },
  {
    name: 'Causality Loop',
    description: 'Effect becomes cause becomes effect becomes...',
    category: ItemCategory.ACCESSORY,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.EPIC,
    imageUrl: '/items/causality-loop.png',
  },
  {
    name: 'Temporal Stabilizer',
    description: 'Keeps you anchored to the present moment',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.RARE,
    healthEffect: 50,
    imageUrl: '/items/temporal-stabilizer.png',
  },

  // === BONE MARKETS ITEMS ===
  {
    name: 'Living Bone Tools',
    description: 'Ossified implements that grow sharper with use',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    durability: 200,
    imageUrl: '/items/living-bone-tools.png',
  },
  {
    name: 'Calcium Crystals',
    description: 'Mineralized bone structure with geometric perfection',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.UNCOMMON,
    imageUrl: '/items/calcium-crystals.png',
  },
  {
    name: 'Skeletal Framework',
    description: 'Wearable bone structure that supports heavy lifting',
    category: ItemCategory.CLOTHING,
    layerType: LayerType.CLOTHING,
    rarity: Rarity.RARE,
    healthEffect: 20,
    imageUrl: '/items/skeletal-framework.png',
  },
  {
    name: 'Bone Marrow Elixir',
    description: 'Rich, life-giving essence extracted from ancient bones',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.UNCOMMON,
    healthEffect: 40,
    energyEffect: 10,
    imageUrl: '/items/bone-marrow-elixir.png',
  },

  // === STATIC FIELDS ITEMS ===
  {
    name: 'White Noise Generator',
    description: 'Creates interference that masks your presence',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    durability: 100,
    imageUrl: '/items/white-noise-generator.png',
  },
  {
    name: 'Static Cling',
    description: 'Electromagnetic adhesive that sticks to anything',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.COMMON,
    imageUrl: '/items/static-cling.png',
  },
  {
    name: 'Frequency Modulator',
    description: 'Tunes reality to different channels',
    category: ItemCategory.ACCESSORY,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.EPIC,
    energyEffect: 15,
    imageUrl: '/items/frequency-modulator.png',
  },
  {
    name: 'Signal Booster Helmet',
    description: 'Amplifies brainwaves through electromagnetic fields',
    category: ItemCategory.HAT,
    layerType: LayerType.HAT,
    rarity: Rarity.RARE,
    energyEffect: 20,
    imageUrl: '/items/signal-booster-helmet.png',
  },
]

// New Locations
const NEW_LOCATIONS = [
  // === THE GLITCH WASTES ===
  {
    name: 'The Glitch Wastes',
    description:
      'Digital desert where reality breaks down into pixelated fragments',
    locationType: LocationType.REGION,
    biome: 'digital',
    difficulty: 4,
    playerCount: 0,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    chatScope: 'REGIONAL',
    welcomeMessage: 'ERROR_404: WELCOME_MESSAGE_NOT_FOUND',
    lore: 'Once a stable data center, this region was corrupted by a massive system failure that left reality itself glitched.',
    mapX: 600,
    mapY: 150,
    subLocations: [
      {
        name: 'Error 404 Oasis',
        description: 'A rest stop that may or may not actually exist',
        locationType: LocationType.BUILDING,
        difficulty: 4,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'null reference exception: comfort not found',
      },
      {
        name: 'Corrupted Data Mines',
        description: 'Extract valuable code fragments from broken databases',
        locationType: LocationType.BUILDING,
        difficulty: 5,
        hasMarket: false,
        hasMining: true,
        hasChat: true,
        welcomeMessage: 'Warning: Memory corruption detected',
      },
    ],
  },

  // === FUNGI NETWORKS ===
  {
    name: 'Fungi Networks',
    description: 'Underground mycelium city where everything is connected',
    locationType: LocationType.REGION,
    biome: 'underground',
    difficulty: 3,
    playerCount: 0,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    chatScope: 'REGIONAL',
    welcomeMessage: 'The network acknowledges your presence.',
    lore: 'A vast underground organism that has achieved collective consciousness, welcoming symbiotic relationships with surface dwellers.',
    mapX: 200,
    mapY: 400,
    subLocations: [
      {
        name: 'Spore Exchange',
        description: 'Trading post where biological resources are shared',
        locationType: LocationType.BUILDING,
        difficulty: 3,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'Breathe deeply. The spores will show you the way.',
      },
      {
        name: 'The Great Mycelium',
        description: 'Central nervous system of the fungal network',
        locationType: LocationType.BUILDING,
        difficulty: 4,
        hasMarket: false,
        hasMining: true,
        hasChat: true,
        welcomeMessage: 'You are now part of something greater.',
      },
    ],
  },

  // === TEMPORAL RIFT ZONE ===
  {
    name: 'Temporal Rift Zone',
    description: 'Time moves strangely here, past and future bleeding together',
    locationType: LocationType.REGION,
    biome: 'temporal',
    difficulty: 5,
    playerCount: 0,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    chatScope: 'REGIONAL',
    welcomeMessage: 'When are you?',
    lore: 'A scientific experiment gone wrong tore holes in spacetime, creating a region where causality itself is unstable.',
    mapX: 500,
    mapY: 350,
    subLocations: [
      {
        name: "Yesterday's Tomorrow",
        description:
          'A marketplace selling items from timelines that never were',
        locationType: LocationType.BUILDING,
        difficulty: 5,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'This conversation happened before you arrived.',
      },
      {
        name: 'Clock Tower Ruins',
        description:
          'Collapsed timekeeper where temporal fragments can be mined',
        locationType: LocationType.BUILDING,
        difficulty: 6,
        hasMarket: false,
        hasMining: true,
        hasChat: true,
        welcomeMessage: 'Time is broken here. Proceed with caution.',
      },
    ],
  },

  // === THE BONE MARKETS ===
  {
    name: 'The Bone Markets',
    description:
      'Skeletal merchants trade in organic technology and calcium currency',
    locationType: LocationType.REGION,
    biome: 'ossuary',
    difficulty: 3,
    playerCount: 0,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    chatScope: 'REGIONAL',
    welcomeMessage: 'Welcome, flesh-bearer. What bones do you bring?',
    lore: 'An ancient cemetery evolved into a thriving market where death is just another resource to be traded.',
    mapX: 150,
    mapY: 300,
    subLocations: [
      {
        name: 'Calcium Exchange',
        description: 'Primary trading floor for bone-based materials',
        locationType: LocationType.BUILDING,
        difficulty: 3,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'Rattle your coins, the dealers are listening.',
      },
      {
        name: 'Ossuary Club',
        description:
          'Social gathering place decorated with artistic bone arrangements',
        locationType: LocationType.BUILDING,
        difficulty: 2,
        hasMarket: false,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'Dance among the ancestors.',
      },
    ],
  },

  // === STATIC FIELDS ===
  {
    name: 'Static Fields',
    description:
      'Everything covered in TV static, reality unclear and shifting',
    locationType: LocationType.REGION,
    biome: 'electromagnetic',
    difficulty: 4,
    playerCount: 0,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    chatScope: 'REGIONAL',
    welcomeMessage: '████████ ██ ████ ███ ████',
    lore: 'A massive electromagnetic anomaly interferes with all signals, creating a region where reality itself seems to be broadcasting on dead channels.',
    mapX: 450,
    mapY: 250,
    subLocations: [
      {
        name: 'Channel 0',
        description:
          'Broadcasting station for frequencies that should not exist',
        locationType: LocationType.BUILDING,
        difficulty: 4,
        hasMarket: false,
        hasMining: true,
        hasChat: true,
        welcomeMessage: '█ow ██ █ing?',
      },
      {
        name: 'Dead Air Tavern',
        description:
          'Social hub where the static is slightly less overwhelming',
        locationType: LocationType.BUILDING,
        difficulty: 3,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'Can you hear me now? Good.',
      },
    ],
  },
]

async function addNewRegions() {
  console.log('🌍 Adding 5 new weird regions to Wojak Earth...\n')

  try {
    // 1. Add all new items
    console.log('📦 Adding themed items...')
    let itemsAdded = 0

    for (const itemData of NEW_ITEMS) {
      const existing = await prisma.item.findUnique({
        where: { name: itemData.name },
      })

      if (!existing) {
        await prisma.item.create({ data: itemData })
        console.log(`  ✨ Added ${itemData.name} (${itemData.rarity})`)
        itemsAdded++
      }
    }
    console.log(`✅ Added ${itemsAdded} new items\n`)

    // 2. Add locations and sub-locations
    console.log('🗺️ Adding locations...')
    let locationsAdded = 0

    for (const locationData of NEW_LOCATIONS) {
      const { subLocations, ...parentData } = locationData

      // Create parent location
      const parentLocation = await prisma.location.create({
        data: parentData,
      })
      console.log(`  🏔️ Added ${parentLocation.name}`)
      locationsAdded++

      // Create sub-locations
      if (subLocations) {
        for (const subData of subLocations) {
          const subLocation = await prisma.location.create({
            data: {
              ...subData,
              parentLocationId: parentLocation.id,
            },
          })
          console.log(`    └─ ${subLocation.name}`)
          locationsAdded++
        }
      }
    }
    console.log(`✅ Added ${locationsAdded} new locations\n`)

    console.log('🎉 NEW REGIONS ADDED SUCCESSFULLY!')
    console.log('='.repeat(50))
    console.log('New regions available:')
    console.log('• The Glitch Wastes - Digital chaos and corrupted reality')
    console.log('• Fungi Networks - Underground mycelium civilization')
    console.log('• Temporal Rift Zone - Time anomalies and paradoxes')
    console.log('• The Bone Markets - Skeletal merchants and calcium economy')
    console.log('• Static Fields - Electromagnetic interference zone')

    console.log('\n🎯 Next steps:')
    console.log('1. Run market seeding to stock these locations')
    console.log('2. Add mining resources for these regions')
    console.log('3. Test travel to the new locations')
    console.log('4. Update your map view to show the new regions')

    // Show total game content
    const totalItems = await prisma.item.count()
    const totalLocations = await prisma.location.count()
    console.log(
      `\n📊 Game now has ${totalItems} items and ${totalLocations} locations!`
    )
  } catch (error) {
    console.error('❌ Failed to add new regions:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

addNewRegions()
