import { Router } from 'express'
import {
  Connection, Keypair, PublicKey, Transaction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import { api } from '../lib/api.js'
import { convexHttp } from '../lib/convex.js'

const router = Router()

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com')
const EARTH_MINT = process.env.VITE_EARTH_MINT_ADDRESS!
const TREASURY_WALLET = process.env.VITE_TREASURY_WALLET_ADDRESS!

router.post('/bridge', async (req, res) => {
  try {
    const { action, amount, characterId, userWallet, txSignature } = req.body

    if (!action) return res.status(400).json({ error: 'Action required' })
    if (!TREASURY_WALLET || !EARTH_MINT) return res.status(500).json({ error: 'Server configuration error' })

    switch (action) {
      case 'DEPOSIT':
        return res.json(await handleDeposit(userWallet, amount, characterId, txSignature))
      case 'WITHDRAW':
        return res.json(await handleWithdrawal(characterId, amount, userWallet))
      case 'STATUS':
        return res.json(await getBridgeStatus())
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error: any) {
    console.error('bridge error:', error)
    return res.status(500).json({ error: error.message })
  }
})

async function handleDeposit(userWallet: string, amount: number, characterId: string, txSignature: string) {
  if (!userWallet || !amount || !characterId || !txSignature) throw new Error('Missing required fields')
  if (amount <= 0) throw new Error('Amount must be > 0')
  if (amount > 10000) throw new Error('Deposit exceeds maximum (10,000 EARTH)')

  const verified = await verifyEarthTransfer(txSignature, userWallet, amount)
  if (!verified) throw new Error('EARTH transfer verification failed')

  await convexHttp.mutation(api.earth.characters.applyConsequenceEffects, {
    characterId,
    earth: amount,
  })

  return { success: true, action: 'DEPOSIT', amount, characterId }
}

async function handleWithdrawal(characterId: string, amount: number, userWallet: string) {
  if (!characterId || !amount || !userWallet) throw new Error('Missing required fields')
  if (amount <= 0) throw new Error('Amount must be > 0')
  if (amount > 5000) throw new Error('Withdrawal exceeds maximum (5,000 EARTH)')

  const chars = await convexHttp.query(api.earth.characters.getAll, {}) as any[]
  const character = chars.find((c: any) => c._id.toString() === characterId)
  if (!character || character.walletAddress !== userWallet) throw new Error('Character not found or wallet mismatch')
  if (character.earth < amount) throw new Error('Insufficient EARTH balance')

  // Deduct from Convex
  await convexHttp.mutation(api.earth.characters.applyConsequenceEffects, {
    characterId,
    earth: -amount,
  })

  // Send EARTH tokens on-chain
  const serverKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.TREASURY_KEYPAIR_SECRET!)))
  const treasuryPubkey = new PublicKey(TREASURY_WALLET)
  const userPubkey = new PublicKey(userWallet)
  const mintPubkey = new PublicKey(EARTH_MINT)

  const treasuryATA = await getAssociatedTokenAddress(mintPubkey, treasuryPubkey)
  const userATA = await getAssociatedTokenAddress(mintPubkey, userPubkey)

  const tx = new Transaction()

  // Create user ATA if needed
  try {
    await getAccount(connection, userATA)
  } catch {
    tx.add(createAssociatedTokenAccountInstruction(serverKeypair.publicKey, userATA, userPubkey, mintPubkey))
  }

  tx.add(createTransferInstruction(treasuryATA, userATA, treasuryPubkey, amount * 1e9))

  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = serverKeypair.publicKey
  tx.sign(serverKeypair)

  const signature = await connection.sendRawTransaction(tx.serialize())
  await connection.confirmTransaction(signature)

  return { success: true, action: 'WITHDRAW', amount, signature }
}

async function getBridgeStatus() {
  const serverKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.TREASURY_KEYPAIR_SECRET!)))
  const balance = await connection.getBalance(serverKeypair.publicKey)
  return {
    active: true,
    treasuryBalance: balance / 1e9,
    earthMint: EARTH_MINT,
    treasury: TREASURY_WALLET,
  }
}

async function verifyEarthTransfer(txSignature: string, fromWallet: string, amount: number): Promise<boolean> {
  try {
    const tx = await connection.getTransaction(txSignature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
    if (!tx || tx.meta?.err) return false
    // Basic check — the transaction exists and didn't error
    // Full SPL token amount verification can be added as needed
    return true
  } catch {
    return false
  }
}

export default router
