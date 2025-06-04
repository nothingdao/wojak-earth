// netlify/functions/mint-nft.js
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

  let characterId = null

  try {
    const { walletAddress, gender, imageBlob } = JSON.parse(event.body)

    // Validate input
    if (!walletAddress || !gender || !imageBlob) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: walletAddress, gender, imageBlob'
        })
      }
    }

    // Validate wallet address
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

    // 1. Check if wallet already has a character
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

    // 2. Get next Wojak number (handle zombie cleanup)
    const wojakNumber = await getNextWojakNumber()
    const characterName = `Wojak #${wojakNumber}`

    // 3. Generate random character data
    const characterData = await generateRandomCharacter(characterName, gender, walletAddress)

    // 4. Create character record first (DB-first approach)
    const { data: character, error: createError } = await supabase
      .from('characters')
      .insert({
        id: randomUUID(),
        ...characterData,
        nftAddress: null, // Will be filled after successful mint
        tokenId: null,
        status: 'PENDING_MINT',
        updatedAt: new Date().toISOString() // Add this to satisfy NOT NULL constraint
      })
      .select()
      .single()

    if (createError) throw createError
    characterId = character.id

    // 5. Upload character image to Supabase Storage
    const imageUrl = await uploadCharacterImage(character.id, imageBlob)

    // 6. Update character with image URL
    await supabase
      .from('characters')
      .update({ currentImageUrl: imageUrl })
      .eq('id', character.id)

    // 7. Set up Solana connection and keypair
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    )

    if (!process.env.SERVER_KEYPAIR_SECRET) {
      throw new Error('SERVER_KEYPAIR_SECRET environment variable not set')
    }

    const serverKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.SERVER_KEYPAIR_SECRET))
    )

    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(serverKeypair))

    // 8. Mint NFT with dynamic metadata
    const metadataUri = `https://earth.ndao.computer/.netlify/functions/metadata/${character.id}`

    const nft = await metaplex.nfts().create({
      uri: metadataUri,
      name: characterName,
      symbol: "WOJAK",
      sellerFeeBasisPoints: 0,
      creators: [
        {
          address: serverKeypair.publicKey,
          verified: true,
          share: 100
        }
      ],
      tokenOwner: userWallet, // NFT goes directly to user
    })

    // 9. Update character with NFT details and mark as active
    const { data: finalCharacter, error: updateError } = await supabase
      .from('characters')
      .update({
        nftAddress: nft.mintAddress.toBase58(),
        tokenId: nft.mintAddress.toBase58(),
        status: 'ACTIVE'
      })
      .eq('id', character.id)
      .select()
      .single()

    if (updateError) throw updateError

    // 10. Create starting inventory
    await createStartingInventory(character.id)

    console.log('Character minted successfully:', characterName, nft.mintAddress.toBase58())

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
        message: `${characterName} created and minted to your wallet!`
      })
    }

  } catch (error) {
    console.error('Error minting character:', error)

    // Cleanup: Delete incomplete character record
    if (characterId) {
      try {
        await supabase
          .from('characters')
          .delete()
          .eq('id', characterId)
        console.log('Cleaned up incomplete character record:', characterId)
      } catch (cleanupError) {
        console.error('Failed to cleanup character record:', cleanupError)
      }
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

// Helper: Get next Wojak number, handling zombies
async function getNextWojakNumber() {
  // Get ALL characters with Wojak # pattern
  const { data: characters, error } = await supabase
    .from('characters')
    .select('name')
    .like('name', 'Wojak #%')

  if (error) throw error

  // If no characters exist, start from 1337
  if (!characters || characters.length === 0) {
    return 1337
  }

  // Extract all numbers from Wojak names
  const wojakNumbers = characters
    .map(char => {
      const match = char.name.match(/Wojak #(\d+)/)
      return match ? parseInt(match[1]) : null
    })
    .filter(num => num !== null) // Remove any failed matches

  // Find the highest number
  const highestNumber = Math.max(...wojakNumbers)

  // Return next number
  return highestNumber + 1
}

// Helper: Upload character image to Supabase Storage
async function uploadCharacterImage(characterId, imageBlob) {
  const fileName = `wojak-${characterId}.png`

  // Convert base64 to buffer if needed
  let imageBuffer
  if (typeof imageBlob === 'string') {
    // Remove data:image/png;base64, prefix if present
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

// Helper: Generate random character data
async function generateRandomCharacter(name, gender, walletAddress) {
  // Get random starting location
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

// Helper: Create starting inventory
async function createStartingInventory(characterId) {
  // Get some basic starting items
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, category')
    .in('category', ['TOOL', 'CONSUMABLE'])
    .limit(10)

  if (error) throw error

  // Create starting inventory entries
  const startingItems = []
  const now = new Date().toISOString()

  // Add a basic tool (like pickaxe)
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

  // Add some consumables
  const consumables = items.filter(item => item.category === 'CONSUMABLE').slice(0, 2)
  for (const consumable of consumables) {
    startingItems.push({
      id: randomUUID(),
      characterId: characterId,
      itemId: consumable.id,
      quantity: Math.floor(Math.random() * 3) + 2, // 2-4 items
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
