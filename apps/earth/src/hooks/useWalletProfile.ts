import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

export function useWalletProfile(address?: string | null) {
  const wallet = useWallet()
  const walletAddress = address ?? wallet.publicKey?.toString() ?? null
  const profile = useQuery(
    api.profiles.getByWallet,
    walletAddress ? { walletAddress } : 'skip'
  )

  return {
    walletAddress,
    profile: profile ?? null,
    loading: profile === undefined && !!walletAddress,
  }
}
