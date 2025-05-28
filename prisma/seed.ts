import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clean existing data (optional - remove in production)
  await prisma.chatMessage.deleteMany()
  await prisma.marketListing.deleteMany()
  await prisma.locationResource.deleteMany()
  await prisma.characterInventory.deleteMany()
  await prisma.characterImage.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.character.deleteMany()
  await prisma.location.deleteMany()
  await prisma.item.deleteMany()

  console.log('🧹 Cleaned existing data')

  // Create Items first
  const items = await Promise.all([
    // Mining Materials
    prisma.item.create({
      data: {
        name: 'Dirty Coal',
        description: 'Basic fuel found in shallow mines',
        category: 'MATERIAL',
        rarity: 'COMMON',
        imageUrl: '/items/dirty-coal.png',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Iron Scraps',
        description: 'Rusty metal pieces, still useful',
        category: 'MATERIAL',
        rarity: 'COMMON',
        imageUrl: '/items/iron-scraps.png',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Ancient Coin',
        description: 'Currency from a forgotten civilization',
        category: 'MATERIAL',
        rarity: 'RARE',
        imageUrl: '/items/ancient-coin.png',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Crystal Shard',
        description: 'Glowing fragment with mysterious properties',
        category: 'MATERIAL',
        rarity: 'EPIC',
        imageUrl: '/items/crystal-shard.png',
      },
    }),

    // Equipment
    prisma.item.create({
      data: {
        name: 'Miners Hat',
        description: 'Worn leather hat with a dim headlamp',
        category: 'HAT',
        layerType: 'HAT',
        rarity: 'COMMON',
        durability: 100,
        energyEffect: 5,
        imageUrl: '/items/miners-hat.png',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Work Gloves',
        description: 'Tough gloves for manual labor',
        category: 'CLOTHING',
        layerType: 'ACCESSORY',
        rarity: 'COMMON',
        durability: 80,
        imageUrl: '/items/work-gloves.png',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Lucky Charm',
        description: "A rabbit's foot that might bring fortune",
        category: 'ACCESSORY',
        layerType: 'ACCESSORY',
        rarity: 'UNCOMMON',
        imageUrl: '/items/lucky-charm.png',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Cyber Jacket',
        description: 'High-tech jacket with built-in displays',
        category: 'CLOTHING',
        layerType: 'CLOTHING',
        rarity: 'RARE',
        energyEffect: 15,
        imageUrl: '/items/cyber-jacket.png',
      },
    }),

    // Consumables
    prisma.item.create({
      data: {
        name: 'Energy Drink',
        description: 'Restores energy and keeps you alert',
        category: 'CONSUMABLE',
        rarity: 'COMMON',
        energyEffect: 25,
        imageUrl: '/items/energy-drink.png',
      },
    }),
    prisma.item.create({
      data: {
        name: 'Health Potion',
        description: 'Mysterious red liquid that heals wounds',
        category: 'CONSUMABLE',
        rarity: 'UNCOMMON',
        healthEffect: 30,
        imageUrl: '/items/health-potion.png',
      },
    }),
  ])

  console.log(`✨ Created ${items.length} items`)

  // Create top-level locations (regions)
  const miningPlains = await prisma.location.create({
    data: {
      name: 'Mining Plains',
      description: 'Rich in basic materials and perfect for newcomers',
      locationType: 'REGION',
      biome: 'plains',
      difficulty: 1,
      playerCount: 12,
      lastActive: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      hasMarket: true,
      hasMining: true,
      hasChat: true,
      chatScope: 'REGIONAL',
      welcomeMessage: 'The wind carries the sound of pickaxes striking stone.',
      lore: 'Once a vast battlefield, these plains now serve as the primary mining grounds for new arrivals to Earth. The soil is rich with metals and coal, making it an ideal starting point for wojaks beginning their journey.',
      mapX: 100,
      mapY: 200,
    },
  })

  const desertOutpost = await prisma.location.create({
    data: {
      name: 'Desert Outpost',
      description: 'Harsh but rewarding terrain for experienced miners',
      locationType: 'REGION',
      biome: 'desert',
      difficulty: 3,
      playerCount: 5,
      lastActive: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
      hasMarket: true,
      hasMining: true,
      hasChat: true,
      chatScope: 'REGIONAL',
      welcomeMessage: 'The scorching sun beats down mercilessly.',
      lore: 'A remote trading post built around an ancient oasis. Only the hardiest wojaks venture here, seeking rare materials that can only be found in the unforgiving desert sands.',
      mapX: 400,
      mapY: 100,
    },
  })

  const cyberCity = await prisma.location.create({
    data: {
      name: 'Cyber City',
      description: 'The technological heart of wojak civilization',
      locationType: 'CITY',
      biome: 'urban',
      difficulty: 2,
      playerCount: 28,
      lastActive: new Date(Date.now() - 30 * 1000), // 30 seconds ago
      hasMarket: true,
      hasMining: false,
      hasChat: true,
      chatScope: 'LOCAL',
      welcomeMessage: 'Neon lights flicker in the perpetual twilight.',
      lore: 'The beating heart of wojak civilization. Technology and commerce thrive in the endless cityscape where digital and physical reality blur together.',
      mapX: 300,
      mapY: 300,
    },
  })

  console.log('🏘️ Created 3 main regions')

  // Create sub-locations
  const subLocations = await Promise.all([
    // Mining Plains sub-locations
    prisma.location.create({
      data: {
        name: 'Rusty Pickaxe Inn',
        description: 'A cozy tavern where miners share stories and ale',
        locationType: 'BUILDING',
        parentLocationId: miningPlains.id,
        difficulty: 1,
        playerCount: 4,
        lastActive: new Date(Date.now() - 5 * 60 * 1000),
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        chatScope: 'LOCAL',
        welcomeMessage: 'The smell of ale and roasted meat fills the air.',
        lore: 'The social hub of the Mining Plains. Here, experienced miners mentor newcomers while sharing tales of their greatest discoveries.',
      },
    }),
    prisma.location.create({
      data: {
        name: 'Crystal Caves',
        description: 'Deep underground shafts where rare crystals grow',
        locationType: 'BUILDING',
        parentLocationId: miningPlains.id,
        difficulty: 2,
        playerCount: 8,
        lastActive: new Date(Date.now() - 1 * 60 * 1000),
        hasMarket: false,
        hasMining: true,
        hasChat: true,
        chatScope: 'LOCAL',
        welcomeMessage: 'Crystalline formations sparkle in your torchlight.',
        lore: 'The deepest mines in the Plains, where rare crystals form over centuries. Only brave wojaks venture into these echoing caverns.',
      },
    }),

    // Desert Outpost sub-locations
    prisma.location.create({
      data: {
        name: 'Oasis Trading Post',
        description: 'The commercial heart of the desert',
        locationType: 'BUILDING',
        parentLocationId: desertOutpost.id,
        difficulty: 3,
        playerCount: 3,
        lastActive: new Date(Date.now() - 20 * 60 * 1000),
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        chatScope: 'LOCAL',
        welcomeMessage:
          'Cool shade and fresh water provide relief from the heat.',
        lore: 'Built around the only reliable water source for miles, this trading post serves as a lifeline for desert travelers.',
      },
    }),

    // Cyber City sub-locations
    prisma.location.create({
      data: {
        name: 'Central Exchange',
        description: 'The main financial district and trading hub',
        locationType: 'BUILDING',
        parentLocationId: cyberCity.id,
        difficulty: 2,
        playerCount: 15,
        lastActive: new Date(Date.now() - 2 * 60 * 1000),
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        chatScope: 'LOCAL',
        welcomeMessage:
          'Holographic displays show market prices from across the world.',
        lore: 'The nerve center of wojak economy, where fortunes are made and lost in digital microseconds.',
      },
    }),
    prisma.location.create({
      data: {
        name: 'The Glitch Club',
        description: 'Underground social hub for hackers and rebels',
        locationType: 'BUILDING',
        parentLocationId: cyberCity.id,
        difficulty: 2,
        playerCount: 8,
        lastActive: new Date(Date.now() - 45 * 60 * 1000),
        hasMarket: false,
        hasMining: false,
        hasChat: true,
        chatScope: 'LOCAL',
        welcomeMessage: 'Bass-heavy music thumps through the smoky atmosphere.',
        lore: 'Hidden beneath the city streets, this club serves as a meeting place for those who operate outside the system.',
      },
    }),
    prisma.location.create({
      data: {
        name: 'Tech Lab',
        description: 'Advanced research facility for digital archaeology',
        locationType: 'BUILDING',
        parentLocationId: cyberCity.id,
        difficulty: 3,
        playerCount: 5,
        lastActive: new Date(Date.now() - 15 * 60 * 1000),
        hasMarket: false,
        hasMining: true, // mining data/components
        hasChat: true,
        chatScope: 'LOCAL',
        welcomeMessage:
          'Banks of servers hum quietly in the sterile environment.',
        lore: 'Where wojak scientists attempt to understand the digital artifacts scattered throughout cyberspace.',
      },
    }),
  ])

  console.log(`🏢 Created ${subLocations.length} sub-locations`)

  // Create location resources (what can be mined where)
  const locationResources = await Promise.all([
    // Mining Plains - basic materials
    prisma.locationResource.create({
      data: {
        locationId: miningPlains.id,
        itemId: items.find((i) => i.name === 'Dirty Coal')!.id,
        spawnRate: 0.6,
        maxPerDay: 20,
        difficulty: 1,
      },
    }),
    prisma.locationResource.create({
      data: {
        locationId: miningPlains.id,
        itemId: items.find((i) => i.name === 'Iron Scraps')!.id,
        spawnRate: 0.4,
        maxPerDay: 15,
        difficulty: 1,
      },
    }),

    // Crystal Caves - rare materials
    prisma.locationResource.create({
      data: {
        locationId: subLocations.find((l) => l.name === 'Crystal Caves')!.id,
        itemId: items.find((i) => i.name === 'Crystal Shard')!.id,
        spawnRate: 0.1,
        maxPerDay: 3,
        difficulty: 3,
      },
    }),

    // Desert - ancient materials
    prisma.locationResource.create({
      data: {
        locationId: desertOutpost.id,
        itemId: items.find((i) => i.name === 'Ancient Coin')!.id,
        spawnRate: 0.15,
        maxPerDay: 5,
        difficulty: 2,
      },
    }),

    // Tech Lab - digital components
    prisma.locationResource.create({
      data: {
        locationId: subLocations.find((l) => l.name === 'Tech Lab')!.id,
        itemId: items.find((i) => i.name === 'Cyber Jacket')!.id,
        spawnRate: 0.05,
        maxPerDay: 1,
        difficulty: 4,
      },
    }),
  ])

  console.log(`⛏️ Created ${locationResources.length} location resources`)

  // Create market listings
  const marketListings = await Promise.all([
    // System items in Mining Plains
    prisma.marketListing.create({
      data: {
        locationId: miningPlains.id,
        itemId: items.find((i) => i.name === 'Miners Hat')!.id,
        price: 50,
        quantity: 10,
        isSystemItem: true,
      },
    }),
    prisma.marketListing.create({
      data: {
        locationId: miningPlains.id,
        itemId: items.find((i) => i.name === 'Work Gloves')!.id,
        price: 25,
        quantity: 15,
        isSystemItem: true,
      },
    }),
    prisma.marketListing.create({
      data: {
        locationId: miningPlains.id,
        itemId: items.find((i) => i.name === 'Energy Drink')!.id,
        price: 10,
        quantity: 50,
        isSystemItem: true,
      },
    }),

    // Premium items in Cyber City
    prisma.marketListing.create({
      data: {
        locationId: cyberCity.id,
        itemId: items.find((i) => i.name === 'Health Potion')!.id,
        price: 75,
        quantity: 20,
        isSystemItem: true,
      },
    }),
    prisma.marketListing.create({
      data: {
        locationId: cyberCity.id,
        itemId: items.find((i) => i.name === 'Lucky Charm')!.id,
        price: 200,
        quantity: 5,
        isSystemItem: true,
      },
    }),
  ])

  console.log(`🏪 Created ${marketListings.length} market listings`)

  // Create a test character (our hardcoded player)
  const testCharacter = await prisma.character.create({
    data: {
      nftAddress: 'DemoNFT123456789',
      tokenId: '1337',
      walletAddress: 'DemoWallet123456789',
      name: 'Wojak #1337',
      gender: 'MALE',
      characterType: 'HUMAN',
      currentLocationId: miningPlains.id,
      currentVersion: 1,
      currentImageUrl: '/wojak.png',
      energy: 85,
      health: 100,
    },
  })

  // Add some sample inventory to test character
  await Promise.all([
    prisma.characterInventory.create({
      data: {
        characterId: testCharacter.id,
        itemId: items.find((i) => i.name === 'Dirty Coal')!.id,
        quantity: 3,
      },
    }),
    prisma.characterInventory.create({
      data: {
        characterId: testCharacter.id,
        itemId: items.find((i) => i.name === 'Miners Hat')!.id,
        quantity: 1,
        isEquipped: true,
      },
    }),
  ])

  // Create some sample transactions
  await Promise.all([
    prisma.transaction.create({
      data: {
        characterId: testCharacter.id,
        type: 'MINT',
        description: 'Character minted',
      },
    }),
    prisma.transaction.create({
      data: {
        characterId: testCharacter.id,
        type: 'MINE',
        itemId: items.find((i) => i.name === 'Dirty Coal')!.id,
        quantity: 1,
        description: 'Found Dirty Coal while mining',
      },
    }),
  ])

  console.log('👤 Created test character with inventory and history')

  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
