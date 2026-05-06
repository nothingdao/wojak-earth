import { Router } from 'express'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

const router = Router()
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed')

router.get('/sol-balance', async (req, res) => {
  try {
    const { wallet_address } = req.query as { wallet_address?: string }
    if (!wallet_address) return res.status(400).json({ error: 'wallet_address required' })

    const balance = await connection.getBalance(new PublicKey(wallet_address))
    const solBalance = balance / LAMPORTS_PER_SOL
    return res.json({ success: true, solBalance, balance: solBalance, lamports: balance, wallet_address })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message })
  }
})

export default router
