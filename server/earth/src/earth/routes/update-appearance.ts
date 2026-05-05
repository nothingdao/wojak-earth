import { Router } from 'express'
import { api } from '../lib/api.js'
import { convexHttp } from '../lib/convex.js'
import { uploadImage } from '../lib/r2.js'

const router = Router()
const EARTH_CHARACTERS_BUCKET = 'earth-characters'

router.post('/update-appearance', async (req, res) => {
  try {
    const { character_id, image_blob, wallet_address, description = 'Equipment update' } = req.body

    if (!character_id || !image_blob || !wallet_address) {
      return res.status(400).json({ error: 'Missing required fields: character_id, image_blob, wallet_address' })
    }

    const character = await convexHttp.query(api.earth.characters.getByWallet, { walletAddress: wallet_address }) as any
    if (!character || character._id.toString() !== character_id) {
      return res.status(404).json({ error: 'Character not found or access denied' })
    }

    const newVersion = (character.currentVersion ?? 1) + 1
    const imageKey = `player-${character_id}-v${newVersion}.png`
    const imageUrl = await uploadImage(EARTH_CHARACTERS_BUCKET, imageKey, image_blob)

    await convexHttp.mutation(api.earth.characters.updateAppearance, {
      walletAddress: wallet_address,
      currentImageUrl: imageUrl,
      currentVersion: newVersion,
    })

    return res.json({ success: true, character_id, image_url: imageUrl, version: newVersion })
  } catch (error: any) {
    console.error('update-appearance error:', error)
    return res.status(500).json({ error: error.message })
  }
})

export default router
