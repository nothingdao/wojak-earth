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
  coins: number
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
  coins: number
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
  // SUPER AGGRESSIVE EXCHANGE TESTING MODE
  DEFAULT_NPC_COUNT: 4, // Default NPC count
  BASE_ACTIVITY_INTERVAL: 45000, // 45 seconds base interval
  ACTIVITY_VARIANCE: 0.4, // 40% variance
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
    console.log('')

    rl.question('Choose mode (1-8): ', (answer) => {
      const modes: Record<string, { type: string | null; name: string }> = {
        '1': { type: null, name: 'Normal (mixed activities)' },
        '2': { type: 'EXCHANGE', name: 'Exchange only' },
        '3': { type: 'MINE', name: 'Mining only' },
        '4': { type: 'TRAVEL', name: 'Travel only' },
        '5': { type: 'TRADE', name: 'Trading only (BUY/SELL)' },
        '6': { type: 'CHAT', name: 'Chat only' },
        '7': { type: 'EQUIP', name: 'Equipment only' },
        '8': { type: 'USE_ITEM', name: 'Survival only' },
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
                coins: character.coins,
                location: character.current_location_id,
                personality: npcData.personality || 'neutral',
                wallet: wallet,
                activityTimeout: null,
              })

              console.log(
                `✅ Resumed ${character.name} (${character.health}H ${character.energy}E ${character.coins}C)`
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
    console.log('📤 Calling mint-nft with data:', {
      wallet_address: npcData.wallet_address,
      gender: npcData.gender,
      hasImageBlob: !!npcData.imageBlob,
      isNPC: npcData.isNPC,
      hasPaymentSignature: !!npcData.paymentSignature,
    })

    const API_BASE = 'http://localhost:8888/.netlify/functions'
    const response = await fetch(`${API_BASE}/mint-nft`, {
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
      const fileName = `wojak-${characterId}.png`
      const { error } = await this.walletManager.supabase.storage
        .from('wojaks')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true,
        })

      if (error) throw error

      // Get public URL
      const {
        data: { publicUrl },
      } = this.walletManager.supabase.storage
        .from('wojaks')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Failed to upload image:', error)
      // Return a fallback URL or throw depending on your needs
      return `https://sudufmmkfuawomvlrkha.supabase.co/storage/v1/object/public/wojaks/wojak-${characterId}.png`
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
        coins: mintResult.character.coins,
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
      // Get random location
      const randomLocation =
        this.locations[Math.floor(Math.random() * this.locations.length)]

      // Update NPC location
      npc.location = randomLocation.id

      // Select random activity based on personality
      const activities = [
        'mine',
        'travel',
        'buy',
        'sell',
        'chat',
        'equip',
        'use_item',
        'exchange',
      ]
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

  private async performMining(npc: NPC): Promise<void> {
    console.log(`NPC ${npc.id} is mining...`)
    await this.createTransaction(npc, 'MINE', 'Mining for resources')
  }

  private async performTravel(npc: NPC, location: Location): Promise<void> {
    console.log(`NPC ${npc.id} is traveling...`)
    await this.createTransaction(
      npc,
      'TRAVEL',
      'Traveling to a new location',
      location.id
    )
  }

  private async performBuy(npc: NPC): Promise<void> {
    if (npc.coins < 10) {
      console.log(`[BUY] NPC ${npc.id} too poor to buy (coins: ${npc.coins})`)
      return
    }

    const cost = Math.floor(Math.random() * 10) + 1
    npc.coins -= cost
    console.log(
      `[BUY] NPC ${npc.id} bought item for ${cost} coins (remaining: ${npc.coins})`
    )
    await this.createTransaction(
      npc,
      'BUY',
      `Bought item for ${cost} coins`,
      undefined,
      cost
    )
  }

  private async performSell(npc: NPC): Promise<void> {
    const reward = Math.floor(Math.random() * 10) + 1
    npc.coins += reward
    console.log(
      `[SELL] NPC ${npc.id} sold item for ${reward} coins (total: ${npc.coins})`
    )
    await this.createTransaction(
      npc,
      'SELL',
      `Sold item for ${reward} coins`,
      undefined,
      reward
    )
  }

  private async performChat(npc: NPC): Promise<void> {
    console.log(`NPC ${npc.id} is chatting...`)
    await this.createTransaction(npc, 'MINT', 'Chatting with other characters')
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
}

// Create and start the NPC engine
const engine = new NPCEngine()
engine.start().catch((error) => {
  console.error('Failed to start NPC engine:', error)
  process.exit(1)
})
