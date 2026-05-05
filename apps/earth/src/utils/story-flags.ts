// src/utils/story-flags.ts - Convex story flags
import { convexHttp } from '@/lib/convex-singleton'
import { api } from '@convex/_generated/api'

export interface StoryFlag {
  flag_name: string
  flag_value: any
  chapter_acquired?: number
  story_id?: string
  acquired_at: string
  metadata?: any
}

export interface LegacyStoryFlag {
  flag_name: string
  flag_value: any
  choice_id: string
  consequence_id: string
  acquired_at: string
  chapter_acquired?: number
  story_id?: string
  response_text?: string
  consequence_data: any
}

export interface ConsequenceData {
  health?: number
  energy?: number
  experience?: number
  credits?: number
  story_flag?: string
  response_text?: string
  next_event_id?: string
  [key: string]: any
}

export async function setStoryFlag(
  characterId: string,
  flagName: string,
  flagValue: any = true,
  options: { chapter?: number; storyId?: string; metadata?: any } = {}
): Promise<{ data: string | null; error: any }> {
  try {
    const id = await convexHttp.mutation(api.earth.storyFlags.set, {
      characterId,
      flagName,
      flagValue,
      storyId: options.storyId,
      chapterAcquired: options.chapter,
      metadata: options.metadata,
    })
    return { data: id as string, error: null }
  } catch (error) {
    console.error('Error setting story flag:', error)
    return { data: null, error }
  }
}

export async function getStoryFlags(characterId: string): Promise<StoryFlag[]> {
  try {
    const flags = await convexHttp.query(api.earth.storyFlags.getByCharacter, { characterId })
    return flags.map((f: any) => ({
      flag_name: f.flagName,
      flag_value: f.flagValue,
      chapter_acquired: f.chapterAcquired,
      story_id: f.storyId,
      acquired_at: new Date(f.acquiredAt ?? f.createdAt).toISOString(),
      metadata: f.metadata,
    }))
  } catch (error) {
    console.error('Error getting story flags:', error)
    return []
  }
}

export async function hasStoryFlag(characterId: string, flagName: string): Promise<boolean> {
  try {
    return convexHttp.query(api.earth.storyFlags.has, { characterId, flagName })
  } catch (error) {
    console.error('Error checking story flag:', error)
    return false
  }
}

export async function getStoryFlagStatistics(characterId: string) {
  const flags = await getStoryFlags(characterId)
  return {
    total: flags.length,
    byStory: flags.reduce((acc, f) => {
      const key = f.story_id ?? 'unknown'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {} as Record<string, number>),
  }
}

// Legacy compatibility - these are stubs since Convex uses different pattern
export async function recordStoryChoice(
  _characterId: string,
  _choiceId: string,
  _consequenceId: string,
  _consequenceData: ConsequenceData
): Promise<{ data: any; error: any }> {
  // TODO: implement via Convex mutation once story consequence system is built
  console.warn('recordStoryChoice: not yet implemented in Convex')
  return { data: null, error: null }
}
