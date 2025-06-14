// netlify/functions/get-sol-balance.js - UPDATED
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

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
    const { wallet_address } = event.queryStringParameters || {}

    if (!wallet_address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          message: 'Wallet address is required'
        })
      }
    }

    // Use Helius devnet endpoint
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://devnet.helius-rpc.com/?api-key=8cc07016-410c-42aa-9220-a8a67cdbb6f7'
    console.log('DEBUG: Solana RPC URL:', rpcUrl)

    // Configure connection with longer timeout and commitment
    const connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    })

    // Get wallet balance with retry logic
    const publicKey = new PublicKey(wallet_address)
    console.log('DEBUG: Public Key for balance check:', wallet_address)

    let balance
    let retries = 0
    const maxRetries = 3

    while (retries < maxRetries) {
      try {
        balance = await connection.getBalance(publicKey)
        break
      } catch (error) {
        console.error(`Attempt ${retries + 1} failed:`, error.message)

        if (retries < maxRetries - 1) {
          const delay = Math.pow(2, retries) * 1000 // Exponential backoff
          console.log(`Retrying after ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          retries++
          continue
        }
        throw error
      }
    }

    const solBalance = balance / LAMPORTS_PER_SOL

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        solBalance,
        wallet_address
      })
    }

  } catch (error) {
    console.error('Error in get-sol-balance:', error)
    console.error('DEBUG: Full get-sol-balance error details:', error.message || error)

    // Return a more specific error message
    let errorMessage = 'Failed to fetch balance'
    let statusCode = 500

    if (error.message?.includes('429')) {
      errorMessage = 'Rate limit exceeded. Please try again in a few seconds.'
      statusCode = 429
    } else if (error.message?.includes('fetch failed')) {
      errorMessage = 'Network error. Please try again.'
      statusCode = 503
    } else if (error.message?.includes('Invalid public key')) {
      errorMessage = 'Invalid wallet address'
      statusCode = 400
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        message: error.message || 'Internal server error'
      })
    }
  }
}
