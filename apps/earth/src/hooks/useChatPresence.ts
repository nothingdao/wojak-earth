// src/hooks/useChatPresence.ts
// Simplified: uses Convex character count for location presence
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Character } from '@/types'

export function useChatParticipantCount(location_id: string | null): number {
  const players = useQuery(
    api.earth.characters.getAtLocation,
    location_id ? { locationId: location_id } : 'skip'
  )
  return players?.length ?? 0
}

export function useChatPresence(
  location_id: string | null,
  _character: Character | null,
  _options?: { onPresenceChange?: (presence: any[]) => void }
): number {
  // Simplified: track participant count from characters at location
  return useChatParticipantCount(location_id)
}
