# Earth 2089 Utility Scripts

This directory contains standalone utility scripts for development, testing, and setup purposes.

## Active Scripts

### `mint-earth-token.js`
**Purpose:** Creates the EARTH token mint on Solana devnet and mints initial supply.

**Usage:**
```bash
node scripts/mint-earth-token.js
```

**What it does:**
- Creates EARTH token mint with 9 decimals
- Mints 3.5M EARTH tokens to server wallet
- Outputs mint address for environment variables
- Provides Solana Explorer links

**Requirements:**
- `SERVER_KEYPAIR_SECRET` environment variable
- Sufficient SOL for transaction fees

---

### `mint-usdc.js`
**Purpose:** Creates a test USDC token for development/testing.

**Usage:**
```bash
node scripts/mint-usdc.js
```

**What it does:**
- Creates test USDC mint with 6 decimals
- Mints 1000 test tokens to server wallet
- Outputs mint address for testing

**Requirements:**
- `SERVER_KEYPAIR_SECRET` environment variable
- Sufficient SOL for transaction fees

---

### `airdrop.js`
**Purpose:** Airdrops tokens/SOL to a predefined list of wallets for testing.

**Usage:**
```bash
node scripts/airdrop.js
```

**What it does:**
- Airdrops tokens to hardcoded wallet addresses
- Used for development/testing purposes
- Distributes tokens to multiple test accounts

**Requirements:**
- `SERVER_KEYPAIR_SECRET` environment variable
- Sufficient SOL and tokens for distribution

---

### `extract-locations.js`
**Purpose:** Extracts location data from the database for analysis or export.

**Usage:**
```bash
npm run extract-locations
```

**What it does:**
- Queries all locations from the database
- Exports location data in a structured format
- Useful for data analysis and documentation

**Requirements:**
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables

---

## Archive Directory

The `scripts/archive/` directory contains one-time migration scripts and test utilities that were used during development:

- **Story system scripts:** Database population and testing for the story/narrative system
- **Database migrations:** Schema updates and data transformations
- **Supabase migration scripts:** Used during the migration from old to new Supabase project

These scripts are kept for historical reference but are not intended for regular use.

---

## Environment Setup

All scripts require environment variables from the `.env` file:

```bash
# Supabase configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Server wallet private key as JSON array
SERVER_KEYPAIR_SECRET=[1,2,3,...,64]

# Solana RPC endpoint
VITE_DEVNET_RPC_URL=https://api.devnet.solana.com
```

## Notes

- These are **utility scripts**, not part of the main application
- Scripts are designed for **devnet** testing
- Ensure adequate SOL balance before running Solana-related scripts
- Scripts output important addresses that may need to be added to environment variables
- Scripts use ES modules (`.js` files with `import` statements)

## Running Scripts

1. **Ensure environment variables are set:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Run the desired script:**
   ```bash
   node scripts/<script-name>.js
   ```

   Or use npm scripts where available:
   ```bash
   npm run extract-locations
   ```
