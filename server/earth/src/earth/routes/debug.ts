import { appendFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'

const router = Router()
const DEBUG_DIR = path.resolve(process.cwd(), '.debug')
const CLIENT_LOG = path.join(DEBUG_DIR, 'earth-client.log')

router.post('/debug/client-log', async (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_CLIENT_LOGS !== 'true') {
    return res.sendStatus(404)
  }

  try {
    await mkdir(DEBUG_DIR, { recursive: true })
    const body = req.body ?? {}
    const entry = {
      ts: new Date().toISOString(),
      level: String(body.level ?? 'log'),
      source: String(body.source ?? 'client'),
      url: body.url,
      message: body.message,
      args: body.args,
      stack: body.stack,
      userAgent: body.userAgent,
    }
    await appendFile(CLIENT_LOG, `${JSON.stringify(entry)}\n`, 'utf8')
    return res.json({ ok: true })
  } catch (error) {
    console.error('debug client-log write failed:', error)
    return res.status(500).json({ ok: false })
  }
})

router.get('/debug/client-log', async (_req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_CLIENT_LOGS !== 'true') {
    return res.sendStatus(404)
  }

  try {
    const text = await readFile(CLIENT_LOG, 'utf8').catch(() => '')
    return res.type('text/plain').send(text.split('\n').slice(-500).join('\n'))
  } catch (error) {
    console.error('debug client-log read failed:', error)
    return res.status(500).json({ ok: false })
  }
})

export default router
