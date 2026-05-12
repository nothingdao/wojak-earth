// src/config/admins.ts

// see .env for other wallets such as treasury.
export const ADMIN_WALLETS = [
  'FuuSf9DtXVA1etWYkBZFdEkxYKcHWYUMjNLsc287z3eh', // Earth Admin #2086
  '9THaas19LkNrs6ZjVXczyE7iTadPpvxUfvroNGkf3xqs', // Earth GM (GameMaster), Treasury Wallet, "Master Wallet"
  'FNaiVWbkPn3cLseb2yiCK8DNkvptWVwfF63dDBuGZFpf', // iPhone SolFlare
  '4yP4qkG3aBRZHSsdmb1fjrrTt7n9CQSTkaynbkzPF75D', // Earth Admin
  // Add more admin wallet addresses as needed
  '7dJDToTRDi7kcvo5VNkziwG9f1BUvmaMxbgXM4twfdmw', // Earth Admin Solfare Chrome
  'F3JPQ3TzzkSDSZBSueY9FpVdNjK3vq5pTLvxnVxHhazw', // Earth Admin Phantom Mobile
  '48zHWqhPEeTUis4J6v9tfuaEkKKybybGhUphTBjLWYLT', // Earth Admin Solflare Chrome 2019 Macbook Pro
  '58xmARPwM4vNW77DQBRvFQH3PBUjwRKxmBtdZSnF1LYj', // Earth player 2 Solflare Chrome 2019 Macbook Pro
]

export function isAdmin(wallet_address: string): boolean {
  return ADMIN_WALLETS.includes(wallet_address)
}
