#!/usr/bin/env node
// npc-engine.ts - centralized configuration in gameConfig.ts

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import gameConfig, { createNPCEngineConfig } from './gameConfig.js'
import { NPCWalletManager } from './wallet-manager.js'
import readline from 'readline'
import crypto from 'crypto'
import dotenv from 'dotenv'
import supabase from './supabase.js'

// Load environment variables
dotenv.config()

// Transaction types from your schema
type TransactionType =
  | 'MINT'
  | 'MINE'
  | 'BUY'
  | 'SELL'
  | 'TRAVEL'
  | 'EQUIP'
  | 'UNEQUIP'
  | 'EXCHANGE'
  | 'BRIDGE'

// Define types for NPC and Location
interface NPC {
  id: string
  name: string
  health: number
  energy: number
  earth: number
  location: string
  personality: string
  wallet: Keypair
  activityTimeout: NodeJS.Timeout | null
}

interface Location {
  id: string
  name: string
  description: string
  type: string
  participants: string[]
}

interface ChatChannel {
  id: string
  name: string
  participants: string[]
}

interface CharacterImageResponse {
  imageBlob: Blob
  selectedLayers: Record<string, string>
}

interface CharacterData {
  id: string
  name: string
  health: number
  energy: number
  earth: number
  current_location_id: string
}

interface CharacterResponse {
  hasCharacter: boolean
  character: CharacterData
}

interface LocationsResponse {
  locations: Location[]
}

// ===== CONFIGURATION =====
const config = createNPCEngineConfig({
  // CHAT SWARM MODE - FAST CONVERGENCE
  DEFAULT_NPC_COUNT: 18, // Default NPC count
  BASE_ACTIVITY_INTERVAL: 5000, // 5 seconds for quick swarm testing
  ACTIVITY_VARIANCE: 0.1, // Low variance for predictable timing
  FUNDING_AMOUNT: 0.02, // SOL per NPC
  LOG_LEVEL: 'info',
  ENABLE_LOGS: true,
  RESPAWN_ENABLED: true,
  SPAWN_DELAY: 2000, // 2 seconds between spawns
})

console.log('🎮 NPC Engine Configuration:')
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`   NPCs: ${config.DEFAULT_NPC_COUNT}`)
console.log(`   Base Interval: ${config.BASE_ACTIVITY_INTERVAL}ms`)
console.log(`   Log Level: ${config.LOG_LEVEL}`)
console.log(`   Respawn: ${config.RESPAWN_ENABLED ? 'Enabled' : 'Disabled'}`)
console.log('')

// ===== ACTIVITY MODE SELECTION =====
async function selectActivityMode(): Promise<string | null> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    console.log('🎯 Select NPC Activity Mode:')
    console.log('1. Normal (mixed activities)')
    console.log('2. Exchange only')
    console.log('3. Mining only')
    console.log('4. Travel only')
    console.log('5. Trading only (BUY/SELL)')
    console.log('6. Chat only')
    console.log('7. Equipment only (EQUIP)')
    console.log('8. Survival only (USE_ITEM)')
    console.log('9. 🗣️ CHAT SWARM - All NPCs converge to one location and chat!')
    console.log('')

    rl.question('Choose mode (1-9): ', (answer) => {
      const modes: Record<string, { type: string | null; name: string }> = {
        '1': { type: null, name: 'Normal (mixed activities)' },
        '2': { type: 'EXCHANGE', name: 'Exchange only' },
        '3': { type: 'MINE', name: 'Mining only' },
        '4': { type: 'TRAVEL', name: 'Travel only' },
        '5': { type: 'TRADE', name: 'Trading only (BUY/SELL)' },
        '6': { type: 'CHAT', name: 'Chat only' },
        '7': { type: 'EQUIP', name: 'Equipment only' },
        '8': { type: 'USE_ITEM', name: 'Survival only' },
        '9': { type: 'CHAT_SWARM', name: '🗣️ Chat Swarm (NPCs converge and chat!)' },
      }

      const selected = modes[answer] || modes['1']
      console.log(`[MODE] Selected: ${selected.name}`)
      console.log('')

      rl.close()
      resolve(selected.type)
    })
  })
}

// ===== MAIN NPC ENGINE CLASS =====
export class NPCEngine {
  private npcs: Map<string, NPC>
  private locations: Location[]
  private connection: Connection
  private treasuryWallet: Keypair
  private config: ReturnType<typeof createNPCEngineConfig>
  private gameConfig: typeof gameConfig
  private isRunning: boolean
  private walletManager: NPCWalletManager
  private chatChannels: Map<string, ChatChannel>
  private metrics: {
    totalActivities: number
    errors: number
    lastReportTime: number
  }
  private currentActivityMode: string | null
  private swarmTargetLocation: string | null = null

  constructor() {
    this.npcs = new Map()
    this.locations = []
    this.connection = new Connection(
      'https://api.devnet.solana.com',
      'confirmed'
    )
    this.treasuryWallet = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.TREASURY_KEYPAIR_SECRET || '[]'))
    )
    this.config = config
    this.gameConfig = gameConfig
    this.isRunning = false
    this.walletManager = new NPCWalletManager(supabase)
    this.chatChannels = new Map()
    this.currentActivityMode = null

    // Performance tracking
    this.metrics = {
      totalActivities: 0,
      errors: 0,
      lastReportTime: Date.now(),
    }
  }

  public stop(): void {
    this.isRunning = false
    // Clear all NPC timers
    for (const [, npc] of this.npcs) {
      if (npc.activityTimeout) {
        clearTimeout(npc.activityTimeout)
        npc.activityTimeout = null
      }
    }
    console.log('⏹️ NPC Engine stopped')
  }

  public async start(): Promise<void> {
    try {
      // Validate environment
      if (
        !process.env.VITE_SUPABASE_URL ||
        !process.env.VITE_SUPABASE_ANON_KEY ||
        !process.env.TREASURY_KEYPAIR_SECRET
      ) {
        throw new Error('Missing required environment variables')
      }

      this.currentActivityMode = await selectActivityMode()

      console.log('[START] Starting NPC Engine...')
      console.log(`[TREASURY] ${this.treasuryWallet.publicKey.toString()}`)

      // Load game data
      await this.loadLocations()

      let resumedCount = 0

      // Resume existing NPCs if enabled
      if (this.config.RESUME_EXISTING) {
        resumedCount = await this.resumeExistingNPCs()
        console.log(`[RESUME] Resumed ${resumedCount} existing NPCs`)
      }

      // Spawn new NPCs if needed
      const needed = this.config.DEFAULT_NPC_COUNT - resumedCount
      if (needed > 0) {
        console.log(`[SPAWN] Spawning ${needed} new NPCs`)
        await this.spawnNPCs(needed)
      } else {
        console.log(`[INFO] No new NPCs needed`)
      }

      // Start the main loop
      this.runLoop()

      console.log('✅ NPC Engine started successfully!')
    } catch (error) {
      console.error(
        '❌ Failed to start NPC Engine:',
        error instanceof Error ? error.message : String(error)
      )
      process.exit(1)
    }
  }

  private async loadLocations(): Promise<void> {
    try {
      const API_BASE = 'http://localhost:8888/.netlify/functions'
      const response = await fetch(`${API_BASE}/get-locations`)
      const data = (await response.json()) as LocationsResponse
      this.locations = data.locations || []
      console.log(`📍 Loaded ${this.locations.length} locations`)
    } catch (error) {
      console.error('[ERROR] Failed to load locations:', error)
      throw error
    }
  }

  private async resumeExistingNPCs(): Promise<number> {
    try {
      console.log('🔄 Resuming existing NPCs...')

      const existingNPCs = await this.walletManager.getExistingNPCs()
      let resumed = 0

      for (const npcData of existingNPCs.slice(
        0,
        this.config.DEFAULT_NPC_COUNT
      )) {
        const wallet = await this.walletManager.load(npcData.id)
        if (wallet) {
          const API_BASE = 'http://localhost:8888/.netlify/functions'
          const response = await fetch(
            `${API_BASE}/get-player-character?wallet_address=${wallet.publicKey.toString()}`
          )
          if (response.ok) {
            const characterData = (await response.json()) as CharacterResponse
            if (characterData.hasCharacter) {
              const character = characterData.character

              this.npcs.set(npcData.id, {
                id: character.id,
                name: character.name,
                health: character.health,
                energy: character.energy,
                earth: character.earth,
                location: character.current_location_id,
                personality: npcData.personality || 'neutral',
                wallet: wallet,
                activityTimeout: null,
              })

              console.log(
                `✅ Resumed ${character.name} (${character.health}H ${character.energy}E ${character.earth}C)`
              )
              resumed++
            }
          }
        }
      }
      return resumed
    } catch (error) {
      console.error('[ERROR] Failed to resume NPCs:', error)
      return 0
    }
  }

  private async spawnNPCs(count: number): Promise<void> {
    const personalities = this.config.AVAILABLE_PERSONALITIES || [
      'neutral',
      'friendly',
      'aggressive',
      'greedy',
      'cautious',
    ]

    for (let i = 0; i < count; i++) {
      const personality = personalities[i % personalities.length]
      await this.spawnNPC(personality, i + 1)

      if (i < count - 1) {
        await this.sleep(this.config.SPAWN_DELAY || 2000)
      }
    }
  }

  private runLoop(): void {
    this.isRunning = true
    console.log('[LOOP] Starting main activity loop...')

    const processNPC = async (npc: NPC) => {
      if (!this.isRunning) return

      try {
        // Calculate next activity delay
        const delay =
          this.config.BASE_ACTIVITY_INTERVAL *
          (1 + (Math.random() * 2 - 1) * this.config.ACTIVITY_VARIANCE)

        // Schedule next activity
        npc.activityTimeout = setTimeout(async () => {
          if (!this.isRunning) return

          try {
            // Perform activity based on mode
            if (this.currentActivityMode === 'EXCHANGE') {
              await this.performExchange(npc)
            } else {
              await this.performRandomActivity(npc)
            }

            // Schedule next activity
            processNPC(npc)
          } catch (error) {
            console.error(`[ERROR] Activity failed for NPC ${npc.id}:`, error)
            this.metrics.errors++
          }
        }, delay)
      } catch (error) {
        console.error(`[ERROR] Failed to process NPC ${npc.id}:`, error)
        this.metrics.errors++
      }
    }

    // Start processing for all NPCs
    for (const npc of this.npcs.values()) {
      processNPC(npc)
    }

    // Start metrics reporting
    setInterval(() => {
      const now = Date.now()
      const elapsed = now - this.metrics.lastReportTime
      const rate = (this.metrics.totalActivities / elapsed) * 1000

      console.log(`
[METRICS] Performance Report:
  Active NPCs: ${this.npcs.size}
  Activities/min: ${(rate * 60).toFixed(2)}
  Error rate: ${(
    (this.metrics.errors / this.metrics.totalActivities) *
    100
  ).toFixed(2)}%
  Uptime: ${(elapsed / 1000 / 60).toFixed(1)} minutes
      `)
    }, 1000)
  }

  private async createTransaction(
    npc: NPC,
    type: TransactionType,
    description: string,
    item_id?: string,
    quantity?: number
  ): Promise<void> {
    try {
      const { error } = await this.walletManager.supabase
        .from('transactions')
        .insert({
          id: crypto.randomUUID(),
          character_id: npc.id,
          type,
          description,
          item_id,
          quantity,
          created_at: new Date().toISOString(),
        })

      if (error) throw error
    } catch (error) {
      console.error(
        `[ERROR] Failed to create transaction for NPC ${npc.id}:`,
        error
      )
    }
  }

  // ===== MISSING METHOD 1: API CALLER =====
  private async callAPI<T>(endpoint: string, payload: unknown): Promise<T> {
    const API_BASE = 'http://localhost:8888/.netlify/functions'
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.message || result.error || `${endpoint} failed`)
    }

    // Return result directly, not result.data
    return result as T
  }

  // ===== MISSING METHOD 2: WALLET FUNDING =====
  private async fundWallet(
    publicKey: PublicKey,
    solAmount: number
  ): Promise<string> {
    const lamports = solAmount * 1000000000
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.treasuryWallet.publicKey,
        toPubkey: publicKey,
        lamports,
      })
    )

    // Return the actual transaction signature
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.treasuryWallet]
    )

    console.log(
      `✅ Funded wallet with ${solAmount} SOL, signature: ${signature}`
    )
    return signature
  }

  // ===== MISSING METHOD 3: NFT CHARACTER MINTING =====
  private async mintNPCCharacter(npcData: {
    wallet_address: string
    gender: string
    imageBlob: Blob | string // Can be blob or base64 string
    selectedLayers: Record<string, string>
    isNPC: boolean
    paymentSignature?: string // Add optional payment signature
  }): Promise<{ character: CharacterData; nft_address: string }> {
    console.log('📤 Calling mint-npc-nft with data:', {
      wallet_address: npcData.wallet_address,
      gender: npcData.gender,
      hasImageBlob: !!npcData.imageBlob,
      isNPC: npcData.isNPC,
      hasPaymentSignature: !!npcData.paymentSignature,
    })

    const API_BASE = 'http://localhost:8888/.netlify/functions'
    const response = await fetch(`${API_BASE}/mint-npc-nft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: npcData.wallet_address,
        gender: npcData.gender,
        imageBlob: npcData.imageBlob,
        selectedLayers: npcData.selectedLayers,
        isNPC: npcData.isNPC,
        // Use real payment signature if provided, otherwise use timestamp
        paymentSignature: npcData.paymentSignature || `npc_mint_${Date.now()}`,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`NFT minting failed: ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ NFT minted:', result.character?.name)
    return result
  }

  private async uploadImageToSupabase(
    imageBlob: Blob | string,
    characterId: string
  ): Promise<string> {
    try {
      // Convert base64 to blob if needed
      let blob: Blob
      if (typeof imageBlob === 'string') {
        // Handle base64 data URLs
        const response = await fetch(imageBlob)
        blob = await response.blob()
      } else {
        blob = imageBlob
      }

      // Upload to Supabase storage
      const fileName = `player-${characterId}.png`
      const { error } = await this.walletManager.supabase.storage
        .from('players')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true,
        })

      if (error) throw error

      // Get public URL
      const {
        data: { publicUrl },
      } = this.walletManager.supabase.storage
        .from('players')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Failed to upload image:', error)
      // Return a fallback URL or throw depending on your needs
      return `https://jnqmbveckrymyyoddsuw.supabase.co/storage/v1/object/public/players/player-${characterId}.png`
    }
  }

  // ===== MISSING METHOD 4: PROPER NPC SPAWNING =====
  private async spawnNPC(personalityType: string, id: number): Promise<void> {
    const npcWallet = Keypair.generate()

    try {
      console.log(
        `[SPAWN] Starting spawn process for ${personalityType}_${id}...`
      )

      // Fund wallet FIRST and get the transaction signature
      console.log(`💰 Funding wallet for ${personalityType}_${id}...`)
      const fundingSignature = await this.fundWallet(
        npcWallet.publicKey,
        this.config.FUNDING_AMOUNT
      )

      // Generate character image
      const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE'
      console.log(
        `🎨 Generating ${gender} image for ${personalityType}_${id}...`
      )

      const imageResult = await this.callAPI<CharacterImageResponse>(
        'generate-character-image',
        {
          wallet_address: npcWallet.publicKey.toString(),
          gender: gender,
          layerSelection: 'random',
        }
      )

      // Mint NFT character with REAL payment signature
      console.log(`🖼️ Minting NFT for ${personalityType}_${id}...`)
      const mintResult = await this.mintNPCCharacter({
        wallet_address: npcWallet.publicKey.toString(),
        gender: gender,
        imageBlob: imageResult.imageBlob,
        selectedLayers: imageResult.selectedLayers,
        isNPC: true,
        paymentSignature: fundingSignature, // Use real transaction signature
      })

      // Store wallet securely
      console.log(`💾 Storing wallet for ${mintResult.character.name}...`)
      await this.walletManager.store(mintResult.character.id, npcWallet)

      // Add to NPCs map
      this.npcs.set(mintResult.character.id, {
        id: mintResult.character.id,
        name: mintResult.character.name,
        health: mintResult.character.health,
        energy: mintResult.character.energy,
        earth: mintResult.character.earth,
        location: mintResult.character.current_location_id,
        personality: personalityType,
        wallet: npcWallet,
        activityTimeout: null,
      })

      console.log(
        `✅ Successfully spawned ${mintResult.character.name} (${personalityType})`
      )
      console.log(`   📍 Location: ${mintResult.character.current_location_id}`)
      console.log(`   🔗 NFT: ${mintResult.nft_address}`)
      console.log(`   💰 Payment: ${fundingSignature}`)
    } catch (error) {
      console.error(`❌ Failed to spawn NPC ${personalityType}_${id}:`, error)
      throw error
    }
  }

  // ===== HELPER METHOD: SLEEP =====
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async performRandomActivity(npc: NPC): Promise<void> {
    try {
      // Check for special activity modes
      if (this.currentActivityMode === 'CHAT_SWARM') {
        await this.performChatSwarm(npc)
        return
      }

      // Get random location
      const randomLocation =
        this.locations[Math.floor(Math.random() * this.locations.length)]

      // Select random activity based on personality and mode
      let activities = []
      
      if (this.currentActivityMode === 'EXCHANGE') {
        activities = ['exchange']
      } else if (this.currentActivityMode === 'MINE') {
        activities = ['mine']
      } else if (this.currentActivityMode === 'TRAVEL') {
        activities = ['travel']
      } else if (this.currentActivityMode === 'TRADE') {
        activities = ['buy', 'sell']
      } else if (this.currentActivityMode === 'CHAT') {
        activities = ['chat']
      } else if (this.currentActivityMode === 'EQUIP') {
        activities = ['equip']
      } else if (this.currentActivityMode === 'USE_ITEM') {
        activities = ['use_item']
      } else {
        // Normal mode - all activities based on personality
        activities = this.getActivitiesForPersonality(npc.personality)
      }

      const activity = activities[Math.floor(Math.random() * activities.length)]

      // Perform activity
      switch (activity) {
        case 'mine':
          await this.performMining(npc)
          break
        case 'travel':
          await this.performTravel(npc, randomLocation)
          break
        case 'buy':
          await this.performBuy(npc)
          break
        case 'sell':
          await this.performSell(npc)
          break
        case 'chat':
          await this.performChat(npc)
          break
        case 'equip':
          await this.performEquip(npc)
          break
        case 'use_item':
          await this.performUseItem(npc)
          break
        case 'exchange':
          await this.performExchange(npc)
          break
      }

      this.metrics.totalActivities++
    } catch (error) {
      console.error(`[ERROR] Activity failed for NPC ${npc.id}:`, error)
      this.metrics.errors++
    }
  }

  private getActivitiesForPersonality(personality: string): string[] {
    switch (personality) {
      case 'aggressive':
        return ['mine', 'exchange', 'travel', 'chat', 'equip']
      case 'friendly':
        return ['chat', 'buy', 'sell', 'travel', 'use_item']
      case 'greedy':
        return ['exchange', 'buy', 'sell', 'mine']
      case 'cautious':
        return ['use_item', 'equip', 'chat', 'travel']
      default: // neutral
        return ['mine', 'travel', 'buy', 'sell', 'chat', 'equip', 'use_item', 'exchange']
    }
  }

  private async performMining(npc: NPC): Promise<void> {
    try {
      console.log(`⛏️ [MINE] ${npc.name} is mining...`)
      
      const response = await this.callAPI('mine-action', {
        wallet_address: npc.wallet.publicKey.toString(),
        location_id: npc.location
      })

      // Update local NPC state
      if (response.character) {
        npc.health = response.character.health
        npc.energy = response.character.energy
        npc.earth = response.character.earth
      }

      const itemsFound = response.items_found || []
      if (itemsFound.length > 0) {
        console.log(`✅ [MINE] ${npc.name} found ${itemsFound.length} items!`)
      } else {
        console.log(`✅ [MINE] ${npc.name} completed mining (no items found)`)
      }
    } catch (error) {
      console.error(`❌ [MINE] Failed for ${npc.name}:`, error)
      // Fallback to transaction record
      await this.createTransaction(npc, 'MINE', 'Mining for resources')
    }
  }

  private async performTravel(npc: NPC, location: Location): Promise<void> {
    // Skip if already at this location
    if (npc.location === location.id) {
      console.log(`🚶 [TRAVEL] ${npc.name} is already at ${location.name}`)
      return
    }

    try {
      console.log(`🚶 [TRAVEL] ${npc.name} traveling to ${location.name}...`)
      
      const response = await this.callAPI('travel-action', {
        wallet_address: npc.wallet.publicKey.toString(),
        destinationId: location.id
      })

      // Update local NPC state
      npc.location = location.id
      if (response.character) {
        npc.health = response.character.health
        npc.earth = response.character.earth
      }

      console.log(`✅ [TRAVEL] ${npc.name} arrived at ${location.name}`)
    } catch (error) {
      console.error(`❌ [TRAVEL] Failed for ${npc.name}:`, error)
      // Fallback to transaction record and update location
      await this.createTransaction(npc, 'TRAVEL', `Traveling to ${location.name}`, location.id)
      npc.location = location.id
    }
  }

  private async performBuy(npc: NPC): Promise<void> {
    if (npc.earth < 10) {
      console.log(`[BUY] NPC ${npc.id} too poor to buy (earth: ${npc.earth})`)
      return
    }

    const cost = Math.floor(Math.random() * 10) + 1
    npc.earth -= cost
    console.log(
      `[BUY] NPC ${npc.id} bought item for ${cost} earth (remaining: ${npc.earth})`
    )
    await this.createTransaction(
      npc,
      'BUY',
      `Bought item for ${cost} earth`,
      undefined,
      cost
    )
  }

  private async performSell(npc: NPC): Promise<void> {
    const reward = Math.floor(Math.random() * 10) + 1
    npc.earth += reward
    console.log(
      `[SELL] NPC ${npc.id} sold item for ${reward} earth (total: ${npc.earth})`
    )
    await this.createTransaction(
      npc,
      'SELL',
      `Sold item for ${reward} earth`,
      undefined,
      reward
    )
  }

  private async performChat(npc: NPC): Promise<void> {
    try {
      const message = this.generateChatMessage(npc)
      console.log(`💬 [CHAT] ${npc.name}: "${message}"`)
      
      await this.callAPI('send-message', {
        wallet_address: npc.wallet.publicKey.toString(),
        location_id: npc.location,
        content: message,
        message_type: 'CHAT'
      })

      console.log(`✅ [CHAT] ${npc.name} sent message`)
    } catch (error) {
      console.error(`❌ [CHAT] Failed for ${npc.name}:`, error)
      // Fallback to transaction record
      await this.createTransaction(npc, 'MINT', 'Chatting with other characters')
    }
  }

  private async performEquip(npc: NPC): Promise<void> {
    const items = ['pickaxe', 'helmet', 'boots', 'gloves', 'backpack']
    const item = items[Math.floor(Math.random() * items.length)]
    console.log(`[EQUIP] NPC ${npc.id} equipped ${item}`)
    await this.createTransaction(npc, 'EQUIP', `Equipped ${item}`, item)
  }

  private async performUseItem(npc: NPC): Promise<void> {
    if (npc.health < 50) {
      npc.health = Math.min(100, npc.health + 25)
      console.log(
        `[USE_ITEM] NPC ${npc.id} used health potion (health: ${npc.health})`
      )
      await this.createTransaction(
        npc,
        'MINT',
        `Used health potion (health: ${npc.health})`,
        'health_potion'
      )
    } else if (npc.energy < 30) {
      npc.energy = Math.min(100, npc.energy + 40)
      console.log(
        `[USE_ITEM] NPC ${npc.id} used energy potion (energy: ${npc.energy})`
      )
      await this.createTransaction(
        npc,
        'MINT',
        `Used energy potion (energy: ${npc.energy})`,
        'energy_potion'
      )
    } else {
      console.log(
        `[USE_ITEM] NPC ${npc.id} doesn't need to use any items right now`
      )
    }
  }

  private async performExchange(npc: NPC): Promise<void> {
    try {
      // Get random item to exchange
      const { data: items } = await this.walletManager.supabase
        .from('items')
        .select('*')
        .limit(1)
        .order('id', { ascending: false })
        .range(Math.floor(Math.random() * 100), Math.floor(Math.random() * 100))

      if (!items?.length) {
        console.log(`[EXCHANGE] No items available for NPC ${npc.id}`)
        return
      }

      const item = items[0]
      console.log(`[EXCHANGE] NPC ${npc.id} exchanging item ${item.name}`)
      await this.createTransaction(
        npc,
        'EXCHANGE',
        `Exchanging ${item.name}`,
        item.id
      )

      // TODO: Implement actual exchange logic with smart contract
      this.metrics.totalActivities++
    } catch (error) {
      console.error(`[ERROR] Exchange failed for NPC ${npc.id}:`, error)
      this.metrics.errors++
    }
  }

  // ===== CHAT SWARM MODE =====
  private async performChatSwarm(npc: NPC): Promise<void> {
    try {
      // Select swarm target location if not set
      if (!this.swarmTargetLocation) {
        this.swarmTargetLocation = await this.selectSwarmTarget()
        console.log(`🗣️ [SWARM] Target location set: ${this.swarmTargetLocation}`)
      }

      // If NPC is not at target location, travel there
      if (npc.location !== this.swarmTargetLocation) {
        console.log(`🚶 [SWARM] ${npc.name} traveling to swarm location...`)
        await this.performTravelToLocation(npc, this.swarmTargetLocation)
        return
      }

      // If at target location, chat
      await this.performSwarmChat(npc)
      this.metrics.totalActivities++
    } catch (error) {
      console.error(`[ERROR] Chat swarm failed for NPC ${npc.id}:`, error)
      this.metrics.errors++
    }
  }

  private async selectSwarmTarget(): Promise<string> {
    // For now, let's use central-exchange as the target
    const targetLocation = 'central-exchange'
    console.log(`🗣️ [SWARM] NPCs will converge at: Central Exchange (${targetLocation})`)
    console.log('🏛️ All NPCs heading to the financial district!')
    return targetLocation
  }

  private async performTravelToLocation(npc: NPC, targetLocationId: string): Promise<void> {
    try {
      console.log(`🚶 [TRAVEL] ${npc.name} traveling to ${targetLocationId}`)
      
      // Update the character's location directly in the database
      const { error } = await this.walletManager.supabase
        .from('characters')
        .update({ current_location_id: targetLocationId })
        .eq('wallet_address', npc.wallet.publicKey.toString())

      if (error) {
        console.error(`❌ [TRAVEL] Database update failed for ${npc.name}:`, error)
      } else {
        console.log(`✅ [TRAVEL] ${npc.name} arrived at ${targetLocationId}`)
      }

      // Update local NPC state regardless
      npc.location = targetLocationId
    } catch (error) {
      console.error(`❌ [TRAVEL] Failed for ${npc.name}:`, error)
      // If travel fails, just update location locally
      npc.location = targetLocationId
    }
  }

  private async performSwarmChat(npc: NPC): Promise<void> {
    try {
      const message = this.generateChatMessage(npc)
      
      console.log(`💬 [CHAT] ${npc.name}: "${message}"`)
      
      // Insert message directly into the database
      const { error } = await this.walletManager.supabase
        .from('chat_messages')
        .insert({
          id: crypto.randomUUID(),
          character_id: npc.id,
          location_id: npc.location,
          message: message,
          message_type: 'CHAT',
          is_system: false
        })

      if (error) {
        console.error(`❌ [CHAT] Database insert failed for ${npc.name}:`, error)
      } else {
        console.log(`✅ [CHAT] ${npc.name} sent message to database`)
      }
    } catch (error) {
      console.error(`❌ [CHAT] Failed for ${npc.name}:`, error)
    }
  }

  // ===== CHAT LIBRARY =====
  private generateChatMessage(npc: NPC): string {
    const messagesByPersonality = {
      aggressive: [
        "Anyone want to trade? I've got rare items!",
        "This place needs more action...",
        "Who's up for some mining? I know the best spots!",
        "I've been grinding all day, time to cash out!",
        "Looking for teammates for the next expedition!",
        "Market prices are terrible today... anyone selling cheap?",
        "This location is getting crowded...",
        "I heard there's good loot in the deeper zones!"
      ],
      friendly: [
        "Hello everyone! How's everyone doing today?",
        "Beautiful day to be exploring Earth-2089!",
        "Anyone new here? I can show you around!",
        "The community here is amazing, love meeting new people!",
        "Hope everyone's having good luck with their adventures!",
        "This is such a peaceful spot, great for chatting!",
        "Anyone need help with anything? Happy to assist!",
        "The sunset looks incredible from this location!"
      ],
      greedy: [
        "What's the current market rate for rare crystals?",
        "I'm buying quantum dust at premium prices!",
        "Anyone selling tools? I pay well for good equipment!",
        "Investment opportunities in the new zones look promising...",
        "Supply chain for energy potions is really tight lately...",
        "Made some good profits mining yesterday!",
        "Looking to corner the market on temporal fragments...",
        "The exchange rates today are absolutely terrible!"
      ],
      cautious: [
        "Is this area safe? Haven't seen any threats lately...",
        "Always check your equipment before heading into new zones.",
        "Health potions are essential, never travel without them.",
        "The radiation levels here seem acceptable...",
        "Anyone know the difficulty rating of the eastern territories?",
        "Better to travel in groups when exploring unknown areas.",
        "I always keep my energy above 50% just in case...",
        "Weather patterns look stable for the next few hours."
      ],
      neutral: [
        "Just passing through, checking out the local scene.",
        "Mining yields have been pretty consistent lately.",
        "Standard trade routes seem to be running smoothly.",
        "Regular maintenance on equipment is paying off.",
        "Population density here is about what I expected.",
        "Resource distribution seems fairly balanced in this zone.",
        "Transport costs are reasonable for this distance.",
        "Everything seems to be operating within normal parameters."
      ]
    }

    const generalMessages = [
      "Another day in the wasteland...",
      "Technology here is fascinating!",
      "The atmosphere has a unique quality to it.",
      "Interesting geological formations around here.",
      "Communication networks are working well today.",
      "The local economy seems to be thriving.",
      "Environmental conditions are quite stable.",
      "Infrastructure development is impressive!"
    ]

    const personalityMessages = messagesByPersonality[npc.personality] || messagesByPersonality.neutral
    const allMessages = [...personalityMessages, ...generalMessages]
    
    return allMessages[Math.floor(Math.random() * allMessages.length)]
  }
}

// Create and start the NPC engine
const engine = new NPCEngine()
engine.start().catch((error) => {
  console.error('Failed to start NPC engine:', error)
  process.exit(1)
})
