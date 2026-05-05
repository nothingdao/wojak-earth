// src/hooks/useReservationStatus.ts
import { useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

export interface Reservation {
  walletAddress: string
  transactionSignature: string
  amountSol: number
  status: 'pending' | 'confirmed' | 'failed'
  // Legacy compat
  wallet_address: string
  transaction_signature: string
  amount_sol: number
}

interface UseReservationStatusReturn {
  reservation: Reservation | null
  loading: boolean
  hasReservation: boolean
  error: string | null
  refetchReservation: () => Promise<void>
}

export function useReservationStatus(shouldLoad: boolean = true): UseReservationStatusReturn {
  const wallet = useWallet()
  const walletAddress = wallet.connected && wallet.publicKey ? wallet.publicKey.toString() : undefined

  const result = useQuery(
    api.earth.reservations.getStatus,
    shouldLoad && walletAddress ? { walletAddress } : 'skip'
  )

  const loading = result === undefined && shouldLoad && !!walletAddress

  const reservation: Reservation | null =
    result?.hasReservation && result.latestTransaction
      ? {
          walletAddress: walletAddress!,
          transactionSignature: result.latestTransaction,
          amountSol: result.totalAmount,
          status: result.latestStatus as 'pending' | 'confirmed' | 'failed',
          wallet_address: walletAddress!,
          transaction_signature: result.latestTransaction,
          amount_sol: result.totalAmount,
        }
      : null

  const hasReservation = result?.hasReservation === true && result.latestStatus === 'confirmed'

  const refetchReservation = useCallback(async () => {
    // Convex useQuery is reactive
  }, [])

  return {
    reservation: shouldLoad ? reservation : null,
    loading: shouldLoad ? loading : false,
    hasReservation: shouldLoad ? hasReservation : false,
    error: null,
    refetchReservation,
  }
}
