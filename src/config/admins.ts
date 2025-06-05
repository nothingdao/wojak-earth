export const ADMIN_WALLETS = [
  'FuuSf9DtXVA1etWYkBZFdEkxYKcHWYUMjNLsc287z3eh',
  // Add more admin wallet addresses as needed
]

export function isAdmin(walletAddress: string): boolean {
  return ADMIN_WALLETS.includes(walletAddress)
}
