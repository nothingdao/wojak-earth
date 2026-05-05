import { SupabaseClient } from '@supabase/supabase-js'
import { Keypair } from '@solana/web3.js'

export class NPCWalletManager {
  supabase: SupabaseClient
  constructor(supabase: SupabaseClient)
  store(npcId: string, wallet: Keypair): Promise<void>
  load(npcId: string): Promise<Keypair | null>
  getExistingNPCs(): Promise<Array<{ id: string; personality: string }>>
}
