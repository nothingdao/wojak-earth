// scripts/ultimate-world-setup.ts - Complete Wojak Earth World Builder
import {
  PrismaClient,
  ItemCategory,
  LayerType,
  Rarity,
  LocationType,
  ChatScope,
  Gender,
  CharacterType,
  ChatMessageType,
} from '@prisma/client'

const prisma = new PrismaClient()

// ============================================================================
// WORLD CONFIGURATION - Adjust these values to customize your world
// ============================================================================

const WORLD_CONFIG = {
  // World Settings
  WORLD_NAME: 'Wojak Earth',
  MAX_TOTAL_CHARACTERS: 100,
  STARTING_LOCATION_NAME: 'Mining Plains',

  // Character Settings
  DEFAULT_HEALTH: 100,
  DEFAULT_ENERGY: 100,
  ENERGY_VARIATION: 20, // Characters start with 80-100 energy
  HEALTH_VARIATION: 10, // Characters start with 90-100 health

  // Economy Settings
  BASE_MINING_ENERGY_COST: 10,
  PRICE_MULTIPLIERS: {
    'Mining Plains': 1.0,
    'Desert Outpost': 1.2,
    'Cyber City': 1.1,
    'Central Exchange': 1.15,
    'The Glitch Club': 0.9,
    'Rusty Pickaxe Inn': 0.95,
    'Crystal Caves': 1.1,
    'The Glitch Wastes': 1.3,
    'Fungi Networks': 1.1,
    'Temporal Rift Zone': 1.5,
    'The Bone Markets': 1.0,
    'Static Fields': 1.2,
  },

  // Mining Settings
  BASE_SPAWN_RATES: {
    COMMON: 0.4,
    UNCOMMON: 0.2,
    RARE: 0.1,
    EPIC: 0.05,
    LEGENDARY: 0.01,
  },

  // Features to Enable/Disable
  FEATURES: {
    CREATE_LOCATIONS: true,
    CREATE_ITEMS: true,
    CREATE_CHARACTERS: true,
    SETUP_MARKETS: true,
    SETUP_MINING: true,
    CREATE_CHAT_HISTORY: true,
    CLEAR_EXISTING_DATA: true,
  },
}

// ============================================================================
// WORLD DATA DEFINITIONS
// ============================================================================

const WORLD_LOCATIONS = [
  // Original Regions
  {
    name: 'Mining Plains',
    description: 'Rich in basic materials and perfect for newcomers',
    locationType: LocationType.REGION,
    biome: 'plains',
    difficulty: 1,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    chatScope: ChatScope.REGIONAL,
    welcomeMessage: 'The wind carries the sound of pickaxes striking stone.',
    lore: 'Once a vast battlefield, these plains now serve as the primary mining grounds for new arrivals.',
    mapX: 100,
    mapY: 200,
    subLocations: [
      {
        name: 'Rusty Pickaxe Inn',
        description: 'A cozy tavern where miners share stories and ale',
        locationType: LocationType.BUILDING,
        difficulty: 1,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        chatScope: ChatScope.LOCAL,
        welcomeMessage: 'The smell of ale and roasted meat fills the air.',
      },
      {
        name: 'Crystal Caves',
        description: 'Deep underground shafts where rare crystals grow',
        locationType: LocationType.BUILDING,
        difficulty: 2,
        hasMarket: true,
        hasMining: true,
        hasChat: true,
        chatScope: ChatScope.LOCAL,
        welcomeMessage: 'Crystalline formations sparkle in your torchlight.',
      },
    ],
  },

  {
    name: 'Desert Outpost',
    description: 'Harsh but rewarding terrain for experienced miners',
    locationType: LocationType.REGION,
    biome: 'desert',
    difficulty: 3,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    chatScope: ChatScope.REGIONAL,
    welcomeMessage: 'The scorching sun beats down mercilessly.',
    lore: 'A remote trading post built around an ancient oasis.',
    mapX: 400,
    mapY: 100,
  },

  {
    name: 'Cyber City',
    description: 'The technological heart of wojak civilization',
    locationType: LocationType.CITY,
    biome: 'urban',
    difficulty: 2,
    hasMarket: true,
    hasMining: false,
    hasChat: true,
    chatScope: ChatScope.LOCAL,
    welcomeMessage: 'Neon lights flicker in the perpetual twilight.',
    lore: 'The beating heart of wojak civilization.',
    mapX: 300,
    mapY: 300,
    subLocations: [
      {
        name: 'Central Exchange',
        description: 'The main financial district and trading hub',
        locationType: LocationType.BUILDING,
        difficulty: 2,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        chatScope: ChatScope.LOCAL,
        welcomeMessage:
          'Holographic displays show market prices from across the world.',
      },
      {
        name: 'The Glitch Club',
        description: 'Underground social hub for hackers and rebels',
        locationType: LocationType.BUILDING,
        difficulty: 2,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        chatScope: ChatScope.LOCAL,
        welcomeMessage: 'Bass-heavy music thumps through the smoky atmosphere.',
      },
    ],
  },

  // Weird New Regions
  {
    name: 'The Glitch Wastes',
    description:
      'Digital desert where reality breaks down into pixelated fragments',
    locationType: LocationType.REGION,
    biome: 'digital',
    difficulty: 4,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    chatScope: ChatScope.REGIONAL,
    welcomeMessage: 'ERROR_404: WELCOME_MESSAGE_NOT_FOUND',
    lore: 'Once a stable data center, this region was corrupted by a massive system failure.',
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

  {
    name: 'Fungi Networks',
    description: 'Underground mycelium city where everything is connected',
    locationType: LocationType.REGION,
    biome: 'underground',
    difficulty: 3,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    chatScope: ChatScope.REGIONAL,
    welcomeMessage: 'The network acknowledges your presence.',
    lore: 'A vast underground organism that has achieved collective consciousness.',
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

  {
    name: 'Temporal Rift Zone',
    description: 'Time moves strangely here, past and future bleeding together',
    locationType: LocationType.REGION,
    biome: 'temporal',
    difficulty: 5,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    chatScope: ChatScope.REGIONAL,
    welcomeMessage: 'When are you?',
    lore: 'A scientific experiment gone wrong tore holes in spacetime.',
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

  {
    name: 'The Bone Markets',
    description:
      'Skeletal merchants trade in organic technology and calcium currency',
    locationType: LocationType.REGION,
    biome: 'ossuary',
    difficulty: 3,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    chatScope: ChatScope.REGIONAL,
    welcomeMessage: 'Welcome, flesh-bearer. What bones do you bring?',
    lore: 'An ancient cemetery evolved into a thriving market.',
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

  {
    name: 'Static Fields',
    description:
      'Everything covered in TV static, reality unclear and shifting',
    locationType: LocationType.REGION,
    biome: 'electromagnetic',
    difficulty: 4,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    chatScope: ChatScope.REGIONAL,
    welcomeMessage: '████████ ██ ████ ███ ████',
    lore: 'A massive electromagnetic anomaly interferes with all signals.',
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

const WORLD_ITEMS = [
  // Basic Materials
  {
    name: 'Dirty Coal',
    description: 'Basic fuel found in shallow mines',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.COMMON,
  },
  {
    name: 'Iron Scraps',
    description: 'Rusty metal pieces, still useful',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.COMMON,
  },
  {
    name: 'Ancient Coin',
    description: 'Currency from a forgotten civilization',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.RARE,
  },
  {
    name: 'Crystal Shard',
    description: 'Glowing fragment with mysterious properties',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.EPIC,
  },

  // Basic Equipment
  {
    name: 'Miners Hat',
    description: 'Worn leather hat with a dim headlamp',
    category: ItemCategory.HAT,
    layerType: LayerType.HAT,
    rarity: Rarity.COMMON,
    durability: 100,
    energyEffect: 5,
  },
  {
    name: 'Work Gloves',
    description: 'Tough gloves for manual labor',
    category: ItemCategory.CLOTHING,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.COMMON,
    durability: 80,
  },
  {
    name: 'Lucky Charm',
    description: "A rabbit's foot that might bring fortune",
    category: ItemCategory.ACCESSORY,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.UNCOMMON,
  },
  {
    name: 'Cyber Jacket',
    description: 'High-tech jacket with built-in displays',
    category: ItemCategory.CLOTHING,
    layerType: LayerType.CLOTHING,
    rarity: Rarity.RARE,
    energyEffect: 15,
  },

  // Basic Consumables
  {
    name: 'Energy Drink',
    description: 'Restores energy and keeps you alert',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.COMMON,
    energyEffect: 25,
  },
  {
    name: 'Health Potion',
    description: 'Mysterious red liquid that heals wounds',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.UNCOMMON,
    healthEffect: 30,
  },

  // Tools
  {
    name: 'Basic Pickaxe',
    description: 'Standard mining tool for beginners',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.COMMON,
    durability: 50,
  },
  {
    name: 'Multi-Tool',
    description: 'Swiss army knife of the digital age',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.COMMON,
    durability: 100,
  },
  {
    name: 'Hacking Toolkit',
    description: 'Portable device for digital infiltration',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    durability: 150,
  },
  {
    name: 'Omni-Tool',
    description: 'Legendary device that adapts to any situation',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.LEGENDARY,
    durability: 1000,
    energyEffect: 20,
    healthEffect: 10,
  },

  // Themed Items - Cyber
  {
    name: 'Rare Floppy Disk',
    description: 'Contains legendary source code from the early net',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.LEGENDARY,
  },
  {
    name: 'Cyberpunk Shades',
    description: 'AR-enhanced sunglasses with data overlay',
    category: ItemCategory.ACCESSORY,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    energyEffect: 10,
  },
  {
    name: 'Neon Visor',
    description: 'Glowing headgear that screams "I hack the planet"',
    category: ItemCategory.HAT,
    layerType: LayerType.HAT,
    rarity: Rarity.EPIC,
    energyEffect: 15,
  },

  // Themed Items - Desert
  {
    name: 'Desert Wrap',
    description: 'Traditional headwrap that protects from sandstorms',
    category: ItemCategory.HAT,
    layerType: LayerType.HAT,
    rarity: Rarity.UNCOMMON,
    healthEffect: 8,
  },
  {
    name: 'Ancient Artifact',
    description: 'Mysterious relic from a lost desert civilization',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.LEGENDARY,
  },

  // Weird Items - Glitch
  {
    name: 'Fragmented Code',
    description: 'Broken data fragments that shimmer with digital energy',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.RARE,
  },
  {
    name: 'Pixel Dust',
    description: 'Granular reality particles from corrupted textures',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.COMMON,
  },
  {
    name: 'Buffer Overflow Potion',
    description:
      'Dangerous digital brew that crashes your system... in a good way',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.EPIC,
    energyEffect: 150,
  },
  {
    name: 'Glitch Goggles',
    description: 'See through the matrix with corrupted vision',
    category: ItemCategory.ACCESSORY,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    energyEffect: 10,
  },

  // Weird Items - Fungi
  {
    name: 'Neural Spores',
    description: 'Microscopic fungal networks that enhance thought',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.UNCOMMON,
  },
  {
    name: 'Symbiotic Armor',
    description: 'Living fungal protection that grows with you',
    category: ItemCategory.CLOTHING,
    layerType: LayerType.CLOTHING,
    rarity: Rarity.EPIC,
    healthEffect: 25,
  },
  {
    name: 'Mycelium Thread',
    description: 'Natural fiber that connects all living things',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.COMMON,
  },

  // Weird Items - Temporal
  {
    name: 'Temporal Flux',
    description: 'Crystallized time that bends around your fingers',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.LEGENDARY,
  },
  {
    name: 'Paradox Engine',
    description: 'Mechanical device that exists in multiple timelines',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.LEGENDARY,
    durability: 999,
    energyEffect: 50,
  },
  {
    name: 'Causality Loop',
    description: 'Effect becomes cause becomes effect becomes...',
    category: ItemCategory.ACCESSORY,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.EPIC,
  },

  // Weird Items - Bone
  {
    name: 'Living Bone Tools',
    description: 'Ossified implements that grow sharper with use',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    durability: 200,
  },
  {
    name: 'Calcium Crystals',
    description: 'Mineralized bone structure with geometric perfection',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.UNCOMMON,
  },
  {
    name: 'Skeletal Framework',
    description: 'Wearable bone structure that supports heavy lifting',
    category: ItemCategory.CLOTHING,
    layerType: LayerType.CLOTHING,
    rarity: Rarity.RARE,
    healthEffect: 20,
  },

  // Weird Items - Static
  {
    name: 'White Noise Generator',
    description: 'Creates interference that masks your presence',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    durability: 100,
  },
  {
    name: 'Static Cling',
    description: 'Electromagnetic adhesive that sticks to anything',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.COMMON,
  },
  {
    name: 'Frequency Modulator',
    description: 'Tunes reality to different channels',
    category: ItemCategory.ACCESSORY,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.EPIC,
    energyEffect: 15,
  },
  {
    name: 'Signal Booster Helmet',
    description: 'Amplifies brainwaves through electromagnetic fields',
    category: ItemCategory.HAT,
    layerType: LayerType.HAT,
    rarity: Rarity.RARE,
    energyEffect: 20,
  },
]

// Character templates
const CHARACTER_TEMPLATES = [
  {
    name: 'Wojak #1337',
    gender: Gender.MALE,
    location: 'Mining Plains',
    energy: 85,
    health: 100,
  },
  {
    name: 'Wojak #420',
    gender: Gender.MALE,
    location: 'Mining Plains',
    energy: 95,
    health: 100,
  },
  {
    name: 'Wojak #69',
    gender: Gender.FEMALE,
    location: 'Rusty Pickaxe Inn',
    energy: 70,
    health: 100,
  },
  {
    name: 'Wojak #888',
    gender: Gender.MALE,
    location: 'Crystal Caves',
    energy: 45,
    health: 90,
  },
  {
    name: 'Wojak #2077',
    gender: Gender.FEMALE,
    location: 'Crystal Caves',
    energy: 60,
    health: 85,
  },
  {
    name: 'Wojak #100',
    gender: Gender.MALE,
    location: 'Central Exchange',
    energy: 80,
    health: 100,
  },
  {
    name: 'Wojak #777',
    gender: Gender.FEMALE,
    location: 'Central Exchange',
    energy: 90,
    health: 95,
  },
  {
    name: 'Wojak #333',
    gender: Gender.MALE,
    location: 'The Glitch Club',
    energy: 55,
    health: 80,
  },
  {
    name: 'Wojak #555',
    gender: Gender.FEMALE,
    location: 'Desert Outpost',
    energy: 40,
    health: 75,
  },
  {
    name: 'Wojak #999',
    gender: Gender.MALE,
    location: 'Desert Outpost',
    energy: 85,
    health: 100,
  },

  // New characters for weird regions
  {
    name: 'Wojak #404',
    gender: Gender.MALE,
    location: 'The Glitch Wastes',
    energy: 50,
    health: 95,
  },
  {
    name: 'Wojak #101',
    gender: Gender.FEMALE,
    location: 'Fungi Networks',
    energy: 75,
    health: 85,
  },
  {
    name: 'Wojak #2025',
    gender: Gender.MALE,
    location: 'Temporal Rift Zone',
    energy: 90,
    health: 80,
  },
  {
    name: 'Wojak #666',
    gender: Gender.FEMALE,
    location: 'The Bone Markets',
    energy: 65,
    health: 90,
  },
  {
    name: 'Wojak #000',
    gender: Gender.MALE,
    location: 'Static Fields',
    energy: 30,
    health: 100,
  },
]

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function randomRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateUniqueNumber(): number {
  return Math.floor(Math.random() * 999999) + 1
}

function applyPriceMultiplier(basePrice: number, locationName: string): number {
  const multiplier = WORLD_CONFIG.PRICE_MULTIPLIERS[locationName] || 1.0
  return Math.round(basePrice * multiplier)
}

function calculateSpawnRate(baseRate: number, rarity: Rarity): number {
  const rarityMultiplier = WORLD_CONFIG.BASE_SPAWN_RATES[rarity] || 0.1
  return Math.min(baseRate * rarityMultiplier, 0.8) // Cap at 80%
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

  console.log('🗺️ Creating world locations...')

  const locationMap = new Map()

  for (const locationData of WORLD_LOCATIONS) {
    const { subLocations, ...parentData } = locationData

    // Create parent location
    const parentLocation = await prisma.location.create({
      data: {
        ...parentData,
        playerCount: 0,
        lastActive: new Date(Date.now() - Math.random() * 30 * 60 * 1000), // Random recent activity
      },
    })

    locationMap.set(parentLocation.name, parentLocation)
    console.log(`  🏔️ ${parentLocation.name}`)

    // Create sub-locations
    if (subLocations) {
      for (const subData of subLocations) {
        const subLocation = await prisma.location.create({
          data: {
            ...subData,
            parentLocationId: parentLocation.id,
            playerCount: 0,
            lastActive: new Date(Date.now() - Math.random() * 60 * 60 * 1000),
          },
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
        imageUrl: `/items/${itemData.name
          .toLowerCase()
          .replace(/\s+/g, '-')}.png`,
      },
    })

    itemMap.set(item.name, item)
    console.log(`  ✨ ${item.name} (${item.rarity})`)
  }

  console.log(`✅ Created ${itemMap.size} items`)
  return itemMap
}

async function createCharacters(locationMap: Map<string, any>) {
  if (!WORLD_CONFIG.FEATURES.CREATE_CHARACTERS) {
    console.log('⏭️ Skipping character creation (disabled in config)')
    return []
  }

  console.log('👥 Creating world characters...')

  const characters = []

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
        id: `char_${template.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        nftAddress: `NFT_${generateUniqueNumber()}`,
        tokenId:
          template.name.split('#')[1] || generateUniqueNumber().toString(),
        walletAddress: `WALLET_${generateUniqueNumber()}`,
        name: template.name,
        gender: template.gender,
        characterType: CharacterType.HUMAN,
        currentLocationId: location.id,
        currentVersion: 1,
        currentImageUrl: `/wojak-${
          template.name.split('#')[1] || 'default'
        }.png`,
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
  locationMap: Map<string, any>,
  itemMap: Map<string, any>
) {
  if (!WORLD_CONFIG.FEATURES.SETUP_MARKETS) {
    console.log('⏭️ Skipping market setup (disabled in config)')
    return
  }

  console.log('🏪 Setting up markets...')

  // Market configurations with base prices
  const MARKET_CONFIGS: Record<
    string,
    Array<{ name: string; quantity: number; price: number }>
  > = {
    'Mining Plains': [
      { name: 'Miners Hat', quantity: 8, price: 15 },
      { name: 'Basic Pickaxe', quantity: 5, price: 20 },
      { name: 'Multi-Tool', quantity: 3, price: 35 },
      { name: 'Energy Drink', quantity: 15, price: 8 },
      { name: 'Work Gloves', quantity: 6, price: 12 },
    ],

    'Rusty Pickaxe Inn': [
      { name: 'Energy Drink', quantity: 20, price: 10 },
      { name: 'Health Potion', quantity: 15, price: 22 },
      { name: 'Basic Pickaxe', quantity: 8, price: 18 },
      { name: 'Lucky Charm', quantity: 4, price: 28 },
    ],

    'Crystal Caves': [
      { name: 'Energy Drink', quantity: 12, price: 12 },
      { name: 'Health Potion', quantity: 8, price: 28 },
      { name: 'Crystal Shard', quantity: 8, price: 50 },
      { name: 'Omni-Tool', quantity: 1, price: 3500 },
    ],

    'Central Exchange': [
      { name: 'Cyberpunk Shades', quantity: 3, price: 65 },
      { name: 'Neon Visor', quantity: 1, price: 150 },
      { name: 'Hacking Toolkit', quantity: 2, price: 120 },
      { name: 'Rare Floppy Disk', quantity: 1, price: 500 },
      { name: 'Cyber Jacket', quantity: 2, price: 85 },
    ],

    'The Glitch Club': [
      { name: 'Cyberpunk Shades', quantity: 4, price: 55 },
      { name: 'Hacking Toolkit', quantity: 3, price: 100 },
      { name: 'Multi-Tool', quantity: 4, price: 30 },
    ],

    'Desert Outpost': [
      { name: 'Desert Wrap', quantity: 4, price: 35 },
      { name: 'Energy Drink', quantity: 6, price: 15 },
      { name: 'Health Potion', quantity: 4, price: 35 },
      { name: 'Ancient Artifact', quantity: 1, price: 1000 },
    ],

    'The Glitch Wastes': [
      { name: 'Glitch Goggles', quantity: 2, price: 120 },
      { name: 'Buffer Overflow Potion', quantity: 1, price: 200 },
      { name: 'Pixel Dust', quantity: 15, price: 8 },
      { name: 'Fragmented Code', quantity: 5, price: 45 },
    ],

    'Fungi Networks': [
      { name: 'Symbiotic Armor', quantity: 1, price: 300 },
      { name: 'Neural Spores', quantity: 12, price: 25 },
      { name: 'Mycelium Thread', quantity: 20, price: 5 },
    ],

    'Temporal Rift Zone': [
      { name: 'Paradox Engine', quantity: 1, price: 5000 },
      { name: 'Temporal Flux', quantity: 2, price: 1000 },
      { name: 'Causality Loop', quantity: 3, price: 400 },
    ],

    'The Bone Markets': [
      { name: 'Living Bone Tools', quantity: 4, price: 160 },
      { name: 'Skeletal Framework', quantity: 2, price: 220 },
      { name: 'Calcium Crystals', quantity: 20, price: 15 },
    ],

    'Static Fields': [
      { name: 'Signal Booster Helmet', quantity: 2, price: 180 },
      { name: 'White Noise Generator', quantity: 3, price: 130 },
      { name: 'Frequency Modulator', quantity: 2, price: 200 },
      { name: 'Static Cling', quantity: 25, price: 6 },
    ],
  }

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
  locationMap: Map<string, any>,
  itemMap: Map<string, any>
) {
  if (!WORLD_CONFIG.FEATURES.SETUP_MINING) {
    console.log('⏭️ Skipping mining setup (disabled in config)')
    return
  }

  console.log('⛏️ Setting up mining resources...')

  // Mining configurations
  const MINING_CONFIGS: Record<
    string,
    Array<{
      name: string
      spawnRate: number
      maxPerDay: number
      difficulty: number
    }>
  > = {
    'Mining Plains': [
      { name: 'Dirty Coal', spawnRate: 0.5, maxPerDay: 25, difficulty: 1 },
      { name: 'Iron Scraps', spawnRate: 0.35, maxPerDay: 15, difficulty: 1 },
      { name: 'Basic Pickaxe', spawnRate: 0.08, maxPerDay: 3, difficulty: 1 },
    ],

    'Crystal Caves': [
      { name: 'Crystal Shard', spawnRate: 0.15, maxPerDay: 5, difficulty: 3 },
      { name: 'Ancient Coin', spawnRate: 0.08, maxPerDay: 3, difficulty: 2 },
      { name: 'Omni-Tool', spawnRate: 0.002, maxPerDay: 1, difficulty: 5 },
    ],

    'Desert Outpost': [
      { name: 'Ancient Coin', spawnRate: 0.18, maxPerDay: 8, difficulty: 3 },
      { name: 'Crystal Shard', spawnRate: 0.06, maxPerDay: 2, difficulty: 4 },
      {
        name: 'Ancient Artifact',
        spawnRate: 0.01,
        maxPerDay: 1,
        difficulty: 5,
      },
    ],

    'The Glitch Wastes': [
      { name: 'Pixel Dust', spawnRate: 0.4, maxPerDay: 20, difficulty: 4 },
      { name: 'Fragmented Code', spawnRate: 0.12, maxPerDay: 6, difficulty: 5 },
      { name: 'Glitch Goggles', spawnRate: 0.02, maxPerDay: 1, difficulty: 6 },
    ],

    'Corrupted Data Mines': [
      { name: 'Fragmented Code', spawnRate: 0.3, maxPerDay: 10, difficulty: 5 },
      {
        name: 'Buffer Overflow Potion',
        spawnRate: 0.008,
        maxPerDay: 1,
        difficulty: 7,
      },
    ],

    'Fungi Networks': [
      { name: 'Mycelium Thread', spawnRate: 0.5, maxPerDay: 30, difficulty: 3 },
      { name: 'Neural Spores', spawnRate: 0.25, maxPerDay: 15, difficulty: 3 },
    ],

    'The Great Mycelium': [
      { name: 'Neural Spores', spawnRate: 0.4, maxPerDay: 20, difficulty: 4 },
      {
        name: 'Symbiotic Armor',
        spawnRate: 0.015,
        maxPerDay: 1,
        difficulty: 5,
      },
    ],

    'Temporal Rift Zone': [
      { name: 'Temporal Flux', spawnRate: 0.05, maxPerDay: 2, difficulty: 6 },
      { name: 'Causality Loop', spawnRate: 0.08, maxPerDay: 3, difficulty: 5 },
    ],

    'Clock Tower Ruins': [
      { name: 'Temporal Flux', spawnRate: 0.08, maxPerDay: 3, difficulty: 6 },
      { name: 'Paradox Engine', spawnRate: 0.001, maxPerDay: 1, difficulty: 8 },
    ],

    'The Bone Markets': [
      {
        name: 'Calcium Crystals',
        spawnRate: 0.35,
        maxPerDay: 18,
        difficulty: 3,
      },
      {
        name: 'Living Bone Tools',
        spawnRate: 0.06,
        maxPerDay: 3,
        difficulty: 4,
      },
    ],

    'Static Fields': [
      { name: 'Static Cling', spawnRate: 0.45, maxPerDay: 22, difficulty: 4 },
      {
        name: 'White Noise Generator',
        spawnRate: 0.07,
        maxPerDay: 3,
        difficulty: 5,
      },
    ],

    'Channel 0': [
      { name: 'Static Cling', spawnRate: 0.6, maxPerDay: 30, difficulty: 4 },
      {
        name: 'Signal Booster Helmet',
        spawnRate: 0.02,
        maxPerDay: 1,
        difficulty: 6,
      },
    ],
  }

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
  locationMap: Map<string, any>,
  characters: any[]
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
  const issues = []

  // Check for locations without markets or mining
  const emptyMarkets = await prisma.location.count({
    where: {
      hasMarket: true,
      marketListings: { none: {} },
    },
  })
  if (emptyMarkets > 0)
    issues.push(`${emptyMarkets} market locations have no items`)

  const emptyMining = await prisma.location.count({
    where: {
      hasMining: true,
      resources: { none: {} },
    },
  })
  if (emptyMining > 0)
    issues.push(`${emptyMining} mining locations have no resources`)

  // Check for characters without locations
  const orphanedCharacters = await prisma.character.count({
    where: { currentLocation: null },
  })
  if (orphanedCharacters > 0)
    issues.push(`${orphanedCharacters} characters have no location`)

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

    console.log('\n🎉 ULTIMATE WORLD SETUP COMPLETE!')
    console.log('='.repeat(50))
    console.log('🚀 Your world is ready for players!')
    console.log('')
    console.log('🎯 Key Features:')
    console.log('  • 12 unique locations across 8 regions')
    console.log('  • 30+ items spanning all categories and rarities')
    console.log('  • 15+ characters distributed across the world')
    console.log('  • Dynamic markets with location-based pricing')
    console.log('  • Resource-rich mining system')
    console.log('  • Living chat history and social features')
    console.log('')
    console.log('📖 Next Steps:')
    console.log('  1. Run `npm run dev` to start your game')
    console.log('  2. Test wallet connection and character selection')
    console.log('  3. Explore all the weird new regions!')
    console.log('  4. Consider adding NFT minting functionality')
  } catch (error) {
    console.error('❌ Ultimate world setup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the ultimate setup
setupUltimateWorld()
