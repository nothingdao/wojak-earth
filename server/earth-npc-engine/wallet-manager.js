// wallet-manager.js - Minimal NPC wallet persistence
import crypto from 'crypto'
import { Keypair } from '@solana/web3.js'

export class NPCWalletManager {
  constructor(supabase) {
    this.supabase = supabase
    this.masterKey = process.env.NPC_WALLET_MASTER_KEY
    if (!this.masterKey) {
      throw new Error('NPC_WALLET_MASTER_KEY environment variable required')
    }
  }

  // Simple encryption
  encrypt(privateKeyArray) {
    const key = crypto.scryptSync(this.masterKey, 'salt', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

    const privateKeyHex = Buffer.from(privateKeyArray).toString('hex')
    let encrypted = cipher.update(privateKeyHex, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return iv.toString('hex') + ':' + encrypted
  }

  // Simple decryption
  decrypt(encryptedData) {
    const [ivHex, encrypted] = encryptedData.split(':')
    const key = crypto.scryptSync(this.masterKey, 'salt', 32)
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return new Uint8Array(Buffer.from(decrypted, 'hex'))
  }

  // Store NPC wallet
  async store(character_id, keypair) {
    const encrypted = this.encrypt(keypair.secretKey)

    const { error } = await this.supabase
      .from('npc_wallets')
      .upsert({
        character_id: character_id,
        encrypted_private_key: encrypted,
        public_key: keypair.publicKey.toString()
      })

    if (error) throw error
  }

  // Load NPC wallet
  async load(character_id) {
    const { data, error } = await this.supabase
      .from('npc_wallets')
      .select('*')
      .eq('character_id', character_id)
      .single()

    if (error || !data) return null

    try {
      const privateKeyArray = this.decrypt(data.encrypted_private_key)
      return Keypair.fromSecretKey(privateKeyArray)
    } catch (e) {
      console.error(`Failed to decrypt wallet for ${character_id}:`, e.message)
      return null
    }
  }

  // Get all existing NPCs with wallets
  async getExistingNPCs() {
    const { data, error } = await this.supabase
      .from('characters')
      .select(`
        *,
        npc_wallets!inner(public_key)
      `)
      .eq('character_type', 'NPC')
      .eq('status', 'ACTIVE')

    if (error) throw error
    return data || []
  }
}
