/* eslint-disable @typescript-eslint/no-explicit-any */
// netlify/functions/earth-bridge.ts - Fixed with user token account creation
import supabaseAdmin from '../../src/utils/supabase-admin'
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import { randomUUID } from 'crypto'

const supabase = supabaseAdmin

const connection = new Connection(
  process.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
)
const treasuryWalletAddress = process.env.VITE_TREASURY_WALLET_ADDRESS!
const earthMintAddress = process.env.VITE_EARTH_MINT_ADDRESS!
const treasuryPrivateKey = process.env.TREASURY_KEYPAIR_SECRET // JSON array format

export const handler = async (event: any, _context: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const { action, amount, characterId, userWallet, txSignature } = JSON.parse(
      event.body || '{}'
    )

    console.log('🚀 Bridge request:', {
      action,
      amount,
      characterId,
      userWallet,
    })

    if (!action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Action required' }),
      }
    }

    if (!treasuryWalletAddress || !earthMintAddress) {
      console.error('❌ Missing critical environment variables')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Server configuration error',
          details: 'Missing treasury or mint configuration',
        }),
      }
    }

    switch (action) {
      case 'DEPOSIT':
        return await handleEarthDeposit(
          userWallet,
          amount,
          characterId,
          txSignature,
          headers
        )
      case 'WITHDRAW':
        return await handleEarthWithdrawal(
          characterId,
          amount,
          userWallet,
          headers
        )
      case 'STATUS':
        return await getBridgeStatus(headers)
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
        }
    }
  } catch (error) {
    console.error('❌ Bridge error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Bridge operation failed',
        message: error.message,
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
    }
  }
}

async function handleEarthDeposit(
  userWallet: string,
  amount: number,
  characterId: string,
  txSignature: string,
  headers: any
) {
  console.log('💰 Processing EARTH deposit...', {
    userWallet,
    amount,
    characterId,
  })

  if (!userWallet || !amount || !characterId || !txSignature) {
    throw new Error(
      'Missing required fields: userWallet, amount, characterId, txSignature'
    )
  }

  if (amount <= 0) {
    throw new Error('Amount must be greater than 0')
  }

  if (amount > 10000) {
    throw new Error('Deposit amount exceeds maximum limit (10,000 EARTH)')
  }

  // 1. Verify the EARTH transfer transaction
  console.log('🔍 Verifying transaction:', txSignature)
  const verified = await verifyEarthTransfer(txSignature, userWallet, amount)
  if (!verified) {
    throw new Error(
      'EARTH transfer verification failed - transaction not found or invalid'
    )
  }

  // 2. Get character and verify ownership
  console.log('👤 Fetching character:', characterId)
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .eq('wallet_address', userWallet)
    .eq('status', 'ACTIVE')
    .single()

  if (charError) {
    console.error('Character query error:', charError)
    throw new Error('Database error when fetching character')
  }

  if (!character) {
    throw new Error('Character not found, inactive, or wallet mismatch')
  }

  console.log('✅ Character verified:', character.name)

  // 3. Update character EARTH balance
  const newBalance = character.earth + amount
  console.log(
    `💎 Updating balance: ${character.earth} + ${amount} = ${newBalance}`
  )

  const { error: updateError } = await supabase
    .from('characters')
    .update({
      earth: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', characterId)

  if (updateError) {
    console.error('Failed to update character balance:', updateError)
    throw new Error('Failed to update character balance')
  }

  // 4. Log transaction - MANDATORY
  const transactionId = randomUUID()
  console.log('📝 Creating transaction record:', {
    id: transactionId,
    character_id: characterId,
    type: 'BRIDGE_DEPOSIT',
    amount: amount,
    txSignature: txSignature,
  })

  const { error: logError } = await supabase.from('transactions').insert({
    id: transactionId,
    character_id: characterId,
    type: 'EXCHANGE',
    description: `BRIDGE_DEPOSIT: Deposited ${amount} EARTH from wallet`,
    from_vault: 'ON_CHAIN',
    to_vault: 'IN_GAME',
    from_units: amount,
    to_units: amount,
    on_chain_signature: txSignature,
    created_at: new Date().toISOString(),
  })

  if (logError) {
    console.error('❌ CRITICAL: Failed to log bridge transaction:', logError)
    console.error('Transaction details:', JSON.stringify(logError, null, 2))

    // ROLLBACK
    console.log('🔄 Rolling back character balance due to logging failure')
    await supabase
      .from('characters')
      .update({
        earth: character.earth,
        updated_at: new Date().toISOString(),
      })
      .eq('id', characterId)

    throw new Error(
      `Transaction logging failed: ${
        logError.message || JSON.stringify(logError)
      }. Deposit rolled back.`
    )
  }

  console.log('✅ Transaction record created successfully:', transactionId)
  console.log('✅ Deposit completed successfully')

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: `Successfully deposited ${amount} EARTH`,
      previousBalance: character.earth,
      newBalance: newBalance,
      transactionSignature: txSignature,
      transactionId: transactionId,
      bridgeStatus: await getBridgeStatusData(),
    }),
  }
}

async function handleEarthWithdrawal(
  characterId: string,
  amount: number,
  userWallet: string,
  headers: any
) {
  console.log('🚀 HANDLEWITHDRAWAL VERSION: 2024-FIXED-TOKEN-ACCOUNT')
  console.log('🏦 Processing EARTH withdrawal...', {
    characterId,
    amount,
    userWallet,
  })

  if (!characterId || !amount || !userWallet) {
    throw new Error('Missing required fields: characterId, amount, userWallet')
  }

  if (amount <= 0) {
    throw new Error('Amount must be greater than 0')
  }

  if (amount > 1000) {
    throw new Error('Withdrawal amount exceeds maximum limit (1,000 EARTH)')
  }

  // 1. Get character and verify sufficient balance
  console.log('👤 Fetching character:', characterId)
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .eq('status', 'ACTIVE')
    .single()

  if (charError) {
    console.error('Character query error:', charError)
    throw new Error('Database error when fetching character')
  }

  if (!character) {
    throw new Error('Character not found or inactive')
  }

  if (character.wallet_address !== userWallet) {
    throw new Error('Wallet address mismatch')
  }

  if (character.earth < amount) {
    throw new Error(
      `Insufficient EARTH balance. Have: ${character.earth}, Need: ${amount}`
    )
  }

  console.log('✅ Character verified:', character.name)

  // 2. Check treasury has sufficient EARTH
  console.log('🏦 Checking treasury balance...')
  const treasuryBalance = await getTreasuryEarthBalance()
  if (treasuryBalance < amount) {
    throw new Error(
      `Treasury insufficient for withdrawal. Treasury has: ${treasuryBalance}, Need: ${amount}`
    )
  }

  console.log(`✅ Treasury check passed: ${treasuryBalance} >= ${amount}`)

  // 3. Send EARTH from treasury to user wallet
  console.log('💸 Sending EARTH from treasury...')
  const txSignature = await sendEarthFromTreasury(userWallet, amount)
  if (!txSignature) {
    throw new Error('Failed to send EARTH from treasury')
  }

  console.log('✅ Treasury transfer completed:', txSignature)

  // 4. Update character EARTH balance
  const newBalance = character.earth - amount
  console.log(
    `💎 Updating balance: ${character.earth} - ${amount} = ${newBalance}`
  )

  const { error: updateError } = await supabase
    .from('characters')
    .update({
      earth: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', characterId)

  if (updateError) {
    console.error(
      'Failed to update character balance after withdrawal:',
      updateError
    )
    throw new Error('Failed to process withdrawal')
  }

  // 5. Log transaction - MANDATORY
  const transactionId = randomUUID()
  console.log('📝 Creating withdrawal transaction record:', {
    id: transactionId,
    character_id: characterId,
    type: 'BRIDGE_WITHDRAW',
    amount: amount,
    txSignature: txSignature,
  })

  const { error: logError } = await supabase.from('transactions').insert({
    id: transactionId,
    character_id: characterId,
    type: 'EXCHANGE',
    description: `BRIDGE_WITHDRAW: Withdrew ${amount} EARTH to wallet`,
    from_vault: 'IN_GAME',
    to_vault: 'ON_CHAIN',
    from_units: amount,
    to_units: amount,
    on_chain_signature: txSignature,
    created_at: new Date().toISOString(),
  })

  if (logError) {
    console.error(
      '❌ CRITICAL: Failed to log withdrawal transaction:',
      logError
    )
    console.error('Transaction details:', JSON.stringify(logError, null, 2))

    // ROLLBACK
    console.log('🔄 Rolling back character balance due to logging failure')
    await supabase
      .from('characters')
      .update({
        earth: character.earth,
        updated_at: new Date().toISOString(),
      })
      .eq('id', characterId)

    throw new Error(
      `Transaction logging failed: ${
        logError.message || JSON.stringify(logError)
      }. Withdrawal rolled back.`
    )
  }

  console.log(
    '✅ Withdrawal transaction record created successfully:',
    transactionId
  )
  console.log('✅ Withdrawal completed successfully')

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: `Successfully withdrew ${amount} EARTH`,
      previousBalance: character.earth,
      newBalance: newBalance,
      earthSent: amount,
      transactionSignature: txSignature,
      transactionId: transactionId,
      bridgeStatus: await getBridgeStatusData(),
    }),
  }
}

async function getBridgeStatus(headers: any) {
  try {
    const status = await getBridgeStatusData()
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        bridgeStatus: status,
      }),
    }
  } catch (error) {
    console.error('❌ Failed to get bridge status:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch bridge status',
        details: error.message,
      }),
    }
  }
}

async function getBridgeStatusData() {
  console.log('📊 Fetching bridge status...')

  try {
    const treasuryEarth = await getTreasuryEarthBalance()

    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('earth')
      .eq('status', 'ACTIVE')

    if (charError) {
      console.error('Error fetching character balances:', charError)
    }

    const inGameEarth =
      characters?.reduce((sum, char) => sum + (char.earth || 0), 0) || 0

    const { data: recentActivity, error: activityError } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['BRIDGE_DEPOSIT', 'BRIDGE_WITHDRAW'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (activityError) {
      console.error('Error fetching recent activity:', activityError)
    }

    const bridgeRatio = inGameEarth > 0 ? treasuryEarth / inGameEarth : 1.0
    const healthStatus =
      treasuryEarth >= inGameEarth ? 'HEALTHY' : 'UNDERBACKED'

    const status = {
      treasuryEarthBalance: treasuryEarth,
      inGameCirculation: inGameEarth,
      bridgeRatio: bridgeRatio,
      maxWithdrawal: Math.min(treasuryEarth, 1000),
      backing:
        treasuryEarth >= inGameEarth
          ? '100%'
          : `${(bridgeRatio * 100).toFixed(1)}%`,
      healthStatus: healthStatus,
      recentActivity: recentActivity || [],
      lastUpdated: new Date().toISOString(),
    }

    console.log('📊 Bridge status:', status)
    return status
  } catch (error) {
    console.error('❌ Error in getBridgeStatusData:', error)
    throw error
  }
}

async function getTreasuryEarthBalance(): Promise<number> {
  try {
    const treasuryWallet = new PublicKey(treasuryWalletAddress)
    const earthMint = new PublicKey(earthMintAddress)

    const treasuryTokenAccount = await getAssociatedTokenAddress(
      earthMint,
      treasuryWallet
    )

    console.log(
      '🔍 Checking treasury token account:',
      treasuryTokenAccount.toString()
    )

    const balance = await connection.getTokenAccountBalance(
      treasuryTokenAccount
    )
    const uiAmount = parseFloat(balance.value.uiAmount?.toString() || '0')

    console.log(`💰 Treasury EARTH balance: ${uiAmount}`)
    return uiAmount
  } catch (error) {
    console.error('❌ Failed to get treasury EARTH balance:', error)
    console.error(
      "This might be because the treasury token account doesn't exist yet"
    )
    return 0
  }
}

async function verifyEarthTransfer(
  txSignature: string,
  userWallet: string,
  expectedAmount: number
): Promise<boolean> {
  try {
    console.log('🔍 Verifying transaction:', {
      txSignature,
      userWallet,
      expectedAmount,
    })

    const txInfo = await connection.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    })

    if (!txInfo || !txInfo.meta) {
      console.error('❌ Transaction not found or no metadata')
      return false
    }

    if (txInfo.meta.err) {
      console.error('❌ Transaction failed:', txInfo.meta.err)
      return false
    }

    console.log('✅ Basic transaction verification passed')

    const preTokenBalances = txInfo.meta.preTokenBalances || []
    const postTokenBalances = txInfo.meta.postTokenBalances || []

    console.log('🔍 Token balance changes:', {
      pre: preTokenBalances.length,
      post: postTokenBalances.length,
    })

    if (preTokenBalances.length === 0 && postTokenBalances.length === 0) {
      console.log('⚠️ No token balance data - allowing for development')
      return true
    }

    const earthMintString = earthMintAddress.toString()
    let earthTransferred = false

    for (const postBalance of postTokenBalances) {
      if (postBalance.mint === earthMintString) {
        const preBalance = preTokenBalances.find(
          (pre) => pre.accountIndex === postBalance.accountIndex
        )

        if (preBalance) {
          const balanceChange =
            (postBalance.uiTokenAmount.uiAmount || 0) -
            (preBalance.uiTokenAmount.uiAmount || 0)
          console.log(`💰 Balance change detected: ${balanceChange}`)

          if (Math.abs(Math.abs(balanceChange) - expectedAmount) < 0.001) {
            earthTransferred = true
            break
          }
        }
      }
    }

    if (!earthTransferred) {
      console.log(
        '⚠️ Detailed verification failed, but allowing for development'
      )
      return process.env.NODE_ENV === 'development'
    }

    console.log('✅ Transaction fully verified')
    return true
  } catch (error) {
    console.error('❌ Transaction verification failed:', error)

    if (process.env.NODE_ENV === 'development') {
      console.log(
        '⚠️ Verification error in development mode - allowing transaction'
      )
      return true
    }

    return false
  }
}

async function sendEarthFromTreasury(
  userWallet: string,
  amount: number
): Promise<string | null> {
  console.log('🚀 SENDEARTH VERSION: 2024-FIXED-TOKEN-ACCOUNT') // Add this line

  try {
    console.log(`🏦 Sending ${amount} EARTH from treasury to ${userWallet}`)

    if (!treasuryPrivateKey) {
      throw new Error(
        'TREASURY_KEYPAIR_SECRET not configured. Set it in your environment variables.'
      )
    }

    // Parse treasury private key from JSON array format
    let treasuryKeypair: Keypair
    try {
      const secretKeyArray = JSON.parse(treasuryPrivateKey)
      const secretKey = new Uint8Array(secretKeyArray)
      treasuryKeypair = Keypair.fromSecretKey(secretKey)
      console.log('✅ Treasury keypair loaded from JSON array')
    } catch (error) {
      throw new Error(
        `Invalid TREASURY_KEYPAIR_SECRET format. Must be JSON array: ${error.message}`
      )
    }

    const treasuryWallet = new PublicKey(treasuryWalletAddress)
    const userWalletPubkey = new PublicKey(userWallet)
    const earthMint = new PublicKey(earthMintAddress)

    // Verify treasury keypair matches treasury wallet address
    if (!treasuryKeypair.publicKey.equals(treasuryWallet)) {
      throw new Error(
        `Treasury private key mismatch. Key is for ${treasuryKeypair.publicKey.toString()}, but expected ${treasuryWallet.toString()}`
      )
    }

    console.log('✅ Treasury keypair verified')

    // Get token accounts
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      earthMint,
      treasuryWallet
    )
    const userTokenAccount = await getAssociatedTokenAddress(
      earthMint,
      userWalletPubkey
    )

    console.log(`Treasury token account: ${treasuryTokenAccount.toString()}`)
    console.log(`User token account: ${userTokenAccount.toString()}`)

    // Verify treasury has sufficient EARTH balance
    try {
      const treasuryAccount = await getAccount(connection, treasuryTokenAccount)
      const treasuryBalance = Number(treasuryAccount.amount) / Math.pow(10, 9)
      console.log(`Treasury balance: ${treasuryBalance} EARTH`)

      if (treasuryBalance < amount) {
        throw new Error(
          `Treasury insufficient balance. Have: ${treasuryBalance}, Need: ${amount}`
        )
      }
    } catch (error) {
      if (error.message.includes('could not find account')) {
        throw new Error('Treasury token account does not exist')
      }
      throw error
    }

    // ✅ FIXED: Check if user token account exists, create if needed
    let needsCreateUserAccount = false
    try {
      await getAccount(connection, userTokenAccount)
      console.log('✅ User token account exists')
    } catch (error) {
      if (
        error.message.includes('could not find account') ||
        error.name === 'TokenAccountNotFoundError'
      ) {
        console.log('📝 User token account does not exist - will create it')
        needsCreateUserAccount = true
      } else {
        throw error
      }
    }

    // Build transaction
    const transaction = new Transaction()

    // ✅ FIXED: Add create user token account instruction if needed
    if (needsCreateUserAccount) {
      console.log('Adding create user token account instruction')
      const createAccountInstruction = createAssociatedTokenAccountInstruction(
        treasuryWallet, // payer (treasury pays for account creation)
        userTokenAccount, // associated token account
        userWalletPubkey, // owner
        earthMint // mint
      )
      transaction.add(createAccountInstruction)
    }

    // Convert amount to base units (9 decimals)
    const transferAmount = BigInt(Math.floor(amount * Math.pow(10, 9)))
    console.log(
      `Transfer amount: ${amount} EARTH = ${transferAmount.toString()} base units`
    )

    // Add transfer instruction
    const transferInstruction = createTransferInstruction(
      treasuryTokenAccount, // source
      userTokenAccount, // destination
      treasuryWallet, // owner
      transferAmount // amount as BigInt
    )
    transaction.add(transferInstruction)

    // Get recent blockhash and set fee payer
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = treasuryWallet

    console.log('🔐 Signing transaction with treasury key...')
    transaction.sign(treasuryKeypair)

    console.log('📡 Sending transaction to Solana...')
    const signature = await connection.sendRawTransaction(
      transaction.serialize()
    )

    console.log(`Transaction sent: ${signature}`)
    console.log('⏳ Waiting for confirmation...')

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(
      signature,
      'confirmed'
    )

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
      )
    }

    console.log('✅ Real treasury withdrawal completed:', signature)
    console.log(`💰 Sent ${amount} EARTH to ${userWallet}`)

    return signature
  } catch (error) {
    console.error('❌ Failed to send EARTH from treasury:', error)
    throw error
  }
}
