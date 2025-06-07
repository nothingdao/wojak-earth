// netlify/functions/create-payment-request.js
import { encodeURL, createQR } from '@solana/pay'
import { PublicKey, Keypair } from '@solana/web3.js'
import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Your treasury wallet public key - set this in your environment variables
const TREASURY_WALLET = new PublicKey(process.env.TREASURY_WALLET_ADDRESS || 'YourTreasuryWalletAddressHere')
const NFT_PRICE_SOL = 2 // 2 SOL for NFT minting

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

    // Create Solana Pay URL using the correct API
    const transferRequestUrl = encodeURL({
      recipient: TREASURY_WALLET,
      amount: NFT_PRICE_SOL,
      reference: reference, // Use generated keypair public key as reference
      label: 'Wojak Earth NFT',
      message: 'Payment for Wojak Earth character NFT',
      memo: memo
    })

    // Generate QR code for the payment request
    const qrCode = await createQR(transferRequestUrl, 400) // 400x400 QR code

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
        qrCode: qrCode,
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

