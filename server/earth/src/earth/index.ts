import { Router } from 'express'
import mintPlayerRouter from './routes/mint-player.js'
import updateAppearanceRouter from './routes/update-appearance.js'
import nftMetadataRouter from './routes/nft-metadata.js'
import solBalanceRouter from './routes/sol-balance.js'
import exchangeRouter from './routes/exchange.js'
import bridgeRouter from './routes/bridge.js'
import economyRouter from './routes/economy.js'
import debugRouter from './routes/debug.js'

const router = Router()

router.use(mintPlayerRouter)
router.use(updateAppearanceRouter)
router.use(nftMetadataRouter)
router.use(solBalanceRouter)
router.use(exchangeRouter)
router.use(bridgeRouter)
router.use(economyRouter)
router.use(debugRouter)

export default router
