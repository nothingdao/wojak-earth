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
import gameConfig, {
  createNPCEngineConfig,
  type NPC_CONFIG,
} from './gameConfig.js'
import {
  applyConsequence,
  applyDamage,
  checkDeath,
  generateChatMessage,
  type ActionConsequence,
} from '@/lib/game-logic/actions'
import { NPCWalletManager } from './wallet-manager.js'
import readline from 'readline'
import crypto from 'crypto'
import dotenv from 'dotenv'
import supabase from './supabase.js'
import { readFileSync } from 'fs'

// Load environment variables
dotenv.config()

// Config source order:
// 1) npc-engine/gameConfig.ts defaults
// 2) npc-engine/npc-config.json (optional local overrides)
// 3) environment variable overrides
const API_BASE =
  process.env.NPC_API_BASE_URL ||
  'https://earth.ndao.computer/.netlify/functions'
const SOLANA_RPC_URL =
  process.env.VITE_SOLANA_RPC_URL ||
  process.env.SOLANA_RPC_URL ||
  'https://api.devnet.solana.com'
const SUPABASE_PUBLIC_URL =
  process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'

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
  experience: number
  location: string
  personality: string
  wallet: Keypair
  storyId?: string | null
  currentEventId?: string | null
  storyFlag?: string | null
  storyFlags: string[]
  inventory: string[]
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
  experience?: number
  current_location_id: string
  story_id?: string | null
  story_flag?: string | null
  current_event_id?: string | null
}

interface CharacterResponse {
  hasCharacter: boolean
  character: CharacterData
}

interface LocationsResponse {
  locations: Location[]
}

interface StoryRecord {
  id: string
  title?: string
  first_event_id?: string | null
  is_active?: boolean
}

interface ChapterRecord {
  id: string
  story_id: string
}

interface EventRecord {
  id: string
  chapter_id: string
  title?: string
  description?: string
  required_location_id?: string | null
}

interface ChoiceRecord {
  id: string
  event_id: string
  choice_key?: string
  text?: string
  order_index?: number
}

interface ConsequenceRecord {
  id: string
  choice_id: string
  consequence_data: ActionConsequence
}

interface StoryBundle {
  story: StoryRecord
  eventsById: Map<string, EventRecord>
  choicesByEventId: Map<string, ChoiceRecord[]>
  consequenceByChoiceId: Map<string, ConsequenceRecord>
  fallbackFirstEventId: string | null
}

type EngineMode = 'api' | 'direct' | 'headless'

interface CLIOptions {
  storyId?: string
  count?: number
  durationMinutes?: number
  mode: EngineMode
}

function parseCLIOptions(argv: string[]): CLIOptions {
  const options: CLIOptions = { mode: 'api' }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]

    if (arg === '--storyId' && next) {
      options.storyId = next
      i++
      continue
    }
    if (arg === '--count' && next) {
      const parsed = Number(next)
      if (Number.isFinite(parsed) && parsed > 0) options.count = Math.floor(parsed)
      i++
      continue
    }
    if (arg === '--duration' && next) {
      const parsed = Number(next)
      if (Number.isFinite(parsed) && parsed > 0) options.durationMinutes = parsed
      i++
      continue
    }
    if (arg === '--mode' && next) {
      if (next === 'api' || next === 'direct' || next === 'headless') {
        options.mode = next
      }
      i++
    }
  }

  return options
}

const CLI_OPTIONS = parseCLIOptions(process.argv.slice(2))

// ===== CONFIGURATION =====
function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function loadNpcConfigFromFile(): Partial<NPC_CONFIG> {
  try {
    const configUrl = new URL('./npc-config.json', import.meta.url)
    const raw = readFileSync(configUrl, 'utf-8')
    const parsed = JSON.parse(raw) as {
      npcCount?: number
      resumeExisting?: boolean
      spawnReplacements?: boolean
      personalities?: string[]
      spawnDelay?: number
      activityInterval?: number
      globalActivityRate?: number
      activityVariance?: number
      fundingAmount?: number
      enableLogs?: boolean
      logLevel?: string
      chat?: { enabled?: boolean; showContext?: boolean; messagePoolSize?: number }
    }

    return {
      DEFAULT_NPC_COUNT: parsed.npcCount,
      RESUME_EXISTING: parsed.resumeExisting,
      RESPAWN_ENABLED: parsed.spawnReplacements,
      AVAILABLE_PERSONALITIES: parsed.personalities,
      SPAWN_DELAY: parsed.spawnDelay,
      BASE_ACTIVITY_INTERVAL: parsed.activityInterval,
      GLOBAL_ACTIVITY_RATE: parsed.globalActivityRate,
      ACTIVITY_VARIANCE: parsed.activityVariance,
      FUNDING_AMOUNT: parsed.fundingAmount,
      ENABLE_LOGS: parsed.enableLogs,
      LOG_LEVEL: parsed.logLevel,
      CHAT_CONFIG: {
        enabled: parsed.chat?.enabled ?? true,
        showContext: parsed.chat?.showContext ?? true,
        messagePoolSize: parsed.chat?.messagePoolSize ?? 50,
      },
    }
  } catch {
    return {}
  }
}

const envConfig: Partial<NPC_CONFIG> = {}
const envNpcCount = parseNumber(process.env.NPC_DEFAULT_COUNT)
const envInterval = parseNumber(process.env.NPC_BASE_ACTIVITY_INTERVAL)
const envVariance = parseNumber(process.env.NPC_ACTIVITY_VARIANCE)
const envSpawnDelay = parseNumber(process.env.NPC_SPAWN_DELAY)
const envFunding = parseNumber(process.env.NPC_FUNDING_AMOUNT)
const envRate = parseNumber(process.env.NPC_GLOBAL_ACTIVITY_RATE)

if (envNpcCount !== undefined) envConfig.DEFAULT_NPC_COUNT = envNpcCount
if (envInterval !== undefined) envConfig.BASE_ACTIVITY_INTERVAL = envInterval
if (envVariance !== undefined) envConfig.ACTIVITY_VARIANCE = envVariance
if (envSpawnDelay !== undefined) envConfig.SPAWN_DELAY = envSpawnDelay
if (envFunding !== undefined) envConfig.FUNDING_AMOUNT = envFunding
if (envRate !== undefined) envConfig.GLOBAL_ACTIVITY_RATE = envRate
if (process.env.LOG_LEVEL) envConfig.LOG_LEVEL = process.env.LOG_LEVEL
if (process.env.ENABLE_LOGS !== undefined) {
  envConfig.ENABLE_LOGS = process.env.ENABLE_LOGS === 'true'
}

const fileConfig = loadNpcConfigFromFile()
const config = createNPCEngineConfig({
  ...fileConfig,
  ...envConfig,
})

console.log('🎮 NPC Engine Configuration:')
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`   NPCs: ${config.DEFAULT_NPC_COUNT}`)
console.log(`   Base Interval: ${config.BASE_ACTIVITY_INTERVAL}ms`)
console.log(`   Log Level: ${config.LOG_LEVEL}`)
console.log(`   Respawn: ${config.RESPAWN_ENABLED ? 'Enabled' : 'Disabled'}`)
console.log(`   API Base: ${API_BASE}`)
console.log(`   Mode: ${CLI_OPTIONS.mode}`)
if (CLI_OPTIONS.storyId) console.log(`   Forced Story: ${CLI_OPTIONS.storyId}`)
if (CLI_OPTIONS.count) console.log(`   NPC Override Count: ${CLI_OPTIONS.count}`)
if (CLI_OPTIONS.durationMinutes) {
  console.log(`   Duration Limit: ${CLI_OPTIONS.durationMinutes} minutes`)
}
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
  private stories: Map<string, StoryBundle>
  private connection: Connection
  private treasuryWallet: Keypair
  private config: ReturnType<typeof createNPCEngineConfig>
  private gameConfig: typeof gameConfig
  private cliOptions: CLIOptions
  private isRunning: boolean
  private walletManager: NPCWalletManager
  private chatChannels: Map<string, ChatChannel>
  private metrics: {
    totalActivities: number
    errors: number
    lastReportTime: number
  }
  private currentActivityMode: string | null
  private warnedStoryColumnMissing: boolean
  private swarmTargetLocation: string | null = null

  constructor() {
    this.npcs = new Map()
    this.locations = []
    this.stories = new Map()
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed')
    this.treasuryWallet = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.TREASURY_KEYPAIR_SECRET || '[]'))
    )
    this.config = config
    this.cliOptions = CLI_OPTIONS
    this.gameConfig = gameConfig
    this.isRunning = false
    this.walletManager = new NPCWalletManager(supabase)
    this.chatChannels = new Map()
    this.currentActivityMode = null
    this.warnedStoryColumnMissing = false

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

      if (process.stdin.isTTY) {
        this.currentActivityMode = await selectActivityMode()
      } else {
        this.currentActivityMode = null
      }

      console.log('[START] Starting NPC Engine...')
      console.log(`[TREASURY] ${this.treasuryWallet.publicKey.toString()}`)

      // Load game data
      await this.loadLocations()
      await this.loadStories()

      let resumedCount = 0
      const targetNpcCount = this.getTargetNpcCount()

      // Resume existing NPCs if enabled
      if (this.config.RESUME_EXISTING) {
        resumedCount = await this.resumeExistingNPCs()
        console.log(`[RESUME] Resumed ${resumedCount} existing NPCs`)
      }

      // Spawn new NPCs if needed
      const needed = targetNpcCount - resumedCount
      if (needed > 0) {
        console.log(`[SPAWN] Spawning ${needed} new NPCs`)
        await this.spawnNPCs(needed)
      } else {
        console.log(`[INFO] No new NPCs needed`)
      }

      // Start the main loop
      this.runLoop()

      if (this.cliOptions.durationMinutes) {
        const durationMs = this.cliOptions.durationMinutes * 60 * 1000
        setTimeout(() => {
          console.log(
            `[STOP] Duration reached (${this.cliOptions.durationMinutes}m). Stopping engine.`
          )
          this.stop()
          process.exit(0)
        }, durationMs)
      }

      console.log('✅ NPC Engine started successfully!')
    } catch (error) {
      console.error(
        '❌ Failed to start NPC Engine:',
        error instanceof Error ? error.message : String(error)
      )
      process.exit(1)
    }
  }

  private getTargetNpcCount(): number {
    return this.cliOptions.count || this.config.DEFAULT_NPC_COUNT
  }

  private async loadLocations(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/get-locations`)
      const data = (await response.json()) as LocationsResponse
      this.locations = data.locations || []
      console.log(`📍 Loaded ${this.locations.length} locations`)
    } catch (error) {
      console.error('[ERROR] Failed to load locations:', error)
      throw error
    }
  }

  private getStoryAdminHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const adminWallet =
      process.env.NPC_ADMIN_WALLET ||
      process.env.ADMIN_WALLET_ADDRESS ||
      process.env.ADMIN_WALLET
    const adminToken = process.env.ADMIN_API_TOKEN

    if (adminWallet) headers['x-admin-wallet'] = adminWallet
    if (adminToken) headers['x-admin-token'] = adminToken

    return headers
  }

  private async fetchStoryList<T>(
    entity: 'story' | 'chapter' | 'event' | 'choice' | 'consequence',
    params: Record<string, string> = {}
  ): Promise<T[]> {
    const query = new URLSearchParams({ entity, ...params }).toString()
    const response = await fetch(`${API_BASE}/story-list?${query}`, {
      method: 'GET',
      headers: this.getStoryAdminHeaders(),
    })

    const raw = await response.text()
    let payload: { data?: unknown; error?: { message?: string } | string } = {}
    try {
      payload = raw ? JSON.parse(raw) : {}
    } catch {
      throw new Error(
        `story-list returned non-JSON (status ${response.status}): ${raw.slice(0, 120)}`
      )
    }

    if (!response.ok) {
      throw new Error(
        payload?.error?.message ||
        payload?.error ||
        `story-list failed for entity=${entity}`
      )
    }

    return (payload?.data || []) as T[]
  }

  private async fetchStoryRead<T>(
    entity: 'story' | 'chapter' | 'event' | 'choice' | 'consequence',
    id: string
  ): Promise<T | null> {
    const query = new URLSearchParams({ entity, id }).toString()
    const response = await fetch(`${API_BASE}/story-read?${query}`, {
      method: 'GET',
      headers: this.getStoryAdminHeaders(),
    })
    const raw = await response.text()
    let payload: { data?: unknown } = {}
    try {
      payload = raw ? JSON.parse(raw) : {}
    } catch {
      return null
    }

    if (!response.ok) {
      return null
    }
    return (payload?.data || null) as T | null
  }

  private async loadStoryBundle(storyId: string): Promise<StoryBundle | null> {
    if (this.stories.has(storyId)) return this.stories.get(storyId) || null

    const story = await this.fetchStoryRead<StoryRecord>('story', storyId)
    if (!story) return null

    const chapters = await this.fetchStoryList<ChapterRecord>('chapter', {
      story_id: storyId,
    })
    const chapterIds = chapters.map((chapter) => chapter.id)
    if (!chapterIds.length) {
      const emptyBundle: StoryBundle = {
        story,
        eventsById: new Map(),
        choicesByEventId: new Map(),
        consequenceByChoiceId: new Map(),
        fallbackFirstEventId: null,
      }
      this.stories.set(storyId, emptyBundle)
      return emptyBundle
    }

    const events = (
      await Promise.all(
        chapterIds.map((chapterId) =>
          this.fetchStoryList<EventRecord>('event', { chapter_id: chapterId })
        )
      )
    ).flat()

    const eventsById = new Map(events.map((event) => [event.id, event]))
    const eventIds = events.map((event) => event.id)

    const choices = (
      await Promise.all(
        eventIds.map((eventId) =>
          this.fetchStoryList<ChoiceRecord>('choice', { event_id: eventId })
        )
      )
    ).flat()

    const choicesByEventId = new Map<string, ChoiceRecord[]>()
    for (const choice of choices) {
      const list = choicesByEventId.get(choice.event_id) || []
      list.push(choice)
      list.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      choicesByEventId.set(choice.event_id, list)
    }

    const consequences = (
      await Promise.all(
        choices.map((choice) =>
          this.fetchStoryList<ConsequenceRecord>('consequence', {
            choice_id: choice.id,
          })
        )
      )
    ).flat()

    const consequenceByChoiceId = new Map<string, ConsequenceRecord>()
    for (const consequence of consequences) {
      consequenceByChoiceId.set(consequence.choice_id, consequence)
    }

    const fallbackFirstEventId = story.first_event_id || events[0]?.id || null
    const bundle: StoryBundle = {
      story,
      eventsById,
      choicesByEventId,
      consequenceByChoiceId,
      fallbackFirstEventId,
    }
    this.stories.set(storyId, bundle)
    return bundle
  }

  private async loadStories(): Promise<void> {
    try {
      if (this.cliOptions.storyId) {
        const bundle = await this.loadStoryBundle(this.cliOptions.storyId)
        if (!bundle) {
          throw new Error(`Story ${this.cliOptions.storyId} not found`)
        }
        console.log(`[STORY] Preloaded forced story ${this.cliOptions.storyId}`)
        return
      }

      const stories = await this.fetchStoryList<StoryRecord>('story')
      const activeStories = stories.filter((story) => story.is_active !== false)
      for (const story of activeStories) {
        if (!story.id) continue
        await this.loadStoryBundle(story.id)
      }

      console.log(`[STORY] Preloaded ${this.stories.size} active stories`)
    } catch (error) {
      console.warn(
        `[STORY] Failed to preload stories: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private async fetchCharacterStoryProgress(walletAddress: string): Promise<{
    storyId: string | null
    storyFlag: string | null
    currentEventId: string | null
    experience: number
  }> {
    try {
      const { data, error } = await this.walletManager.supabase
        .from('characters')
        .select('story_id, story_flag, current_event_id, experience')
        .eq('wallet_address', walletAddress)
        .single()

      if (error) {
        throw error
      }

      return {
        storyId: data?.story_id || null,
        storyFlag: data?.story_flag || null,
        currentEventId: data?.current_event_id || null,
        experience: Number(data?.experience || 0),
      }
    } catch (error) {
      if (!this.warnedStoryColumnMissing) {
        this.warnedStoryColumnMissing = true
        console.warn(
          '[STORY] Story progress columns may be missing on characters table. Suggested migration: add story_id uuid, story_flag text, current_event_id uuid.'
        )
      }
      return {
        storyId: null,
        storyFlag: null,
        currentEventId: null,
        experience: 0,
      }
    }
  }

  private chooseStoryIdForNPC(existingStoryId?: string | null): string | null {
    if (this.cliOptions.storyId) return this.cliOptions.storyId
    if (existingStoryId) return existingStoryId

    const allStoryIds = [...this.stories.keys()]
    if (!allStoryIds.length) return null
    return allStoryIds[Math.floor(Math.random() * allStoryIds.length)]
  }

  private async assignStoryToNPC(npc: NPC, storyId: string | null): Promise<void> {
    npc.storyId = storyId
    if (!storyId) return

    let bundle: StoryBundle | null = null
    try {
      bundle = await this.loadStoryBundle(storyId)
    } catch (error) {
      console.warn(
        `[STORY] Failed to load story ${storyId} for NPC ${npc.id}: ${error instanceof Error ? error.message : String(error)}`
      )
      npc.storyId = null
      return
    }

    npc.currentEventId =
      npc.currentEventId || bundle?.story.first_event_id || bundle?.fallbackFirstEventId || null

    console.log(
      `[STORY] Loaded story ${storyId} for NPC ${npc.wallet.publicKey.toString()}`
    )

    try {
      await this.walletManager.supabase
        .from('characters')
        .update({
          story_id: storyId,
          current_event_id: npc.currentEventId,
          story_flag: npc.storyFlag || null,
        })
        .eq('id', npc.id)
    } catch {
      // Soft-fail for environments without story columns.
    }
  }

  private async resumeExistingNPCs(): Promise<number> {
    try {
      console.log('🔄 Resuming existing NPCs...')

      const existingNPCs = await this.walletManager.getExistingNPCs()
      let resumed = 0

      for (const npcData of existingNPCs.slice(
        0,
        this.getTargetNpcCount()
      )) {
        const wallet = await this.walletManager.load(npcData.id)
        if (wallet) {
          const response = await fetch(
            `${API_BASE}/get-player-character?wallet_address=${wallet.publicKey.toString()}`
          )
          if (response.ok) {
            const characterData = (await response.json()) as CharacterResponse
            if (characterData.hasCharacter) {
              const character = characterData.character
              const storyProgress = await this.fetchCharacterStoryProgress(
                wallet.publicKey.toString()
              )

              const npc: NPC = {
                id: character.id,
                name: character.name,
                health: character.health,
                energy: character.energy,
                earth: character.earth,
                experience: storyProgress.experience,
                location: character.current_location_id,
                personality: npcData.personality || 'neutral',
                wallet: wallet,
                storyId: null,
                currentEventId: storyProgress.currentEventId,
                storyFlag: storyProgress.storyFlag,
                storyFlags: storyProgress.storyFlag ? [storyProgress.storyFlag] : [],
                inventory: [],
                activityTimeout: null,
              }
              this.npcs.set(npcData.id, npc)
              const assignedStoryId = this.chooseStoryIdForNPC(storyProgress.storyId)
              await this.assignStoryToNPC(npc, assignedStoryId)

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
            } else if (npc.storyId) {
              await this.performStoryTick(npc)
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
    if (this.cliOptions.mode !== 'api') {
      throw new Error(
        `Mode ${this.cliOptions.mode} is not implemented yet for endpoint ${endpoint}`
      )
    }

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
      return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/players/player-${characterId}.png`
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
      const npc: NPC = {
        id: mintResult.character.id,
        name: mintResult.character.name,
        health: mintResult.character.health,
        energy: mintResult.character.energy,
        earth: mintResult.character.earth,
        experience: Number(mintResult.character.experience || 0),
        location: mintResult.character.current_location_id,
        personality: personalityType,
        wallet: npcWallet,
        storyId: null,
        currentEventId: null,
        storyFlag: null,
        storyFlags: [],
        inventory: [],
        activityTimeout: null,
      }
      this.npcs.set(mintResult.character.id, npc)
      await this.assignStoryToNPC(npc, this.chooseStoryIdForNPC(null))

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

  private selectActionFromStoryText(input: string): string {
    const value = input.toLowerCase()
    if (value.includes('mine')) return 'mine'
    if (value.includes('travel') || value.includes('move')) return 'travel'
    if (value.includes('trade') || value.includes('buy') || value.includes('sell')) return 'trade'
    if (value.includes('chat') || value.includes('speak') || value.includes('talk')) return 'chat'
    if (value.includes('rest') || value.includes('recover')) return 'rest'
    return 'chat'
  }

  private chooseStoryChoice(npc: NPC, choices: ChoiceRecord[]): ChoiceRecord {
    if (choices.length === 1) return choices[0]

    if (npc.health < 30) {
      const safeChoice = choices.find((choice) =>
        `${choice.choice_key || ''} ${choice.text || ''}`.toLowerCase().match(/rest|heal|recover|avoid/)
      )
      if (safeChoice) return safeChoice
    }

    if (npc.energy < 25) {
      const energyChoice = choices.find((choice) =>
        `${choice.choice_key || ''} ${choice.text || ''}`.toLowerCase().match(/rest|recover|eat|sleep/)
      )
      if (energyChoice) return energyChoice
    }

    return choices[0]
  }

  private async executeStoryAction(
    npc: NPC,
    action: string,
    event: EventRecord
  ): Promise<void> {
    if (action === 'mine') {
      await this.performMining(npc)
      console.log(`[ACTION] Executed mine from event ${event.id}`)
      return
    }
    if (action === 'travel') {
      const destination =
        this.locations.find((location) => location.id === event.required_location_id) ||
        this.locations[Math.floor(Math.random() * this.locations.length)]
      if (destination) {
        await this.performTravel(npc, destination)
      }
      console.log(`[ACTION] Executed travel from event ${event.id}`)
      return
    }
    if (action === 'trade') {
      if (Math.random() > 0.5) await this.performBuy(npc)
      else await this.performSell(npc)
      console.log(`[ACTION] Executed trade from event ${event.id}`)
      return
    }
    if (action === 'rest') {
      npc.energy = Math.min(100, npc.energy + 15)
      npc.health = Math.min(100, npc.health + 5)
      console.log(`[ACTION] Executed rest from event ${event.id}`)
      return
    }

    await this.performChat(npc)
    console.log(`[ACTION] Executed chat from event ${event.id}`)
  }

  private async persistStoryProgress(npc: NPC): Promise<void> {
    try {
      await this.walletManager.supabase
        .from('characters')
        .update({
          health: npc.health,
          energy: npc.energy,
          earth: npc.earth,
          experience: npc.experience,
          story_id: npc.storyId || null,
          story_flag: npc.storyFlag || null,
          current_event_id: npc.currentEventId || null,
          current_location_id: npc.location,
          updated_at: new Date().toISOString(),
        })
        .eq('id', npc.id)

      console.log(
        `[PROGRESS] Updated story_flag/next_event_id for NPC ${npc.id}: flag=${npc.storyFlag || 'none'} next=${npc.currentEventId || 'none'}`
      )
    } catch (error) {
      console.warn(
        `[PROGRESS] Failed to persist story progress for NPC ${npc.id}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private async performStoryTick(npc: NPC): Promise<void> {
    if (!npc.storyId) {
      await this.performRandomActivity(npc)
      return
    }

    const bundle = await this.loadStoryBundle(npc.storyId)
    if (!bundle) {
      await this.performRandomActivity(npc)
      return
    }

    const currentEventId =
      npc.currentEventId ||
      bundle.story.first_event_id ||
      bundle.fallbackFirstEventId

    if (!currentEventId) {
      await this.performRandomActivity(npc)
      return
    }

    const event = bundle.eventsById.get(currentEventId)
    if (!event) {
      npc.currentEventId = bundle.fallbackFirstEventId
      await this.persistStoryProgress(npc)
      return
    }

    const choices = bundle.choicesByEventId.get(event.id) || []
    if (!choices.length) {
      await this.performRandomActivity(npc)
      return
    }

    const selectedChoice = this.chooseStoryChoice(npc, choices)
    const actionSource = `${selectedChoice.choice_key || ''} ${selectedChoice.text || ''} ${event.title || ''}`
    const action = this.selectActionFromStoryText(actionSource)
    await this.executeStoryAction(npc, action, event)

    const consequence = bundle.consequenceByChoiceId.get(selectedChoice.id)
    if (consequence?.consequence_data) {
      const result = applyConsequence(consequence.consequence_data, {
        health: npc.health,
        energy: npc.energy,
        experience: npc.experience,
        earth: npc.earth,
        inventory: npc.inventory,
        storyFlags: npc.storyFlags,
      })

      npc.health = result.nextState.health
      npc.energy = result.nextState.energy
      npc.earth = result.nextState.earth
      npc.experience = result.nextState.experience
      npc.inventory = result.nextState.inventory || npc.inventory
      npc.storyFlags = result.nextState.storyFlags || npc.storyFlags
      npc.storyFlag = result.deltas.addedStoryFlags[0] || npc.storyFlag || null
      npc.currentEventId =
        result.deltas.nextEventId ||
        consequence.consequence_data.next_event_id ||
        npc.currentEventId

      console.log(
        `[CONSEQUENCE] Applied deltas: ${JSON.stringify({
          health: result.deltas.health,
          energy: result.deltas.energy,
          experience: result.deltas.experience,
          earth: result.deltas.earth,
          nextEventId: result.deltas.nextEventId,
          storyFlags: result.deltas.addedStoryFlags,
        })} to NPC ${npc.id}`
      )
    }

    await this.persistStoryProgress(npc)
    this.metrics.totalActivities++
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
      const message = generateChatMessage({
        personality: npc.personality,
        location: npc.location,
      })
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
      const message = generateChatMessage({
        personality: npc.personality,
        location: npc.location,
      })
      
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

  // ===== SHARED ACTION HELPERS (Phase 2 stubs for story playback integration) =====
  private applyDamageToNPC(npc: NPC, damageAmount: number): void {
    const result = applyDamage(npc.health, damageAmount)
    npc.health = result.newHealth
  }

  private checkNPCDeathState(npc: NPC): { dead: boolean; reason: string } {
    return checkDeath(npc.health, npc.energy)
  }

  private applyConsequenceToNPC(
    npc: NPC,
    consequence: ActionConsequence
  ): { nextEventId: string | null } {
    const result = applyConsequence(consequence, {
      health: npc.health,
      energy: npc.energy,
      experience: 0,
      earth: npc.earth,
    })

    npc.health = result.nextState.health
    npc.energy = result.nextState.energy
    npc.earth = result.nextState.earth

    return { nextEventId: result.deltas.nextEventId }
  }
}

// Create and start the NPC engine
const engine = new NPCEngine()
engine.start().catch((error) => {
  console.error('Failed to start NPC engine:', error)
  process.exit(1)
})
