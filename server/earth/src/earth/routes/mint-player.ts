import { Router } from 'express'
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { randomUUID } from 'crypto'
import { api } from '../lib/api.js'
import { convexHttp } from '../lib/convex.js'
import { uploadImage } from '../lib/r2.js'
import {
  finalizeCharacterMintReceipt,
  parseReceiptId,
  verifyCharacterMintReceipt,
  type VerifiedCharacterMintReceipt,
} from '../lib/earthVault.js'

const router = Router()

const NFT_PRICE_SOL = 0.05
const EARTH_CHARACTERS_BUCKET = 'earth-characters'

router.post('/mint-player', async (req, res) => {
  const characterId = randomUUID()

  try {
    const {
      wallet_address,
      gender,
      imageBlob,
      selectedLayers,
      paymentSignature,
      earthVaultReceiptId,
      earthVaultReceiptAddress,
      isNPC = false,
    } = req.body

    if (!wallet_address || !gender || !imageBlob) {
      return res.status(400).json({ error: 'Missing required fields: wallet_address, gender, imageBlob' })
    }

    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )

    let paymentReference = paymentSignature as string | undefined
    let verifiedVaultReceipt: VerifiedCharacterMintReceipt | null = null

    if (isNPC) {
      paymentReference = paymentReference ?? `npc:${characterId}`
      const existing = await convexHttp.query(api.earth.characters.getByPaymentSignature, { paymentSignature: paymentReference })
      if (existing) {
        return res.status(400).json({ error: 'Payment reference already used', code: 'PAYMENT_ALREADY_USED' })
      }
    } else {
      const receiptInput = earthVaultReceiptId ?? req.body.receiptId
      if (!receiptInput) {
        return res.status(400).json({
          error: 'Earth Vault character mint receipt is required for new character creation',
          code: 'EARTH_VAULT_RECEIPT_REQUIRED',
        })
      }

      const receiptId = parseReceiptId(receiptInput)
      const expectedLamports = BigInt(process.env.EARTH_CHARACTER_MINT_PRICE_LAMPORTS ?? Math.round(NFT_PRICE_SOL * 1e9))
      try {
        verifiedVaultReceipt = await verifyCharacterMintReceipt({
          connection,
          walletAddress: wallet_address,
          receiptId,
          receiptAddress: earthVaultReceiptAddress,
          expectedLamports,
        })
      } catch (error: any) {
        return res.status(400).json({
          error: error.message || 'Invalid Earth Vault receipt',
          code: 'INVALID_EARTH_VAULT_RECEIPT',
        })
      }

      paymentReference = `earth-vault:${verifiedVaultReceipt.receiptAddress.toBase58()}`
      const existingByReceipt = await convexHttp.query(api.earth.characters.getByPaymentSignature, { paymentSignature: paymentReference }) as any
      if (existingByReceipt) {
        if (existingByReceipt.walletAddress === wallet_address) {
          return res.json({
            success: true,
            character: {
              id: existingByReceipt._id,
              name: existingByReceipt.name,
              wallet_address,
            },
            nft_address: existingByReceipt.nftAddress ?? null,
            image_url: existingByReceipt.currentImageUrl ?? existingByReceipt.birthImageUrl ?? null,
            metadataUri: null,
            paymentVerified: true,
            alreadyCreated: true,
          })
        }
        return res.status(400).json({ error: 'Earth Vault receipt already used', code: 'PAYMENT_ALREADY_USED' })
      }
    }

    // Check wallet doesn't already have a character
    const existingChar = await convexHttp.query(api.earth.characters.getByWallet, { walletAddress: wallet_address })
    if (existingChar) {
      return res.status(400).json({ error: 'Wallet already has a character', code: 'WALLET_HAS_PLAYER' })
    }

    // Get a random starting location. This should come from the remote Convex
    // Earth dataset; do not silently create placeholder world data here.
    const locations = await convexHttp.query(api.earth.locations.getAll, {}) as any[]
    if (locations.length === 0) {
      return res.status(500).json({
        error: 'No Earth locations found in Convex. Migrate/seed Earth world data before creating players.',
        code: 'NO_STARTING_LOCATION',
      })
    }

    const startingNames = ['Frostpine Reaches', 'Crystal Caverns', 'Tech District', 'Mining Plains']
    const startingLocs = locations.filter((l: any) => startingNames.includes(l.name))
    const startingLocation = startingLocs[Math.floor(Math.random() * startingLocs.length)] ?? locations[0]
    if (!startingLocation?._id) {
      return res.status(500).json({ error: 'No valid starting location available', code: 'NO_STARTING_LOCATION' })
    }

    // Get next player number
    const allChars = await convexHttp.query(api.earth.characters.getAll, {}) as any[]
    const playerNumbers = allChars
      .map((c: any) => { const m = c.name?.match(/Player #(\d+)/); return m ? parseInt(m[1]) : null })
      .filter(Boolean) as number[]
    const nextNumber = playerNumbers.length > 0 ? Math.max(...playerNumbers) + 1 : 1337
    const characterName = `Player #${nextNumber}`

    // Upload image before creating the Convex character so storage failures do
    // not leave a paid wallet with a partial character record.
    const imageKey = `player-${characterId}.png`
    const imageUrl = await uploadImage(EARTH_CHARACTERS_BUCKET, imageKey, imageBlob)

    // Create character in Convex
    const convexCharId = await convexHttp.mutation(api.earth.characters.create, {
      walletAddress: wallet_address,
      name: characterName,
      characterType: isNPC ? 'NPC' : 'HUMAN',
      gender: gender.toUpperCase() as 'MALE' | 'FEMALE',
      currentLocationId: startingLocation._id,
      paymentSignature: paymentReference,
      baseLayerFile: selectedLayers?.['1-base'] ?? undefined,
      baseGender: gender.toLowerCase(),
    })

    if (verifiedVaultReceipt && verifiedVaultReceipt.earthCredited > 0n) {
      await convexHttp.mutation(api.earth.earthLedger.creditFromVaultReceipt, {
        characterId: convexCharId,
        amountRaw: verifiedVaultReceipt.earthCredited.toString(),
        source: 'starter_credit',
        receiptId: verifiedVaultReceipt.receiptAddress.toBase58(),
      })
    }

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

    const nftAddress = nft.mintAddress.toBase58()
    await convexHttp.mutation(api.earth.characters.setNftAddress, {
      characterId: convexCharId,
      walletAddress: wallet_address,
      nftAddress,
      tokenId: nftAddress,
    })

    // Create starting inventory
    await createStartingInventory(convexCharId.toString(), selectedLayers)

    let receiptFinalizationSignature: string | null = null
    if (verifiedVaultReceipt) {
      receiptFinalizationSignature = await finalizeCharacterMintReceipt({
        connection,
        receiptAddress: verifiedVaultReceipt.receiptAddress,
        serverKeypair,
      })
    }

    return res.json({
      success: true,
      character: { id: convexCharId, name: characterName, wallet_address },
      nft_address: nftAddress,
      image_url: imageUrl,
      metadataUri,
      paymentVerified: true,
      earthVaultReceipt: verifiedVaultReceipt ? {
        receipt_address: verifiedVaultReceipt.receiptAddress.toBase58(),
        lamports_paid: verifiedVaultReceipt.lamportsPaid.toString(),
        earth_credited: verifiedVaultReceipt.earthCredited.toString(),
        finalized_signature: receiptFinalizationSignature,
      } : null,
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
    '2-skin': 'skin',
    '3-undergarments': 'undergarments',
    '4-clothing': 'clothing',
    '5-outerwear': 'outerwear',
    '6-hair': 'hair',
    '7-face-accessories': 'face_accessory',
    '8-headwear': 'headwear',
    '9-misc-accessories': 'misc_accessory',
  }

  const normalizeLayerFile = (value?: string | null) => value?.replace(/^(male-|female-)/, '')

  for (const [layerType, fileName] of Object.entries(selectedLayers)) {
    if (!fileName) continue
    const slot = LAYER_SLOTS[layerType]
    if (!slot) continue

    const normalizedFileName = normalizeLayerFile(fileName)
    const item = items.find((i: any) =>
      i.layerFile === fileName ||
      i.baseLayerFile === fileName ||
      normalizeLayerFile(i.layerFile) === normalizedFileName ||
      normalizeLayerFile(i.baseLayerFile) === normalizedFileName
    )
    if (!item) {
      console.warn(`No starter inventory item matched ${layerType}/${fileName}`)
      continue
    }

    await convexHttp.mutation(api.earth.inventory.add, {
      characterId,
      itemId: item._id,
      quantity: 1,
      isEquipped: true,
      slotId: slot,
      slotIndex: 1,
      isPrimary: true,
    })
  }
}

export default router
