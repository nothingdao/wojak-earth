#!/usr/bin/env node
// npc-engine.js - Updated with location-aware chat system


import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Connection, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js'
import fs from 'fs'
import path from 'path'

// Import chat messages from separate file
import { LOCATION_CHAT_MESSAGES } from './chat-messages.js'

// wallet-manager.js - Minimal NPC wallet persistence
import { NPCWalletManager } from './wallet-manager.js'

// Load environment variables
dotenv.config()

// Load configuration from npc-config.json
let config = {}
const configPath = path.join(process.cwd(), 'npc-config.json')
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    console.log('📋 Loaded config from npc-config.json')
  } catch (error) {
    console.error('❌ Failed to load config file:', error.message)
    process.exit(1)
  }
} else {
  console.error('❌ npc-config.json not found!')
  process.exit(1)
}

console.log('⚙️ NPC Engine Configuration:')
console.log(`   - NPCs to spawn: ${config.npcCount}`)
console.log(`   - Personalities: ${config.personalities.join(', ')}`)
console.log(`   - Activity interval: ${config.activityInterval}ms`)
console.log(`   - Funding amount: ${config.fundingAmount} SOL`)
console.log(`   - Chat enabled: ${config.chat?.enabled ?? true}`)
console.log('')

const API_BASE = 'http://localhost:8888/.netlify/functions'

// Validate required environment variables
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('VITE_SUPABASE_URL:', !!process.env.VITE_SUPABASE_URL)
  console.error('VITE_SUPABASE_ANON_KEY:', !!process.env.VITE_SUPABASE_ANON_KEY)
  console.error('SERVER_KEYPAIR_SECRET:', !!process.env.SERVER_KEYPAIR_SECRET)
  process.exit(1)
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

// NPC Personalities
const PERSONALITIES = {
  casual: {
    preferences: { TRAVEL: 0.25, MINE: 0.25, BUY: 0.2, CHAT: 0.1, EQUIP: 0.1, USE_ITEM: 0.1 },
    activityDelay: config.activityInterval * 1.5
  },
  hardcore: {
    preferences: { MINE: 0.5, TRAVEL: 0.15, BUY: 0.1, EQUIP: 0.15, USE_ITEM: 0.05, CHAT: 0.05 },
    activityDelay: config.activityInterval * 0.8
  },
  social: {
    preferences: { TRAVEL: 0.25, BUY: 0.2, CHAT: 0.3, MINE: 0.1, EQUIP: 0.1, USE_ITEM: 0.05 },
    activityDelay: config.activityInterval * 1.2
  },
  merchant: {
    preferences: { BUY: 0.3, SELL: 0.25, TRAVEL: 0.2, EQUIP: 0.15, MINE: 0.05, CHAT: 0.05 },
    activityDelay: config.activityInterval * 1.0
  },
  explorer: {
    preferences: { TRAVEL: 0.4, MINE: 0.25, BUY: 0.15, EQUIP: 0.1, USE_ITEM: 0.05, CHAT: 0.05 },
    activityDelay: config.activityInterval * 0.9
  }
}

class NPCEngine {
  constructor() {
    this.npcs = new Map()
    this.locations = []
    this.connection = new Connection("https://api.devnet.solana.com", "confirmed")
    this.treasuryWallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.SERVER_KEYPAIR_SECRET)))
    this.config = config
    this.isRunning = false
    this.walletManager = new NPCWalletManager(supabase)
  }

  log(level, message, ...args) {
    if (!this.config.enableLogs) return

    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    const configLevel = levels[this.config.logLevel] || 1
    const messageLevel = levels[level] || 1

    if (messageLevel >= configLevel) {
      console.log(message, ...args)
    }
  }

  async start() {
    console.log('🤖 Starting NPC Engine...')
    console.log(`💰 Treasury: ${this.treasuryWallet.publicKey.toString()}`)

    await this.loadLocations()

    let resumedCount = 0

    // Resume existing NPCs first
    if (this.config.resumeExisting) {
      resumedCount = await this.resumeExistingNPCs()
      console.log(`🔄 Resumed ${resumedCount} existing NPCs`)
    }

    // Spawn new ones if needed
    const needed = this.config.npcCount - resumedCount
    console.log(`📊 Debug: resumedCount=${resumedCount}, npcCount=${this.config.npcCount}, needed=${needed}`)

    if (needed > 0) {
      console.log(`🆕 Spawning ${needed} new NPCs`)
      await this.spawnNPCs(needed)
    } else {
      console.log(`✅ No new NPCs needed`)
    }

    this.runLoop()
  }

  async resumeExistingNPCs() {
    console.log('🔄 Resuming existing NPCs...')

    const existingNPCs = await this.walletManager.getExistingNPCs()
    let resumed = 0

    for (const npcData of existingNPCs.slice(0, this.config.npcCount)) {
      const wallet = await this.walletManager.load(npcData.id)
      if (wallet) {
        // Get full character data including health, energy, coins, level
        const response = await fetch(`${API_BASE}/get-player-character?walletAddress=${wallet.publicKey.toString()}`)
        if (response.ok) {
          const characterData = await response.json()
          if (characterData.hasCharacter) {
            const character = characterData.character

            this.npcs.set(npcData.id, {
              ...character,  // Use full character data from API
              wallet: wallet,
              personality: npcData.personality || 'casual',
              nextActivity: Date.now() + 1000,
              lastActivity: null,
              activityTimeout: null
            })
            console.log(`✅ Resumed ${character.name} (Health: ${character.health}, Energy: ${character.energy}, Coins: ${character.coins})`)
            resumed++
          }
        } else {
          // Fallback to basic data if API fails
          this.npcs.set(npcData.id, {
            ...npcData,
            wallet: wallet,
            personality: npcData.personality || 'casual',
            health: 100,  // Default values
            energy: 100,
            coins: 0,
            level: 1,
            nextActivity: Date.now() + 1000,
            lastActivity: null,
            activityTimeout: null
          })
          console.log(`⚠️ Resumed ${npcData.name} with default stats`)
          resumed++
        }
      }
    }
    return resumed
  }


  // ===== OPTIONAL: ADD ACTIVITY LOGGING =====
  async doActivity(npc) {
    // Ensure npc has required fields
    if (typeof npc.health === 'undefined') npc.health = 100
    if (typeof npc.energy === 'undefined') npc.energy = 100
    if (typeof npc.coins === 'undefined') npc.coins = 0
    if (typeof npc.level === 'undefined') npc.level = 1

    // Check if health is too low for any activity
    if (npc.health < 5) {
      console.log(`💀 ${npc.name} critically injured (${npc.health} health) - cannot act`)
      return
    }

    if (npc.energy < this.config.energyRestThreshold) {
      await this.rest(npc)
      return
    }

    const personality = PERSONALITIES[npc.personality]
    const action = this.chooseAction(personality.preferences, npc)

    // Enhanced logging with more context
    const timestamp = new Date().toLocaleTimeString()
    const populationInfo = `${this.getActiveNPCCount()}/${this.npcs.size}`
    const energyInfo = `${npc.energy}E/${npc.health}H`

    console.log(`🎯 [${timestamp}] (${populationInfo}) ${npc.name} (${npc.personality}) ${energyInfo} → ${action}`)

    try {
      switch (action) {
        case 'MINE': await this.mine(npc); break
        case 'TRAVEL': await this.travel(npc); break
        case 'BUY': await this.buy(npc); break
        case 'CHAT': await this.chat(npc); break
        case 'EQUIP': await this.equip(npc); break
        case 'USE_ITEM': await this.useItem(npc); break
      }
    } catch (error) {
      this.log('error', `${npc.name} ${action} failed:`, error.message)
    }
  }

  async loadLocations() {
    const response = await fetch(`${API_BASE}/get-locations`)
    const data = await response.json()
    this.locations = data.locations || []
    console.log(`📍 Loaded ${this.locations.length} locations`)
  }

  async spawnNPCs(count = null) {
    const spawnCount = count || this.config.npcCount
    const personalities = this.config.personalities.filter(p => PERSONALITIES[p])

    for (let i = 0; i < spawnCount; i++) {
      const personality = personalities[i % personalities.length]
      await this.spawnNPC(personality, i + 1)
      if (i < spawnCount - 1) {
        await this.sleep(this.config.spawnDelay)
      }
    }
  }

  async spawnNPC(personalityType, id) {
    const npcWallet = Keypair.generate()
    const npcId = `npc_${Date.now()}_${id}`

    try {
      await this.fundWallet(npcWallet.publicKey, this.config.fundingAmount)

      const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE'
      console.log(`🎨 Generating ${gender} image for ${personalityType}_${id}...`)

      const imageResult = await this.callAPI('generate-character-image', {
        gender: gender,
        layerSelection: 'random'
      })

      console.log(`🖼️ Minting NFT for ${personalityType}_${id}...`)
      const mintResult = await this.mintNPCCharacter({
        walletAddress: npcWallet.publicKey.toString(),
        gender: gender,
        imageBlob: imageResult.imageBlob,
        selectedLayers: imageResult.selectedLayers,
        isNPC: true
      })

      // STORE the wallet securely
      await this.walletManager.store(mintResult.character.id, npcWallet)

      this.npcs.set(mintResult.character.id, {
        ...mintResult.character,
        wallet: npcWallet,
        personality: personalityType,
        nextActivity: Date.now() + PERSONALITIES[personalityType].activityDelay,
        lastActivity: null,
        activityTimeout: null // ADD THIS LINE
      })

      // If engine is already running, start this NPC's timer
      if (this.isRunning) {
        this.scheduleNextActivity(this.npcs.get(mintResult.character.id))
      }

      console.log(`👤 Spawned ${mintResult.character.name} at ${this.getLocationName(mintResult.character.currentLocationId)}`)

      console.log(`🔗 NFT: ${mintResult.nftAddress}`)

    } catch (error) {
      console.error(`Failed to spawn NPC ${personalityType}_${id}:`, error.message)
      throw error
    }
  }

  async mintNPCCharacter(npcData) {
    console.log('📤 Calling mint-nft with data:', {
      walletAddress: npcData.walletAddress,
      gender: npcData.gender,
      hasImageBlob: !!npcData.imageBlob,
      hasSelectedLayers: !!npcData.selectedLayers,
      isNPC: npcData.isNPC
    })

    const response = await fetch(`${API_BASE}/mint-nft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...npcData,
        paymentSignature: `npc_mint_${Date.now()}`
      })
    })

    console.log('📥 Mint response status:', response.status)

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ Mint-nft error details:', error)
      throw new Error(error.message || error.error || 'NFT minting failed')
    }

    const result = await response.json()
    console.log('✅ Mint-nft success:', {
      characterName: result.character?.name,
      nftAddress: result.nftAddress
    })

    return result
  }

  async fundWallet(publicKey, solAmount) {
    const lamports = solAmount * 1000000000
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.treasuryWallet.publicKey,
        toPubkey: publicKey,
        lamports
      })
    )
    await sendAndConfirmTransaction(this.connection, transaction, [this.treasuryWallet])
  }

  runLoop() {
    this.isRunning = true
    const populationCount = this.npcs.size
    const avgDelayMinutes = Math.round((this.config.globalActivityRate * populationCount) / 60000)

    console.log(`🎲 Starting population-based timing:`)
    console.log(`   📊 Population: ${populationCount} NPCs`)
    console.log(`   ⏱️  Average delay per NPC: ~${avgDelayMinutes} minutes`)
    console.log(`   🌍 Expected global activity: ~1 action every ${this.config.globalActivityRate / 1000}s`)

    // Start independent timers for each NPC
    for (const [id, npc] of this.npcs) {
      // Stagger initial startup over first 2 minutes to avoid burst
      const startupDelay = Math.random() * 120000 // 0-2 minutes

      setTimeout(() => {
        this.scheduleNextActivity(npc)
      }, startupDelay)
    }
  }

  scheduleNextActivity(npc) {
    if (!this.isRunning) return

    const personality = PERSONALITIES[npc.personality]
    const delay = personality.activityDelay * (0.5 + Math.random()) // Simple randomness

    npc.activityTimeout = setTimeout(async () => {
      await this.doActivity(npc)
      this.scheduleNextActivity(npc)
    }, delay)
  }

  calculateActivityDelay(npc) {
    const populationCount = this.npcs.size
    const globalRate = this.config.globalActivityRate || 45000 // 45 second default

    // Base delay scales with population
    const baseDelay = globalRate * populationCount

    console.log(`📊 Population: ${populationCount}, Base delay per NPC: ${Math.round(baseDelay / 60000)}m ${Math.round((baseDelay % 60000) / 1000)}s`)

    // Personality modifiers (some NPCs more/less active)
    const personalityMultipliers = {
      casual: 1.4,     // 40% slower - laid back
      hardcore: 0.7,   // 30% faster - always active
      social: 0.9,     // 10% faster - likes activity
      merchant: 0.8,   // 20% faster - business focused
      explorer: 1.2    // 20% slower - takes time to explore
    }

    const personalityMultiplier = personalityMultipliers[npc.personality] || 1.0
    const personalityDelay = baseDelay * personalityMultiplier

    // Add randomness (±variance%)
    const variance = this.config.activityVariance || 0.4
    const randomMultiplier = 1 + (Math.random() - 0.5) * variance // 0.6 to 1.4 with 40% variance

    const finalDelay = personalityDelay * randomMultiplier

    // Minimum delay (don't let it get too fast)
    const minDelay = 30000 // 30 seconds minimum

    return Math.max(minDelay, finalDelay)
  }

  stop() {
    this.isRunning = false

    // Clear all individual NPC timers
    for (const [id, npc] of this.npcs) {
      if (npc.activityTimeout) {
        clearTimeout(npc.activityTimeout)
        npc.activityTimeout = null
      }
    }

    this.log('info', '⏹️ NPC Engine stopped - all timers cleared')
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getActiveNPCCount() {
    // Count NPCs that aren't resting
    let activeCount = 0
    for (const [id, npc] of this.npcs) {
      if (npc.energy >= this.config.energyRestThreshold) {
        activeCount++
      }
    }
    return activeCount
  }


  async rest(npc) {
    this.log('debug', `😴 ${npc.name} is resting (${npc.energy}/100 energy)`)
    npc.energy = Math.min(100, npc.energy + this.config.restEnergyGain)

    await supabase
      .from('characters')
      .update({ energy: npc.energy })
      .eq('id', npc.id)
  }

  chooseAction(preferences, npc) {
    const rand = Math.random()
    let cumulative = 0

    // Modify preferences based on health (with null check)
    const adjustedPreferences = { ...preferences }
    const npcHealth = npc.health || 100  // Default to 100 if undefined
    const npcEnergy = npc.energy || 100  // Default to 100 if undefined

    // Low health - avoid risky activities
    if (npcHealth < 30) {
      adjustedPreferences.MINE *= 0.3  // Mining can cause health loss
      adjustedPreferences.TRAVEL *= 0.2 // Travel costs health
      adjustedPreferences.USE_ITEM *= 3.0 // Prioritize healing items
      adjustedPreferences.CHAT *= 1.5  // Safe activity

      console.log(`❤️ ${npc.name} low health (${npcHealth}) - avoiding risky activities`)
    }

    // Critical health - only use items or rest
    if (npcHealth < 10) {
      return Math.random() > 0.5 ? 'USE_ITEM' : 'REST'
    }

    // Normalize adjusted preferences
    const total = Object.values(adjustedPreferences).reduce((sum, val) => sum + val, 0)
    for (const [action, weight] of Object.entries(adjustedPreferences)) {
      cumulative += weight / total
      if (rand <= cumulative) return action
    }

    return 'MINE'
  }

  async mine(npc) {
    const result = await this.callAPI('mine-action', { walletAddress: npc.walletAddress })
    npc.energy = result.newEnergyLevel
    if (result.foundItem) {
      console.log(`⛏️  ${npc.name} found ${result.foundItem.name}`)
    }
    npc.lastActivity = 'MINING'
  }

  async travel(npc) {
    const availableDestinations = this.locations.filter(loc => {
      if (loc.id === npc.currentLocationId) return false

      // Check level requirement
      if (loc.minLevel && npc.level < loc.minLevel) {
        // we give the npcs a list of accessible places isntead of having them cycle through all locations and jam up the logs
        // console.log(`🚫 ${npc.name} (Level ${npc.level}) cannot access ${loc.name} (Level ${loc.minLevel} required)`)
        return false
      }

      // Check entry cost
      if (loc.entryCost && npc.coins < loc.entryCost) {
        console.log(`💸 ${npc.name} cannot afford ${loc.name} (${loc.entryCost} coins, has ${npc.coins})`)
        return false
      }

      // Check if private
      if (loc.isPrivate) {
        // we give the npcs a list of accessible places isntead of having them cycle through all locations and jam up the logs
        // console.log(`🔒 ${npc.name} cannot access private location ${loc.name}`)
        return false
      }

      return true
    })

    if (availableDestinations.length === 0) {
      console.log(`🚧 ${npc.name} has no available destinations`)
      return
    }

    const destination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)]

    try {
      await this.callAPI('travel-action', {
        walletAddress: npc.walletAddress,
        destinationId: destination.id
      })

      npc.currentLocationId = destination.id

      // Log successful travel with costs
      if (destination.entryCost) {
        npc.coins -= destination.entryCost
        console.log(`🚶 ${npc.name} → ${destination.name} (paid ${destination.entryCost} coins)`)
      } else {
        console.log(`🚶 ${npc.name} → ${destination.name}`)
      }

      npc.lastActivity = 'TRAVEL'
    } catch (error) {
      console.log(`🚫 ${npc.name} travel blocked: ${error.message}`)
    }
  }

  async buy(npc) {
    const response = await fetch(`${API_BASE}/get-market?locationId=${npc.currentLocationId}`)
    const market = await response.json()

    if (market.items?.length) {
      const affordable = market.items.filter(item => item.price <= npc.coins)
      if (affordable.length) {
        const item = affordable[Math.floor(Math.random() * affordable.length)]
        await this.callAPI('buy-item', {
          walletAddress: npc.walletAddress,
          marketListingId: item.id
        })
        npc.coins -= item.price
        console.log(`💰 ${npc.name} bought ${item.item.name}`)
        npc.lastActivity = 'BUY'
      }
    }
  }

  async chat(npc) {
    // Skip chat if disabled in config
    if (this.config.chat && !this.config.chat.enabled) {
      return
    }

    let messagePool = LOCATION_CHAT_MESSAGES.default
    let context = 'default'

    // Priority 1: Check energy state
    if (npc.energy < this.config.energyRestThreshold) {
      messagePool = LOCATION_CHAT_MESSAGES.low_energy
      context = 'low_energy'
    }
    // Priority 2: Check recent activity
    else if (npc.lastActivity) {
      const activityKey = `after_${npc.lastActivity.toLowerCase()}`
      if (LOCATION_CHAT_MESSAGES[activityKey]) {
        messagePool = LOCATION_CHAT_MESSAGES[activityKey]
        context = activityKey
      }
    }
    // Priority 3: Use location biome
    else {
      const location = this.locations.find(loc => loc.id === npc.currentLocationId)
      if (location?.biome && LOCATION_CHAT_MESSAGES[location.biome]) {
        messagePool = LOCATION_CHAT_MESSAGES[location.biome]
        context = location.biome
      }
    }

    // Pick random message from selected pool
    const message = messagePool[Math.floor(Math.random() * messagePool.length)]

    await this.callAPI('send-message', {
      walletAddress: npc.walletAddress,
      locationId: npc.currentLocationId,
      message,
      messageType: 'CHAT'
    })

    if (this.config.chat?.showContext) {
      console.log(`💬 ${npc.name}: "${message}" (${context})`)
    } else {
      console.log(`💬 ${npc.name}: "${message}"`)
    }

    // Clear activity tracking for next time
    npc.lastActivity = null
  }

  async equip(npc) {
    // Get current inventory state - need to refresh from database
    const inventoryResponse = await fetch(`${API_BASE}/get-player-character?walletAddress=${npc.walletAddress}`)
    if (!inventoryResponse.ok) return

    const characterData = await inventoryResponse.json()
    if (!characterData.hasCharacter) return

    const inventory = characterData.character.inventory || []

    // Find items that can be equipped/unequipped
    const unequippedItems = inventory.filter(item =>
      !item.isEquipped &&
      item.item.category !== 'MATERIAL' &&
      item.item.category !== 'CONSUMABLE' &&
      item.quantity > 0
    )

    const equippedItems = inventory.filter(item => item.isEquipped)

    // Decide whether to equip or unequip (70% equip, 30% unequip)
    const shouldEquip = Math.random() > 0.3 && unequippedItems.length > 0

    if (shouldEquip) {
      // Equip a random unequipped item
      const item = unequippedItems[Math.floor(Math.random() * unequippedItems.length)]

      await this.callAPI('equip-item', {
        walletAddress: npc.walletAddress,
        inventoryId: item.id,
        equip: true,
        setPrimary: Math.random() > 0.7 // 30% chance to set as primary
      })

      console.log(`⚔️ ${npc.name} equipped ${item.item.name} (${item.item.category})`)
    } else if (equippedItems.length > 0) {
      // Unequip a random equipped item
      const item = equippedItems[Math.floor(Math.random() * equippedItems.length)]

      await this.callAPI('equip-item', {
        walletAddress: npc.walletAddress,
        inventoryId: item.id,
        equip: false
      })

      console.log(`🎒 ${npc.name} unequipped ${item.item.name}`)
    }

    npc.lastActivity = 'EQUIP'
  }

  async useItem(npc) {
    const inventoryResponse = await fetch(`${API_BASE}/get-player-character?walletAddress=${npc.walletAddress}`)
    if (!inventoryResponse.ok) return

    const characterData = await inventoryResponse.json()
    if (!characterData.hasCharacter) return

    const character = characterData.character
    const inventory = character.inventory || []

    const consumables = inventory.filter(item =>
      item.item.category === 'CONSUMABLE' &&
      item.quantity > 0
    )

    if (!consumables.length) return

    let targetItem = null
    let reason = ''

    // CRITICAL HEALTH - highest priority
    if (character.health < 20) {
      targetItem = consumables.find(item => (item.item.healthEffect || 0) > 0)
      if (targetItem) {
        reason = `CRITICAL HEALTH (${character.health}/100)`
        console.log(`🚨 ${npc.name} ${reason}`)
      }
    }

    // Low energy - second priority
    if (!targetItem && character.energy < 30) {
      targetItem = consumables.find(item => (item.item.energyEffect || 0) > 0)
      if (targetItem) {
        reason = `LOW ENERGY (${character.energy}/100)`
      }
    }

    // Moderate health - third priority
    if (!targetItem && character.health < 60) {
      targetItem = consumables.find(item => (item.item.healthEffect || 0) > 0)
      if (targetItem) {
        reason = `HEALTH MAINTENANCE (${character.health}/100)`
      }
    }

    // Random use if no urgent need
    if (!targetItem) {
      targetItem = consumables[Math.floor(Math.random() * consumables.length)]
      reason = 'ROUTINE USE'
    }

    await this.callAPI('use-item', {
      walletAddress: npc.walletAddress,
      inventoryId: targetItem.id
    })

    const effects = []
    if (targetItem.item.energyEffect) effects.push(`+${targetItem.item.energyEffect} energy`)
    if (targetItem.item.healthEffect) effects.push(`+${targetItem.item.healthEffect} health`)

    console.log(`🍎 ${npc.name} used ${targetItem.item.name} [${reason}]${effects.length ? ` (${effects.join(', ')})` : ''}`)
    npc.lastActivity = 'USE_ITEM'
  }

  async callAPI(endpoint, payload) {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    // Enhanced XP logging
    if (result.experienceGained) {
      const npc = Array.from(this.npcs.values()).find(n => n.walletAddress === payload.walletAddress)

      if (result.leveledUp) {
        console.log(`🎉 LEVEL UP! ${npc?.name} reached Level ${result.newLevel}! (${result.totalExperience} total XP)`)
      } else if (result.xpNeededForNext) {
        console.log(`🌟 ${npc?.name} gained ${result.experienceGained} XP (${result.xpNeededForNext} XP to level ${result.newLevel + 1})`)

        if (result.missingAchievements?.length) {
          console.log(`🎯 ${npc?.name} needs: ${result.missingAchievements.join(', ')}`)
        }
      }
    }

    return result
  }

  getRandomLocation(excludeId) {
    const available = this.locations.filter(loc => loc.id !== excludeId)
    return available[Math.floor(Math.random() * available.length)]
  }

  getLocationName(locationId) {
    return this.locations.find(loc => loc.id === locationId)?.name || 'Unknown'
  }
}

const engine = new NPCEngine()
engine.start().catch(console.error)

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...')
  process.exit(0)
})



