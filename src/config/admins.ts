export const ADMIN_WALLETS = [
  'FuuSf9DtXVA1etWYkBZFdEkxYKcHWYUMjNLsc287z3eh', // Earth Admin Wojak #2086
  '9THaas19LkNrs6ZjVXczyE7iTadPpvxUfvroNGkf3xqs', // Earth GM (GameMaster), Treasury Wallet, "Master Wallet"
  '4yP4qkG3aBRZHSsdmb1fjrrTt7n9CQSTkaynbkzPF75D', // Earth Admin Wojak #2083
  // Add more admin wallet addresses as needed
]

export function isAdmin(wallet_address: string): boolean {
  return ADMIN_WALLETS.includes(wallet_address)
}
