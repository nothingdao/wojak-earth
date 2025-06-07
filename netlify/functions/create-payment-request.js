// netlify/functions/create-payment-request.js
import { encodeURL } from '@solana/pay'
import { PublicKey, Keypair } from '@solana/web3.js'
import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import BigNumber from 'bignumber.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Your treasury wallet public key - set this in your environment variables
const TREASURY_WALLET = new PublicKey(process.env.TREASURY_WALLET_ADDRESS || 'YourTreasuryWalletAddressHere')
const NFT_PRICE_SOL = 0.1 // 0.1 SOL for NFT minting

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
    const { walletAddress, characterData } = JSON.parse(event.body || '{}')

    if (!walletAddress) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Wallet address is required' })
      }
    }

    // Check if wallet already has a character
    const { data: existingChar } = await supabase
      .from('characters')
      .select('id, name')
      .eq('walletAddress', walletAddress)
      .single()

    if (existingChar) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Wallet already has a character',
          existingCharacter: existingChar.name
        })
      }
    }

    // Generate unique payment ID
    const paymentId = randomUUID()
    const memo = `wojak-nft-${paymentId}`

    // Generate a unique reference for Solana Pay (must be a valid public key)
    const referenceKeypair = Keypair.generate()
    const reference = referenceKeypair.publicKey

    console.log('Creating Solana Pay URL with:', {
      recipient: TREASURY_WALLET.toString(),
      amount: NFT_PRICE_SOL,
      reference: reference.toString(),
      memo: memo
    })

    // Create Solana Pay URL using the correct API
    let transferRequestUrl
    try {
      transferRequestUrl = encodeURL({
        recipient: TREASURY_WALLET,
        amount: new BigNumber(NFT_PRICE_SOL),
        reference: reference,
        label: 'Wojak Earth NFT',
        message: 'Payment for Wojak Earth character NFT',
        memo: memo
      })
      console.log('Generated Solana Pay URL:', transferRequestUrl.toString())
    } catch (encodeError) {
      console.error('Error encoding Solana Pay URL:', encodeError)
      // Fallback: create manual Solana Pay URL
      const params = new URLSearchParams({
        recipient: TREASURY_WALLET.toString(),
        amount: NFT_PRICE_SOL.toString(),
        reference: reference.toString(),
        label: 'Wojak Earth NFT',
        message: 'Payment for Wojak Earth character NFT',
        memo: memo
      })
      transferRequestUrl = new URL(`solana:${TREASURY_WALLET.toString()}?${params.toString()}`)
      console.log('Fallback URL generated:', transferRequestUrl.toString())
    }

    // Store pending payment in database
    const { data: pendingPayment, error: paymentError } = await supabase
      .from('pending_payments')
      .insert({
        id: paymentId,
        wallet_address: walletAddress,
        amount: NFT_PRICE_SOL,
        status: 'PENDING',
        character_data: characterData,
        memo: memo,
        treasury_wallet: TREASURY_WALLET.toString(),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // Expires in 30 minutes
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating pending payment:', paymentError)
      throw new Error('Failed to create payment request')
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        paymentId: paymentId,
        paymentUrl: transferRequestUrl.toString(),
        // QR code will be generated on frontend
        amount: NFT_PRICE_SOL,
        treasuryWallet: TREASURY_WALLET.toString(),
        memo: memo,
        expiresAt: pendingPayment.expires_at,
        message: `Please pay ${NFT_PRICE_SOL} SOL to mint your Wojak Earth NFT`
      })
    }

  } catch (error) {
    console.error('Error creating payment request:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to create payment request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

