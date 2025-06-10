// netlify/functions/get-sol-balance.js

const { Connection, PublicKey } = require('@solana/web3.js')

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Get wallet address from query parameters
    const wallet_address = event.queryStringParameters?.wallet_address

    if (!wallet_address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing wallet_address parameter'
        })
      }
    }

    // Validate wallet address format
    let publicKey
    try {
      publicKey = new PublicKey(wallet_address)
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid wallet address format'
        })
      }
    }

    // Connect to Solana devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

    // Get SOL balance
    const balanceInLamports = await connection.getBalance(publicKey)
    const solBalance = balanceInLamports / 1000000000 // Convert lamports to SOL

    // Optional: Get account info for additional details
    const accountInfo = await connection.getAccountInfo(publicKey)
    const accountExists = accountInfo !== null

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        wallet_address,
        solBalance,
        balanceInLamports,
        accountExists,
        network: 'devnet',
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching SOL balance:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch SOL balance',
        message: error.message
      })
    }
  }
}
