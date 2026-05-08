import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { GAME_CONFIG_TABLE_FIELDS } from "./gameConfigValidators";

export default defineSchema({
  verifiedSessions: defineTable({
    walletAddress: v.string(),
    txSignature: v.string(),
    paymentType: v.union(v.literal("SOL"), v.literal("ASTRDS")),
    verifiedAt: v.number(),
    expiresAt: v.number(),
    consumed: v.optional(v.boolean()),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_tx", ["txSignature"]),

  scores: defineTable({
    walletAddress: v.string(),
    score: v.number(),
    date: v.string(),
  }).index("by_score", ["score"]),

  gameSessions: defineTable({
    walletAddress: v.string(),
    score: v.number(),
    levelReached: v.number(),
    pillsCollected: v.optional(v.number()),
    astrdsEarned: v.optional(v.number()), // authoritative ASTRDS to mint, written by game server at game over
    astrdsEarnedRaw: v.optional(v.string()), // raw 9-decimal units, supports fractional ASTRDS
    astrdsAllocated: v.optional(v.number()),
    astrdsBurned: v.optional(v.number()),
    astrdsAllocatedRaw: v.optional(v.string()),
    astrdsBurnedRaw: v.optional(v.string()),
    settlementExpiry: v.optional(v.number()),
    settlementSignature: v.optional(v.array(v.number())),
    settlementSessionId: v.optional(v.array(v.number())),
    settlementTxSignature: v.optional(v.string()),
    sessionStart: v.string(),
    lastUpdated: v.string(),
    sessionEnd: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("ending"),
      v.literal("ended")
    ),
  }).index("by_wallet", ["walletAddress"]),

  chatMessages: defineTable({
    walletAddress: v.string(),
    message: v.string(),
    timestamp: v.string(),
  }),

  players: defineTable({
    walletAddress: v.string(),
    avatarStorageId: v.optional(v.id("_storage")),
    updatedAt: v.number(),
  }).index("by_wallet", ["walletAddress"]),

  walletProfiles: defineTable({
    walletAddress: v.string(),
    displayName: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_wallet", ["walletAddress"]),

  spaceDeposits: defineTable({
    walletAddress: v.string(), // depositor
    txSignature: v.string(), // on-chain transfer tx
    poolAddress: v.optional(v.string()), // on-chain DepositPool PDA
    mintAddress: v.string(), // token mint
    programId: v.string(), // 'TOKEN' or 'TOKEN_2022'
    symbol: v.string(),
    name: v.string(),
    logoUri: v.optional(v.string()),
    decimals: v.optional(v.number()),
    totalAmount: v.number(), // verified on-chain amount (raw units)
    remainingAmount: v.number(), // tokens left to distribute (raw units)
    tokensPerPill: v.number(), // raw units each collected pill represents
    minLevel: v.number(),
    maxLevel: v.number(),
    depositedAt: v.number(),
    // Spawn distribution mode — controls how often tokens appear for each player
    // steady: fixed interval regardless of level
    // escalating: interval shrinks as level increases, rewarding skilled play
    // wave: burst of N tokens then a quiet cooldown period
    spawnMode: v.optional(
      v.union(v.literal("steady"), v.literal("escalating"), v.literal("wave"))
    ),
    spawnInterval: v.optional(v.number()), // seconds between spawns (base for all modes)
    escalationRate: v.optional(v.number()), // escalating only: rate interval shrinks per level
    waveSize: v.optional(v.number()), // wave only: tokens per burst
    waveCooldown: v.optional(v.number()), // wave only: quiet period between waves (seconds)
    status: v.union(
      v.literal("pending_verification"),
      v.literal("active"),
      v.literal("depleted"),
      v.literal("cancelled")
    ),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_wallet_mint", ["walletAddress", "mintAddress"])
    .index("by_status", ["status"])
    .index("by_tx", ["txSignature"]),

  // One-time server-issued spawn authorizations.
  // A ticket is issued when the server validates a spawn is allowed (session active,
  // cooldown elapsed). The client must present the ticket ID to collect the token.
  // This prevents bots from calling collectFromDeposit without actually playing.
  spawnTickets: defineTable({
    depositId: v.id("spaceDeposits"),
    playerWalletAddress: v.string(),
    gameSessionId: v.id("gameSessions"),
    issuedAt: v.number(),
    expiresAt: v.number(), // 60s TTL — uncollected ticket expires
    used: v.boolean(),
  })
    .index("by_wallet_deposit_time", [
      "playerWalletAddress",
      "depositId",
      "issuedAt",
    ])
    .index("by_game_session", ["gameSessionId"]),

  // Individual pill collection events, written server-side at collection time.
  // Persists across sessions — player can claim at any time from AccountScreen or
  // game-over screen. Status transitions: pending → claimed.
  collections: defineTable({
    playerWalletAddress: v.string(),
    depositId: v.id("spaceDeposits"),
    gameSessionId: v.id("gameSessions"),
    mintAddress: v.string(),
    amount: v.number(), // raw units owed to player
    spawnId: v.id("spawnTickets"), // the ticket that authorized this collection
    status: v.union(
      v.literal("pending"),
      v.literal("claiming"),
      v.literal("claimed")
    ),
    collectedAt: v.number(),
    claimedTxSignature: v.optional(v.string()),
  })
    .index("by_player_wallet", ["playerWalletAddress"])
    .index("by_status_wallet", ["status", "playerWalletAddress"])
    .index("by_game_session", ["gameSessionId"]),

  // On-chain claim transfer records — one per claimSpaceTokens execution (which
  // may cover many collection events). Used by webhook to distinguish authorized
  // game payouts from external treasury drains.
  claims: defineTable({
    depositId: v.id("spaceDeposits"),
    playerWalletAddress: v.string(),
    mintAddress: v.string(),
    txSignature: v.string(),
    amount: v.number(), // raw units transferred on-chain
    claimedAt: v.number(),
  })
    .index("by_signature", ["txSignature"])
    .index("by_deposit", ["depositId"])
    .index("by_player_wallet", ["playerWalletAddress"]),

  // Singleton — at most one document. Version increments on every write so the
  // game server can detect changes and optionally apply them to running sessions.
  gameConfig: defineTable(GAME_CONFIG_TABLE_FIELDS),

  economySnapshots: defineTable({
    timestamp: v.number(),
    source: v.union(v.literal("manual"), v.literal("crank"), v.literal("cron")),
    poolAddress: v.string(),
    solUsdPrice: v.number(),
    astrdsReserve: v.number(),
    solReserve: v.number(),
    priceSolPerAstrds: v.number(),
    priceUsdPerAstrds: v.number(),
    totalSupply: v.number(),
    pendingBuybackSol: v.number(),
    crankTxSignature: v.optional(v.string()),
  }).index("by_timestamp", ["timestamp"]),

  // ─── Earth 2089 tables ───────────────────────────────────────────────────

  earth_characters: defineTable({
    walletAddress: v.string(),
    name: v.string(),
    characterType: v.union(
      v.literal("HUMAN"),
      v.literal("CREATURE"),
      v.literal("NPC")
    ),
    gender: v.union(v.literal("MALE"), v.literal("FEMALE")),
    status: v.optional(v.string()),
    currentLocationId: v.string(),
    level: v.number(),
    health: v.number(),
    energy: v.number(),
    earth: v.number(),
    experience: v.optional(v.number()),
    currentVersion: v.number(),
    currentImageUrl: v.optional(v.string()),
    birthImageUrl: v.optional(v.string()),
    baseLayerFile: v.optional(v.string()),
    baseGender: v.optional(v.string()),
    nftAddress: v.optional(v.string()),
    tokenId: v.optional(v.string()),
    paymentSignature: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_location", ["currentLocationId"])
    .index("by_status", ["status"]),

  earth_characterImages: defineTable({
    characterId: v.string(),
    imageUrl: v.string(),
    version: v.number(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_character", ["characterId"]),

  earth_items: defineTable({
    legacyId: v.optional(v.string()),
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("CLOTHING"),
      v.literal("HAT"),
      v.literal("ACCESSORY"),
      v.literal("TOOL"),
      v.literal("CONSUMABLE"),
      v.literal("MATERIAL")
    ),
    rarity: v.union(
      v.literal("COMMON"),
      v.literal("UNCOMMON"),
      v.literal("RARE"),
      v.literal("EPIC"),
      v.literal("LEGENDARY")
    ),
    layerType: v.optional(
      v.union(
        v.literal("BACKGROUND"),
        v.literal("BASE"),
        v.literal("CLOTHING"),
        v.literal("HAT"),
        v.literal("FACE_COVERING"),
        v.literal("ACCESSORY"),
        v.literal("OUTERWEAR"),
        v.literal("FACE_ACCESSORY"),
        v.literal("HAIR")
      )
    ),
    layerFile: v.optional(v.string()),
    layerGender: v.optional(v.string()),
    layerOrder: v.optional(v.number()),
    baseLayerFile: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isVisual: v.optional(v.boolean()),
    hasGenderVariants: v.optional(v.boolean()),
    healthEffect: v.optional(v.number()),
    energyEffect: v.optional(v.number()),
    durability: v.optional(v.number()),
    compatibilityRules: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_category", ["category"]),

  earth_equipmentSlots: defineTable({
    legacyId: v.optional(v.string()),
    name: v.string(),
    category: v.optional(v.string()),
    layerType: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    unlockLevel: v.optional(v.number()),
    maxSlotsBase: v.optional(v.number()),
    maxSlotsPerLevel: v.optional(v.number()),
    maxSlotsTotal: v.optional(v.number()),
    sortOrder: v.optional(v.number()),
    createdAt: v.number(),
  }),

  earth_inventory: defineTable({
    characterId: v.string(),
    itemId: v.string(),
    quantity: v.number(),
    isEquipped: v.boolean(),
    equippedSlot: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    slotIndex: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_character", ["characterId"])
    .index("by_character_item", ["characterId", "itemId"])
    .index("by_character_equipped", ["characterId", "isEquipped"]),

  earth_locations: defineTable({
    legacyId: v.optional(v.string()),
    name: v.string(),
    description: v.string(),
    locationType: v.string(),
    chatScope: v.union(
      v.literal("LOCAL"),
      v.literal("REGIONAL"),
      v.literal("GLOBAL")
    ),
    difficulty: v.number(),
    hasChat: v.boolean(),
    hasMarket: v.boolean(),
    hasMining: v.boolean(),
    hasTravel: v.boolean(),
    hasExchange: v.boolean(),
    isPrivate: v.boolean(),
    playerCount: v.number(),
    parentLocationId: v.optional(v.string()),
    biome: v.optional(v.string()),
    territory: v.optional(v.string()),
    theme: v.optional(v.string()),
    lore: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    svgPathId: v.optional(v.string()),
    mapX: v.optional(v.number()),
    mapY: v.optional(v.number()),
    minLevel: v.optional(v.number()),
    entryCost: v.optional(v.number()),
    status: v.optional(v.string()),
    isExplored: v.optional(v.boolean()),
    welcomeMessage: v.optional(v.string()),
    lastActive: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["locationType"])
    .index("by_parent", ["parentLocationId"]),

  earth_locationResources: defineTable({
    legacyId: v.optional(v.string()),
    locationId: v.string(),
    itemId: v.string(),
    spawnRate: v.number(),
    difficulty: v.number(),
    maxPerDay: v.optional(v.number()),
  })
    .index("by_location", ["locationId"])
    .index("by_item", ["itemId"]),

  earth_marketListings: defineTable({
    legacyId: v.optional(v.string()),
    locationId: v.string(),
    itemId: v.string(),
    price: v.number(),
    quantity: v.number(),
    isSystemItem: v.boolean(),
    sellerId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_location", ["locationId"])
    .index("by_item", ["itemId"])
    .index("by_location_item", ["locationId", "itemId"]),

  earth_transactions: defineTable({
    characterId: v.string(),
    type: v.union(
      v.literal("MINT"),
      v.literal("MINE"),
      v.literal("BUY"),
      v.literal("SELL"),
      v.literal("TRAVEL"),
      v.literal("EQUIP"),
      v.literal("UNEQUIP"),
      v.literal("EXCHANGE"),
      v.literal("BRIDGE")
    ),
    description: v.string(),
    itemId: v.optional(v.string()),
    quantity: v.optional(v.number()),
    energyBurn: v.optional(v.number()),
    earthTxn: v.optional(v.string()),
    senderEarth: v.optional(v.string()),
    receiverEarth: v.optional(v.string()),
    fromVault: v.optional(v.string()),
    toVault: v.optional(v.string()),
    fromUnits: v.optional(v.number()),
    toUnits: v.optional(v.number()),
    exchangeFlux: v.optional(v.number()),
    onChainSignature: v.optional(v.string()),
    wastelandBlock: v.optional(v.number()),
    sequenceId: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_character", ["characterId"])
    .index("by_type", ["type"])
    .index("by_character_type", ["characterId", "type"]),

  earth_chatMessages: defineTable({
    characterId: v.string(),
    locationId: v.string(),
    message: v.string(),
    messageType: v.union(
      v.literal("CHAT"),
      v.literal("EMOTE"),
      v.literal("SYSTEM"),
      v.literal("WHISPER")
    ),
    isSystem: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_location", ["locationId"])
    .index("by_location_time", ["locationId", "createdAt"]),

  earth_stories: defineTable({
    title: v.string(),
    characterPath: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  earth_chapters: defineTable({
    storyId: v.string(),
    title: v.string(),
    chapterNumber: v.number(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_story", ["storyId"]),

  earth_events: defineTable({
    chapterId: v.string(),
    title: v.string(),
    description: v.string(),
    orderIndex: v.number(),
    createdAt: v.number(),
  }).index("by_chapter", ["chapterId"]),

  earth_choices: defineTable({
    eventId: v.string(),
    choiceKey: v.string(),
    text: v.string(),
    orderIndex: v.number(),
    createdAt: v.number(),
  }).index("by_event", ["eventId"]),

  earth_consequences: defineTable({
    choiceId: v.string(),
    consequenceData: v.any(),
    createdAt: v.number(),
  }).index("by_choice", ["choiceId"]),

  earth_storyFlags: defineTable({
    characterId: v.string(),
    flagName: v.string(),
    flagValue: v.optional(v.any()),
    storyId: v.optional(v.string()),
    chapterAcquired: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
    acquiredAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_character", ["characterId"])
    .index("by_character_flag", ["characterId", "flagName"]),

  earth_pendingPayments: defineTable({
    walletAddress: v.string(),
    treasuryWallet: v.string(),
    amount: v.number(),
    status: v.string(),
    expiresAt: v.number(),
    characterId: v.optional(v.string()),
    characterData: v.optional(v.any()),
    transactionSignature: v.optional(v.string()),
    amountReceived: v.optional(v.number()),
    nftAddress: v.optional(v.string()),
    nftMinted: v.optional(v.boolean()),
    memo: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    mintedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_status", ["status"]),

  earth_npcWallets: defineTable({
    characterId: v.string(),
    publicKey: v.string(),
    encryptedPrivateKey: v.string(),
    createdAt: v.number(),
  }).index("by_character", ["characterId"]),

  earth_experienceLogs: defineTable({
    characterId: v.string(),
    source: v.string(),
    experienceGained: v.number(),
    experienceTotal: v.number(),
    levelBefore: v.optional(v.number()),
    levelAfter: v.optional(v.number()),
    leveledUp: v.optional(v.boolean()),
    details: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_character", ["characterId"]),
});
