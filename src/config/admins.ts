export const ADMIN_WALLETS = [
  'FuuSf9DtXVA1etWYkBZFdEkxYKcHWYUMjNLsc287z3eh', // Earth Admin
  '9THaas19LkNrs6ZjVXczyE7iTadPpvxUfvroNGkf3xqs', // Earth GM (GameMaster), Treasury Wallet, "Master Wallet"
  // Add more admin wallet addresses as needed
]

export function isAdmin(walletAddress: string): boolean {
  return ADMIN_WALLETS.includes(walletAddress)
}
