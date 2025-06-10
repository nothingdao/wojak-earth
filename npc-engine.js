#!/usr/bin/env node
// npc-engine.js - Complete rewrite with centralized configuration

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Connection, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js'
import readline from 'readline'

// Import centralized configuration
import gameConfig, {
  createNPCEngineConfig,
  calculateActivityDelay,
  NPC_PERSONALITIES
} from './src/config/gameConfig.js'

// Import supporting modules
import { LOCATION_CHAT_MESSAGES } from './chat-messages.js'
import { NPCWalletManager } from './wallet-manager.js'

dotenv.config()

// ===== CONFIGURATION =====
const config = createNPCEngineConfig({
  // Environment-specific overrides
  DEFAULT_NPC_COUNT: parseInt(process.env.NPC_COUNT) || 8,
  BASE_ACTIVITY_INTERVAL: parseInt(process.env.NPC_INTERVAL) || (process.env.NODE_ENV === 'development' ? 15000 : 45000),
  LOG_LEVEL: process.env.NPC_LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  ENABLE_LOGS: process.env.NPC_LOGS !== 'false',
  RESPAWN_ENABLED: process.env.NPC_RESPAWN !== 'false',
})

const API_BASE = 'http://localhost:8888/.netlify/functions'
let FORCE_ACTIVITY = null

console.log('🎮 NPC Engine Configuration:')
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`   NPCs: ${config.DEFAULT_NPC_COUNT}`)
console.log(`   Base Interval: ${config.BASE_ACTIVITY_INTERVAL}ms`)
console.log(`   Log Level: ${config.LOG_LEVEL}`)
console.log(`   Respawn: ${config.RESPAWN_ENABLED ? 'Enabled' : 'Disabled'}`)
console.log('')

// ===== ACTIVITY MODE SELECTION =====
async function selectActivityMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
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
      const modes = {
        '1': { type: null, name: 'Normal (mixed activities)' },
        '2': { type: 'EXCHANGE', name: 'Exchange only' },
        '3': { type: 'MINE', name: 'Mining only' },
        '4': { type: 'TRAVEL', name: 'Travel only' },
        '5': { type: 'TRADE', name: 'Trading only (BUY/SELL)' },
        '6': { type: 'CHAT', name: 'Chat only' },
        '7': { type: 'EQUIP', name: 'Equipment only' },
        '8': { type: 'USE_ITEM', name: 'Survival only' }
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
class NPCEngine {
  constructor() {
    this.npcs = new Map()
    this.locations = []
    this.connection = new Connection("https://api.devnet.solana.com", "confirmed")
    this.treasuryWallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.SERVER_KEYPAIR_SECRET)))
    this.config = config
    this.gameConfig = gameConfig
    this.isRunning = false
    this.walletManager = new NPCWalletManager(createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    ))

    // Performance tracking
    this.metrics = {
      totalActivities: 0,
      errors: 0,
      lastReportTime: Date.now()
    }
  }

  // ===== LOGGING =====
  log(level, message, ...args) {
    if (!this.config.ENABLE_LOGS) return

    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    const configLevel = levels[this.config.LOG_LEVEL] || 1
    const messageLevel = levels[level] || 1

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toLocaleTimeString()
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, ...args)
    }
  }

  // ===== POPULATION MANAGEMENT =====
  getActiveNPCCount() {
    return Array.from(this.npcs.values()).filter(npc =>
      !npc.isDead && npc.energy >= this.gameConfig.GAME_MECHANICS.ENERGY_REST_THRESHOLD
    ).length
  }

  getDeadNPCCount() {
    return Array.from(this.npcs.values()).filter(npc => npc.isDead).length
  }

  getPopulationStats() {
    const total = this.npcs.size
    const dead = this.getDeadNPCCount()
    const alive = total - dead
    const active = this.getActiveNPCCount()
    const resting = alive - active

    return { total, alive, dead, active, resting }
  }

  // ===== CORE ACTIVITY SYSTEM =====
  scheduleNextActivity(npc) {
    if (!this.isRunning || npc.isDead) return

    // Use intelligent delay calculation
    const delay = calculateActivityDelay(
      npc.personality,
      this.getActiveNPCCount(),
      this.config.BASE_ACTIVITY_INTERVAL
    )

    // Add configured variance
    const variance = 1 + (Math.random() - 0.5) * this.config.ACTIVITY_VARIANCE
    const finalDelay = Math.max(5000, delay * variance)

    this.log('debug', `⏰ ${npc.name} (${npc.personality}) next activity in ${Math.round(finalDelay / 1000)}s`)

    npc.activityTimeout = setTimeout(async () => {
      if (!npc.isDead) {
        await this.doActivity(npc)
        this.scheduleNextActivity(npc)
      }
    }, finalDelay)
  }

  async doActivity(npc) {
    const { MAX_HEALTH, MAX_ENERGY, ENERGY_REST_THRESHOLD } = this.gameConfig.GAME_MECHANICS

    // Ensure NPC has required stats
    npc.health = npc.health ?? MAX_HEALTH
    npc.energy = npc.energy ?? MAX_ENERGY
    npc.coins = npc.coins ?? this.gameConfig.GAME_MECHANICS.STARTING_COINS
    npc.level = npc.level ?? this.gameConfig.GAME_MECHANICS.STARTING_LEVEL

    // Death check
    if (npc.health <= 0) {
      await this.handleNPCDeath(npc)
      return
    }

    // Critical health - emergency healing only
    if (npc.health <= 5) {
      this.log('warn', `${npc.name} critically injured (${npc.health} health)`)
      const healed = await this.tryEmergencyHealing(npc)
      if (!healed) {
        npc.failedHealingAttempts = (npc.failedHealingAttempts || 0) + 1
        if (npc.failedHealingAttempts >= 3) {
          npc.health = 0
          this.log('error', `${npc.name} died from desperation`)
        }
      } else {
        npc.failedHealingAttempts = 0
      }
      return
    }

    // Low energy - rest first
    if (npc.energy < ENERGY_REST_THRESHOLD) {
      await this.rest(npc)
      return
    }

    // Choose and execute action
    const personality = NPC_PERSONALITIES[npc.personality]
    const action = this.chooseAction(personality.preferences, npc)

    const timestamp = new Date().toLocaleTimeString()
    const stats = this.getPopulationStats()
    const populationInfo = `${stats.active}/${stats.alive}/${stats.dead}`
    const energyInfo = `${npc.energy}E/${npc.health}H`

    this.log('info', `[${timestamp}] (${populationInfo}) ${npc.name} (${npc.personality}) ${energyInfo} -> ${action}${FORCE_ACTIVITY ? ' [FORCED]' : ''}`)

    try {
      await this.executeAction(npc, action)
      this.metrics.totalActivities++
    } catch (error) {
      this.log('error', `${npc.name} ${action} failed:`, error.message)
      this.metrics.errors++
    }
  }

  chooseAction(preferences, npc) {
    if (FORCE_ACTIVITY) {
      return FORCE_ACTIVITY === 'TRADE' ? (Math.random() > 0.5 ? 'BUY' : 'SELL') : FORCE_ACTIVITY
    }

    const { MAX_HEALTH } = this.gameConfig.GAME_MECHANICS
    const adjustedPreferences = { ...preferences }

    // Health-based adjustments
    if (npc.health <= 5) return 'USE_ITEM'

    if (npc.health < MAX_HEALTH * 0.3) {
      adjustedPreferences.MINE *= 0.1
      adjustedPreferences.TRAVEL *= 0.2
      adjustedPreferences.USE_ITEM *= 10.0
      adjustedPreferences.BUY *= 2.0
      adjustedPreferences.CHAT *= 2.0
      adjustedPreferences.EXCHANGE *= 0.2
    }

    // Choose action weighted by preferences
    const total = Object.values(adjustedPreferences).reduce((sum, val) => sum + val, 0)
    const rand = Math.random()
    let cumulative = 0

    for (const [action, weight] of Object.entries(adjustedPreferences)) {
      cumulative += weight / total
      if (rand <= cumulative) return action
    }

    return 'USE_ITEM'
  }

  async executeAction(npc, action) {
    switch (action) {
      case 'MINE': return await this.mine(npc)
      case 'TRAVEL': return await this.travel(npc)
      case 'BUY': return await this.buy(npc)
      case 'SELL': return await this.sell(npc)
      case 'CHAT': return await this.chat(npc)
      case 'EQUIP': return await this.equip(npc)
      case 'USE_ITEM': return await this.useItem(npc)
      case 'EXCHANGE': return await this.exchange(npc)
      default: throw new Error(`Unknown action: ${action}`)
    }
  }

  async rest(npc) {
    const { MAX_ENERGY } = this.gameConfig.GAME_MECHANICS
    const restGain = this.gameConfig.GAME_MECHANICS.REST_ENERGY_GAIN

    this.log('debug', `😴 ${npc.name} resting (${npc.energy}/${MAX_ENERGY} energy)`)

    npc.energy = Math.min(MAX_ENERGY, npc.energy + restGain)

    // Update in database
    await this.updateNPCInDatabase(npc.id, { energy: npc.energy })
  }

  // ===== ACTION IMPLEMENTATIONS =====
  async mine(npc) {
    const result = await this.callAPI('mine-action', {
      wallet_address: npc.wallet_address
    })

    npc.energy = result.newEnergyLevel
    if (result.newHealthLevel !== undefined) {
      npc.health = result.newHealthLevel
    }

    if (result.foundItem) {
      this.log('info', `⛏️ ${npc.name} found ${result.foundItem.name} (${result.foundItem.rarity})`)
    }

    npc.lastActivity = 'MINING'
  }

  async travel(npc) {
    const availableDestinations = this.locations.filter(loc => {
      return loc.id !== npc.current_location_id &&
        (!loc.min_level || npc.level >= loc.min_level) &&
        (!loc.entry_cost || npc.coins >= loc.entry_cost) &&
        !loc.is_private
    })

    if (availableDestinations.length === 0) {
      this.log('debug', `${npc.name} has no available destinations`)
      return
    }

    const destination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)]

    await this.callAPI('travel-action', {
      wallet_address: npc.wallet_address,
      destinationId: destination.id
    })

    await this.refreshNPCData(npc)

    this.log('info', `🚶 ${npc.name} traveled to ${destination.name}`)
    npc.lastActivity = 'TRAVEL'
  }

  async buy(npc) {
    const response = await fetch(`${API_BASE}/get-market?location_id=${npc.current_location_id}`)
    const market = await response.json()

    if (market.items?.length) {
      const affordable = market.items.filter(item => item.price <= npc.coins && item.quantity > 0)
      if (affordable.length) {
        const item = affordable[Math.floor(Math.random() * affordable.length)]

        const buyResult = await this.callAPI('buy-item', {
          wallet_address: npc.wallet_address,
          marketListingId: item.id
        })

        if (buyResult.success) {
          await this.refreshNPCData(npc)
          this.log('info', `💰 ${npc.name} bought ${item.item.name} for ${item.price} coins`)
        }
      }
    }
    npc.lastActivity = 'BUY'
  }

  async sell(npc) {
    const inventoryResponse = await fetch(`${API_BASE}/get-player-character?wallet_address=${npc.wallet_address}`)
    if (!inventoryResponse.ok) return

    const characterData = await inventoryResponse.json()
    if (!characterData.hasCharacter) return

    const inventory = characterData.character.inventory || []
    const sellableItems = inventory.filter(item =>
      !item.is_equipped &&
      item.quantity > 0 &&
      this.shouldSellItem(item, npc)
    )

    if (sellableItems.length === 0) return

    const itemToSell = sellableItems[Math.floor(Math.random() * sellableItems.length)]
    const quantityToSell = Math.min(itemToSell.quantity, Math.ceil(Math.random() * 3))

    const sellResult = await this.callAPI('sell-item', {
      wallet_address: npc.wallet_address,
      inventoryId: itemToSell.id,
      quantity: quantityToSell
    })

    if (sellResult.success) {
      await this.refreshNPCData(npc)
      this.log('info', `💰 ${npc.name} sold ${quantityToSell}x ${itemToSell.item.name} for ${sellResult.sale.sellPrice} coins`)
    }

    npc.lastActivity = 'SELL'
  }

  async chat(npc) {
    if (!this.config.CHAT_CONFIG.enabled) return

    let messagePool = LOCATION_CHAT_MESSAGES.default
    let context = 'default'

    // Choose message context
    if (npc.energy < this.gameConfig.GAME_MECHANICS.ENERGY_REST_THRESHOLD) {
      messagePool = LOCATION_CHAT_MESSAGES.low_energy
      context = 'low_energy'
    } else if (npc.lastActivity) {
      const activityKey = `after_${npc.lastActivity.toLowerCase()}`
      if (LOCATION_CHAT_MESSAGES[activityKey]) {
        messagePool = LOCATION_CHAT_MESSAGES[activityKey]
        context = activityKey
      }
    }

    const message = messagePool[Math.floor(Math.random() * messagePool.length)]

    await this.callAPI('send-message', {
      wallet_address: npc.wallet_address,
      location_id: npc.current_location_id,
      message,
      message_type: 'CHAT'
    })

    if (this.config.CHAT_CONFIG.showContext) {
      this.log('info', `💬 ${npc.name}: "${message}" (${context})`)
    } else {
      this.log('info', `💬 ${npc.name}: "${message}"`)
    }

    npc.lastActivity = null
  }

  async equip(npc) {
    const inventoryResponse = await fetch(`${API_BASE}/get-player-character?wallet_address=${npc.wallet_address}`)
    if (!inventoryResponse.ok) return

    const characterData = await inventoryResponse.json()
    if (!characterData.hasCharacter) return

    const inventory = characterData.character.inventory || []
    const unequippedItems = inventory.filter(item =>
      !item.is_equipped &&
      item.item.category !== 'MATERIAL' &&
      item.item.category !== 'CONSUMABLE' &&
      item.quantity > 0
    )

    if (unequippedItems.length > 0 && Math.random() > 0.3) {
      const item = unequippedItems[Math.floor(Math.random() * unequippedItems.length)]

      await this.callAPI('equip-item', {
        wallet_address: npc.wallet_address,
        inventoryId: item.id,
        equip: true,
        setPrimary: Math.random() > 0.7
      })

      this.log('info', `⚔️ ${npc.name} equipped ${item.item.name}`)
    }

    npc.lastActivity = 'EQUIP'
  }

  async useItem(npc) {
    const inventoryResponse = await fetch(`${API_BASE}/get-player-character?wallet_address=${npc.wallet_address}`)
    if (!inventoryResponse.ok) return

    const characterData = await inventoryResponse.json()
    if (!characterData.hasCharacter) return

    const character = characterData.character
    const inventory = character.inventory || []
    const consumables = inventory.filter(item =>
      item.item.category === 'CONSUMABLE' && item.quantity > 0
    )

    if (!consumables.length) return

    let targetItem = null
    let reason = 'ROUTINE USE'

    // Smart item usage
    if (character.health < 20) {
      targetItem = consumables.find(item => (item.item.health_effect || 0) > 0)
      reason = 'CRITICAL HEALTH'
    } else if (character.energy < 30) {
      targetItem = consumables.find(item => (item.item.energy_effect || 0) > 0)
      reason = 'LOW ENERGY'
    } else if (character.health < 60) {
      targetItem = consumables.find(item => (item.item.health_effect || 0) > 0)
      reason = 'HEALTH MAINTENANCE'
    }

    if (!targetItem) {
      targetItem = consumables[Math.floor(Math.random() * consumables.length)]
    }

    await this.callAPI('use-item', {
      wallet_address: npc.wallet_address,
      inventoryId: targetItem.id
    })

    await this.refreshNPCData(npc)

    const effects = []
    if (targetItem.item.energy_effect) effects.push(`+${targetItem.item.energy_effect} energy`)
    if (targetItem.item.health_effect) effects.push(`+${targetItem.item.health_effect} health`)

    this.log('info', `🍎 ${npc.name} used ${targetItem.item.name} [${reason}] ${effects.length ? `(${effects.join(', ')})` : ''}`)
    npc.lastActivity = 'USE_ITEM'
  }

  async exchange(npc) {
    // Get exchange info
    const exchangeInfo = await this.getExchangeInfo()
    if (!exchangeInfo || !exchangeInfo.isActive) {
      this.log('debug', `💱 ${npc.name} skipping exchange - market closed`)
      return
    }

    const solPrice = exchangeInfo.solPrice
    const npcSOLBalance = await this.getSolBalance(npc.wallet.publicKey)
    const strategy = this.determineExchangeStrategy(npc, npcSOLBalance, solPrice, exchangeInfo)

    if (!strategy) {
      this.log('debug', `💱 ${npc.name} no profitable exchange opportunity`)
      return
    }

    const { action, amountUSD, reason } = strategy

    this.log('info', `💱 ${npc.name} attempting ${action} for $${amountUSD} [${reason}] at $${solPrice}/SOL`)

    const exchangeResult = await this.callAPI('npc-exchange', {
      wallet_address: npc.wallet_address,
      action: action,
      amountUSD: amountUSD,
      character_id: npc.id
    })

    if (exchangeResult.success) {
      await this.refreshNPCData(npc)

      if (action === 'BUY_SOL') {
        this.log('info', `💰 ${npc.name} bought ${exchangeResult.solReceived.toFixed(6)} SOL for $${amountUSD}`)
      } else {
        this.log('info', `💰 ${npc.name} sold ${exchangeResult.solSpent.toFixed(6)} SOL for $${amountUSD}`)
      }
    }

    npc.lastActivity = 'EXCHANGE'
  }

  // ===== HELPER METHODS =====
  shouldSellItem(item, npc) {
    const itemData = item.item

    // Don't sell healing items if low health/energy
    if (npc.health < 50 && itemData.health_effect > 0) return false
    if (npc.energy < 50 && itemData.energy_effect > 0) return false

    // Sell if broke
    if (npc.coins < 50) return true

    // Sell excess materials
    if (itemData.category === 'MATERIAL' && item.quantity > 3) return true

    return Math.random() < 0.3 // 30% chance to sell other items
  }

  determineExchangeStrategy(npc, npcSOLBalance, solPrice, exchangeInfo) {
    const strategies = []

    // Need SOL for transactions
    if (npcSOLBalance < 0.01 && npc.coins >= 5) {
      strategies.push({
        action: 'BUY_SOL',
        amountUSD: Math.min(10, Math.floor(npc.coins * 0.2)),
        reason: 'necessity',
        priority: 10
      })
    }

    // Need coins but have excess SOL
    if (npc.coins < 50 && npcSOLBalance > 0.05) {
      const maxSellUSD = Math.min(20, Math.floor(npcSOLBalance * solPrice * 0.3))
      if (maxSellUSD >= 5) {
        strategies.push({
          action: 'SELL_SOL',
          amountUSD: maxSellUSD,
          reason: 'liquidity',
          priority: 8
        })
      }
    }

    // Merchant portfolio balancing
    if (npc.personality === 'merchant' && npc.coins > 200) {
      const totalWealthUSD = npc.coins + (npcSOLBalance * solPrice)
      const solPercentage = (npcSOLBalance * solPrice) / totalWealthUSD

      if (solPercentage < 0.15 && npc.coins >= 30) {
        strategies.push({
          action: 'BUY_SOL',
          amountUSD: Math.min(30, Math.floor(npc.coins * 0.15)),
          reason: 'portfolio',
          priority: 6
        })
      } else if (solPercentage > 0.4) {
        strategies.push({
          action: 'SELL_SOL',
          amountUSD: Math.min(25, Math.floor((npcSOLBalance * solPrice) * 0.2)),
          reason: 'portfolio',
          priority: 6
        })
      }
    }

    return strategies.length > 0 ? strategies.sort((a, b) => b.priority - a.priority)[0] : null
  }

  async getExchangeInfo() {
    try {
      const response = await fetch(`${API_BASE}/get-exchange-info`)
      return response.ok ? await response.json() : null
    } catch (error) {
      return null
    }
  }

  async getSolBalance(publicKey) {
    try {
      const balance = await this.connection.getBalance(publicKey)
      return balance / 1000000000
    } catch (error) {
      return 0
    }
  }

  async tryEmergencyHealing(npc) {
    try {
      const inventoryResponse = await fetch(`${API_BASE}/get-player-character?wallet_address=${npc.wallet_address}`)
      if (!inventoryResponse.ok) return false

      const characterData = await inventoryResponse.json()
      if (!characterData.hasCharacter) return false

      const inventory = characterData.character.inventory || []
      const healingItems = inventory.filter(item =>
        item.item.category === 'CONSUMABLE' &&
        item.quantity > 0 &&
        (item.item.health_effect || 0) > 0
      )

      if (healingItems.length === 0) return false

      const bestHealingItem = healingItems.reduce((best, current) =>
        (current.item.health_effect || 0) > (best.item.health_effect || 0) ? current : best
      )

      await this.callAPI('use-item', {
        wallet_address: npc.wallet_address,
        inventoryId: bestHealingItem.id
      })

      await this.refreshNPCData(npc)
      this.log('info', `🩹 ${npc.name} used ${bestHealingItem.item.name} to survive`)
      return true

    } catch (error) {
      return false
    }
  }

  async handleNPCDeath(npc) {
    this.log('warn', `💀 ${npc.name} has died!`)

    npc.isDead = true
    npc.deathTime = Date.now()

    if (npc.activityTimeout) {
      clearTimeout(npc.activityTimeout)
      npc.activityTimeout = null
    }

    await this.updateNPCInDatabase(npc.id, { status: 'DEAD', health: 0 })

    if (this.config.RESPAWN_ENABLED) {
      this.scheduleRespawn(npc)
    }
  }

  scheduleRespawn(npc) {
    const respawnDelay = this.config.RESPAWN_DELAY_MINUTES * 60 * 1000

    this.log('info', `⏰ ${npc.name} will respawn in ${this.config.RESPAWN_DELAY_MINUTES} minutes`)

    setTimeout(async () => {
      await this.respawnNPC(npc)
    }, respawnDelay)
  }

  async respawnNPC(npc) {
    this.log('info', `🔄 Respawning ${npc.name}...`)

    const startingLocations = this.locations.filter(loc =>
      loc.difficulty <= 2 && !loc.is_private && (!loc.min_level || loc.min_level <= 1)
    )

    const respawnLocation = startingLocations.length > 0
      ? startingLocations[Math.floor(Math.random() * startingLocations.length)]
      : this.locations[0]

    const respawnHealth = 50
    const respawnEnergy = 75

    await this.updateNPCInDatabase(npc.id, {
      status: 'ACTIVE',
      health: respawnHealth,
      energy: respawnEnergy,
      current_location_id: respawnLocation.id
    })

    npc.isDead = false
    npc.health = respawnHealth
    npc.energy = respawnEnergy
    npc.current_location_id = respawnLocation.id
    npc.deathTime = null

    this.scheduleNextActivity(npc)
    this.log('info', `✨ ${npc.name} respawned at ${respawnLocation.name}`)
  }

  // ===== DATA MANAGEMENT =====
  async refreshNPCData(npc) {
    try {
      const response = await fetch(`${API_BASE}/get-player-character?wallet_address=${npc.wallet_address}`)
      if (response.ok) {
        const characterData = await response.json()
        if (characterData.hasCharacter) {
          const character = characterData.character
          npc.coins = character.coins
          npc.health = character.health
          npc.energy = character.energy
          npc.level = character.level
          npc.experience = character.experience
          npc.current_location_id = character.current_location_id
        }
      }
    } catch (error) {
      this.log('error', `Failed to refresh ${npc.name}:`, error.message)
    }
  }

  async updateNPCInDatabase(npcId, updates) {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
    await supabase.from('characters').update(updates).eq('id', npcId)
  }

  async callAPI(endpoint, payload) {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.message || result.error || `${endpoint} failed`)
    }

    return result
  }

  // ===== INITIALIZATION =====
  async loadLocations() {
    const response = await fetch(`${API_BASE}/get-locations`)
    const data = await response.json()
    this.locations = data.locations || []
    this.log('info', `📍 Loaded ${this.locations.length} locations`)
  }

  async resumeExistingNPCs() {
    this.log('info', '🔄 Resuming existing NPCs...')

    const existingNPCs = await this.walletManager.getExistingNPCs()
    let resumed = 0

    for (const npcData of existingNPCs.slice(0, this.config.DEFAULT_NPC_COUNT)) {
      const wallet = await this.walletManager.load(npcData.id)
      if (wallet) {
        const response = await fetch(`${API_BASE}/get-player-character?wallet_address=${wallet.publicKey.toString()}`)
        if (response.ok) {
          const characterData = await response.json()
          if (characterData.hasCharacter) {
            const character = characterData.character

            this.npcs.set(npcData.id, {
              ...character,
              wallet: wallet,
              personality: npcData.personality || 'casual',
              nextActivity: Date.now() + 1000,
              lastActivity: null,
              activityTimeout: null
            })

            this.log('info', `✅ Resumed ${character.name} (${character.health}H ${character.energy}E ${character.coins}C)`)
            resumed++
          }
        }
      }
    }
    return resumed
  }

  async spawnNPCs(count) {
    const personalities = this.config.AVAILABLE_PERSONALITIES || Object.keys(NPC_PERSONALITIES)

    for (let i = 0; i < count; i++) {
      const personality = personalities[i % personalities.length]
      await this.spawnNPC(personality, i + 1)

      if (i < count - 1) {
        await this.sleep(this.config.SPAWN_DELAY || 2000)
      }
    }
  }

  async spawnNPC(personalityType, id) {
    const npcWallet = Keypair.generate()
    const npcId = `npc_${Date.now()}_${id}`

    try {
      // Fund wallet
      await this.fundWallet(npcWallet.publicKey, this.config.FUNDING_AMOUNT)

      // Generate character image
      const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE'
      this.log('info', `🎨 Generating ${gender} image for ${personalityType}_${id}...`)

      const imageResult = await this.callAPI('generate-character-image', {
        gender: gender,
        layerSelection: 'random'
      })

      // Mint NFT character
      this.log('info', `🖼️ Minting NFT for ${personalityType}_${id}...`)
      const mintResult = await this.mintNPCCharacter({
        wallet_address: npcWallet.publicKey.toString(),
        gender: gender,
        imageBlob: imageResult.imageBlob,
        selectedLayers: imageResult.selectedLayers,
        isNPC: true
      })

      // Store wallet securely
      await this.walletManager.store(mintResult.character.id, npcWallet)

      // Add to NPCs map
      this.npcs.set(mintResult.character.id, {
        ...mintResult.character,
        wallet: npcWallet,
        personality: personalityType,
        nextActivity: Date.now() + NPC_PERSONALITIES[personalityType].activityDelayMultiplier * 1000,
        lastActivity: null,
        activityTimeout: null
      })

      // Start activity if engine is running
      if (this.isRunning) {
        this.scheduleNextActivity(this.npcs.get(mintResult.character.id))
      }

      this.log('info', `👤 Spawned ${mintResult.character.name} (${personalityType}) at ${this.getLocationName(mintResult.character.current_location_id)}`)
      this.log('info', `🔗 NFT: ${mintResult.nft_address}`)

    } catch (error) {
      this.log('error', `Failed to spawn NPC ${personalityType}_${id}:`, error.message)
      throw error
    }
  }

  async mintNPCCharacter(npcData) {
    this.log('debug', '📤 Calling mint-nft with data:', {
      wallet_address: npcData.wallet_address,
      gender: npcData.gender,
      hasImageBlob: !!npcData.imageBlob,
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

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`NFT minting failed: ${errorText}`)
    }

    const result = await response.json()
    this.log('info', '✅ NFT minted:', result.character?.name)
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

  getLocationName(location_id) {
    return this.locations.find(loc => loc.id === location_id)?.name || 'Unknown'
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ===== MAIN RUN LOOP =====
  runLoop() {
    this.isRunning = true
    const populationCount = this.npcs.size

    this.log('info', `🎲 Starting NPC Engine:`)
    this.log('info', `   📊 Population: ${populationCount} NPCs`)
    this.log('info', `   ⏰ Base interval: ${this.config.BASE_ACTIVITY_INTERVAL}ms`)
    this.log('info', `   📈 Variance: ${this.config.ACTIVITY_VARIANCE * 100}%`)
    this.log('info', `   💀 Death system: ${this.config.RESPAWN_ENABLED ? 'Enabled' : 'Disabled'}`)
    this.log('info', `   🔄 Respawn delay: ${this.config.RESPAWN_DELAY_MINUTES}min`)

    // Start staggered timers to prevent thundering herd
    let startupDelay = 0
    for (const [id, npc] of this.npcs) {
      if (!npc.isDead) {
        setTimeout(() => {
          this.scheduleNextActivity(npc)
        }, startupDelay)
        startupDelay += 2000 + Math.random() * 3000 // 2-5 second stagger
      }
    }

    // Status reporting
    const reportInterval = this.config.LOG_LEVEL === 'debug' ? 60000 : 300000 // 1min debug, 5min normal
    setInterval(() => {
      const stats = this.getPopulationStats()
      const efficiency = Math.round((stats.active / stats.total) * 100)
      const errorRate = Math.round((this.metrics.errors / Math.max(this.metrics.totalActivities, 1)) * 100)

      this.log('info', `[STATS] Pop: ${stats.active}/${stats.alive}/${stats.total} | Efficiency: ${efficiency}% | Errors: ${errorRate}% | Activities: ${this.metrics.totalActivities}`)

      // Reset metrics
      this.metrics.totalActivities = 0
      this.metrics.errors = 0
    }, reportInterval)
  }

  stop() {
    this.isRunning = false

    // Clear all NPC timers
    for (const [id, npc] of this.npcs) {
      if (npc.activityTimeout) {
        clearTimeout(npc.activityTimeout)
        npc.activityTimeout = null
      }
    }

    this.log('info', '⏹️ NPC Engine stopped')
  }

  // ===== MAIN START METHOD =====
  async start() {
    try {
      // Validate environment
      if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY || !process.env.SERVER_KEYPAIR_SECRET) {
        throw new Error('Missing required environment variables')
      }

      FORCE_ACTIVITY = await selectActivityMode()

      this.log('info', '[START] Starting NPC Engine...')
      this.log('info', `[TREASURY] ${this.treasuryWallet.publicKey.toString()}`)

      // Load game data
      await this.loadLocations()

      let resumedCount = 0

      // Resume existing NPCs if enabled
      if (this.config.RESUME_EXISTING) {
        resumedCount = await this.resumeExistingNPCs()
        this.log('info', `[RESUME] Resumed ${resumedCount} existing NPCs`)
      }

      // Spawn new NPCs if needed
      const needed = this.config.DEFAULT_NPC_COUNT - resumedCount
      if (needed > 0) {
        this.log('info', `[SPAWN] Spawning ${needed} new NPCs`)
        await this.spawnNPCs(needed)
      } else {
        this.log('info', `[INFO] No new NPCs needed`)
      }

      // Start the main loop
      this.runLoop()

      this.log('info', '✅ NPC Engine started successfully!')

    } catch (error) {
      this.log('error', '❌ Failed to start NPC Engine:', error.message)
      process.exit(1)
    }
  }
}

// ===== STARTUP =====
const engine = new NPCEngine()

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down NPC Engine...')
  engine.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🔄 Received SIGTERM, shutting down gracefully...')
  engine.stop()
  process.exit(0)
})

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error)
  engine.stop()
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
  engine.stop()
  process.exit(1)
})

// Start the engine
engine.start().catch(error => {
  console.error('💥 Failed to start engine:', error)
  process.exit(1)
})
