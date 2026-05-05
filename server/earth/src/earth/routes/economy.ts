import { Router } from 'express'
import { api } from '../lib/api.js'
import { convexHttp } from '../lib/convex.js'

const router = Router()

router.get('/economy', async (_req, res) => {
  try {
    const overview = await convexHttp.query(api.earth.economy.getOverview, {})
    return res.json({ success: true, ...overview })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
})

router.post('/grant-experience', async (req, res) => {
  try {
    const { characterId, amount, reason } = req.body
    if (!characterId || !amount) return res.status(400).json({ error: 'characterId and amount required' })

    await convexHttp.mutation(api.earth.economy.grantExperience, { characterId, amount, reason })
    return res.json({ success: true })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
})

router.post('/npc-exchange', async (req, res) => {
  try {
    const { characterId, npcId, action, amount } = req.body
    if (!characterId || !action || !amount) return res.status(400).json({ error: 'characterId, action, amount required' })

    // NPC exchange: earth ↔ items at NPC rates
    // For now returns a placeholder — full NPC economy logic can be wired once NPC state is in Convex
    return res.json({ success: true, action, amount, message: 'NPC exchange acknowledged' })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
})

export default router
