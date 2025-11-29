// src/utils/story-flags.ts - Story flag management utilities using existing consequences table
import { createClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/supabase'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

// Types for the new story_flags table
export interface StoryFlag {
  flag_name: string
  flag_value: any
  chapter_acquired?: number
  story_id?: string
  acquired_at: string
  metadata?: any
}

// Legacy type for experience_logs compatibility
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

// ============================================================================
// NEW STORY FLAGS TABLE FUNCTIONS (Recommended)
// ============================================================================

/**
 * Set a story flag using the new story_flags table
 */
export async function setStoryFlag(
  characterId: string,
  flagName: string,
  flagValue: any = true,
  options: {
    chapter?: number
    storyId?: string
    metadata?: any
  } = {}
): Promise<{ data: string | null; error: any }> {
  try {
    console.log(`🏷️ Setting story flag: ${flagName} = ${JSON.stringify(flagValue)} for character ${characterId}`)
    
    const { data, error } = await supabase.rpc('set_story_flag', {
      p_character_id: characterId,
      p_flag_name: flagName,
      p_flag_value: typeof flagValue === 'object' ? flagValue : JSON.stringify(flagValue),
      p_chapter: options.chapter || null,
      p_story_id: options.storyId || null,
      p_metadata: options.metadata || {}
    })

    if (error) {
      console.error('❌ Error setting story flag:', error)
      return { data: null, error }
    }

    console.log(`✅ Story flag set successfully: ${flagName}`)
    return { data, error: null }
  } catch (err) {
    console.error('❌ Exception setting story flag:', err)
    return { data: null, error: err }
  }
}

/**
 * Get all story flags for a character from the new story_flags table
 */
export async function getStoryFlags(characterId: string): Promise<{ data: StoryFlag[] | null; error: any }> {
  try {
    console.log(`📋 Getting story flags for character: ${characterId}`)
    
    const { data, error } = await supabase.rpc('get_character_flags', {
      p_character_id: characterId
    })

    if (error) {
      console.error('❌ Error getting story flags:', error)
      return { data: null, error }
    }

    console.log(`✅ Found ${data?.length || 0} story flags`)
    return { data: data || [], error: null }
  } catch (err) {
    console.error('❌ Exception getting story flags:', err)
    return { data: null, error: err }
  }
}

/**
 * Check if character has a specific story flag
 */
export async function hasStoryFlag(characterId: string, flagName: string): Promise<{ data: boolean; error: any }> {
  try {
    const { data, error } = await supabase.rpc('has_story_flag', {
      p_character_id: characterId,
      p_flag_name: flagName
    })

    if (error) {
      console.error('❌ Error checking story flag:', error)
      return { data: false, error }
    }

    return { data: data || false, error: null }
  } catch (err) {
    console.error('❌ Exception checking story flag:', err)
    return { data: false, error: err }
  }
}

/**
 * Get story flag statistics for a character
 */
export async function getStoryFlagStatistics(characterId: string): Promise<{
  data: {
    totalFlags: number
    flagsByStory: Record<string, number>
    flagsByChapter: Record<string, number>
    recentFlags: StoryFlag[]
  } | null
  error: any
}> {
  try {
    const { data: flags, error } = await getStoryFlags(characterId)
    
    if (error || !flags) {
      return { data: null, error }
    }

    const stats = {
      totalFlags: flags.length,
      flagsByStory: {} as Record<string, number>,
      flagsByChapter: {} as Record<string, number>,
      recentFlags: flags.slice(0, 10) // Most recent 10 flags
    }

    // Count flags by story and chapter
    flags.forEach(flag => {
      if (flag.story_id) {
        stats.flagsByStory[flag.story_id] = (stats.flagsByStory[flag.story_id] || 0) + 1
      }
      if (flag.chapter_acquired) {
        const chapterKey = `chapter_${flag.chapter_acquired}`
        stats.flagsByChapter[chapterKey] = (stats.flagsByChapter[chapterKey] || 0) + 1
      }
    })

    return { data: stats, error: null }
  } catch (err) {
    console.error('❌ Exception getting story flag statistics:', err)
    return { data: null, error: err }
  }
}

// ============================================================================
// LEGACY EXPERIENCE LOGS FUNCTIONS (Kept for backwards compatibility)
// ============================================================================

/**
 * Get all story flags for a character from experience_logs table (LEGACY)
 * Story choices are recorded as experience gains with story flag data in the details JSON
 */
export async function getLegacyCharacterFlags(characterId: string): Promise<{ data: LegacyStoryFlag[] | null; error: any }> {
  try {
    console.log(`Looking for story flags for character: ${characterId}`)
    
    // Query experience_logs for story-related XP gains that contain story flags
    const { data, error } = await supabase
      .from('experience_logs')
      .select('*')
      .eq('character_id', characterId)
      .or('source.eq.story_choice,source.ilike.story_%,source.ilike.chapter_%')
      .not('details->>story_flag', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching story flags:', error)
      return { data: null, error }
    }

    if (!data || data.length === 0) {
      console.log('No story flags found for character')
      return { data: [], error: null }
    }

    // Transform experience_logs into story flags
    const storyFlags: StoryFlag[] = data
      .map(log => {
        const details = log.details as any
        if (!details?.story_flag) return null

        return {
          flag_name: details.story_flag,
          flag_value: details.flag_value || true,
          choice_id: details.choice_id || '',
          consequence_id: log.id, // Use experience log ID
          acquired_at: log.created_at || '',
          chapter_acquired: details.chapter_number,
          story_id: details.story_id || log.source,
          response_text: details.response_text,
          consequence_data: details
        }
      })
      .filter((flag): flag is StoryFlag => flag !== null)

    console.log(`Found ${storyFlags.length} story flags for character`)
    return { data: storyFlags, error: null }
    
  } catch (error) {
    console.error('Error in getCharacterFlags:', error)
    return { data: null, error }
  }
}

/**
 * Record a story choice as an experience gain with story flag data
 * This replaces the need for a separate story_flags table by using experience_logs
 */
export async function recordStoryChoice(
  characterId: string,
  choiceData: {
    story_flag?: string
    flag_value?: any
    choice_id: string
    choice_key: string
    event_key: string
    chapter_number: number
    story_id: string
    experience_gained: number
    response_text?: string
    next_event_id?: string
    health?: number
    energy?: number
    credits?: number
    [key: string]: any
  }
): Promise<{ data: any; error: any }> {
  try {
    // Get character's current experience for the total
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('experience, level')
      .eq('id', characterId)
      .single()

    if (charError) return { data: null, error: charError }

    const currentExp = character?.experience || 0
    const newTotalExp = currentExp + choiceData.experience_gained
    const currentLevel = character?.level || 1
    
    // Simple level calculation (could be enhanced)
    const newLevel = Math.floor(newTotalExp / 100) + 1
    const leveledUp = newLevel > currentLevel

    // Record the story choice as an experience gain
    const { data, error } = await supabase
      .from('experience_logs')
      .insert({
        character_id: characterId,
        source: `story_${choiceData.story_id}`,
        experience_gained: choiceData.experience_gained,
        experience_total: newTotalExp,
        level_before: currentLevel,
        level_after: newLevel,
        leveled_up: leveledUp,
        details: {
          story_flag: choiceData.story_flag,
          flag_value: choiceData.flag_value || true,
          choice_id: choiceData.choice_id,
          choice_key: choiceData.choice_key,
          event_key: choiceData.event_key,
          chapter_number: choiceData.chapter_number,
          story_id: choiceData.story_id,
          response_text: choiceData.response_text,
          next_event_id: choiceData.next_event_id,
          health: choiceData.health,
          energy: choiceData.energy,
          credits: choiceData.credits,
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (error) return { data: null, error }

    // Update character's experience and level
    const { error: updateError } = await supabase
      .from('characters')
      .update({
        experience: newTotalExp,
        level: newLevel
      })
      .eq('id', characterId)

    if (updateError) {
      console.error('Error updating character experience:', updateError)
      // Don't fail the whole operation, just log the error
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Check if a character has a specific story flag (LEGACY)
 */
export async function hasLegacyStoryFlag(characterId: string, flagName: string): Promise<{ data: boolean; error: any }> {
  try {
    const { data: flags, error } = await getLegacyCharacterFlags(characterId)
    if (error) return { data: false, error }
    
    const hasFlag = flags?.some(flag => flag.flag_name === flagName) || false
    return { data: hasFlag, error: null }
  } catch (error) {
    return { data: false, error }
  }
}

/**
 * Get story flags by pattern (useful for checking flag families like "consor_*" or "*_relationship")
 */
export async function getStoryFlagsByPattern(
  characterId: string, 
  pattern: string
): Promise<{ data: StoryFlag[] | null; error: any }> {
  try {
    const { data: flags, error } = await getCharacterFlags(characterId)
    if (error || !flags) return { data: null, error }
    
    // Simple pattern matching - could be enhanced with proper regex
    const matchingFlags = flags.filter(flag => {
      const flagName = flag.flag_name.toLowerCase()
      const searchPattern = pattern.toLowerCase().replace('*', '')
      
      if (pattern.startsWith('*')) {
        return flagName.endsWith(searchPattern)
      } else if (pattern.endsWith('*')) {
        return flagName.startsWith(searchPattern)
      } else {
        return flagName.includes(searchPattern)
      }
    })
    
    return { data: matchingFlags, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Get story flag statistics for a character (LEGACY)
 */
export async function getLegacyStoryFlagStats(characterId: string): Promise<{
  data: {
    totalFlags: number
    flagsByStory: Record<string, number>
    flagsByChapter: Record<string, number>
    recentFlags: LegacyStoryFlag[]
  } | null
  error: any
}> {
  try {
    const { data: flags, error } = await getLegacyCharacterFlags(characterId)
    if (error || !flags) {
      // Return empty stats instead of null for better UX when no story progress exists yet
      return { 
        data: {
          totalFlags: 0,
          flagsByStory: {},
          flagsByChapter: {},
          recentFlags: []
        }, 
        error: null 
      }
    }

    const flagsByStory: Record<string, number> = {}
    const flagsByChapter: Record<string, number> = {}

    flags.forEach(flag => {
      if (flag.story_id) {
        flagsByStory[flag.story_id] = (flagsByStory[flag.story_id] || 0) + 1
      }
      if (flag.chapter_acquired) {
        const chapterKey = `Chapter ${flag.chapter_acquired}`
        flagsByChapter[chapterKey] = (flagsByChapter[chapterKey] || 0) + 1
      }
    })

    const recentFlags = flags.slice(0, 10) // Most recent 10 flags

    return {
      data: {
        totalFlags: flags.length,
        flagsByStory,
        flagsByChapter,
        recentFlags
      },
      error: null
    }
  } catch (error) {
    return { data: null, error }
  }
}

// Common story flag patterns for the Earth 2089 universe
export const STORY_FLAG_PATTERNS = {
  // Reputation systems
  SETTLEMENT_TRUST: 'settlement_trust_*',
  CONSOR_STANDING: 'consor_standing_*',
  SURVIVOR_NETWORK: 'survivor_network_*',
  
  // Character development paths
  LEADERSHIP_TRAITS: 'leadership_*',
  REBEL_TRAITS: 'rebel_*',
  SURVIVOR_TRAITS: 'survivor_*',
  DIPLOMAT_TRAITS: 'diplomat_*',
  
  // Story progression
  CHAPTER_COMPLETION: 'chapter_*_complete',
  STORY_UNLOCKS: 'unlock_*',
  SECRET_DISCOVERIES: 'secret_*',
  
  // Relationships
  CHARACTER_RELATIONSHIPS: '*_relationship',
  FACTION_RELATIONSHIPS: 'faction_*',
  
  // World state
  LOCATION_DISCOVERIES: 'discovered_*',
  WORLD_EVENTS: 'event_*',
  
  // Achievements
  MILESTONE_ACHIEVEMENTS: 'milestone_*',
  HIDDEN_ACHIEVEMENTS: 'hidden_*'
} as const

export type StoryFlagPattern = keyof typeof STORY_FLAG_PATTERNS