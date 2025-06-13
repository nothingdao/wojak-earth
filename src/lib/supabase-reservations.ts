// src/lib/supabase-reservations.ts
import supabase from '@/utils/supabase'

// Types
export interface Reservation {
  id?: string
  wallet_address: string
  transaction_signature: string
  amount_sol: number
  status: 'pending' | 'confirmed' | 'failed'
  created_at?: string
  updated_at?: string
}

// Save reservation to Supabase (INSERT only - for new reservations)
export async function saveReservationToSupabase(
  reservation: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>
) {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .insert([reservation])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save reservation: ${error.message}`)
    }

    console.log('Reservation saved successfully:', data)
    return data
  } catch (error) {
    console.error('Error saving reservation:', error)
    throw error
  }
}

// Update reservation status (UPDATE only - for existing reservations)
export async function updateReservationStatus(
  transactionSignature: string,
  status: Reservation['status']
) {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_signature', transactionSignature)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update reservation: ${error.message}`)
    }

    console.log('Reservation status updated successfully:', data)
    return data
  } catch (error) {
    console.error('Error updating reservation:', error)
    throw error
  }
}

// Get reservation by wallet address
export async function getReservationFromSupabase(
  walletAddress: string
): Promise<Reservation | null> {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to get reservation: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error getting reservation:', error)
    throw error
  }
}

// Alternative: Upsert function (INSERT or UPDATE)
export async function upsertReservationToSupabase(
  reservation: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>
) {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .upsert(
        [
          {
            ...reservation,
            updated_at: new Date().toISOString(),
          },
        ],
        {
          onConflict: 'transaction_signature',
        }
      )
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to upsert reservation: ${error.message}`)
    }

    console.log('Reservation upserted successfully:', data)
    return data
  } catch (error) {
    console.error('Error upserting reservation:', error)
    throw error
  }
}

// Get all reservations (admin function)
export async function getAllReservations(): Promise<Reservation[]> {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get reservations: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error getting all reservations:', error)
    throw error
  }
}

// Get reservation stats using the view
export async function getReservationStats() {
  try {
    const { data, error } = await supabase
      .from('reservation_stats')
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to get reservation stats: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error getting reservation stats:', error)
    throw error
  }
}

// Get user reservation status using the function
export async function getUserReservationStatus(walletAddress: string) {
  try {
    const { data, error } = await supabase.rpc('get_user_reservation_status', {
      wallet_addr: walletAddress,
    })

    if (error) {
      throw new Error(`Failed to get user reservation status: ${error.message}`)
    }

    return data?.[0] || null
  } catch (error) {
    console.error('Error getting user reservation status:', error)
    throw error
  }
}
