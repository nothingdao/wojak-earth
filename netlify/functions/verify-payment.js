// netlify/functions/verify-payment.js
import { Connection, PublicKey } from '@solana/web3.js'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const TREASURY_WALLET = new PublicKey(process.env.TREASURY_WALLET_ADDRESS || 'YourTreasuryWalletAddressHere')
const NFT_PRICE_SOL = 2

export const handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
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
    const { paymentId, signature } = JSON.parse(event.body || '{}')

    if (!paymentId || !signature) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Payment ID and transaction signature are required' 
        })
      }
    }

    // Get pending payment from database
    const { data: pendingPayment, error: paymentError } = await supabase
      .from('pending_payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (paymentError || !pendingPayment) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Payment request not found' 
        })
      }
    }

    // Check if payment has expired
    if (new Date() > new Date(pendingPayment.expires_at)) {
      await supabase
        .from('pending_payments')
        .update({ status: 'EXPIRED' })
        .eq('id', paymentId)

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Payment request has expired' 
        })
      }
    }

    // Check if payment was already verified
    if (pendingPayment.status === 'VERIFIED') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          verified: true,
          message: 'Payment already verified',
          paymentId: paymentId
        })
      }
    }

    // Verify transaction on Solana blockchain
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    )

    let transaction
    try {
      transaction = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      })
    } catch (error) {
      console.error('Error fetching transaction:', error)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid transaction signature or transaction not found' 
        })
      }
    }

    if (!transaction) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Transaction not found on blockchain' 
        })
      }
    }

    // Check if transaction was successful
    if (transaction.meta?.err) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Transaction failed on blockchain',
          transactionError: transaction.meta.err
        })
      }
    }

    // Verify transaction details
    const accountKeys = transaction.transaction.message.accountKeys.map(key => 
      typeof key === 'string' ? key : key.toString()
    )
    
    // Check if treasury wallet is in the transaction
    const treasuryInTransaction = accountKeys.includes(TREASURY_WALLET.toString())
    
    if (!treasuryInTransaction) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Transaction does not involve the treasury wallet' 
        })
      }
    }

    // Check transaction amount (simplified check - in production you'd want more robust verification)
    const preBalances = transaction.meta.preBalances
    const postBalances = transaction.meta.postBalances
    
    // Find treasury wallet index
    const treasuryIndex = accountKeys.findIndex(key => key === TREASURY_WALLET.toString())
    
    if (treasuryIndex === -1) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Treasury wallet not found in transaction' 
        })
      }
    }

    // Calculate amount received by treasury (in lamports)
    const treasuryBalanceChange = postBalances[treasuryIndex] - preBalances[treasuryIndex]
    const expectedAmountLamports = NFT_PRICE_SOL * 1000000000 // Convert SOL to lamports
    
    // Allow for small variance due to fees (within 1% tolerance)
    const tolerance = expectedAmountLamports * 0.01
    
    if (treasuryBalanceChange < expectedAmountLamports - tolerance) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Insufficient payment amount. Expected: ${NFT_PRICE_SOL} SOL, Received: ${treasuryBalanceChange / 1000000000} SOL` 
        })
      }
    }

    // Check memo if present
    const memoInstruction = transaction.transaction.message.instructions.find(
      instruction => {
        const programId = accountKeys[instruction.programIdIndex]
        return programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' // Memo program ID
      }
    )

    if (memoInstruction && memoInstruction.data) {
      const memo = Buffer.from(memoInstruction.data, 'base64').toString('utf8')
      if (memo !== pendingPayment.memo) {
        console.warn(`Memo mismatch. Expected: ${pendingPayment.memo}, Found: ${memo}`)
      }
    }

    // Payment verified! Update the database
    const { error: updateError } = await supabase
      .from('pending_payments')
      .update({
        status: 'VERIFIED',
        transaction_signature: signature,
        verified_at: new Date().toISOString(),
        amount_received: treasuryBalanceChange / 1000000000 // Convert back to SOL
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('Error updating payment status:', updateError)
      throw new Error('Failed to update payment status')
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        verified: true,
        paymentId: paymentId,
        transactionSignature: signature,
        amountReceived: treasuryBalanceChange / 1000000000,
        message: 'Payment verified successfully! You can now mint your NFT.'
      })
    }

  } catch (error) {
    console.error('Error verifying payment:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to verify payment',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

