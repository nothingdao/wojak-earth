// netlify/functions/mint-nft.js - SIMPLIFIED VERSION (FUCK SOLANA PAY)
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js"
import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const TREASURY_WALLET = process.env.TREASURY_WALLET_ADDRESS
const NFT_PRICE_SOL = 0.01

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

  const character_id = randomUUID()
  console.log('🆔 Generated character ID:', character_id)

  try {
    const { wallet_address, gender, imageBlob, selectedLayers, paymentSignature, isNPC = false } = JSON.parse(event.body)

    console.log('📋 Request data:', {
      wallet_address,
      gender,
      hasImageBlob: !!imageBlob,
      hasSelectedLayers: !!selectedLayers,
      paymentSignature: paymentSignature || 'NOT PROVIDED'
    })

    if (!wallet_address || !gender || !imageBlob || !paymentSignature) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: wallet_address, gender, imageBlob, paymentSignature'
        })
      }
    }

    // 🔍 PAYMENT VERIFICATION - SIMPLE VERSION WITH NPC SKIP
    console.log('💰 Verifying payment signature:', paymentSignature)

    // REAL PLAYER PAYMENT VERIFICATION
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    )

    // Skip payment verification for NPCs
    if (paymentSignature.startsWith('npc_mint_')) {
      console.log('🤖 Skipping payment verification for NPC')

      // Check if this NPC signature was already used
      const { data: existingNPC } = await supabase
        .from('characters')
        .select('id, name')
        .eq('payment_signature', paymentSignature)
        .single()

      if (existingNPC) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'NPC signature already used',
            existingCharacter: existingNPC.name,
            code: 'PAYMENT_ALREADY_USED'
          })
        }
      }
    } else {


      // Get transaction details
      let transaction
      try {
        transaction = await connection.getTransaction(paymentSignature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        })
      } catch (txError) {
        console.error('❌ Failed to fetch transaction:', txError)
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Could not find payment transaction. Please wait a moment and try again.',
            code: 'PAYMENT_NOT_FOUND'
          })
        }
      }

      if (!transaction) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Payment transaction not found on blockchain',
            code: 'PAYMENT_NOT_FOUND'
          })
        }
      }

      if (transaction.meta?.err) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Payment transaction failed',
            code: 'PAYMENT_FAILED',
            details: transaction.meta.err
          })
        }
      }

      // Verify payment went to treasury wallet
      const accountKeys = transaction.transaction.message.accountKeys.map(key =>
        typeof key === 'string' ? key : key.toString()
      )

      const treasuryIndex = accountKeys.findIndex(key => key === TREASURY_WALLET)

      if (treasuryIndex === -1) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Payment did not go to treasury wallet',
            code: 'INVALID_RECIPIENT',
            debug: {
              treasuryWallet: TREASURY_WALLET,
              accountKeys: accountKeys
            }
          })
        }
      }

      // Verify payment amount
      const preBalances = transaction.meta.preBalances
      const postBalances = transaction.meta.postBalances
      const balanceChange = postBalances[treasuryIndex] - preBalances[treasuryIndex]
      const expectedLamports = NFT_PRICE_SOL * 1000000000

      console.log('💰 Payment verification:', {
        treasuryIndex,
        balanceChange,
        expectedLamports,
        balanceChangeSol: balanceChange / 1000000000,
        expectedSol: NFT_PRICE_SOL
      })

      if (balanceChange < expectedLamports * 0.95) { // 5% tolerance for potential fees
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `Insufficient payment. Expected: ${NFT_PRICE_SOL} SOL, Received: ${balanceChange / 1000000000} SOL`,
            code: 'INSUFFICIENT_PAYMENT'
          })
        }
      }

      // Verify sender is the wallet requesting the mint
      const senderIndex = 0 // Usually the first account is the sender
      const senderPubkey = accountKeys[senderIndex]

      if (senderPubkey !== wallet_address) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Payment sender does not match wallet address',
            code: 'WALLET_MISMATCH',
            debug: {
              paymentFrom: senderPubkey,
              requestFrom: wallet_address
            }
          })
        }
      }

      console.log('✅ Payment verified successfully:', {
        signature: paymentSignature,
        amount: balanceChange / 1000000000,
        from: senderPubkey,
        to: TREASURY_WALLET
      })

      // Check if this signature was already used
      const { data: existingCharacter } = await supabase
        .from('characters')
        .select('id, name')
        .eq('payment_signature', paymentSignature)
        .single()

      if (existingCharacter) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Payment signature already used for another character',
            existingCharacter: existingCharacter.name,
            code: 'PAYMENT_ALREADY_USED'
          })
        }
      }
    }

    // Check if wallet already has a character (for both NPCs and players)
    const { data: existingChar } = await supabase
      .from('characters')
      .select('id, name')
      .eq('wallet_address', wallet_address)
      .single()

    if (existingChar) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Wallet already has a character',
          existingCharacter: existingChar.name,
          code: 'WALLET_HAS_CHARACTER'
        })
      }
    }

    // 📝 CHARACTER CREATION - Same as before but with payment signature
    const wojakNumber = await getNextWojakNumber()
    const characterName = `Wojak #${wojakNumber}`
    const characterData = await generateRandomCharacter(characterName, gender, wallet_address, isNPC)

    // Create character record with payment signature
    const { data: character, error: createError } = await supabase
      .from('characters')
      .insert({
        id: character_id,
        ...characterData,
        payment_signature: paymentSignature, // Store payment proof
        nft_address: null,
        token_id: null,
        status: 'PENDING_MINT',
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Failed to create character:', createError)
      throw createError
    }

    // Upload character image
    const image_url = await uploadCharacterImage(character_id, imageBlob)
    await supabase
      .from('characters')
      .update({ current_image_url: image_url })
      .eq('id', character_id)

    // 🎨 NFT MINTING - Same as before
    console.log('🎨 Starting NFT mint...')

    const serverKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.SERVER_KEYPAIR_SECRET))
    )

    console.log('🔑 Server wallet:', serverKeypair.publicKey.toBase58())

    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(serverKeypair))

    // Collection handling
    let collectionMint = null
    if (process.env.WOJAK_COLLECTION_ADDRESS) {
      try {
        collectionMint = new PublicKey(process.env.WOJAK_COLLECTION_ADDRESS)
        console.log('🗂️ Using collection:', collectionMint.toBase58())
      } catch (collectionError) {
        console.warn('⚠️ Collection setup failed:', collectionError)
        collectionMint = null
      }
    }

    // Create NFT
    const metadataUri = `https://earth.ndao.computer/.netlify/functions/metadata/${character_id}`
    console.log('📝 Metadata URI:', metadataUri)

    let nftParams = {
      uri: metadataUri,
      name: characterName,
      symbol: "WOJAK",
      sellerFeeBasisPoints: 500,
      creators: [
        {
          address: serverKeypair.publicKey,
          verified: true,
          share: 100
        }
      ],
      tokenOwner: new PublicKey(wallet_address),
      isMutable: true,
    }

    if (collectionMint) {
      nftParams.collection = collectionMint
    }

    console.log('🚀 Minting NFT...')
    const nft = await metaplex.nfts().create(nftParams)

    console.log('✅ NFT minted successfully!')
    console.log('  - Mint address:', nft.mintAddress.toBase58())
    console.log('  - Transaction:', nft.response.signature)

    // Collection verification if needed
    if (collectionMint) {
      try {
        console.log('🔐 Verifying collection...')
        await metaplex.nfts().verifyCollection({
          mintAddress: nft.mintAddress,
          collectionMintAddress: collectionMint,
          collectionAuthority: serverKeypair,
        })
        console.log('✅ Collection verified!')
      } catch (verifyError) {
        console.warn('⚠️ Collection verification failed:', verifyError)
      }
    }

    // Update character with NFT info
    const { data: finalCharacter, error: updateError } = await supabase
      .from('characters')
      .update({
        nft_address: nft.mintAddress.toBase58(),
        token_id: nft.mintAddress.toBase58(),
        status: 'ACTIVE'
      })
      .eq('id', character_id)
      .select()
      .single()

    if (updateError) throw updateError

    // Create starting inventory
    await createStartingInventoryWithLayers(character_id, selectedLayers)

    console.log('🎉 Character creation complete!')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        character: finalCharacter,
        nft_address: nft.mintAddress.toBase58(),
        signature: nft.response.signature,
        image_url: image_url,
        metadataUri: metadataUri,
        collectionAddress: collectionMint?.toBase58() || null,
        paymentVerified: true,
        paymentSignature: paymentSignature,
        message: `${characterName} created and minted to your wallet!`
      })
    }

  } catch (error) {
    console.error('❌ FATAL ERROR:', error)

    // Cleanup failed character
    try {
      await supabase
        .from('characters')
        .delete()
        .eq('id', character_id)
      console.log('🧹 Cleaned up failed character record')
    } catch (cleanupError) {
      console.error('❌ Cleanup failed:', cleanupError)
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to create character',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}

// 🛠️ HELPER FUNCTIONS (Same as before)
async function getNextWojakNumber() {
  const { data: characters, error } = await supabase
    .from('characters')
    .select('name')
    .like('name', 'Wojak #%')

  if (error) throw error

  if (!characters || characters.length === 0) {
    return 1337
  }

  const wojakNumbers = characters
    .map(char => {
      const match = char.name.match(/Wojak #(\d+)/)
      return match ? parseInt(match[1]) : null
    })
    .filter(num => num !== null)

  const highestNumber = Math.max(...wojakNumbers)
  return highestNumber + 1
}

async function uploadCharacterImage(character_id, imageBlob) {
  const fileName = `wojak-${character_id}.png`

  let imageBuffer
  if (typeof imageBlob === 'string') {
    const base64Data = imageBlob.replace(/^data:image\/[a-z]+;base64,/, '')
    imageBuffer = Buffer.from(base64Data, 'base64')
  } else {
    imageBuffer = imageBlob
  }

  const { data, error } = await supabase.storage
    .from('wojaks')
    .upload(fileName, imageBuffer, {
      contentType: 'image/png',
      upsert: true
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('wojaks')
    .getPublicUrl(fileName)

  return publicUrl
}

async function generateRandomCharacter(name, gender, wallet_address, isNPC = false) {

  const startingLocations = [
    'Frostpine Reaches',
    'Crystal Caverns',
    'Tech District',
    'Mining Plains'
  ]

  const { data: locations, error: locError } = await supabase
    .from('locations')
    .select('id, name')
    .in('name', startingLocations)

  if (locError) throw locError

  const startingLocation = locations[Math.floor(Math.random() * locations.length)]

  return {
    name: name,
    gender: gender,
    character_type: isNPC ? 'NPC' : 'HUMAN', // Use the isNPC flag here
    wallet_address: wallet_address,
    currentlocation_id: startingLocation.id,
    energy: 100,
    health: 100,
    level: 1,
    coins: 1200,
    current_version: 1
  }
}

async function createStartingInventoryWithLayers(character_id, selectedLayers = null) {
  console.log('🎒 Creating starting inventory...')

  const startingItems = []
  const now = new Date().toISOString()

  // LAYER-BASED ITEMS
  if (selectedLayers) {
    console.log('👕 Processing layer-based items...')

    const ITEM_LAYER_TYPES = ['3-undergarments', '4-clothing', '5-outerwear', '7-face-accessories', '8-headwear', '9-misc-accessories']

    for (const layer_type of ITEM_LAYER_TYPES) {
      const selectedFile = selectedLayers[layer_type]

      if (!selectedFile) {
        console.log(`  ⏭️ No ${layer_type} selected`)
        continue
      }

      console.log(`  🔍 Looking for item: ${layer_type}/${selectedFile}`)

      // Try exact match first
      let { data: layerItems, error: itemError } = await supabase
        .from('items')
        .select('id, name, category, layer_file, layer_gender, base_layer_file')
        .eq('layer_file', selectedFile)

      // If no exact match, try genderless items
      if (!layerItems || layerItems.length === 0) {
        const base_layer_file = selectedFile.replace(/^(male-|female-)/, '')
        console.log(`  🔍 Looking for genderless item: "${base_layer_file}"`)

        const { data: genderlessItems, error: genderlessError } = await supabase
          .from('items')
          .select('id, name, category, layer_file, layer_gender, base_layer_file')
          .eq('base_layer_file', base_layer_file)
          .is('layer_file', null)
          .is('layer_gender', null)

        layerItems = genderlessItems
        itemError = genderlessError
      }

      if (itemError) {
        console.error(`  ❌ Database error for ${layer_type}/${selectedFile}:`, itemError)
        continue
      }

      if (!layerItems || layerItems.length === 0) {
        console.log(`  ⏭️ No item found for ${layer_type}/${selectedFile}`)
        continue
      }

      // Prefer genderless items
      let selectedItem = layerItems.find(item => item.layer_gender === null)
      if (!selectedItem) {
        selectedItem = layerItems[0]
      }

      // Add to starting inventory as equipped
      startingItems.push({
        id: randomUUID(),
        character_id: character_id,
        item_id: selectedItem.id,
        quantity: 1,
        is_equipped: true,
        created_at: now,
        updated_at: now
      })

      console.log(`  ✅ Added equipped ${selectedItem.category}: ${selectedItem.name}`)
    }
  } else {
    console.log('⚠️ No selectedLayers provided')
  }

  // BASIC ITEMS
  console.log('🔧 Adding basic starter items...')
  const { data: basicItems, error: basicError } = await supabase
    .from('items')
    .select('id, name, category')
    .in('category', ['TOOL', 'CONSUMABLE'])
    .is('layer_file', null)
    .limit(10)

  if (basicError) {
    console.warn('⚠️ Failed to load basic items:', basicError)
  } else if (basicItems && basicItems.length > 0) {
    // Add a basic tool
    const tool = basicItems.find(item => item.category === 'TOOL')
    if (tool) {
      startingItems.push({
        id: randomUUID(),
        character_id: character_id,
        item_id: tool.id,
        quantity: 1,
        is_equipped: false,
        created_at: now,
        updated_at: now
      })
      console.log(`  🔧 Added tool: ${tool.name}`)
    }

    // Add some consumables
    const consumables = basicItems.filter(item => item.category === 'CONSUMABLE').slice(0, 2)
    for (const consumable of consumables) {
      const quantity = Math.floor(Math.random() * 3) + 2
      startingItems.push({
        id: randomUUID(),
        character_id: character_id,
        item_id: consumable.id,
        quantity: quantity,
        is_equipped: false,
        created_at: now,
        updated_at: now
      })
      console.log(`  🍎 Added consumable: ${consumable.name} (${quantity}x)`)
    }
  }

  // Insert all inventory items
  if (startingItems.length > 0) {
    console.log(`💾 Inserting ${startingItems.length} items into character_inventory...`)

    const { error: invError } = await supabase
      .from('character_inventory')
      .insert(startingItems)

    if (invError) {
      console.error('❌ Failed to create starting inventory:', invError)
      throw invError
    }

    console.log(`✅ Created starting inventory with ${startingItems.length} items`)
  } else {
    console.log('⚠️ No items added to starting inventory')
  }
}
