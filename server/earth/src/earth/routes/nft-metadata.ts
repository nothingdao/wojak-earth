import { Router } from 'express'
import { api } from '../lib/api.js'
import { convexHttp } from '../lib/convex.js'

const router = Router()

router.get('/nft-metadata/:characterId', async (req, res) => {
  res.set('Cache-Control', 'no-cache')
  try {
    const { characterId } = req.params

    const chars = await convexHttp.query(api.earth.characters.getAll, {}) as any[]
    const character = chars.find((c: any) => c._id.toString() === characterId)

    if (!character) {
      return res.status(404).json({ error: 'Character not found' })
    }

    const metadata = {
      name: character.name,
      symbol: 'PLAYER',
      description: `${character.name} — Earth 2089 character. Level ${character.level} ${character.characterType}.`,
      image: character.currentImageUrl ?? character.birthImageUrl ?? 'https://earth.ndao.computer/earth.png',
      attributes: [
        { trait_type: 'Level', value: character.level },
        { trait_type: 'Gender', value: character.gender },
        { trait_type: 'Type', value: character.characterType },
        { trait_type: 'Health', value: character.health },
        { trait_type: 'Energy', value: character.energy },
        { trait_type: 'Earth', value: character.earth },
      ],
      properties: {
        category: 'image',
        creators: [
          {
            address: process.env.TREASURY_WALLET_ADDRESS ?? '11111111111111111111111111111111',
            verified: true,
            share: 100,
          },
        ],
        files: [{ uri: character.currentImageUrl ?? 'https://earth.ndao.computer/earth.png', type: 'image/png' }],
      },
      collection: { name: 'EARTH 2089 Players', family: 'Earth 2089' },
      game_data: {
        character_id: characterId,
        level: character.level,
        health: character.health,
        energy: character.energy,
        earth: character.earth,
        location_id: character.currentLocationId,
      },
    }

    return res.json(metadata)
  } catch (error: any) {
    console.error('nft-metadata error:', error)
    return res.status(500).json({ error: error.message })
  }
})

export default router
