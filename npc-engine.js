#!/usr/bin/env node
// npc-engine.js - Updated with location-aware chat system


import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Connection, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

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
    console.log('[CONFIG] Loaded config from npc-config.json')
  } catch (error) {
    console.error('[ERROR] Failed to load config file:', error.message)
    process.exit(1)
  }
} else {
  console.error('[ERROR] npc-config.json not found!')
  process.exit(1)
}

console.log('[SETUP] NPC Engine Configuration:')
console.log(`   - NPCs to spawn: ${config.npcCount}`)
console.log(`   - Personalities: ${config.personalities.join(', ')}`)
console.log(`   - Activity interval: ${config.activityInterval}ms`)
console.log(`   - Funding amount: ${config.fundingAmount} SOL`)
console.log(`   - Chat enabled: ${config.chat?.enabled ?? true}`)
console.log('')


async function selectActivityMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    console.log('')
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

const API_BASE = 'http://localhost:8888/.netlify/functions'

// Validate required environment variables
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('[ERROR] Missing required environment variables:')
  console.error('VITE_SUPABASE_URL:', !!process.env.VITE_SUPABASE_URL)
  console.error('VITE_SUPABASE_ANON_KEY:', !!process.env.VITE_SUPABASE_ANON_KEY)
  console.error('SERVER_KEYPAIR_SECRET:', !!process.env.SERVER_KEYPAIR_SECRET)
  process.exit(1)
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

// ADD THIS LINE HERE:
let FORCE_ACTIVITY = null

// NPC Personalities
const PERSONALITIES = {
  casual: {
    preferences: {
      TRAVEL: 0.20, MINE: 0.20, BUY: 0.16, SELL: 0.07, CHAT: 0.09,
      EQUIP: 0.09, USE_ITEM: 0.07, EXCHANGE: 0.12 // Boosted for testing
    },
    activityDelay: config.activityInterval * 1.5
  },

  hardcore: {
    preferences: {
      MINE: 0.45, SELL: 0.15, TRAVEL: 0.13, BUY: 0.08,
      EQUIP: 0.14, USE_ITEM: 0.03, CHAT: 0.01, EXCHANGE: 0.01 // Focused on mining
    },
    activityDelay: config.activityInterval * 0.8
  },

  social: {
    preferences: {
      TRAVEL: 0.22, BUY: 0.18, CHAT: 0.28, SELL: 0.08,
      MINE: 0.09, EQUIP: 0.1, USE_ITEM: 0.03, EXCHANGE: 0.02
    },
    activityDelay: config.activityInterval * 1.2
  },

  merchant: {
    preferences: {
      BUY: 0.20, SELL: 0.23, TRAVEL: 0.16, EQUIP: 0.12,
      MINE: 0.08, CHAT: 0.02, USE_ITEM: 0.02, EXCHANGE: 0.17 // Much higher!
    },
    activityDelay: config.activityInterval * 1.0
  },

  explorer: {
    preferences: {
      TRAVEL: 0.33, MINE: 0.22, SELL: 0.12, BUY: 0.13,
      EQUIP: 0.1, USE_ITEM: 0.05, CHAT: 0.02, EXCHANGE: 0.03 // Need SOL for travel costs
    },
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
    FORCE_ACTIVITY = await selectActivityMode()

    console.log('[START] Starting NPC Engine...')
    console.log(`[TREASURY] ${this.treasuryWallet.publicKey.toString()}`)

    await this.loadLocations()

    let resumedCount = 0

    // Resume existing NPCs first
    if (this.config.resumeExisting) {
      resumedCount = await this.resumeExistingNPCs()
      console.log(`[RESUME] Resumed ${resumedCount} existing NPCs`)
    }

    // Spawn new ones if needed
    const needed = this.config.npcCount - resumedCount
    console.log(`[DEBUG] resumedCount=${resumedCount}, npcCount=${this.config.npcCount}, needed=${needed}`)

    if (needed > 0) {
      console.log(`[SPAWN] Spawning ${needed} new NPCs`)
      await this.spawnNPCs(needed)
    } else {
      console.log(`[INFO] No new NPCs needed`)
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
        const response = await fetch(`${API_BASE}/get-player-character?wallet_address=${wallet.publicKey.toString()}`)
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

    // DEATH CHECK - NPCs die when health reaches 0
    if (npc.health <= 0) {
      await this.handleNPCDeath(npc)
      return
    }

    // CRITICAL HEALTH - Only try healing, no other activities
    if (npc.health <= 5) {
      console.log(`[CRITICAL] ${npc.name} critically injured (${npc.health} health) - last chance to heal`)
      const healingSuccess = await this.tryEmergencyHealing(npc)
      if (!healingSuccess) {
        // Track failed healing attempts
        npc.failedHealingAttempts = (npc.failedHealingAttempts || 0) + 1
        console.log(`[DEATH] ${npc.name} couldn't find healing - attempt ${npc.failedHealingAttempts}/3`)

        // Die from desperation after 3 failed attempts
        if (npc.failedHealingAttempts >= 3) {
          npc.health = 0
          console.log(`[DEATH] ${npc.name} died from desperation - couldn't find healing after 3 attempts`)
        }
      } else {
        // Reset counter if healing succeeds
        npc.failedHealingAttempts = 0
      }
      return
    }

    // Low energy - rest first
    if (npc.energy < this.config.energyRestThreshold) {
      await this.rest(npc)
      return
    }

    const personality = PERSONALITIES[npc.personality]
    const action = this.chooseAction(personality.preferences, npc)

    // Enhanced logging with more context
    const timestamp = new Date().toLocaleTimeString()
    const populationInfo = `${this.getActiveNPCCount()}/${this.npcs.size}/${this.getDeadNPCCount()}`
    const energyInfo = `${npc.energy}E/${npc.health}H`

    // console.log(`[${timestamp}] (${populationInfo}) ${npc.name} (${npc.personality}) ${energyInfo} -> ${action}`)
    console.log(`[${timestamp}] (${populationInfo}) ${npc.name} (${npc.personality}) ${energyInfo} -> ${action}${FORCE_ACTIVITY ? ' [FORCED]' : ''}`)


    try {
      switch (action) {
        case 'MINE': await this.mine(npc); break
        case 'TRAVEL': await this.travel(npc); break
        case 'BUY': await this.buy(npc); break
        case 'SELL': await this.sell(npc); break
        case 'CHAT': await this.chat(npc); break
        case 'EQUIP': await this.equip(npc); break
        case 'USE_ITEM': await this.useItem(npc); break
        case 'EXCHANGE': await this.exchange(npc); break // Add this line

      }
    } catch (error) {
      this.log('error', `${npc.name} ${action} failed:`, error.message)
    }
  }


  // Add this new exchange method to your NPCEngine class
  async exchange(npc) {
    try {
      // Get current exchange info and SOL price
      const exchangeInfo = await this.getExchangeInfo()
      if (!exchangeInfo || !exchangeInfo.isActive) {
        console.log(`💱 ${npc.name} skipping exchange - market closed or no liquidity`)
        return
      }

      const solPrice = exchangeInfo.solPrice
      const npcSOLBalance = await this.getSolBalance(npc.wallet.publicKey)

      // Determine exchange strategy based on NPC state and personality
      const strategy = this.determineExchangeStrategy(npc, npcSOLBalance, solPrice, exchangeInfo)

      if (!strategy) {
        console.log(`[EXCHANGE] ${npc.name} no profitable exchange opportunity (${npc.coins} coins, ${npcSOLBalance.toFixed(4)} SOL, $${solPrice}/SOL)`)
        return
      }

      const { action, amountUSD, reason } = strategy

      console.log(`[EXCHANGE] ${npc.name} attempting ${action} for $${amountUSD} [${reason}] at $${solPrice}/SOL`)

      console.log(`💱 ${npc.name} attempting ${action} for $${amountUSD} [${reason}] at $${solPrice}/SOL`)

      const exchangeResult = await this.callAPI('npc-exchange', {
        wallet_address: npc.wallet_address,
        action: action,
        amountUSD: amountUSD,
        character_id: npc.id
      })

      if (exchangeResult.success) {
        await this.refreshNPCData(npc)

        // Calculate XP for smart financial decisions
        let xpGained = 3 // Base exchange XP

        // Bonus XP for good timing and strategy
        if (reason === 'necessity') xpGained += 5 // Smart necessity trading
        if (reason === 'arbitrage' && npc.personality === 'merchant') xpGained += 8 // Merchant bonus
        if (reason === 'portfolio') xpGained += 4 // Diversification bonus
        if (amountUSD >= 50) xpGained += 3 // Large transaction bonus

        await this.grantXP(npc, xpGained, 'FINANCE', {
          action: action,
          amountUSD: amountUSD,
          reason: reason,
          solPrice: solPrice,
          efficiency: strategy.efficiency || 1.0
        })

        if (action === 'BUY_SOL') {
          console.log(`💰 ${npc.name} bought ${exchangeResult.solReceived.toFixed(6)} SOL for $${amountUSD} (${exchangeResult.coinsSpent} coins) [${reason}] (+${xpGained} XP)`)
        } else {
          console.log(`💰 ${npc.name} sold ${exchangeResult.solSpent.toFixed(6)} SOL for $${amountUSD} (${exchangeResult.coinsReceived} coins) [${reason}] (+${xpGained} XP)`)
        }

        npc.lastActivity = 'EXCHANGE'

      } else {
        console.log(`🚫 ${npc.name} exchange failed: ${exchangeResult.message || exchangeResult.error}`)
      }

    } catch (error) {
      console.log(`🚫 ${npc.name} exchange failed: ${error.message}`)
    }
  }

  // Determine what exchange action an NPC should take
  determineExchangeStrategy(npc, npcSOLBalance, solPrice, exchangeInfo) {
    const strategies = []

    // Strategy 1: NECESSITY - Need SOL for blockchain transactions
    if (npcSOLBalance < 0.01 && npc.coins >= 5) {
      strategies.push({
        action: 'BUY_SOL',
        amountUSD: Math.min(10, Math.floor(npc.coins * 0.2)), // Use 20% of coins, max $10
        reason: 'necessity',
        priority: 10, // Highest priority
        efficiency: 1.0
      })
    }

    // Strategy 2: LIQUIDITY - Need coins for purchases but have excess SOL
    if (npc.coins < 50 && npcSOLBalance > 0.05) {
      const maxSellUSD = Math.min(20, Math.floor(npcSOLBalance * solPrice * 0.3)) // Sell 30% of SOL, max $20
      if (maxSellUSD >= 5) {
        strategies.push({
          action: 'SELL_SOL',
          amountUSD: maxSellUSD,
          reason: 'liquidity',
          priority: 8,
          efficiency: 1.0
        })
      }
    }

    // Strategy 3: PORTFOLIO BALANCE - Merchants balance their holdings
    if (npc.personality === 'merchant' && npc.coins > 200) {
      const totalWealthUSD = npc.coins + (npcSOLBalance * solPrice)
      const solPercentage = (npcSOLBalance * solPrice) / totalWealthUSD

      // Target 20-30% SOL allocation for merchants
      if (solPercentage < 0.15 && npc.coins >= 30) {
        // Too little SOL - buy some
        strategies.push({
          action: 'BUY_SOL',
          amountUSD: Math.min(30, Math.floor(npc.coins * 0.15)),
          reason: 'portfolio',
          priority: 6,
          efficiency: 0.8
        })
      } else if (solPercentage > 0.4) {
        // Too much SOL - sell some
        const sellAmount = Math.min(25, Math.floor((npcSOLBalance * solPrice) * 0.2))
        strategies.push({
          action: 'SELL_SOL',
          amountUSD: sellAmount,
          reason: 'portfolio',
          priority: 6,
          efficiency: 0.8
        })
      }
    }

    // Strategy 4: OPPORTUNITY - Small random trades for activity
    if (Math.random() < 0.2 && npc.coins >= 20) {
      const tradeAmount = Math.floor(5 + Math.random() * 15) // $5-$20
      const buyOrSell = Math.random() > 0.5

      if (buyOrSell && npc.coins >= tradeAmount) {
        strategies.push({
          action: 'BUY_SOL',
          amountUSD: tradeAmount,
          reason: 'opportunity',
          priority: 2,
          efficiency: 0.6
        })
      } else if (!buyOrSell && npcSOLBalance * solPrice >= tradeAmount) {
        strategies.push({
          action: 'SELL_SOL',
          amountUSD: tradeAmount,
          reason: 'opportunity',
          priority: 2,
          efficiency: 0.6
        })
      }
    }

    // Return highest priority strategy
    if (strategies.length === 0) return null

    return strategies.sort((a, b) => b.priority - a.priority)[0]
  }

  // Helper method to get current exchange information
  async getExchangeInfo() {
    try {
      const response = await fetch(`${API_BASE}/get-exchange-info`)
      if (response.ok) {
        const data = await response.json()
        console.log('[DEBUG] Exchange Info:', data) // Add this line
        return data
      }
      return null
    } catch (error) {
      console.error('Failed to get exchange info:', error)
      return null
    }
  }

  // Helper method to get SOL balance (add this if you don't have it)
  async getSolBalance(publicKey) {
    try {
      const balance = await this.connection.getBalance(publicKey)
      return balance / 1000000000
    } catch (error) {
      console.error('Failed to get SOL balance:', error)
      return 0
    }
  }

  // NEW: Sell method for NPCs
  async sell(npc) {
    const inventoryResponse = await fetch(`${API_BASE}/get-player-character?wallet_address=${npc.wallet_address}`)
    if (!inventoryResponse.ok) return

    const characterData = await inventoryResponse.json()
    if (!characterData.hasCharacter) return

    const inventory = characterData.character.inventory || []

    // Find items that can be sold (not equipped, quantity > 0)
    const sellableItems = inventory.filter(item =>
      !item.is_equipped &&
      item.quantity > 0 &&
      this.shouldSellItem(item, npc)
    )

    if (sellableItems.length === 0) {
      console.log(`🚫 ${npc.name} has nothing worth selling`)
      return
    }

    // Choose item to sell based on NPC strategy
    const itemToSell = this.chooseSellItem(sellableItems, npc)
    const quantityToSell = this.chooseSellQuantity(itemToSell, npc)

    try {
      const sellResult = await this.callAPI('sell-item', {
        wallet_address: npc.wallet_address,
        inventoryId: itemToSell.id,
        quantity: quantityToSell
      })

      if (sellResult.success) {
        await this.refreshNPCData(npc)

        // Calculate selling XP (business skills)
        let xpGained = 3 // Base selling XP

        // Bonus XP for good business decisions
        if (sellResult.sale.sellPrice >= 50) xpGained += 4 // High value sale
        if (itemToSell.item.category === 'MATERIAL') xpGained += 2 // Smart material selling
        if (npc.coins < 100) xpGained += 3 // Needed the money

        await this.grantXP(npc, xpGained, 'BUSINESS', {
          itemName: itemToSell.item.name,
          category: itemToSell.item.category,
          quantity: quantityToSell,
          sellPrice: sellResult.sale.sellPrice,
          profit: sellResult.sale.sellPrice
        })

        console.log(`💰 ${npc.name} sold ${quantityToSell}x ${itemToSell.item.name} for ${sellResult.sale.sellPrice} coins (+${xpGained} XP, ${npc.coins} total)`)
        npc.lastActivity = 'SELL'

      } else {
        console.log(`🚫 ${npc.name} sale failed: ${sellResult.message || sellResult.error}`)
      }

    } catch (error) {
      console.log(`🚫 ${npc.name} sale failed: ${error.message}`)
    }
  }

  // Determine if an item should be sold
  shouldSellItem(item, npc) {
    const itemData = item.item

    // Never sell health/energy items if health/energy is low
    if (npc.health < 50 && itemData.health_effect > 0) return false
    if (npc.energy < 50 && itemData.energy_effect > 0) return false

    // Always consider selling if broke
    if (npc.coins < 50) return true

    // Sell excess materials (keep max 3 of each)
    if (itemData.category === 'MATERIAL' && item.quantity > 3) return true

    // Sell duplicate equipment if already have one equipped
    if (['TOOL', 'HAT', 'CLOTHING', 'ACCESSORY'].includes(itemData.category)) {
      // Could check if already have this type equipped
      return true
    }

    // Sell consumables if have too many
    if (itemData.category === 'CONSUMABLE' && item.quantity > 5) return true

    return false
  }

  // Choose which item to sell (strategy varies by personality)
  chooseSellItem(sellableItems, npc) {
    if (npc.personality === 'merchant') {
      // Merchants sell highest value items
      return sellableItems.reduce((best, current) => {
        const currentValue = this.estimateItemValue(current)
        const bestValue = this.estimateItemValue(best)
        return currentValue > bestValue ? current : best
      })
    }

    if (npc.coins < 20) {
      // Desperate NPCs sell anything valuable
      return sellableItems.find(item => this.estimateItemValue(item) >= 15) || sellableItems[0]
    }

    // Default: sell materials first (renewable from mining)
    const materials = sellableItems.filter(item => item.item.category === 'MATERIAL')
    if (materials.length > 0) {
      return materials[Math.floor(Math.random() * materials.length)]
    }

    // Then excess consumables
    const consumables = sellableItems.filter(item =>
      item.item.category === 'CONSUMABLE' && item.quantity > 2
    )
    if (consumables.length > 0) {
      return consumables[Math.floor(Math.random() * consumables.length)]
    }

    // Finally, random sellable item
    return sellableItems[Math.floor(Math.random() * sellableItems.length)]
  }

  // Choose how much to sell
  chooseSellQuantity(item, npc) {
    if (npc.coins < 10) {
      // Desperate: sell everything
      return item.quantity
    }

    if (item.item.category === 'MATERIAL') {
      // Keep 1-2, sell the rest
      return Math.max(1, item.quantity - 2)
    }

    if (item.item.category === 'CONSUMABLE') {
      // Keep 2-3, sell the rest
      return Math.max(1, item.quantity - 3)
    }

    // For equipment, usually sell 1
    return 1
  }

  // Estimate item value for decision making
  estimateItemValue(item) {
    const rarityValues = { COMMON: 10, UNCOMMON: 20, RARE: 40, EPIC: 80, LEGENDARY: 150 }
    const baseValue = rarityValues[item.item.rarity] || 10
    const effectValue = (item.item.health_effect || 0) + (item.item.energy_effect || 0)
    return baseValue + effectValue
  }


  // NEW: Handle NPC death
  async handleNPCDeath(npc) {
    console.log(`💀 ${npc.name} has died! (${npc.personality} personality)`)

    // Mark as dead and stop their activity timer
    npc.isDead = true
    npc.deathTime = Date.now()

    if (npc.activityTimeout) {
      clearTimeout(npc.activityTimeout)
      npc.activityTimeout = null
    }

    // Update database status
    try {
      await supabase
        .from('characters')
        .update({
          status: 'DEAD',
          health: 0
        })
        .eq('id', npc.id)

      // Optional: Send death message to their current location
      if (this.config.chat?.enabled && this.config.announceDeaths) {
        await this.callAPI('send-message', {
          wallet_address: npc.wallet_address,
          location_id: npc.currentlocation_id,
          message: `${npc.name} has fallen...`,
          message_type: 'SYSTEM'
        })
      }

      // Schedule respawn if enabled
      if (this.config.respawnEnabled) {
        this.scheduleRespawn(npc)
      }

    } catch (error) {
      console.error(`Failed to handle death for ${npc.name}:`, error.message)
    }
  }

  // NEW: Try emergency healing for critical NPCs
  async tryEmergencyHealing(npc) {
    try {
      const inventoryResponse = await fetch(`${API_BASE}/get-player-character?wallet_address=${npc.wallet_address}`)
      if (!inventoryResponse.ok) return false

      const characterData = await inventoryResponse.json()
      if (!characterData.hasCharacter) return false

      const inventory = characterData.character.inventory || []

      // Find health-restoring consumables
      const healingItems = inventory.filter(item =>
        item.item.category === 'CONSUMABLE' &&
        item.quantity > 0 &&
        (item.item.health_effect || 0) > 0
      )

      if (healingItems.length === 0) {
        console.log(`💀 ${npc.name} has no healing items - fate sealed`)
        return false
      }

      // Use the best healing item available
      const bestHealingItem = healingItems.reduce((best, current) =>
        (current.item.health_effect || 0) > (best.item.health_effect || 0) ? current : best
      )

      await this.callAPI('use-item', {
        wallet_address: npc.wallet_address,
        inventoryId: bestHealingItem.id
      })

      await this.refreshNPCData(npc)

      console.log(`🩹 ${npc.name} used ${bestHealingItem.item.name} to survive (+${bestHealingItem.item.health_effect} health → ${npc.health})`)
      return true

    } catch (error) {
      console.error(`Emergency healing failed for ${npc.name}:`, error.message)
      return false
    }
  }

  // NEW: Schedule NPC respawn
  scheduleRespawn(npc) {
    const respawnDelay = this.config.respawnDelayMinutes * 60 * 1000 // Convert to milliseconds

    console.log(`⏰ ${npc.name} will respawn in ${this.config.respawnDelayMinutes} minutes`)

    setTimeout(async () => {
      await this.respawnNPC(npc)
    }, respawnDelay)
  }

  // NEW: Respawn an NPC
  async respawnNPC(npc) {
    console.log(`🔄 Respawning ${npc.name}...`)

    try {
      // Find a starting location (preferably easier/safer ones)
      const startingLocations = this.locations.filter(loc =>
        loc.difficulty <= 2 && !loc.is_private && (!loc.min_level || loc.min_level <= 1)
      )

      const respawnLocation = startingLocations.length > 0
        ? startingLocations[Math.floor(Math.random() * startingLocations.length)]
        : this.locations[0] // Fallback to first location

      // Reset character stats
      const respawnHealth = 50 // Start with reduced health as penalty
      const respawnEnergy = 75  // Reduced energy too

      await supabase
        .from('characters')
        .update({
          status: 'ACTIVE',
          health: respawnHealth,
          energy: respawnEnergy,
          currentlocation_id: respawnLocation.id
        })
        .eq('id', npc.id)

      // Update local NPC data
      npc.isDead = false
      npc.health = respawnHealth
      npc.energy = respawnEnergy
      npc.currentlocation_id = respawnLocation.id
      npc.deathTime = null

      // Optional: Announce respawn
      if (this.config.chat?.enabled && this.config.announceRespawns) {
        await this.callAPI('send-message', {
          wallet_address: npc.wallet_address,
          location_id: respawnLocation.id,
          message: `${npc.name} has returned from the void...`,
          message_type: 'SYSTEM'
        })
      }

      // Resume normal activity
      this.scheduleNextActivity(npc)

      console.log(`✨ ${npc.name} respawned at ${respawnLocation.name} (${respawnHealth}H ${respawnEnergy}E)`)

    } catch (error) {
      console.error(`Failed to respawn ${npc.name}:`, error.message)
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
        wallet_address: npcWallet.publicKey.toString(),
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

      console.log(`👤 Spawned ${mintResult.character.name} at ${this.getLocationName(mintResult.character.currentlocation_id)}`)

      console.log(`🔗 NFT: ${mintResult.nft_address}`)

    } catch (error) {
      console.error(`Failed to spawn NPC ${personalityType}_${id}:`, error.message)
      throw error
    }
  }

  async mintNPCCharacter(npcData) {
    console.log('📤 Calling mint-nft with data:', {
      wallet_address: npcData.wallet_address,
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
      nft_address: result.nft_address
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

  // UPDATED: Enhanced logging in runLoop
  runLoop() {
    this.isRunning = true
    const populationCount = this.npcs.size

    console.log(`🎲 Starting population-based timing:`)
    console.log(`   📊 Population: ${populationCount} NPCs`)
    console.log(`   💀 Death system: ${this.config.respawnEnabled ? 'Enabled' : 'Permanent death'}`)
    console.log(`   ⏰ Respawn delay: ${this.config.respawnDelayMinutes || 'N/A'} minutes`)

    // Start independent timers for each NPC
    for (const [id, npc] of this.npcs) {
      if (!npc.isDead) { // Only start timers for living NPCs
        const startupDelay = Math.random() * 120000 // 0-2 minutes
        setTimeout(() => {
          this.scheduleNextActivity(npc)
        }, startupDelay)
      }
    }

    // Population status reporting every 5 minutes
    setInterval(() => {
      const stats = this.getPopulationStats()
      console.log(`[STATS] Population Report: ${stats.alive}/${stats.total} alive (${stats.active} active, ${stats.resting} resting, ${stats.dead} dead)`)
    }, 300000) // 5 minutes
  }

  // UPDATED: Activity scheduling - Skip dead NPCs
  scheduleNextActivity(npc) {
    if (!this.isRunning || npc.isDead) return

    const personality = PERSONALITIES[npc.personality]
    const delay = personality.activityDelay * (0.5 + Math.random())

    npc.activityTimeout = setTimeout(async () => {
      if (!npc.isDead) { // Double-check they're still alive
        await this.doActivity(npc)
        this.scheduleNextActivity(npc)
      }
    }, delay)
  }

  // NEW: Count dead NPCs
  getDeadNPCCount() {
    let deadCount = 0
    for (const [id, npc] of this.npcs) {
      if (npc.isDead) deadCount++
    }
    return deadCount
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

  // UPDATED: Active NPC count excludes dead ones
  getActiveNPCCount() {
    let activeCount = 0
    for (const [id, npc] of this.npcs) {
      if (!npc.isDead && npc.energy >= this.config.energyRestThreshold) {
        activeCount++
      }
    }
    return activeCount
  }

  // NEW: Get population stats
  getPopulationStats() {
    const total = this.npcs.size
    const dead = this.getDeadNPCCount()
    const alive = total - dead
    const active = this.getActiveNPCCount()
    const resting = alive - active

    return { total, alive, dead, active, resting }
  }


  async rest(npc) {
    this.log('debug', `😴 ${npc.name} is resting (${npc.energy}/100 energy)`)
    npc.energy = Math.min(100, npc.energy + this.config.restEnergyGain)

    await supabase
      .from('characters')
      .update({ energy: npc.energy })
      .eq('id', npc.id)
  }

  // UPDATED: Action choice - NPCs avoid death when possible
  chooseAction(preferences, npc) {

    if (FORCE_ACTIVITY) {
      // Special case for TRADE mode (randomly pick BUY or SELL)
      if (FORCE_ACTIVITY === 'TRADE') {
        return Math.random() > 0.5 ? 'BUY' : 'SELL'
      }

      // Return the forced activity
      return FORCE_ACTIVITY
    }

    const rand = Math.random()
    let cumulative = 0

    const adjustedPreferences = { ...preferences }
    const npcHealth = npc.health || 100
    const npcEnergy = npc.energy || 100


    // EXCHANGE LOGIC - NPCs make smarter exchange decisions based on market conditions

    // Merchants are more active in exchanges when they have significant wealth
    if (npc.personality === 'merchant' && npc.coins > 500) {
      adjustedPreferences.EXCHANGE *= 3.0
    }

    // All NPCs more likely to exchange when they need SOL for transactions
    // (This will be checked more thoroughly in the exchange method)
    if (npc.coins > 100) {
      adjustedPreferences.EXCHANGE *= 1.5
    }

    // Less likely to exchange when poor (need coins for basic needs)
    if (npc.coins < 50) {
      adjustedPreferences.EXCHANGE *= 0.2
    }


    // CRITICAL HEALTH - Only healing attempts
    if (npcHealth <= 5) {
      return 'USE_ITEM' // Desperately try to heal
    }

    // Very low health - strongly avoid dangerous activities
    if (npcHealth < 15) {
      adjustedPreferences.MINE *= 0.05  // Almost never mine
      adjustedPreferences.TRAVEL *= 0.1 // Avoid travel
      adjustedPreferences.USE_ITEM *= 20.0 // Heavily prioritize healing
      adjustedPreferences.BUY *= 3.0    // May need healing items
      adjustedPreferences.CHAT *= 3.0   // Safe activity
      adjustedPreferences.EXCHANGE *= 0.1 // Don't exchange when critically injured


      console.log(`⚠️ ${npc.name} avoiding death (${npcHealth} health)`)
    }

    // Low health - more cautious
    if (npcHealth < 30) {
      adjustedPreferences.MINE *= 0.3
      adjustedPreferences.TRAVEL *= 0.4
      adjustedPreferences.USE_ITEM *= 5.0
      adjustedPreferences.BUY *= 2.0
      adjustedPreferences.CHAT *= 2.0
    }

    // Normalize adjusted preferences
    const total = Object.values(adjustedPreferences).reduce((sum, val) => sum + val, 0)
    for (const [action, weight] of Object.entries(adjustedPreferences)) {
      cumulative += weight / total
      if (rand <= cumulative) return action
    }

    return 'USE_ITEM' // Default to trying to heal
  }

  // Helper method to grant XP for any activity
  async grantXP(npc, experience, source, details = {}) {
    try {
      const response = await fetch(`${API_BASE}/grant-experience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: npc.wallet_address,
          experience,
          source,
          details
        })
      })

      if (response.ok) {
        const xpData = await response.json()

        // Update local NPC data
        npc.experience = xpData.totalExperience
        if (xpData.leveledUp) {
          npc.level = xpData.newLevel
          console.log(`🎉 LEVEL UP! ${npc.name} reached Level ${xpData.newLevel}! (${xpData.totalExperience} total XP)`)
        } else {
          console.log(`⭐ ${npc.name} gained ${experience} XP from ${source} (${xpData.totalExperience} total, need ${xpData.xpNeededForNext} more for level ${xpData.newLevel + 1})`)
        }

        return xpData
      }
    } catch (error) {
      console.warn(`Failed to grant XP to ${npc.name}:`, error.message)
    }
    return null
  }

  // Updated mining with XP
  async mine(npc) {
    const result = await this.callAPI('mine-action', { wallet_address: npc.wallet_address })

    // Update local stats from API response
    npc.energy = result.newEnergyLevel
    if (result.newHealthLevel !== undefined) {
      npc.health = result.newHealthLevel
    }

    // Calculate XP based on results
    let xpGained = 10 // Base mining XP

    if (result.foundItem) {
      console.log(`⛏️  ${npc.name} found ${result.foundItem.name}`)
      xpGained += 15 // Item found bonus

      // Rarity bonuses
      const rarityBonuses = {
        COMMON: 0, UNCOMMON: 5, RARE: 15, EPIC: 40, LEGENDARY: 100
      }
      xpGained += rarityBonuses[result.foundItem.rarity] || 0
    }

    // Grant XP
    await this.grantXP(npc, xpGained, 'MINING', {
      foundItem: result.foundItem?.name,
      rarity: result.foundItem?.rarity,
      healthLoss: result.healthLoss || 0
    })

    npc.lastActivity = 'MINING'
  }

  // Updated travel with XP
  async travel(npc) {
    const availableDestinations = this.locations.filter(loc => {
      if (loc.id === npc.currentlocation_id) return false
      if (loc.min_level && npc.level < loc.min_level) return false
      if (loc.entry_cost && npc.coins < loc.entry_cost) return false
      if (loc.is_private) return false
      return true
    })

    if (availableDestinations.length === 0) {
      console.log(`🚧 ${npc.name} has no available destinations`)
      return
    }

    const destination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)]

    try {
      await this.callAPI('travel-action', {
        wallet_address: npc.wallet_address,
        destinationId: destination.id
      })

      await this.refreshNPCData(npc)

      // Calculate travel XP based on destination difficulty
      let xpGained = 5 // Base travel XP
      xpGained += Math.max(0, destination.difficulty - 1) * 3 // Difficulty bonus

      // First time visiting bonus
      const hasVisited = await this.checkIfVisitedBefore(npc, destination.id)
      if (!hasVisited) {
        xpGained += 10
        console.log(`🗺️  ${npc.name} discovered ${destination.name} for the first time!`)
      }

      await this.grantXP(npc, xpGained, 'TRAVEL', {
        destination: destination.name,
        difficulty: destination.difficulty,
        firstVisit: !hasVisited,
        entry_cost: destination.entry_cost || 0
      })

      if (destination.entry_cost) {
        console.log(`🚶 ${npc.name} → ${destination.name} (paid ${destination.entry_cost} coins, +${xpGained} XP)`)
      } else {
        console.log(`🚶 ${npc.name} → ${destination.name} (+${xpGained} XP)`)
      }

      npc.lastActivity = 'TRAVEL'
    } catch (error) {
      console.log(`🚫 ${npc.name} travel blocked: ${error.message}`)
    }
  }


  // Updated buy with XP
  async buy(npc) {
    const response = await fetch(`${API_BASE}/get-market?location_id=${npc.currentlocation_id}`)
    const market = await response.json()

    if (market.items?.length) {
      const affordable = market.items.filter(item => item.price <= npc.coins && item.quantity > 0)
      if (affordable.length) {
        const item = affordable[Math.floor(Math.random() * affordable.length)]

        try {
          const buyResult = await this.callAPI('buy-item', {
            wallet_address: npc.wallet_address,
            marketListingId: item.id
          })

          if (buyResult.success) {
            await this.refreshNPCData(npc)

            // Calculate shopping XP
            let xpGained = 2 // Base shopping XP

            // Price-based bonus (expensive items = more XP)
            if (item.price >= 100) xpGained += 8
            else if (item.price >= 50) xpGained += 5
            else if (item.price >= 20) xpGained += 3

            // Smart purchase bonus (buying what you need)
            if (npc.health < 30 && item.item.health_effect > 0) xpGained += 5
            if (npc.energy < 30 && item.item.energy_effect > 0) xpGained += 5

            await this.grantXP(npc, xpGained, 'SHOPPING', {
              itemName: item.item.name,
              price: item.price,
              category: item.item.category,
              rarity: item.item.rarity
            })

            console.log(`💰 ${npc.name} bought ${item.item.name} for ${item.price} coins (+${xpGained} XP, ${npc.coins} remaining)`)
            npc.lastActivity = 'BUY'
          } else {
            console.log(`🚫 ${npc.name} couldn't buy ${item.item.name}: ${buyResult.message || buyResult.error}`)
          }
        } catch (error) {
          console.log(`🚫 ${npc.name} purchase failed: ${error.message}`)
        }
      } else {
        console.log(`💸 ${npc.name} cannot afford anything available at ${this.getLocationName(npc.currentlocation_id)}`)
      }
    }
  }

  // NEW METHOD: Refresh NPC data from database
  async refreshNPCData(npc) {
    try {
      const response = await fetch(`${API_BASE}/get-player-character?wallet_address=${npc.wallet_address}`)
      if (response.ok) {
        const characterData = await response.json()
        if (characterData.hasCharacter) {
          const character = characterData.character

          // Update all key stats from database
          npc.coins = character.coins
          npc.health = character.health
          npc.energy = character.energy
          npc.level = character.level
          npc.experience = character.experience
          npc.currentlocation_id = character.currentlocation_id

          this.log('debug', `🔄 Refreshed ${npc.name}: ${npc.coins} coins, ${npc.health}H, ${npc.energy}E`)
        }
      }
    } catch (error) {
      console.error(`Failed to refresh NPC data for ${npc.name}:`, error.message)
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
      const location = this.locations.find(loc => loc.id === npc.currentlocation_id)
      if (location?.biome && LOCATION_CHAT_MESSAGES[location.biome]) {
        messagePool = LOCATION_CHAT_MESSAGES[location.biome]
        context = location.biome
      }
    }

    // FIXED: Pick message FIRST, before using it
    const message = messagePool[Math.floor(Math.random() * messagePool.length)]

    await this.callAPI('send-message', {
      wallet_address: npc.wallet_address,
      location_id: npc.currentlocation_id,
      message,
      message_type: 'CHAT'
    })

    // FIXED: Grant XP AFTER message is declared
    await this.grantXP(npc, 1, 'SOCIAL', {
      context,
      message: message.substring(0, 50) // Now message exists!
    })

    if (this.config.chat?.showContext) {
      console.log(`💬 ${npc.name}: "${message}" (${context}) (+1 XP)`)
    } else {
      console.log(`💬 ${npc.name}: "${message}" (+1 XP)`)
    }

    // Clear activity tracking for next time
    npc.lastActivity = null
  }

  // Updated equipment changes with XP
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
    const equippedItems = inventory.filter(item => item.is_equipped)

    const shouldEquip = Math.random() > 0.3 && unequippedItems.length > 0

    if (shouldEquip) {
      const item = unequippedItems[Math.floor(Math.random() * unequippedItems.length)]

      await this.callAPI('equip-item', {
        wallet_address: npc.wallet_address,
        inventoryId: item.id,
        equip: true,
        setPrimary: Math.random() > 0.7
      })

      // Equipment XP
      await this.grantXP(npc, 3, 'EQUIPMENT', {
        action: 'equip',
        itemName: item.item.name,
        category: item.item.category
      })

      console.log(`⚔️ ${npc.name} equipped ${item.item.name} (+3 XP)`)
    } else if (equippedItems.length > 0) {
      const item = equippedItems[Math.floor(Math.random() * equippedItems.length)]

      await this.callAPI('equip-item', {
        wallet_address: npc.wallet_address,
        inventoryId: item.id,
        equip: false
      })

      await this.grantXP(npc, 1, 'EQUIPMENT', {
        action: 'unequip',
        itemName: item.item.name
      })

      console.log(`🎒 ${npc.name} unequipped ${item.item.name} (+1 XP)`)
    }

    npc.lastActivity = 'EQUIP'
  }

  // Updated item use with XP
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
    let reason = ''
    let xpBonus = 0

    // Smart item usage gets bonus XP
    if (character.health < 20) {
      targetItem = consumables.find(item => (item.item.health_effect || 0) > 0)
      if (targetItem) {
        reason = `CRITICAL HEALTH (${character.health}/100)`
        xpBonus = 5 // Smart emergency healing
      }
    }

    if (!targetItem && character.energy < 30) {
      targetItem = consumables.find(item => (item.item.energy_effect || 0) > 0)
      if (targetItem) {
        reason = `LOW ENERGY (${character.energy}/100)`
        xpBonus = 3
      }
    }

    if (!targetItem && character.health < 60) {
      targetItem = consumables.find(item => (item.item.health_effect || 0) > 0)
      if (targetItem) {
        reason = `HEALTH MAINTENANCE (${character.health}/100)`
        xpBonus = 2
      }
    }

    if (!targetItem && character.health > 30) {
      targetItem = consumables[Math.floor(Math.random() * consumables.length)]
      reason = 'ROUTINE USE'
      xpBonus = 0 // No bonus for wasteful use
    }

    if (!targetItem) return

    try {
      await this.callAPI('use-item', {
        wallet_address: npc.wallet_address,
        inventoryId: targetItem.id
      })

      await this.refreshNPCData(npc)

      const baseXP = 2
      await this.grantXP(npc, baseXP + xpBonus, 'SURVIVAL', {
        itemName: targetItem.item.name,
        reason,
        smartUse: xpBonus > 0,
        healthBefore: character.health,
        energyBefore: character.energy
      })

      const effects = []
      if (targetItem.item.energy_effect) effects.push(`+${targetItem.item.energy_effect} energy`)
      if (targetItem.item.health_effect) effects.push(`+${targetItem.item.health_effect} health`)

      console.log(`🍎 ${npc.name} used ${targetItem.item.name} [${reason}] (+${baseXP + xpBonus} XP) ${effects.length ? `(${effects.join(', ')})` : ''} (${npc.health}H ${npc.energy}E)`)
      npc.lastActivity = 'USE_ITEM'

    } catch (error) {
      console.log(`🚫 ${npc.name} item use failed: ${error.message}`)
    }
  }

  // Helper method to check if visited location before
  async checkIfVisitedBefore(npc, location_id) {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('description')
        .eq('character_id', npc.id)
        .eq('type', 'TRAVEL')
        .ilike('description', `%${location_id}%`)
        .limit(1)

      return transactions && transactions.length > 0
    } catch (error) {
      return false // Assume not visited if we can't check
    }
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
      const npc = Array.from(this.npcs.values()).find(n => n.wallet_address === payload.wallet_address)

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

  getLocationName(location_id) {
    return this.locations.find(loc => loc.id === location_id)?.name || 'Unknown'
  }
}

const engine = new NPCEngine()
engine.start().catch(console.error)

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...')
  process.exit(0)
})



