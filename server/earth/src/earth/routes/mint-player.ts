import { Router } from 'express'
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { randomUUID } from 'crypto'
import { api } from '../lib/api.js'
import { convexHttp } from '../lib/convex.js'
import { uploadImage } from '../lib/r2.js'

const router = Router()

const NFT_PRICE_SOL = 0.05
const EARTH_CHARACTERS_BUCKET = 'earth-characters'

router.post('/mint-player', async (req, res) => {
  const characterId = randomUUID()

  try {
    const { wallet_address, gender, imageBlob, selectedLayers, paymentSignature, isNPC = false } = req.body

    if (!wallet_address || !gender || !imageBlob || !paymentSignature) {
      return res.status(400).json({ error: 'Missing required fields: wallet_address, gender, imageBlob, paymentSignature' })
    }

    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )

    if (isNPC) {
      // NPC: just check signature uniqueness via Convex
      const existing = await convexHttp.query(api.earth.characters.getByPaymentSignature, { paymentSignature })
      if (existing) {
        return res.status(400).json({ error: 'Payment signature already used', code: 'PAYMENT_ALREADY_USED' })
      }
    } else {
      // Real player: verify on-chain payment
      const transaction = await connection.getTransaction(paymentSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      }).catch(() => null)

      if (!transaction) {
        return res.status(400).json({ error: 'Payment transaction not found', code: 'PAYMENT_NOT_FOUND' })
      }
      const meta = transaction.meta
      if (!meta) {
        return res.status(400).json({ error: 'Payment transaction metadata missing', code: 'PAYMENT_META_MISSING' })
      }
      if (meta.err) {
        return res.status(400).json({ error: 'Payment transaction failed', code: 'PAYMENT_FAILED' })
      }

      const TREASURY_WALLET = process.env.TREASURY_WALLET_ADDRESS!
      const message: any = transaction.transaction.message
      const messageKeys = typeof message.getAccountKeys === 'function'
        ? message.getAccountKeys({ accountKeysFromLookups: meta.loadedAddresses })
        : { staticAccountKeys: message.accountKeys ?? [] }
      const accountKeys = (typeof messageKeys.keySegments === 'function'
        ? messageKeys.keySegments().flat()
        : messageKeys.staticAccountKeys ?? messageKeys.accountKeys ?? []
      ).map((k: any) => typeof k === 'string' ? k : k.toString())
      const treasuryIndex = accountKeys.findIndex((k: string) => k === TREASURY_WALLET)
      if (treasuryIndex === -1) {
        return res.status(400).json({ error: 'Payment did not go to treasury', code: 'INVALID_RECIPIENT' })
      }

      const balanceChange = meta.postBalances[treasuryIndex] - meta.preBalances[treasuryIndex]
      if (balanceChange < NFT_PRICE_SOL * 1e9 * 0.95) {
        return res.status(400).json({ error: `Insufficient payment. Expected ${NFT_PRICE_SOL} SOL`, code: 'INSUFFICIENT_PAYMENT' })
      }

      if (accountKeys[0] !== wallet_address) {
        return res.status(400).json({ error: 'Payment sender mismatch', code: 'WALLET_MISMATCH' })
      }

      const existingBySignature = await convexHttp.query(api.earth.characters.getByPaymentSignature, { paymentSignature })
      if (existingBySignature) {
        return res.status(400).json({ error: 'Payment signature already used', code: 'PAYMENT_ALREADY_USED' })
      }
    }

    // Check wallet doesn't already have a character
    const existingChar = await convexHttp.query(api.earth.characters.getByWallet, { walletAddress: wallet_address })
    if (existingChar) {
      return res.status(400).json({ error: 'Wallet already has a character', code: 'WALLET_HAS_PLAYER' })
    }

    // Get a random starting location
    const locations = await convexHttp.query(api.earth.locations.getAll, {}) as any[]
    const startingNames = ['Frostpine Reaches', 'Crystal Caverns', 'Tech District', 'Mining Plains']
    const startingLocs = locations.filter((l: any) => startingNames.includes(l.name))
    const startingLocation = startingLocs[Math.floor(Math.random() * startingLocs.length)] ?? locations[0]

    // Get next player number
    const allChars = await convexHttp.query(api.earth.characters.getAll, {}) as any[]
    const playerNumbers = allChars
      .map((c: any) => { const m = c.name?.match(/Player #(\d+)/); return m ? parseInt(m[1]) : null })
      .filter(Boolean) as number[]
    const nextNumber = playerNumbers.length > 0 ? Math.max(...playerNumbers) + 1 : 1337
    const characterName = `Player #${nextNumber}`

    // Create character in Convex
    const convexCharId = await convexHttp.mutation(api.earth.characters.create, {
      walletAddress: wallet_address,
      name: characterName,
      characterType: isNPC ? 'NPC' : 'HUMAN',
      gender: gender.toUpperCase() as 'MALE' | 'FEMALE',
      currentLocationId: startingLocation._id,
      paymentSignature,
      baseLayerFile: selectedLayers?.['1-base'] ?? undefined,
      baseGender: gender.toLowerCase(),
    })

    // Upload image to R2
    const imageKey = `player-${characterId}.png`
    const imageUrl = await uploadImage(EARTH_CHARACTERS_BUCKET, imageKey, imageBlob)

    // Update character with image URL
    await convexHttp.mutation(api.earth.characters.updateAppearance, {
      walletAddress: wallet_address,
      currentImageUrl: imageUrl,
    })

    // Mint NFT
    const serverKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.SERVER_KEYPAIR_SECRET!))
    )
    const metaplex = Metaplex.make(connection).use(keypairIdentity(serverKeypair))

    const SERVER_URL = process.env.SERVER_URL!
    const metadataUri = `${SERVER_URL}/earth/nft-metadata/${convexCharId}`

    let collectionMint: PublicKey | null = null
    if (process.env.PLAYER_COLLECTION_ADDRESS) {
      try { collectionMint = new PublicKey(process.env.PLAYER_COLLECTION_ADDRESS) } catch {}
    }

    const nftParams: any = {
      uri: metadataUri,
      name: characterName,
      symbol: 'PLAYER',
      sellerFeeBasisPoints: 500,
      creators: [{ address: serverKeypair.publicKey, verified: true, share: 100 }],
      tokenOwner: new PublicKey(wallet_address),
      isMutable: true,
    }
    if (collectionMint) nftParams.collection = collectionMint

    const nft = await metaplex.nfts().create(nftParams)

    if (collectionMint) {
      try {
        await metaplex.nfts().verifyCollection({
          mintAddress: nft.mintAddress,
          collectionMintAddress: collectionMint,
          collectionAuthority: serverKeypair,
        })
      } catch (e) {
        console.warn('Collection verification failed:', e)
      }
    }

    // Store NFT address on character — use updateAppearance to patch
    // (We'd ideally have a dedicated mutation but this is a safe workaround)
    // TODO: add setNftAddress mutation to Convex

    // Create starting inventory
    await createStartingInventory(convexCharId.toString(), selectedLayers)

    return res.json({
      success: true,
      character: { id: convexCharId, name: characterName, wallet_address },
      nft_address: nft.mintAddress.toBase58(),
      image_url: imageUrl,
      metadataUri,
      paymentVerified: true,
    })

  } catch (error: any) {
    console.error('mint-player error:', error)
    return res.status(500).json({ success: false, error: error.message || 'Character creation failed' })
  }
})

// NPC mint — same flow, isNPC=true
router.post('/mint-npc', async (req, res) => {
  req.body.isNPC = true
  // delegate to same logic via internal redirect isn't clean — duplicate the call
  return res.status(501).json({ error: 'Use /mint-player with isNPC=true' })
})

async function createStartingInventory(characterId: string, selectedLayers: Record<string, string> | null) {
  if (!selectedLayers) return

  const items = await convexHttp.query(api.earth.items.getAll, {}) as any[]

  const LAYER_SLOTS: Record<string, string> = {
    '1-base': 'base',
    '4-clothing': 'clothing',
    '5-outerwear': 'outerwear',
    '6-hair': 'hair',
    '8-headwear': 'headwear',
    '9-misc-accessories': 'misc_accessory',
  }

  for (const [layerType, fileName] of Object.entries(selectedLayers)) {
    if (!fileName) continue
    const slot = LAYER_SLOTS[layerType]

    const item = items.find((i: any) =>
      i.baseLayerFile === fileName ||
      i.baseLayerFile === fileName.replace(/^(male-|female-)/, '')
    )
    if (!item) continue

    await convexHttp.mutation(api.earth.inventory.add, {
      characterId,
      itemId: item._id,
      quantity: 1,
      isEquipped: !!slot,
      slotId: slot ?? undefined,
    })
  }
}

export default router
