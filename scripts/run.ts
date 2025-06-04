// scripts/run.ts - Script runner that loads Vite env vars
import { loadEnv } from 'vite'

// Load environment variables
const env = loadEnv('development', process.cwd(), '')
Object.assign(process.env, env)

async function runScript() {
  const scriptName = process.argv[2]

  if (!scriptName) {
    console.log('📋 Available scripts:')
    console.log(
      '  npm run script seed                          - Seed database with initial data'
    )
    console.log(
      '  npm run script seed-missing [missing|all]    - Add missing items to database'
    )
    console.log(
      '  npm run script restock                       - Full biome-based restock'
    )
    console.log(
      '  npm run script restock biome [biomes...]     - Restock specific biomes'
    )
    console.log(
      '  npm run script restock location "Name"       - Restock specific location'
    )
    console.log(
      '  npm run script restock consumables           - Quick consumables restock'
    )
    console.log(
      '  npm run script restock energy [quantity]     - Legacy energy drink restock'
    )
    console.log(
      '  npm run script restock analyze               - Analyze market stock'
    )
    return
  }

  try {
    switch (scriptName) {
      case 'seed': {
        const { seedDatabase } = await import('./seedDatabase')
        await seedDatabase()
        break
      }

      case 'seed-missing': {
        const mode = process.argv[3] || 'missing'
        const { seedMissingItems, seedAllMissingWorldItems } = await import(
          './seedMissingItems'
        )

        switch (mode) {
          case 'all':
            await seedAllMissingWorldItems()
            break
          case 'missing':
          default:
            await seedMissingItems()
            break
        }
        break
      }

      case 'restock': {
        const restockMode = process.argv[3] || 'full'

        switch (restockMode) {
          case 'biome': {
            const { restockBiomeMarkets } = await import('./restockMarkets')
            const biomes = process.argv.slice(4) // Get all biome names after 'biome'
            await restockBiomeMarkets(biomes)
            break
          }

          case 'location': {
            const { restockSpecificLocation } = await import('./restockMarkets')
            const locationName = process.argv.slice(4).join(' ') // Join all words after 'location'
            if (!locationName) {
              console.log('❌ Please specify a location name')
              console.log(
                'Example: npm run script restock location "Cyber City"'
              )
              return
            }
            await restockSpecificLocation(locationName)
            break
          }

          case 'consumables': {
            const { quickRestockConsumables } = await import('./restockMarkets')
            await quickRestockConsumables()
            break
          }

          case 'energy': {
            // Legacy support for old energy drink restocking
            const { restockEnergyDrinksOnly } = await import('./restockMarkets')
            const quantity = parseInt(process.argv[4]) || 50
            await restockEnergyDrinksOnly(quantity)
            break
          }

          case 'analyze': {
            const { analyzeCurrentStock } = await import('./restockMarkets')
            await analyzeCurrentStock()
            break
          }

          case 'full':
          default: {
            const { restockBiomeMarkets } = await import('./restockMarkets')
            await restockBiomeMarkets() // Restock all biomes
            break
          }
        }
        break
      }

      default:
        console.log(`❌ Unknown script: ${scriptName}`)
        console.log('Run without arguments to see available scripts')
        break
    }
  } catch (error) {
    console.error('💥 Script failed:', error)
    process.exit(1)
  }
}

runScript()
