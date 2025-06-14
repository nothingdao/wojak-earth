// src/hookes/useChatPresence.ts

import { useState, useEffect, useRef } from 'react'
import supabase from '../utils/supabase'
import type { Character } from '@/types'

interface PresenceOptions {
  onPresenceChange?: (currentPresence: any[]) => void
}

// Hook for READING participant count (doesn't track presence)
export function useChatParticipantCount(location_id: string | null) {
  const [chatParticipants, setChatParticipants] = useState(0)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!location_id) return

    const channel = supabase.channel(`chat_presence_${location_id}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        const participants = Object.keys(presenceState).length
        const names = Object.values(presenceState)
          .flat()
          .map((p: any) => p.name)
          .join(', ')

        console.log(
          `Chat participants synced: ${participants} active (${names})`
        )
        setChatParticipants(participants)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [location_id])

  return chatParticipants
}

// Hook for ACTIVELY participating in chat (tracks presence)
export function useChatPresence(
  location_id: string | null,
  character: Character | null,
  options?: PresenceOptions
) {
  const [chatParticipants, setChatParticipants] = useState(0)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!location_id || !character) return

    const channel = supabase.channel(`chat_presence_${location_id}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        const participants = Object.keys(presenceState).length
        const currentPresence = Object.values(presenceState).flat()

        const names = currentPresence.map((p: any) => p.name).join(', ')
        console.log(
          `Chat participants synced: ${participants} active (${names})`
        )

        setChatParticipants(participants)

        // Call the callback with current presence data
        if (options?.onPresenceChange) {
          // Use a ref to avoid infinite loops
          const callback = options.onPresenceChange
          setTimeout(() => callback(currentPresence), 0)
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((presence: any) => {
          console.log(`${presence.name} joined chat:`, presence)
        })
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          console.log(`${presence.name} left chat:`, presence)
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`${character.name} entering chat presence`)
          await channel.track({
            user_id: character.id,
            name: character.name,
            online_at: new Date().toISOString(),
          })
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        console.log(`${character.name} leaving chat presence`)
        channelRef.current.untrack()
        channelRef.current.unsubscribe()
      }
    }
  }, [location_id, character?.id, character?.name])

  return chatParticipants
}
