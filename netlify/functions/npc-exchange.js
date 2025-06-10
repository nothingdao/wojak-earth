// netlify/functions/npc-exchange.js - NPCs trade coins for SOL at market rates
import { createClient } from '@supabase/supabase-js'
import { Connection, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js'
import { randomUUID } from 'crypto'
import { NPCWalletManager } from '../../wallet-manager.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const MIN_TRANSACTION_USD = 1 // Minimum $1 transaction
const MAX_TRANSACTION_USD = 100 // Maximum $100 transaction  
const TREASURY_RESERVE_SOL = 5 // Keep at least 5 SOL in treasury
const EXCHANGE_FEE_PERCENT = 0.5 // 0.5% exchange fee

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const {
      wallet_address,
      action, // 'BUY_SOL' or 'SELL_SOL'
      amountUSD, // Amount in USD value (since 1 coin = $1)
      character_id
    } = JSON.parse(event.body || '{}')

    if (!wallet_address || !action || !amountUSD || !character_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: wallet_address, action, amountUSD, character_id'
        })
      }
    }

    // Get current SOL price
    const solPrice = await getCurrentSOLPrice()
    console.log(`💰 Current SOL price: $${solPrice}`)

    // Verify this is an NPC character
    const { data: character, error: characterError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', character_id)
      .eq('character_type', 'NPC')
      .eq('status', 'ACTIVE')
      .single()

    if (characterError || !character) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'NPC character not found' })
      }
    }

    // Verify wallet address matches
    if (character.wallet_address !== wallet_address) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Wallet address mismatch' })
      }
    }

    // Validate transaction amount
    if (amountUSD < MIN_TRANSACTION_USD || amountUSD > MAX_TRANSACTION_USD) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Transaction must be between $${MIN_TRANSACTION_USD} and $${MAX_TRANSACTION_USD}`
        })
      }
    }

    // Initialize wallet manager and connection
    const walletManager = new NPCWalletManager(supabase)
    const connection = new Connection("https://api.devnet.solana.com", "confirmed")
    const treasuryWallet = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.SERVER_KEYPAIR_SECRET))
    )

    // Load NPC wallet
    const npcWallet = await walletManager.load(character_id)
    if (!npcWallet) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to load NPC wallet' })
      }
    }

    let result
    if (action === 'BUY_SOL') {
      result = await buySOL(character, amountUSD, solPrice, npcWallet, treasuryWallet, connection)
    } else if (action === 'SELL_SOL') {
      result = await sellSOL(character, amountUSD, solPrice, npcWallet, treasuryWallet, connection)
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action. Use BUY_SOL or SELL_SOL' })
      }
    }

    // Update character coins in database
    await supabase
      .from('characters')
      .update({
        coins: result.newCoinBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', character_id)

    // Log the transaction with debug logging
    const transactionId = randomUUID()
    const currentTime = new Date().toISOString()

    const transactionData = {
      id: transactionId,
      character_id: character_id,
      type: 'EXCHANGE',
      description: result.description,
      created_at: currentTime,

      // Blockchain ledger fields (lowercase to match database)
      from_vault: action === 'BUY_SOL' ? 'RUST_COIN' : 'SCRAP_SOL',
      to_vault: action === 'BUY_SOL' ? 'SCRAP_SOL' : 'RUST_COIN',
      from_units: action === 'BUY_SOL' ? result.coinsSpent : result.solSpent,
      to_units: action === 'BUY_SOL' ? result.solReceived : result.coinsReceived,
      exchange_flux: action === 'BUY_SOL' ? (result.coinsSpent / result.solReceived) : (result.coinsReceived / result.solSpent),

      // Wasteland blockchain metadata (lowercase to match database)
      wasteland_block: Math.floor(Date.now() / 60000),
      txn_shard: `w${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      sender_shard: `shard_${wallet_address.slice(-8)}`,
      receiver_shard: 'SYSTEM_AMM',
      energy_burn: 2,
      sequence_id: Date.now()
    }

    console.log('🔗 BLOCKCHAIN TRANSACTION DATA:', JSON.stringify(transactionData, null, 2))

    const { error: insertError } = await supabase
      .from('transactions')
      .insert(transactionData)

    if (insertError) {
      console.error('❌ TRANSACTION INSERT FAILED:', insertError)
    } else {
      console.log('✅ BLOCKCHAIN TRANSACTION LOGGED SUCCESSFULLY')
    }

    console.log('✅ Transaction logged successfully with blockchain fields')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        action: action,
        solPrice: solPrice,
        ...result
      })
    }

  } catch (error) {
    console.error('Exchange error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Exchange failed',
        message: error.message
      })
    }
  }
}

async function getCurrentSOLPrice() {
  try {
    // Try CoinGecko first (free tier)
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
    const data = await response.json()

    if (data.solana?.usd) {
      return data.solana.usd
    }

    // Fallback to CoinMarketCap if CoinGecko fails
    const cmcResponse = await fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=SOL', {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY || ''
      }
    })

    if (cmcResponse.ok) {
      const cmcData = await cmcResponse.json()
      return cmcData.data.SOL.quote.USD.price
    }

    // Final fallback - use approximate price
    console.warn('Could not fetch SOL price, using fallback')
    return 180 // Approximate SOL price as fallback

  } catch (error) {
    console.error('Error fetching SOL price:', error)
    return 180 // Fallback price
  }
}

async function buySOL(character, amountUSD, solPrice, npcWallet, treasuryWallet, connection) {
  const coinsToSpend = Math.floor(amountUSD) // 1 coin = $1

  if (character.coins < coinsToSpend) {
    throw new Error(`Insufficient coins. Have ${character.coins}, need ${coinsToSpend}`)
  }

  // Calculate SOL amount (accounting for exchange fee)
  const feeAmount = amountUSD * (EXCHANGE_FEE_PERCENT / 100)
  const netAmountUSD = amountUSD - feeAmount
  const solToReceive = netAmountUSD / solPrice
  const lamportsToReceive = Math.floor(solToReceive * 1000000000)

  // Check treasury has enough SOL
  const treasuryBalance = await connection.getBalance(treasuryWallet.publicKey)
  const treasurySOL = treasuryBalance / 1000000000

  if (treasurySOL < (solToReceive + TREASURY_RESERVE_SOL)) {
    throw new Error('Treasury has insufficient SOL for this exchange')
  }

  console.log(`🏦 NPC ${character.name} buying ${solToReceive.toFixed(6)} SOL for $${amountUSD} (${coinsToSpend} coins) at $${solPrice}/SOL`)

  // Create transfer transaction from treasury to NPC
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: treasuryWallet.publicKey,
      toPubkey: npcWallet.publicKey,
      lamports: lamportsToReceive
    })
  )

  // Send transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [treasuryWallet]
  )

  const newCoinBalance = character.coins - coinsToSpend

  return {
    newCoinBalance,
    solReceived: solToReceive,
    coinsSpent: coinsToSpend,
    amountUSD: amountUSD,
    feeAmount: feeAmount,
    transactionSignature: signature,
    exchangeRate: solPrice,
    description: `Bought ${solToReceive.toFixed(6)} SOL for $${amountUSD} (${coinsToSpend} coins) at $${solPrice}/SOL`
  }
}

async function sellSOL(character, amountUSD, solPrice, npcWallet, treasuryWallet, connection) {
  // Calculate SOL needed to get USD amount (before fees)
  const grossSolNeeded = amountUSD / solPrice
  const feeAmount = amountUSD * (EXCHANGE_FEE_PERCENT / 100)
  const netCoinsToReceive = Math.floor(amountUSD - feeAmount)

  const lamportsToSpend = Math.floor(grossSolNeeded * 1000000000)

  // Check NPC has enough SOL
  const npcBalance = await connection.getBalance(npcWallet.publicKey)
  if (npcBalance < lamportsToSpend) {
    const npcSOL = npcBalance / 1000000000
    throw new Error(`Insufficient SOL. Have ${npcSOL.toFixed(6)}, need ${grossSolNeeded.toFixed(6)}`)
  }

  console.log(`🏦 NPC ${character.name} selling ${grossSolNeeded.toFixed(6)} SOL for $${amountUSD} (${netCoinsToReceive} coins) at $${solPrice}/SOL`)

  // Create transfer transaction from NPC to treasury
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: npcWallet.publicKey,
      toPubkey: treasuryWallet.publicKey,
      lamports: lamportsToSpend
    })
  )

  // Sign with NPC wallet and send
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [npcWallet]
  )

  const newCoinBalance = character.coins + netCoinsToReceive

  return {
    newCoinBalance,
    coinsReceived: netCoinsToReceive,
    solSpent: grossSolNeeded,
    amountUSD: amountUSD,
    feeAmount: feeAmount,
    transactionSignature: signature,
    exchangeRate: solPrice,
    description: `Sold ${grossSolNeeded.toFixed(6)} SOL for $${amountUSD} (${netCoinsToReceive} coins) at $${solPrice}/SOL`
  }
}
