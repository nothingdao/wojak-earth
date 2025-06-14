// netlify/functions/get-exchange-quote.js - Get a quote for coin-SOL exchange
import { Connection, Keypair } from '@solana/web3.js'

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { action, amountUSD } = event.queryStringParameters || {}

    if (!action || !amountUSD) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters: action (BUY_SOL/SELL_SOL) and amountUSD'
        })
      }
    }

    const amount = parseFloat(amountUSD)
    if (isNaN(amount) || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid amountUSD - must be a positive number' })
      }
    }

    if (amount < 1 || amount > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Amount must be between $1 and $100'
        })
      }
    }

    // Get current SOL price
    const solPrice = await getCurrentSOLPrice()

    // Check treasury liquidity
    const connection = new Connection("https://api.devnet.solana.com", "confirmed")
    const treasuryWallet = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.SERVER_KEYPAIR_SECRET
      )
    const treasuryBalance = await connection.getBalance(treasuryWallet.publicKey)
    const treasurySOL = treasuryBalance / 1000000000
    const availableForExchange = Math.max(0, treasurySOL - 5) // 5 SOL reserve

    const EXCHANGE_FEE_PERCENT = 0.5

    let quote

    if (action === 'BUY_SOL') {
      // User wants to spend coins (USD) to get SOL
      const coinsRequired = amount // 1 coin = $1
      const feeAmount = amount * (EXCHANGE_FEE_PERCENT / 100)
      const netAmountUSD = amount - feeAmount
      const solReceived = netAmountUSD / solPrice

      // Check if treasury has enough SOL
      const canExecute = solReceived <= availableForExchange

      quote = {
        action: 'BUY_SOL',
        inputAmount: amount,
        inputCurrency: 'USD',
        coinsRequired: coinsRequired,
        outputAmount: solReceived,
        outputCurrency: 'SOL',
        exchangeRate: solPrice,
        feePercent: EXCHANGE_FEE_PERCENT,
        feeAmount: feeAmount,
        netAmount: netAmountUSD,
        canExecute: canExecute,
        reason: canExecute ? 'Quote available' : 'Insufficient treasury liquidity',
        breakdown: {
          grossAmount: `$${amount}`,
          fee: `$${feeAmount.toFixed(2)} (${EXCHANGE_FEE_PERCENT}%)`,
          netForExchange: `$${netAmountUSD.toFixed(2)}`,
          solPrice: `$${solPrice.toFixed(2)} per SOL`,
          solReceived: `${solReceived.toFixed(6)} SOL`
        }
      }

    } else if (action === 'SELL_SOL') {
      // User wants to spend SOL to get coins (USD)
      const grossSOLNeeded = amount / solPrice
      const feeAmount = amount * (EXCHANGE_FEE_PERCENT / 100)
      const netCoinsReceived = amount - feeAmount

      quote = {
        action: 'SELL_SOL',
        inputAmount: grossSOLNeeded,
        inputCurrency: 'SOL',
        solRequired: grossSOLNeeded,
        outputAmount: netCoinsReceived,
        outputCurrency: 'USD',
        coinsReceived: Math.floor(netCoinsReceived), // Coins are whole numbers
        exchangeRate: solPrice,
        feePercent: EXCHANGE_FEE_PERCENT,
        feeAmount: feeAmount,
        netAmount: netCoinsReceived,
        canExecute: true, // Can always sell SOL if user has it
        reason: 'Quote available',
        breakdown: {
          solRequired: `${grossSOLNeeded.toFixed(6)} SOL`,
          solPrice: `$${solPrice.toFixed(2)} per SOL`,
          grossValue: `$${amount}`,
          fee: `$${feeAmount.toFixed(2)} (${EXCHANGE_FEE_PERCENT}%)`,
          netReceived: `${Math.floor(netCoinsReceived)} coins ($${netCoinsReceived.toFixed(2)})`
        }
      }

    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action. Use BUY_SOL or SELL_SOL' })
      }
    }

    // Add market context
    quote.marketContext = {
      solPrice: solPrice,
      priceSource: 'CoinGecko API',
      treasuryLiquidity: availableForExchange,
      liquidityStatus: availableForExchange > 10 ? 'HIGH' :
        availableForExchange > 2 ? 'MEDIUM' : 'LOW',
      timestamp: new Date().toISOString(),
      validFor: '60 seconds' // Quotes expire after 1 minute
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(quote, null, 2)
    }

  } catch (error) {
    console.error('Error generating exchange quote:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate quote',
        message: error.message
      })
    }
  }
}

async function getCurrentSOLPrice() {
  try {
    // Try CoinGecko first
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.solana?.usd) {
      return data.solana.usd
    }

    throw new Error('Invalid CoinGecko response')

  } catch (error) {
    console.error('Error fetching SOL price:', error)

    try {
      // Fallback to Binance
      const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT')
      const binanceData = await binanceResponse.json()

      if (binanceData.price) {
        return parseFloat(binanceData.price)
      }
    } catch (binanceError) {
      console.error('Error fetching from Binance:', binanceError)
    }

    // Final fallback
    return 180
  }
}
