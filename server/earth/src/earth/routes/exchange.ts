import { Router } from 'express'
import { Connection, Keypair } from '@solana/web3.js'

const router = Router()

const EXCHANGE_FEE_PERCENT = 0.5
const MIN_TRANSACTION_USD = 1
const MAX_TRANSACTION_USD = 100
const TREASURY_RESERVE_SOL = 5

async function getCurrentSOLPrice(): Promise<number> {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
    const data = await r.json() as any
    return data?.solana?.usd ?? 150
  } catch {
    return 150 // fallback
  }
}

router.get('/exchange/info', async (_req, res) => {
  try {
    const solPrice = await getCurrentSOLPrice()
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed')
    const treasuryWallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.SERVER_KEYPAIR_SECRET!)))
    const treasuryBalance = await connection.getBalance(treasuryWallet.publicKey)
    const treasurySOL = treasuryBalance / 1e9
    const availableForExchange = Math.max(0, treasurySOL - TREASURY_RESERVE_SOL)

    return res.json({
      solPrice,
      exchangeFeePercent: EXCHANGE_FEE_PERCENT,
      minTransactionUSD: MIN_TRANSACTION_USD,
      maxTransactionUSD: MAX_TRANSACTION_USD,
      treasuryReserve: TREASURY_RESERVE_SOL,
      treasuryBalance: treasurySOL,
      availableForExchange,
      isActive: availableForExchange > 0.1,
      rates: {
        buySOL: {
          rate: `$${solPrice.toFixed(2)} per SOL`,
          earthPerSOL: solPrice,
          netSOLPerDollar: (1 - EXCHANGE_FEE_PERCENT / 100) / solPrice,
        },
        sellSOL: {
          rate: `$${solPrice.toFixed(2)} per SOL`,
          dollarsPerSOL: solPrice,
          netCoinsPerSOL: solPrice * (1 - EXCHANGE_FEE_PERCENT / 100),
        },
      },
      limits: {
        minCoinsForBuySOL: MIN_TRANSACTION_USD,
        maxCoinsForBuySOL: MAX_TRANSACTION_USD,
        minSOLForSellSOL: MIN_TRANSACTION_USD / solPrice,
        maxSOLForSellSOL: MAX_TRANSACTION_USD / solPrice,
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
})

router.get('/exchange/quote', async (req, res) => {
  try {
    const { type, amount } = req.query as { type?: string; amount?: string }
    if (!type || !amount) return res.status(400).json({ error: 'type and amount required' })

    const solPrice = await getCurrentSOLPrice()
    const amt = parseFloat(amount)
    const fee = amt * (EXCHANGE_FEE_PERCENT / 100)

    if (type === 'buy_sol') {
      // Spend earth, get SOL
      const netEarth = amt - fee
      const solOut = netEarth / solPrice
      return res.json({ type, inputAmount: amt, outputAmount: solOut, fee, solPrice, expiresAt: Date.now() + 60000 })
    } else if (type === 'sell_sol') {
      // Spend SOL, get earth
      const earthOut = Math.floor(amt * solPrice * (1 - EXCHANGE_FEE_PERCENT / 100))
      return res.json({ type, inputAmount: amt, outputAmount: earthOut, fee: amt * (EXCHANGE_FEE_PERCENT / 100), solPrice, expiresAt: Date.now() + 60000 })
    }

    return res.status(400).json({ error: 'type must be buy_sol or sell_sol' })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
})

export default router
