// netlify/functions/mint-nft.js - DEBUG VERSION
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js"
import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

  const characterId = randomUUID()
  console.log('🆔 Generated character ID:', characterId)

  try {
    const { walletAddress, gender, imageBlob } = JSON.parse(event.body)

    // Enhanced collection debugging
    console.log('🔍 COLLECTION DEBUG START')
    console.log('🔍 Environment check:')
    console.log('  - WOJAK_COLLECTION_ADDRESS:', process.env.WOJAK_COLLECTION_ADDRESS || 'NOT SET')
    console.log('  - SERVER_KEYPAIR_SECRET:', process.env.SERVER_KEYPAIR_SECRET ? 'SET' : 'NOT SET')

    if (!walletAddress || !gender || !imageBlob) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: walletAddress, gender, imageBlob'
        })
      }
    }

    let userWallet
    try {
      userWallet = new PublicKey(walletAddress)
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid wallet address' })
      }
    }

    // 1. Check existing character
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

    // 2-6. Character creation and image upload (same as before)
    const wojakNumber = await getNextWojakNumber()
    const characterName = `Wojak #${wojakNumber}`
    const characterData = await generateRandomCharacter(characterName, gender, walletAddress)

    const { data: character, error: createError } = await supabase
      .from('characters')
      .insert({
        id: characterId,
        ...characterData,
        nftAddress: null,
        tokenId: null,
        status: 'PENDING_MINT',
        updatedAt: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) throw createError

    const imageUrl = await uploadCharacterImage(characterId, imageBlob)
    await supabase
      .from('characters')
      .update({ currentImageUrl: imageUrl })
      .eq('id', characterId)

    // 7. Enhanced Solana setup with collection debugging
    console.log('🔧 Setting up Solana connection...')
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    )

    const serverKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.SERVER_KEYPAIR_SECRET))
    )

    console.log('🔑 Server wallet:', serverKeypair.publicKey.toBase58())

    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(serverKeypair))

    // 8. Collection verification and setup
    let collectionMint = null
    if (process.env.WOJAK_COLLECTION_ADDRESS) {
      try {
        collectionMint = new PublicKey(process.env.WOJAK_COLLECTION_ADDRESS)
        console.log('🗂️  Collection mint address:', collectionMint.toBase58())

        // Verify collection exists
        console.log('🔍 Verifying collection exists...')
        const collectionNft = await metaplex.nfts().findByMint({
          mintAddress: collectionMint
        })
        console.log('✅ Collection found:', collectionNft.name)
        console.log('🔍 Collection details:')
        console.log('  - Name:', collectionNft.name)
        console.log('  - Symbol:', collectionNft.symbol)
        console.log('  - Is Collection:', collectionNft.collectionDetails ? 'YES' : 'NO')
        console.log('  - Owner:', collectionNft.tokenStandard)

      } catch (collectionError) {
        console.error('❌ Collection validation failed:', collectionError)
        console.log('⚠️  Proceeding without collection...')
        collectionMint = null
      }
    } else {
      console.log('⚠️  No collection address set')
    }

    // 9. NFT creation with enhanced debugging
    const metadataUri = `https://earth.ndao.computer/.netlify/functions/metadata/${characterId}`
    console.log('📝 Metadata URI:', metadataUri)

    console.log('🎨 Creating NFT...')
    console.log('  - Name:', characterName)
    console.log('  - Symbol: WOJAK')
    console.log('  - Owner:', userWallet.toBase58())
    console.log('  - Collection:', collectionMint?.toBase58() || 'None')

    // Create NFT with or without collection
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
      tokenOwner: userWallet,
      isMutable: true,
    }

    // Add collection if available
    if (collectionMint) {
      console.log('🔗 Adding collection to NFT params...')
      nftParams.collection = collectionMint
    }

    console.log('🚀 Minting NFT...')
    const nft = await metaplex.nfts().create(nftParams)

    console.log('✅ NFT minted successfully!')
    console.log('  - Mint address:', nft.mintAddress.toBase58())
    console.log('  - Transaction:', nft.response.signature)

    // 10. Collection verification (separate step)
    if (collectionMint) {
      try {
        console.log('🔐 Starting collection verification...')
        console.log('  - NFT mint:', nft.mintAddress.toBase58())
        console.log('  - Collection mint:', collectionMint.toBase58())
        console.log('  - Authority:', serverKeypair.publicKey.toBase58())

        const verifyResult = await metaplex.nfts().verifyCollection({
          mintAddress: nft.mintAddress,
          collectionMintAddress: collectionMint,
          collectionAuthority: serverKeypair,
        })

        console.log('✅ Collection verification successful!')
        console.log('  - Verification transaction:', verifyResult.response.signature)

      } catch (verifyError) {
        console.error('❌ Collection verification failed:')
        console.error('  - Error:', verifyError.message)
        console.error('  - Stack:', verifyError.stack)
        console.log('⚠️  NFT created but not verified in collection')
      }
    }

    // 11. Final steps (same as before)
    const { data: finalCharacter, error: updateError } = await supabase
      .from('characters')
      .update({
        nftAddress: nft.mintAddress.toBase58(),
        tokenId: nft.mintAddress.toBase58(),
        status: 'ACTIVE'
      })
      .eq('id', characterId)
      .select()
      .single()

    if (updateError) throw updateError

    await createStartingInventory(characterId)

    console.log('🎉 Character creation complete!')
    console.log('🔍 COLLECTION DEBUG END')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        character: finalCharacter,
        nftAddress: nft.mintAddress.toBase58(),
        signature: nft.response.signature,
        imageUrl: imageUrl,
        metadataUri: metadataUri,
        collectionAddress: collectionMint?.toBase58() || null,
        collectionLinked: !!collectionMint,
        message: `${characterName} created and minted to your wallet!`
      })
    }

  } catch (error) {
    console.error('❌ FATAL ERROR:', error)
    console.error('❌ Stack trace:', error.stack)

    // Cleanup
    try {
      await supabase
        .from('characters')
        .delete()
        .eq('id', characterId)
      console.log('🧹 Cleaned up incomplete character record')
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

// Helper functions (same as before)
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

async function uploadCharacterImage(characterId, imageBlob) {
  const fileName = `wojak-${characterId}.png`

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

async function generateRandomCharacter(name, gender, walletAddress) {
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
    characterType: 'HUMAN',
    walletAddress: walletAddress,
    currentLocationId: startingLocation.id,
    energy: 100,
    health: 100,
    level: 1,
    coins: 0,
    currentVersion: 1
  }
}

async function createStartingInventory(characterId) {
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, category')
    .in('category', ['TOOL', 'CONSUMABLE'])
    .limit(10)

  if (error) throw error

  const startingItems = []
  const now = new Date().toISOString()

  const tool = items.find(item => item.category === 'TOOL')
  if (tool) {
    startingItems.push({
      id: randomUUID(),
      characterId: characterId,
      itemId: tool.id,
      quantity: 1,
      isEquipped: false,
      createdAt: now,
      updatedAt: now
    })
  }

  const consumables = items.filter(item => item.category === 'CONSUMABLE').slice(0, 2)
  for (const consumable of consumables) {
    startingItems.push({
      id: randomUUID(),
      characterId: characterId,
      itemId: consumable.id,
      quantity: Math.floor(Math.random() * 3) + 2,
      isEquipped: false,
      createdAt: now,
      updatedAt: now
    })
  }

  if (startingItems.length > 0) {
    const { error: invError } = await supabase
      .from('character_inventory')
      .insert(startingItems)

    if (invError) throw invError
  }
}
