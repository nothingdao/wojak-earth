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
      '  npm run script seed           - Seed database with initial data'
    )
    console.log('  npm run script restock        - Restock markets')
    console.log('  npm run script restock energy - Quick energy drink restock')
    console.log('  npm run script restock analyze - Analyze market stock')
    return
  }

  try {
    switch (scriptName) {
      case 'seed': {
        const { seedDatabase } = await import('./seedDatabase')
        await seedDatabase()
        break
      }

      case 'restock': {
        const restockMode = process.argv[3] || 'full'
        const { restockMarkets, restockEnergyDrinksOnly, analyzeCurrentStock } =
          await import('./restockMarkets')

        switch (restockMode) {
          case 'energy': {
            const quantity = parseInt(process.argv[4]) || 50
            await restockEnergyDrinksOnly(quantity)
            break
          }
          case 'analyze':
            await analyzeCurrentStock()
            break
          case 'full':
          default:
            await restockMarkets()
            break
        }
        break
      }

      default:
        console.log(`❌ Unknown script: ${scriptName}`)
        break
    }
  } catch (error) {
    console.error('💥 Script failed:', error)
    process.exit(1)
  }
}

runScript()
