// test-solana-pay.js - Simple test script for Solana Pay integration
// Run with: node test-solana-pay.js

import fetch from 'node-fetch'

const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://earth.ndao.computer'
  : 'http://localhost:8888'

const TEST_WALLET = '9THaas19LkNrs6ZjVXczyE7iTadPpvxUfvroNGkf3xqs' // Replace with actual wallet

async function testPaymentFlow() {
  console.log('🧪 Testing Solana Pay Integration...')
  console.log('📍 Base URL:', BASE_URL)

  try {
    // Step 1: Create payment request
    console.log('\n1️⃣ Creating payment request...')
    const paymentResponse = await fetch(`${BASE_URL}/.netlify/functions/create-payment-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: TEST_WALLET,
        characterData: {
          gender: 'male',
          testData: true
        }
      })
    })

    const paymentData = await paymentResponse.json()

    if (!paymentResponse.ok) {
      throw new Error(`Payment request failed: ${paymentData.error}`)
    }

    console.log('✅ Payment request created!')
    console.log('   Payment ID:', paymentData.paymentId)
    console.log('   Amount:', paymentData.amount, 'SOL')
    console.log('   Treasury:', paymentData.treasuryWallet)
    console.log('   Expires:', new Date(paymentData.expiresAt).toLocaleString())
    console.log('   Payment URL:', paymentData.paymentUrl)

    // Step 2: Test payment verification (will fail without actual payment)
    console.log('\n2️⃣ Testing payment verification...')
    const fakeSignature = 'test_signature_' + Date.now()

    const verifyResponse = await fetch(`${BASE_URL}/.netlify/functions/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: paymentData.paymentId,
        signature: fakeSignature
      })
    })

    const verifyData = await verifyResponse.json()

    if (verifyResponse.ok) {
      console.log('✅ Payment verified!')
    } else {
      console.log('❌ Payment verification failed (expected):', verifyData.error)
    }

    // Step 3: Test mint with unverified payment (will fail)
    console.log('\n3️⃣ Testing mint without verified payment...')
    const mintResponse = await fetch(`${BASE_URL}/.netlify/functions/mint-nft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: TEST_WALLET,
        gender: 'male',
        imageBlob: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        selectedLayers: {},
        paymentId: paymentData.paymentId
      })
    })

    const mintData = await mintResponse.json()

    if (mintResponse.ok) {
      console.log('✅ NFT minted!')
    } else {
      console.log('❌ NFT minting failed (expected):', mintData.error)
      console.log('   Code:', mintData.code)
    }

    console.log('\n🎉 Test completed!')
    console.log('\n📋 Next steps:')
    console.log('   1. Set TREASURY_WALLET_ADDRESS environment variable')
    console.log('   2. Run the database migration in Supabase')
    console.log('   3. Test with real wallet and payment')
    console.log('   4. Integrate SolanaPayment component in your frontend')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Check environment
if (!process.env.TREASURY_WALLET_ADDRESS || process.env.TREASURY_WALLET_ADDRESS === 'YourTreasuryWalletAddressHere') {
  console.log('⚠️  Please set TREASURY_WALLET_ADDRESS environment variable')
  console.log('   Example: export TREASURY_WALLET_ADDRESS=Your_Actual_Wallet_Address')
  process.exit(1)
}

if (TEST_WALLET === 'YourTestWalletAddressHere') {
  console.log('⚠️  Please set TEST_WALLET in this script to your actual wallet address')
  process.exit(1)
}

testPaymentFlow()

