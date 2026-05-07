import packageJson from '../package.json' with { type: 'json' }

type ReadinessCheck = {
  name: string
  required: string[]
  optional?: string[]
}

const readinessChecks: ReadinessCheck[] = [
  {
    name: 'convex',
    required: ['CONVEX_URL', 'CONVEX_SITE_URL', 'ADMIN_API_KEY'],
  },
  {
    name: 'solana',
    required: ['SOLANA_RPC_URL'],
  },
  {
    name: 'earth-minting',
    required: [
      'SERVER_URL',
      'SERVER_KEYPAIR_SECRET',
      'TREASURY_WALLET_ADDRESS',
      'VITE_TREASURY_WALLET_ADDRESS',
    ],
    optional: ['PLAYER_COLLECTION_ADDRESS'],
  },
  {
    name: 'earth-bridge',
    required: ['TREASURY_KEYPAIR_SECRET', 'VITE_EARTH_MINT_ADDRESS'],
  },
  {
    name: 'r2-storage',
    required: ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_URL'],
  },
]

function isPresent(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function missingEnv(keys: string[]): string[] {
  return keys.filter((key) => !isPresent(process.env[key]))
}

export function getHealthStatus() {
  return {
    ok: true,
    service: packageJson.name,
    version: packageJson.version,
  }
}

export function getReadinessStatus() {
  const checks = readinessChecks.map((check) => {
    const missing = missingEnv(check.required)
    return {
      name: check.name,
      ok: missing.length === 0,
      missing,
      optional: check.optional ?? [],
    }
  })

  const missing = checks.flatMap((check) => check.missing)
  const ok = missing.length === 0

  return {
    ...getHealthStatus(),
    ok,
    checks,
    missing,
  }
}
