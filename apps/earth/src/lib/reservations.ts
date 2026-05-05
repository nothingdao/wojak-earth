// src/lib/reservations.ts
import { convexHttp } from '@/lib/convex-singleton'
import { api } from '@convex/_generated/api'

export interface Reservation {
  id?: string
  wallet_address: string
  transaction_signature: string
  amount_sol: number
  status: 'pending' | 'confirmed' | 'failed'
  created_at?: string
  updated_at?: string
}

export async function saveReservation(
  reservation: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>
): Promise<Reservation> {
  const id = await convexHttp.mutation(api.earth.reservations.create, {
    walletAddress: reservation.wallet_address,
    transactionSignature: reservation.transaction_signature,
    amountSol: reservation.amount_sol,
  })
  return {
    ...reservation,
    id: id as string,
  }
}

export async function updateReservationStatus(
  transactionSignature: string,
  status: Reservation['status']
): Promise<Reservation> {
  // Query to find reservation by transaction signature then confirm
  // Note: we don't have a direct "get by tx sig" query yet
  // For now, return a stub — full implementation needs a getByTxSig query
  console.warn('updateReservationStatus: not fully implemented in Convex yet')
  return {
    wallet_address: '',
    transaction_signature: transactionSignature,
    amount_sol: 0,
    status,
  }
}

export async function getReservation(walletAddress: string): Promise<Reservation | null> {
  const result = await convexHttp.query(api.earth.reservations.getStatus, { walletAddress })
  if (!result.hasReservation || result.latestStatus !== 'confirmed') return null
  return {
    wallet_address: walletAddress,
    transaction_signature: result.latestTransaction ?? '',
    amount_sol: result.totalAmount,
    status: result.latestStatus as 'confirmed',
  }
}

export async function upsertReservation(
  reservation: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>
): Promise<Reservation> {
  return saveReservation(reservation)
}

export async function getAllReservations(): Promise<Reservation[]> {
  const stats = await convexHttp.query(api.earth.reservations.getStats, {})
  console.log('Reservation stats:', stats)
  return []
}

export async function getReservationStats() {
  return convexHttp.query(api.earth.reservations.getStats, {})
}

export async function getUserReservationStatus(walletAddress: string) {
  return convexHttp.query(api.earth.reservations.getStatus, { walletAddress })
}
