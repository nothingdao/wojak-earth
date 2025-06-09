// netlify/functions/get-exchange-info.js - Get current SOL prices and exchange rates
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
    const MIN_TRANSACTION_USD = 1
    const MAX_TRANSACTION_USD = 100
    const TREASURY_RESERVE_SOL = 5
    const EXCHANGE_FEE_PERCENT = 0.5

    // Get current SOL price
    const solPrice = await getCurrentSOLPrice()

    // Get treasury balance
    const connection = new Connection("https://api.devnet.solana.com", "confirmed")
    const treasuryWallet = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.SERVER_KEYPAIR_SECRET))
    )

    const treasuryBalance = await connection.getBalance(treasuryWallet.publicKey)
    const treasurySOL = treasuryBalance / 1000000000
    const availableForExchange = Math.max(0, treasurySOL - TREASURY_RESERVE_SOL)

    // Calculate exchange amounts
    const minSOLForBuy = (MIN_TRANSACTION_USD * (1 - EXCHANGE_FEE_PERCENT / 100)) / solPrice
    const maxSOLForBuy = (MAX_TRANSACTION_USD * (1 - EXCHANGE_FEE_PERCENT / 100)) / solPrice
    const minSOLForSell = MIN_TRANSACTION_USD / solPrice
    const maxSOLForSell = MAX_TRANSACTION_USD / solPrice

    const exchangeInfo = {
      // Current market data
      solPrice: solPrice,
      priceSource: "Static Test Price",
      lastPriceUpdate: new Date().toISOString(),

      // Exchange parameters
      exchangeFeePercent: EXCHANGE_FEE_PERCENT,
      minTransactionUSD: MIN_TRANSACTION_USD,
      maxTransactionUSD: MAX_TRANSACTION_USD,

      // Treasury status
      treasuryReserve: TREASURY_RESERVE_SOL,
      treasuryBalance: treasurySOL,
      availableForExchange: availableForExchange,
      isActive: availableForExchange > 0.1,

      // Exchange calculations
      rates: {
        // For buying SOL with coins (1 coin = $1)
        buySOL: {
          rate: `$${solPrice.toFixed(2)} per SOL`,
          coinsPerSOL: solPrice, // How many coins needed to buy 1 SOL
          netSOLPerDollar: (1 - EXCHANGE_FEE_PERCENT / 100) / solPrice, // After fees
          example: {
            spend: "$10 (10 coins)",
            receive: `${((10 * (1 - EXCHANGE_FEE_PERCENT / 100)) / solPrice).toFixed(6)} SOL`,
            fee: `$${(10 * EXCHANGE_FEE_PERCENT / 100).toFixed(2)}`
          }
        },

        // For selling SOL for coins
        sellSOL: {
          rate: `$${solPrice.toFixed(2)} per SOL`,
          dollarsPerSOL: solPrice, // How many dollars you get per SOL
          netCoinsPerSOL: solPrice * (1 - EXCHANGE_FEE_PERCENT / 100), // After fees
          example: {
            spend: `${(10 / solPrice).toFixed(6)} SOL`,
            receive: `${Math.floor(10 * (1 - EXCHANGE_FEE_PERCENT / 100))} coins ($${10 * (1 - EXCHANGE_FEE_PERCENT / 100)})`,
            fee: `$${(10 * EXCHANGE_FEE_PERCENT / 100).toFixed(2)}`
          }
        }
      },

      // Transaction limits in different units
      limits: {
        minCoinsForBuySOL: MIN_TRANSACTION_USD, // $1 = 1 coin
        maxCoinsForBuySOL: MAX_TRANSACTION_USD, // $100 = 100 coins
        minSOLForBuySOL: minSOLForBuy,
        maxSOLForBuySOL: maxSOLForBuy,
        minSOLForSellSOL: minSOLForSell,
        maxSOLForSellSOL: maxSOLForSell
      },

      // Quick reference conversions
      conversions: {
        oneSOLInCoins: Math.floor(solPrice),
        oneSOLInUSD: solPrice,
        oneCoinInSOL: 1 / solPrice,
        oneDollarInSOL: 1 / solPrice,
        tenDollarsInSOL: 10 / solPrice,
        hundredDollarsInSOL: 100 / solPrice
      },

      fees: {
        exchangeFeePercent: EXCHANGE_FEE_PERCENT,
        networkFee: "~0.000005 SOL (Solana network fee)",
        note: "Exchange fee applies to all trades. Network fees paid separately."
      },

      status: {
        operational: treasurySOL > TREASURY_RESERVE_SOL,
        liquidityStatus: availableForExchange > 10 ? 'HIGH' :
          availableForExchange > 2 ? 'MEDIUM' : 'LOW',
        maxPossibleExchangeUSD: Math.floor(availableForExchange * solPrice * 0.9), // 90% safety margin
        lastUpdate: new Date().toISOString()
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(exchangeInfo, null, 2)
    }

  } catch (error) {
    console.error('Error getting exchange info:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get exchange information',
        message: error.message
      })
    }
  }
}

async function getCurrentSOLPrice() {
  // Static price for testing - no API rate limits
  const testPrice = 180
  console.log(`📈 Using test SOL price: $${testPrice}`)
  return testPrice
}
