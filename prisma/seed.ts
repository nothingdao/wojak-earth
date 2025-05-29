import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting expanded database seed...')

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

  // Create Items first (same as before)
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

  // Create top-level locations (same as before)
  const miningPlains = await prisma.location.create({
    data: {
      name: 'Mining Plains',
      description: 'Rich in basic materials and perfect for newcomers',
      locationType: 'REGION',
      biome: 'plains',
      difficulty: 1,
      playerCount: 8, // Will be updated by actual characters
      lastActive: new Date(Date.now() - 2 * 60 * 1000),
      hasMarket: true,
      hasMining: true,
      hasChat: true,
      chatScope: 'REGIONAL',
      welcomeMessage: 'The wind carries the sound of pickaxes striking stone.',
      lore: 'Once a vast battlefield, these plains now serve as the primary mining grounds for new arrivals to Earth.',
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
      playerCount: 3,
      lastActive: new Date(Date.now() - 12 * 60 * 1000),
      hasMarket: true,
      hasMining: true,
      hasChat: true,
      chatScope: 'REGIONAL',
      welcomeMessage: 'The scorching sun beats down mercilessly.',
      lore: 'A remote trading post built around an ancient oasis.',
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
      playerCount: 12,
      lastActive: new Date(Date.now() - 30 * 1000),
      hasMarket: true,
      hasMining: false,
      hasChat: true,
      chatScope: 'LOCAL',
      welcomeMessage: 'Neon lights flicker in the perpetual twilight.',
      lore: 'The beating heart of wojak civilization.',
      mapX: 300,
      mapY: 300,
    },
  })

  // Create sub-locations
  const rustyPickaxeInn = await prisma.location.create({
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
    },
  })

  const crystalCaves = await prisma.location.create({
    data: {
      name: 'Crystal Caves',
      description: 'Deep underground shafts where rare crystals grow',
      locationType: 'BUILDING',
      parentLocationId: miningPlains.id,
      difficulty: 2,
      playerCount: 4,
      lastActive: new Date(Date.now() - 1 * 60 * 1000),
      hasMarket: false,
      hasMining: true,
      hasChat: true,
      chatScope: 'LOCAL',
      welcomeMessage: 'Crystalline formations sparkle in your torchlight.',
    },
  })

  const centralExchange = await prisma.location.create({
    data: {
      name: 'Central Exchange',
      description: 'The main financial district and trading hub',
      locationType: 'BUILDING',
      parentLocationId: cyberCity.id,
      difficulty: 2,
      playerCount: 8,
      lastActive: new Date(Date.now() - 2 * 60 * 1000),
      hasMarket: true,
      hasMining: false,
      hasChat: true,
      chatScope: 'LOCAL',
      welcomeMessage:
        'Holographic displays show market prices from across the world.',
    },
  })

  const glitchClub = await prisma.location.create({
    data: {
      name: 'The Glitch Club',
      description: 'Underground social hub for hackers and rebels',
      locationType: 'BUILDING',
      parentLocationId: cyberCity.id,
      difficulty: 2,
      playerCount: 4,
      lastActive: new Date(Date.now() - 15 * 60 * 1000),
      hasMarket: false,
      hasMining: false,
      hasChat: true,
      chatScope: 'LOCAL',
      welcomeMessage: 'Bass-heavy music thumps through the smoky atmosphere.',
    },
  })

  console.log('🏘️ Created locations')

  // 🆕 CREATE DIVERSE CHARACTERS (Our Test Players)
  const characters = await Promise.all([
    // Our main test character
    prisma.character.create({
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
    }),

    // Mining Plains characters
    prisma.character.create({
      data: {
        nftAddress: 'NFT420420420',
        tokenId: '420',
        walletAddress: 'Wallet420',
        name: 'Wojak #420',
        gender: 'MALE',
        characterType: 'HUMAN',
        currentLocationId: miningPlains.id,
        currentVersion: 1,
        currentImageUrl: '/wojak-420.png',
        energy: 95,
        health: 100,
      },
    }),
    prisma.character.create({
      data: {
        nftAddress: 'NFT69696969',
        tokenId: '69',
        walletAddress: 'Wallet69',
        name: 'Wojak #69',
        gender: 'FEMALE',
        characterType: 'HUMAN',
        currentLocationId: rustyPickaxeInn.id,
        currentVersion: 1,
        currentImageUrl: '/wojak-69.png',
        energy: 70,
        health: 100,
      },
    }),
    prisma.character.create({
      data: {
        nftAddress: 'NFT888888',
        tokenId: '888',
        walletAddress: 'Wallet888',
        name: 'Wojak #888',
        gender: 'MALE',
        characterType: 'HUMAN',
        currentLocationId: crystalCaves.id,
        currentVersion: 1,
        currentImageUrl: '/wojak-888.png',
        energy: 45,
        health: 90,
      },
    }),
    prisma.character.create({
      data: {
        nftAddress: 'NFT2077777',
        tokenId: '2077',
        walletAddress: 'Wallet2077',
        name: 'Wojak #2077',
        gender: 'FEMALE',
        characterType: 'HUMAN',
        currentLocationId: crystalCaves.id,
        currentVersion: 1,
        currentImageUrl: '/wojak-2077.png',
        energy: 60,
        health: 85,
      },
    }),

    // Cyber City characters
    prisma.character.create({
      data: {
        nftAddress: 'NFT1001001',
        tokenId: '100',
        walletAddress: 'Wallet100',
        name: 'Wojak #100',
        gender: 'MALE',
        characterType: 'HUMAN',
        currentLocationId: centralExchange.id,
        currentVersion: 1,
        currentImageUrl: '/wojak-100.png',
        energy: 80,
        health: 100,
      },
    }),
    prisma.character.create({
      data: {
        nftAddress: 'NFT7777777',
        tokenId: '777',
        walletAddress: 'Wallet777',
        name: 'Wojak #777',
        gender: 'FEMALE',
        characterType: 'HUMAN',
        currentLocationId: centralExchange.id,
        currentVersion: 1,
        currentImageUrl: '/wojak-777.png',
        energy: 90,
        health: 95,
      },
    }),
    prisma.character.create({
      data: {
        nftAddress: 'NFT3333333',
        tokenId: '333',
        walletAddress: 'Wallet333',
        name: 'Wojak #333',
        gender: 'MALE',
        characterType: 'HUMAN',
        currentLocationId: glitchClub.id,
        currentVersion: 1,
        currentImageUrl: '/wojak-333.png',
        energy: 55,
        health: 80,
      },
    }),

    // Desert characters
    prisma.character.create({
      data: {
        nftAddress: 'NFT5555555',
        tokenId: '555',
        walletAddress: 'Wallet555',
        name: 'Wojak #555',
        gender: 'FEMALE',
        characterType: 'HUMAN',
        currentLocationId: desertOutpost.id,
        currentVersion: 1,
        currentImageUrl: '/wojak-555.png',
        energy: 40,
        health: 75,
      },
    }),
    prisma.character.create({
      data: {
        nftAddress: 'NFT9999999',
        tokenId: '999',
        walletAddress: 'Wallet999',
        name: 'Wojak #999',
        gender: 'MALE',
        characterType: 'CREATURE',
        currentLocationId: desertOutpost.id,
        currentVersion: 1,
        currentImageUrl: '/wojak-999.png',
        energy: 85,
        health: 100,
      },
    }),
  ])

  console.log(`👥 Created ${characters.length} characters`)

  // 🆕 CREATE REALISTIC CHAT MESSAGES
  const chatMessages = await Promise.all([
    // Mining Plains chat (regional - shows in main area and sub-locations)
    prisma.chatMessage.create({
      data: {
        locationId: miningPlains.id,
        characterId: characters.find((c) => c.name === 'Wojak #420')!.id,
        message: 'Anyone know where the best iron deposits are?',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 3 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: miningPlains.id,
        characterId: characters.find((c) => c.name === 'Wojak #1337')!.id,
        message:
          'Try the eastern slopes, found some good scraps there yesterday',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: miningPlains.id,
        characterId: characters.find((c) => c.name === 'Wojak #420')!.id,
        message: 'Thanks! Heading there now',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 90 * 1000),
      },
    }),

    // Rusty Pickaxe Inn chat (local - cozy tavern conversation)
    prisma.chatMessage.create({
      data: {
        locationId: rustyPickaxeInn.id,
        characterId: characters.find((c) => c.name === 'Wojak #69')!.id,
        message: 'This ale tastes like it was brewed in a boot 😂',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 8 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: rustyPickaxeInn.id,
        characterId: characters.find((c) => c.name === 'Wojak #420')!.id,
        message: 'Hey, at least it gets you drunk!',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 7 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: rustyPickaxeInn.id,
        characterId: characters.find((c) => c.name === 'Wojak #69')!.id,
        message: 'True! Anyone up for some mining stories?',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
      },
    }),

    // Crystal Caves chat (focused on mining)
    prisma.chatMessage.create({
      data: {
        locationId: crystalCaves.id,
        characterId: characters.find((c) => c.name === 'Wojak #888')!.id,
        message: 'Whoa! Just found a crystal shard in the deep tunnel!',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: crystalCaves.id,
        characterId: characters.find((c) => c.name === 'Wojak #2077')!.id,
        message: 'Nice! What rarity?',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 4 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: crystalCaves.id,
        characterId: characters.find((c) => c.name === 'Wojak #888')!.id,
        message: "Epic! First one I've ever seen",
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 3 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: crystalCaves.id,
        characterId: characters.find((c) => c.name === 'Wojak #2077')!.id,
        message: "Damn, I've been mining here for weeks with no luck",
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
      },
    }),

    // Central Exchange chat (trading focused)
    prisma.chatMessage.create({
      data: {
        locationId: centralExchange.id,
        characterId: characters.find((c) => c.name === 'Wojak #100')!.id,
        message: 'WTS: Cyber Jacket, rare quality. Looking for ancient coins',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: centralExchange.id,
        characterId: characters.find((c) => c.name === 'Wojak #777')!.id,
        message: 'How many coins?',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 14 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: centralExchange.id,
        characterId: characters.find((c) => c.name === 'Wojak #100')!.id,
        message: '15 coins, firm price',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 13 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: centralExchange.id,
        characterId: characters.find((c) => c.name === 'Wojak #777')!.id,
        message: 'Deal! Meet me at the trade terminal',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 12 * 60 * 1000),
      },
    }),

    // Glitch Club chat (underground vibe)
    prisma.chatMessage.create({
      data: {
        locationId: glitchClub.id,
        characterId: characters.find((c) => c.name === 'Wojak #333')!.id,
        message: '*nods to the beat* This track is fire 🔥',
        messageType: 'EMOTE',
        createdAt: new Date(Date.now() - 20 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: glitchClub.id,
        characterId: characters.find((c) => c.name === 'Wojak #777')!.id,
        message: 'Anyone know who the DJ is tonight?',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 18 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: glitchClub.id,
        characterId: characters.find((c) => c.name === 'Wojak #333')!.id,
        message: 'DJ CyberWojak, they drop the sickest beats in the city',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 16 * 60 * 1000),
      },
    }),

    // Desert Outpost chat (survival focused)
    prisma.chatMessage.create({
      data: {
        locationId: desertOutpost.id,
        characterId: characters.find((c) => c.name === 'Wojak #555')!.id,
        message: 'Water supplies running low... need to find the oasis',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 25 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: desertOutpost.id,
        characterId: characters.find((c) => c.name === 'Wojak #999')!.id,
        message: 'Follow the ancient stone markers, they lead to water',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 23 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: desertOutpost.id,
        characterId: characters.find((c) => c.name === 'Wojak #555')!.id,
        message: 'Thanks creature-wojak, you know this desert well',
        messageType: 'CHAT',
        createdAt: new Date(Date.now() - 22 * 60 * 1000),
      },
    }),

    // System messages
    prisma.chatMessage.create({
      data: {
        locationId: miningPlains.id,
        characterId: characters.find((c) => c.name === 'Wojak #420')!.id,
        message: 'Wojak #420 found: Iron Scraps (COMMON)',
        messageType: 'SYSTEM',
        isSystem: true,
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        locationId: crystalCaves.id,
        characterId: characters.find((c) => c.name === 'Wojak #888')!.id,
        message: 'Wojak #888 found: Crystal Shard (EPIC)',
        messageType: 'SYSTEM',
        isSystem: true,
        createdAt: new Date(Date.now() - 4 * 60 * 1000),
      },
    }),
  ])

  console.log(`💬 Created ${chatMessages.length} chat messages`)

  // Create some sample inventory items
  await Promise.all([
    prisma.characterInventory.create({
      data: {
        characterId: characters.find((c) => c.name === 'Wojak #1337')!.id,
        itemId: items.find((i) => i.name === 'Dirty Coal')!.id,
        quantity: 3,
      },
    }),
    prisma.characterInventory.create({
      data: {
        characterId: characters.find((c) => c.name === 'Wojak #1337')!.id,
        itemId: items.find((i) => i.name === 'Miners Hat')!.id,
        quantity: 1,
        isEquipped: true,
      },
    }),
    prisma.characterInventory.create({
      data: {
        characterId: characters.find((c) => c.name === 'Wojak #888')!.id,
        itemId: items.find((i) => i.name === 'Crystal Shard')!.id,
        quantity: 1,
      },
    }),
  ])

  // Create some location resources
  await Promise.all([
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
        locationId: crystalCaves.id,
        itemId: items.find((i) => i.name === 'Crystal Shard')!.id,
        spawnRate: 0.1,
        maxPerDay: 3,
        difficulty: 3,
      },
    }),
  ])

  console.log('🎉 Expanded database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Enhanced seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
