// src/components/admin/StoryEditor.tsx - Basic story editor interface
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Save, Play, TestTube, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { Tables } from '@/types/supabase'
import { createClient } from '@supabase/supabase-js'
import { showStoryDialog, useStoryDialog, StoryDialog, addStoryScreens, type StoryScreen } from '@/components/ui/story-dialog'
import { createStoryScreens } from '@/utils/story-system'
import { recordStoryChoice, setStoryFlag } from '@/utils/story-flags'
import type { Character } from '@/types'
import {
  ActionConsequenceSchema,
  type ActionConsequence,
  type StoryEntity,
} from '@/lib/game-logic/types'
import { FUNCTIONS_API_BASE } from '@/config/functionsBase'

// Type aliases for cleaner code
type Story = Tables<'stories'>
type Chapter = Tables<'chapters'>
type Event = Tables<'events'>
type Choice = Tables<'choices'>
type Consequence = Tables<'consequences'>

// Type for consequence data structure
type ConsequenceData = ActionConsequence

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

// Using deployed Netlify functions for reliable Supabase access
const STORY_API_BASE = FUNCTIONS_API_BASE
let storyApiAdminWallet: string | null = null

function setStoryApiAdminWallet(walletAddress?: string | null) {
  storyApiAdminWallet = walletAddress || null
}

async function callStoryApi<T>(
  endpoint: string,
  init?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  }

  if (storyApiAdminWallet) {
    headers['x-admin-wallet'] = storyApiAdminWallet
  }

  const response = await fetch(`${STORY_API_BASE}/${endpoint}`, {
    ...init,
    headers,
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.error?.message || result?.error || 'Story API request failed')
  }
  return result as T
}

async function storyList<T>(
  entity: StoryEntity,
  params: Record<string, string> = {}
): Promise<T[]> {
  const query = new URLSearchParams({ entity, ...params }).toString()
  const result = await callStoryApi<{ data: T[] }>(`story-list?${query}`)
  return result.data || []
}

async function storyCreate<T>(
  entity: StoryEntity,
  data: Record<string, unknown>
): Promise<T> {
  const result = await callStoryApi<{ data: T }>('story-create', {
    method: 'POST',
    body: JSON.stringify({ entity, data }),
  })
  return result.data
}

async function storyUpdate<T>(
  entity: StoryEntity,
  id: string,
  updates: Record<string, unknown>
): Promise<T> {
  const result = await callStoryApi<{ data: T }>('story-update', {
    method: 'PATCH',
    body: JSON.stringify({ entity, id, updates }),
  })
  return result.data
}

async function storyDelete(entity: StoryEntity, id: string): Promise<void> {
  await callStoryApi('story-delete', {
    method: 'DELETE',
    body: JSON.stringify({ entity, id }),
  })
}

interface StoryEditorProps {
  character?: Character
}

export function StoryEditor({ character }: StoryEditorProps) {
  const [stories, setStories] = useState<Story[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [choices, setChoices] = useState<Choice[]>([])
  const [consequences, setConsequences] = useState<Consequence[]>([])
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null)
  const [selectedConsequence, setSelectedConsequence] = useState<Consequence | null>(null)
  const [showConsequenceBuilder, setShowConsequenceBuilder] = useState(false)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'flow'>('list')
  const [nuclearMode, setNuclearMode] = useState(false)

  // Story dialog testing state
  const dialogState = useStoryDialog()

  useEffect(() => {
    setStoryApiAdminWallet(character?.wallet_address || null)
  }, [character?.wallet_address])

  // Load stories on mount
  useEffect(() => {
    loadStories()
  }, [])

  // Load chapters when story is selected
  useEffect(() => {
    if (selectedStory) {
      // Clear child data immediately when story changes
      setSelectedChapter(null)
      setSelectedEvent(null)
      setSelectedChoice(null)
      setSelectedConsequence(null)
      setChapters([])
      setEvents([])
      setChoices([])
      setConsequences([])
      // Then load fresh chapters for the new story
      loadChapters(selectedStory.id)
    } else {
      // Clear all data when no story is selected
      setSelectedChapter(null)
      setSelectedEvent(null)
      setSelectedChoice(null)
      setSelectedConsequence(null)
      setChapters([])
      setEvents([])
      setChoices([])
      setConsequences([])
    }
  }, [selectedStory])

  // Load events when chapter is selected
  useEffect(() => {
    if (selectedChapter) {
      // Clear child data immediately when chapter changes
      setSelectedEvent(null)
      setSelectedChoice(null)
      setSelectedConsequence(null)
      setEvents([])
      setChoices([])
      setConsequences([])
      // Then load fresh events for the new chapter
      loadEvents(selectedChapter.id)
    }
  }, [selectedChapter])

  // Clear selection state when event changes (but keep all chapter data loaded)
  useEffect(() => {
    if (selectedEvent) {
      setSelectedChoice(null)
      setSelectedConsequence(null)
    }
  }, [selectedEvent])

  const loadStories = async () => {
    try {
      const data = await storyList<Story>('story', {
        orderBy: 'created_at',
        ascending: 'false',
      })
      setStories(data || [])
    } catch (error) {
      console.error('Error loading stories:', error)
    }
  }

  const loadChapters = async (storyId: string) => {
    try {
      const data = await storyList<Chapter>('chapter', {
        story_id: storyId,
        orderBy: 'chapter_number',
        ascending: 'true',
      })
      setChapters(data || [])
    } catch (error) {
      console.error('Error loading chapters:', error)
    }
  }

  const loadEvents = async (chapterId: string) => {
    try {
      const data = await storyList<Event>('event', {
        chapter_id: chapterId,
        orderBy: 'order_index',
        ascending: 'true',
      })
      setEvents(data || [])

      // Load all choices for all events in this chapter
      if (data && data.length > 0) {
        loadAllChoicesForChapter(data.map(e => e.id))
      }
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  const loadAllChoicesForChapter = async (eventIds: string[]) => {
    try {
      const data = await storyList<Choice>('choice', {
        event_ids: eventIds.join(','),
        orderBy: 'order_index',
        ascending: 'true',
      })
      setChoices(data || [])
      // Load all consequences for all choices
      if (data && data.length > 0) {
        loadConsequences(data.map(c => c.id))
      }
    } catch (error) {
      console.error('Error loading chapter choices:', error)
    }
  }

  const loadChoices = async (eventId: string) => {
    try {
      const data = await storyList<Choice>('choice', {
        event_id: eventId,
        orderBy: 'order_index',
        ascending: 'true',
      })
      setChoices(data || [])
      // Load consequences for all choices
      if (data && data.length > 0) {
        loadConsequences(data.map(c => c.id))
      }
    } catch (error) {
      console.error('Error loading choices:', error)
    }
  }

  const loadConsequences = async (choiceIds: string[]) => {
    if (choiceIds.length === 0) return

    try {
      const data = await storyList<Consequence>('consequence', {
        choice_ids: choiceIds.join(','),
      })
      setConsequences(data || [])
    } catch (error) {
      console.error('Error loading consequences:', error)
    }
  }


  const createStory = async () => {
    const title = prompt('Story title:')
    const characterPath = prompt('Character path (male/female):')

    if (!title || !characterPath) return

    setLoading(true)
    try {
      const data = await storyCreate<Story>('story', {
        title,
        character_path: characterPath,
        description: 'New story description'
      })

      setStories([data, ...stories])
      setSelectedStory(data)
    } catch (error) {
      console.error('Error creating story:', error)
    }
    setLoading(false)
  }

  const createChapter = async () => {
    if (!selectedStory) return

    const title = prompt('Chapter title:')
    const chapterNumber = chapters.length + 1

    if (!title) return

    setLoading(true)
    try {
      const data = await storyCreate<Chapter>('chapter', {
        story_id: selectedStory.id,
        chapter_number: chapterNumber,
        title,
        description: 'New chapter description'
      })

      setChapters([...chapters, data])
      setSelectedChapter(data)
    } catch (error) {
      console.error('Error creating chapter:', error)
    }
    setLoading(false)
  }

  const updateChapter = async (chapterId: string, updates: Partial<Chapter>) => {
    setLoading(true)
    try {
      await storyUpdate('chapter', chapterId, updates as Record<string, unknown>)
      // Update local state
      setChapters(chapters.map(ch =>
        ch.id === chapterId ? { ...ch, ...updates } : ch
      ))
      if (selectedChapter?.id === chapterId) {
        setSelectedChapter({ ...selectedChapter, ...updates })
      }
    } catch (error) {
      console.error('Error updating chapter:', error)
    }
    setLoading(false)
  }

  const updateEvent = async (eventId: string, updates: Partial<Event>) => {
    setLoading(true)
    try {
      await storyUpdate('event', eventId, updates as Record<string, unknown>)
      // Update local state
      setEvents(events.map(ev =>
        ev.id === eventId ? { ...ev, ...updates } : ev
      ))
      if (selectedEvent?.id === eventId) {
        setSelectedEvent({ ...selectedEvent, ...updates })
      }
    } catch (error) {
      console.error('Error updating event:', error)
    }
    setLoading(false)
  }

  const createEvent = async () => {
    console.log('createEvent function called!')
    console.log('selectedChapter:', selectedChapter)
    if (!selectedChapter) {
      alert('Please select a chapter first!')
      return
    }

    console.log('About to prompt for title...')
    const title = prompt('Event title:')
    console.log('Title entered:', title)
    if (!title) return

    // Check if an event with this title already exists in the chapter
    const existingEvent = events.find(e =>
      e.chapter_id === selectedChapter.id &&
      e.title.toLowerCase().trim() === title.toLowerCase().trim()
    )

    if (existingEvent) {
      alert(`An event with the title "${title}" already exists in this chapter. Please choose a different title.`)
      return
    }

    console.log('Creating event:', {
      chapter_id: selectedChapter.id,
      title,
      currentEventsCount: events.length,
      order_index: events.length + 1
    })

    setLoading(true)
    try {
      const data = await storyCreate<Event>('event', {
        chapter_id: selectedChapter.id,
        title,
        description: 'New event description',
        order_index: events.length + 1
      })
      console.log('Event created successfully:', data)
      // Reload events to ensure we have the latest data
      await loadEvents(selectedChapter.id)
      // Set the newly created event as selected
      setSelectedEvent(data)
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Unexpected error creating event')
    }
    setLoading(false)
  }

  const createChoice = async () => {
    if (!selectedEvent) {
      alert('Please select an event first!')
      return
    }

    const text = prompt('Choice text:')

    if (!text) return

    const choiceKey = prompt('Choice key (e.g., c1, c2, or leave blank for auto):') ||
      `c${choices.filter(c => c.event_id === selectedEvent.id).length + 1}`

    console.log('Creating choice for event:', selectedEvent.id, 'Text:', text, 'Key:', choiceKey)
    setLoading(true)

    try {
      const data = await storyCreate<Choice>('choice', {
        event_id: selectedEvent.id,
        choice_key: choiceKey,
        text,
        order_index: choices.filter(c => c.event_id === selectedEvent.id).length + 1
      })
      console.log('Choice created successfully:', data)
      setChoices([...choices, data])
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Unexpected error creating choice')
    }

    setLoading(false)
  }

  // Legacy function - kept for backward compatibility but not used in UI
  const createConsequence = async (choiceId: string) => {
    const consequenceData = prompt('Consequence data (JSON format, e.g., {"health": -1, "item": "artifact"}):') || '{}'

    console.log('Creating consequence for choice:', choiceId, 'Data:', consequenceData)
    setLoading(true)

    try {
      const parsedData = JSON.parse(consequenceData)
      const validated = ActionConsequenceSchema.safeParse(parsedData)
      if (!validated.success) {
        alert('Invalid consequence JSON keys or values')
        setLoading(false)
        return
      }
      const data = await storyCreate<Consequence>('consequence', {
        choice_id: choiceId,
        consequence_data: validated.data
      })
      console.log('Consequence created successfully:', data)
      setConsequences([...consequences, data])
    } catch (err) {
      console.error('JSON parse error or unexpected error:', err)
      alert('Invalid JSON format or unexpected error')
    }

    setLoading(false)
  }

  const updateChoice = async (choiceId: string, updates: Partial<Choice>) => {
    setLoading(true)
    try {
      await storyUpdate('choice', choiceId, updates as Record<string, unknown>)
      setChoices(choices.map(ch =>
        ch.id === choiceId ? { ...ch, ...updates } : ch
      ))
    } catch (error: any) {
      console.error('Error updating choice:', error)
      alert(`Failed to update choice: ${error.message || 'Unknown error'}`)
    }
    setLoading(false)
  }

  const createConsequenceWithBuilder = (choiceId: string) => {
    const choice = choices.find(c => c.id === choiceId)
    if (choice) {
      setSelectedChoice(choice)
      setShowConsequenceBuilder(true)
    }
  }

  const saveConsequence = async (consequenceData: ConsequenceData) => {
    if (!selectedChoice) return

    console.log('Creating consequence for choice:', selectedChoice.id, 'Data:', consequenceData)
    setLoading(true)

    try {
      const validated = ActionConsequenceSchema.safeParse(consequenceData)
      if (!validated.success) {
        alert('Invalid consequence data')
        setLoading(false)
        return
      }
      const data = await storyCreate<Consequence>('consequence', {
        choice_id: selectedChoice.id,
        consequence_data: validated.data,
      })
      console.log('Consequence created successfully:', data)
      setConsequences([...consequences, data])
      setShowConsequenceBuilder(false)
      setSelectedChoice(null)
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Unexpected error creating consequence')
    }

    setLoading(false)
  }

  const editConsequence = (consequence: Consequence) => {
    const choice = choices.find(c => c.id === consequence.choice_id)
    if (choice) {
      setSelectedChoice(choice)
      setSelectedConsequence(consequence)
      setShowConsequenceBuilder(true)
    }
  }

  const updateConsequence = async (consequenceId: string, consequenceData: ConsequenceData) => {
    console.log('Updating consequence:', consequenceId, 'Data:', consequenceData)
    setLoading(true)

    try {
      const validated = ActionConsequenceSchema.safeParse(consequenceData)
      if (!validated.success) {
        alert('Invalid consequence data')
        setLoading(false)
        return
      }
      const data = await storyUpdate<Consequence>('consequence', consequenceId, {
        consequence_data: validated.data,
      })
      console.log('Consequence updated successfully:', data)
      setConsequences(consequences.map(c =>
        c.id === consequenceId ? { ...c, consequence_data: validated.data } : c
      ))
      setShowConsequenceBuilder(false)
      setSelectedChoice(null)
      setSelectedConsequence(null)
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Unexpected error updating consequence')
    }

    setLoading(false)
  }

  const deleteConsequence = async (consequenceId: string) => {
    if (!confirm('Delete this consequence? This cannot be undone.')) return

    console.log('Deleting consequence:', consequenceId)
    setLoading(true)

    try {
      await storyDelete('consequence', consequenceId)
      console.log('Consequence deleted successfully')
      setConsequences(consequences.filter(c => c.id !== consequenceId))
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Unexpected error deleting consequence')
    }

    setLoading(false)
  }

  const deleteChoice = async (choiceId: string) => {
    if (!confirm('Delete this choice and all its consequences? This cannot be undone.')) return

    console.log('Deleting choice:', choiceId)
    setLoading(true)

    try {
      // Consequences will be deleted automatically due to CASCADE
      await storyDelete('choice', choiceId)
      console.log('Choice deleted successfully')
      setChoices(choices.filter(c => c.id !== choiceId))
      // Remove associated consequences from local state
      setConsequences(consequences.filter(c => c.choice_id !== choiceId))
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Unexpected error deleting choice')
    }

    setLoading(false)
  }

  const editChoice = async (choice: Choice) => {
    const newText = prompt('Edit choice text:', choice.text)
    if (!newText || newText === choice.text) return

    await updateChoice(choice.id, { text: newText })
  }

  // === DELETE FUNCTIONS ===

  const deleteChapter = async (chapter: Chapter) => {
    // Count what will be deleted
    const chapterEvents = events.filter(e => e.chapter_id === chapter.id)
    const eventIds = chapterEvents.map(e => e.id)

    let choiceCount = 0
    let consequenceCount = 0

    if (eventIds.length > 0) {
      const chapterChoices = choices.filter(c => eventIds.includes(c.event_id))
      choiceCount = chapterChoices.length

      const choiceIds = chapterChoices.map(c => c.id)
      consequenceCount = consequences.filter(c => choiceIds.includes(c.choice_id)).length
    }

    let confirmed = false

    if (nuclearMode) {
      // Nuclear mode: simple confirm
      confirmed = confirm(
        `🔴 NUCLEAR MODE: DELETE CHAPTER\n\n` +
        `Delete: "${chapter.title}"\n` +
        `• ${chapterEvents.length} event(s)\n` +
        `• ${choiceCount} choice(s)\n` +
        `• ${consequenceCount} consequence(s)\n\n` +
        `Continue?`
      )
    } else {
      // Safe mode: type-to-confirm
      const confirmText = prompt(
        `⚠️ DELETE CHAPTER WARNING\n\n` +
        `This will delete:\n` +
        `• Chapter: "${chapter.title}"\n` +
        `• ${chapterEvents.length} event(s)\n` +
        `• ${choiceCount} choice(s)\n` +
        `• ${consequenceCount} consequence(s)\n\n` +
        `Type the chapter title to confirm: "${chapter.title}"`
      )

      if (confirmText !== chapter.title) {
        alert('Deletion cancelled - title did not match')
        return
      }
      confirmed = true
    }

    if (!confirmed) return

    setLoading(true)

    try {
      // Delete chapter (CASCADE will handle events, choices, consequences)
      await storyDelete('chapter', chapter.id)
      alert(`Chapter "${chapter.title}" deleted successfully`)
      // Clear selections if deleted
      if (selectedChapter?.id === chapter.id) {
        setSelectedChapter(null)
        setSelectedEvent(null)
      }
      // Reload chapters list
      if (selectedStory) {
        loadChapters(selectedStory.id)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Unexpected error deleting chapter')
    }

    setLoading(false)
  }

  const deleteEvent = async (event: Event) => {
    // Count what will be deleted
    const eventChoices = choices.filter(c => c.event_id === event.id)
    const choiceIds = eventChoices.map(c => c.id)
    const consequenceCount = consequences.filter(c => choiceIds.includes(c.choice_id)).length

    let confirmed = false

    if (nuclearMode) {
      // Nuclear mode: simple confirm
      confirmed = confirm(
        `🔴 NUCLEAR MODE: DELETE EVENT\n\n` +
        `Delete: "${event.title}"\n` +
        `• ${eventChoices.length} choice(s)\n` +
        `• ${consequenceCount} consequence(s)\n\n` +
        `⚠️ May break story flow!\n\n` +
        `Continue?`
      )
    } else {
      // Safe mode: type-to-confirm
      const confirmText = prompt(
        `⚠️ DELETE EVENT WARNING\n\n` +
        `This will delete:\n` +
        `• Event: "${event.title}"\n` +
        `• ${eventChoices.length} choice(s)\n` +
        `• ${consequenceCount} consequence(s)\n\n` +
        `⚠️ WARNING: This may break story flow if other events reference this one!\n\n` +
        `Type the event title to confirm: "${event.title}"`
      )

      if (confirmText !== event.title) {
        alert('Deletion cancelled - title did not match')
        return
      }
      confirmed = true
    }

    if (!confirmed) return

    setLoading(true)

    try {
      // Delete event (CASCADE will handle choices and consequences)
      await storyDelete('event', event.id)
      alert(`Event "${event.title}" deleted successfully`)
      // Clear selections if deleted
      if (selectedEvent?.id === event.id) {
        setSelectedEvent(null)
      }
      // Reload events list
      if (selectedChapter) {
        loadEvents(selectedChapter.id)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Unexpected error deleting event')
    }

    setLoading(false)
  }

  // === EVENT REORDERING ===

  const reorderEvents = async (draggedEventId: string, targetEventId: string) => {
    if (!selectedChapter) return

    const chapterEvents = events.filter(e => e.chapter_id === selectedChapter.id)
    const sortedEvents = [...chapterEvents].sort((a, b) => a.order_index - b.order_index)

    const draggedIndex = sortedEvents.findIndex(e => e.id === draggedEventId)
    const targetIndex = sortedEvents.findIndex(e => e.id === targetEventId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Reorder the array
    const reordered = [...sortedEvents]
    const [removed] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, removed)

    // Update order_index for all affected events
    const updates = reordered.map((event, index) => ({
      id: event.id,
      order_index: index + 1
    }))

    setLoading(true)

    // Batch update all events
    for (const update of updates) {
      await storyUpdate('event', update.id, { order_index: update.order_index })
    }

    // Refresh events list
    await loadEvents(selectedChapter.id)
    setLoading(false)
  }

  // === STORY TESTING FUNCTIONS ===

  // Helper function to safely parse consequence data
  const parseConsequenceData = (consequence: Consequence): ConsequenceData => {
    try {
      if (typeof consequence.consequence_data === 'object' && consequence.consequence_data !== null) {
        return consequence.consequence_data as ConsequenceData
      }
      return {}
    } catch {
      return {}
    }
  }

  // Helper to extract effects from consequence data for story dialog
  const extractEffects = (data: ConsequenceData) => {
    const effects: any = {}

    if (data.health !== undefined && data.health !== 0) effects.health = data.health
    if (data.energy !== undefined && data.energy !== 0) effects.energy = data.energy
    if (data.experience !== undefined && data.experience !== 0) effects.experience = data.experience

    // Handle both "credits" (legacy) and "earth" (new)
    const earthAmount = (data.earth || 0) + (data.credits || 0)
    if (earthAmount !== 0) effects.credits = earthAmount

    if (data.item) effects.items = [data.item]
    if (data.story_flag) effects.flags = [data.story_flag]

    return Object.keys(effects).length > 0 ? effects : undefined
  }

  // Create a choice screen for an event with loaded data
  const createNextEventScreen = (event: Event, eventChoices: Choice[], eventConsequences: Consequence[]) => {
    if (eventChoices.length > 0) {
      // Choice event
      return createStoryScreens.choice(
        event.description,
        eventChoices.map(choice => {
          const choiceConsequences = eventConsequences.filter(c => c.choice_id === choice.id)
          console.log(`Choice "${choice.text}" (ID: ${choice.id}) has ${choiceConsequences.length} consequences`)

          return {
            text: choice.text,
            action: () => {
              console.log(`Choice made: ${choice.text}`)
              console.log(`Choice consequences found:`, choiceConsequences.length)

              // Process consequences and dynamically add screens
              choiceConsequences.forEach(consequence => {
                const data = parseConsequenceData(consequence)
                console.log('Consequence applied:', data)
                console.log('Checking for next_event_id:', data.next_event_id)
                console.log('next_event_id type:', typeof data.next_event_id)
                console.log('next_event_id truthy?', !!data.next_event_id)

                // Extract effects from consequence
                const effects = extractEffects(data)

                // Build screens for this choice's aftermath
                const newScreens: StoryScreen[] = []

                // Add response text if provided
                if (data.response_text) {
                  newScreens.push({
                    ...createStoryScreens.text(data.response_text, 'CONSEQUENCE'),
                    effects // Add effects to the response screen
                  })
                }

                // Add next event if provided (recursive chaining)
                if (data.next_event_id) {
                  const nextEvent = events.find(e => e.id === data.next_event_id)
                  if (nextEvent) {
                    const nextEventChoices = choices.filter(c => c.event_id === nextEvent.id)
                    const nextEventConsequences = consequences.filter(c =>
                      nextEventChoices.some(choice => choice.id === c.choice_id)
                    )

                    const nextEventScreen = createNextEventScreen(nextEvent, nextEventChoices, nextEventConsequences)
                    addStoryScreens([nextEventScreen])
                  }
                }

                // Add immediate screens (response text)
                if (newScreens.length > 0) {
                  addStoryScreens(newScreens)
                }
              })
            },
            variant: choice.text.toLowerCase().includes('risk') || choice.text.toLowerCase().includes('danger')
              ? 'destructive' as const
              : choice.text.toLowerCase().includes('careful') || choice.text.toLowerCase().includes('study')
                ? 'secondary' as const
                : 'default' as const
          }
        }),
        event.title
      )
    } else {
      // Text-only event
      return createStoryScreens.text(event.description, event.title)
    }
  }

  // Convert database event to story dialog format - with dynamic screen injection
  const convertEventToDialog = (event: Event) => {
    // Get ALL choices and consequences for this specific event
    const eventChoices = choices.filter(c => c.event_id === event.id)
    const eventConsequences = consequences.filter(c =>
      eventChoices.some(choice => choice.id === c.choice_id)
    )

    console.log(`Converting event "${event.title}": ${eventChoices.length} choices, ${eventConsequences.length} consequences`)

    if (eventChoices.length > 0) {
      // Choice event
      return createStoryScreens.choice(
        event.description,
        eventChoices.map(choice => {
          const choiceConsequences = eventConsequences.filter(c => c.choice_id === choice.id)

          return {
            text: choice.text,
            action: () => {
              console.log(`Choice made: ${choice.text}`)

              // Process consequences and dynamically add screens
              choiceConsequences.forEach(consequence => {
                const data = parseConsequenceData(consequence)
                console.log('Consequence applied:', data)

                // Extract effects from consequence
                const effects = extractEffects(data)

                // Build screens for this choice's aftermath
                const newScreens: StoryScreen[] = []

                // Add response text if provided
                if (data.response_text) {
                  newScreens.push({
                    ...createStoryScreens.text(data.response_text, 'CONSEQUENCE'),
                    effects // Add effects to the response screen
                  })
                }

                // Add next event if provided (chaining logic)
                if (data.next_event_id) {
                  const nextEvent = events.find(e => e.id === data.next_event_id)
                  if (nextEvent) {
                    const nextEventChoices = choices.filter(c => c.event_id === nextEvent.id)
                    const nextEventConsequences = consequences.filter(c =>
                      nextEventChoices.some(choice => choice.id === c.choice_id)
                    )

                    const nextEventScreen = createNextEventScreen(nextEvent, nextEventChoices, nextEventConsequences)
                    addStoryScreens([nextEventScreen])
                  }
                }

                // Add screens to existing dialog
                if (newScreens.length > 0) {
                  addStoryScreens(newScreens)
                }
              })

              // Record story choice for character progression (AFTER UI effects)
              if (character) {
                console.log(`🏷️ Recording story choice for character: ${character.name}`)

                // Process each consequence to potentially create story flags
                choiceConsequences.forEach(async (consequence) => {
                  const data = parseConsequenceData(consequence)

                  // Get chapter information
                  const chapter = chapters.find(ch => ch.id === event.chapter_id)
                  const story = stories.find(st => st.id === chapter?.story_id)

                  // NEW: Use the proper story_flags table for flag recording
                  if (data.story_flag) {
                    try {
                      const flagResult = await setStoryFlag(
                        character.id,
                        data.story_flag,
                        true, // Default flag value
                        {
                          chapter: chapter?.chapter_number,
                          storyId: story?.id,
                          metadata: {
                            choice_id: choice.id,
                            choice_text: choice.text,
                            event_title: event.title,
                            response_text: data.response_text,
                            consequence_data: data
                          }
                        }
                      )

                      if (flagResult.error) {
                        console.error('❌ Failed to set story flag:', flagResult.error)
                      } else {
                        console.log(`✅ Story flag set: ${data.story_flag}`)
                      }
                    } catch (error) {
                      console.error('❌ Error setting story flag:', error)
                    }
                  }

                  // LEGACY: Also record in experience_logs for XP/character progression
                  if (data.experience || data.health || data.energy || data.credits) {
                    const choiceData = {
                      story_flag: data.story_flag,
                      flag_value: data.story_flag ? true : undefined,
                      choice_id: choice.id,
                      choice_key: choice.choice_key || choice.id,
                      event_id: event.id,
                      chapter_number: chapter?.chapter_number || 1,
                      story_id: story?.id || 'test_story',
                      experience_gained: data.experience || 0, // Only record XP if provided
                      response_text: data.response_text,
                      next_event_id: data.next_event_id,
                      health: data.health,
                      energy: data.energy,
                      credits: data.credits
                    }

                    try {
                      const xpResult = await recordStoryChoice(character.id, choiceData)
                      if (xpResult.error) {
                        console.error('❌ Failed to record XP/stats:', xpResult.error)
                      } else {
                        console.log('✅ XP/stats recorded successfully')
                      }
                    } catch (error) {
                      console.error('❌ Error recording XP/stats:', error)
                    }
                  }
                })
              } else {
                console.log('⚠️ No character provided - story choice not recorded')
              }
            },
            variant: choice.text.toLowerCase().includes('risk') || choice.text.toLowerCase().includes('danger')
              ? 'destructive' as const
              : choice.text.toLowerCase().includes('careful') || choice.text.toLowerCase().includes('study')
                ? 'secondary' as const
                : 'default' as const
          }
        }),
        event.title
      )
    } else {
      // Text-only event
      return createStoryScreens.text(event.description, event.title)
    }
  }

  // Test a single event - following the existing story pattern
  const testEvent = (event: Event) => {
    console.log(`Testing event: ${event.title} (ID: ${event.id})`)

    const screen = convertEventToDialog(event)

    showStoryDialog({
      screens: [screen],
      storyId: event.id,
      onComplete: () => console.log(`Event ${event.title} completed!`)
    })
  }

  // Test entire chapter - follows actual story flow with branching
  const testChapter = async (chapter: Chapter) => {
    // Load events for this chapter if needed
    const chapterEvents = events.filter(e => e.chapter_id === chapter.id)

    if (chapterEvents.length === 0) {
      // Load from database if not in state
      setLoading(true)
      await loadEvents(chapter.id)
      setLoading(false)

      // Try again after loading
      const loadedEvents = events.filter(e => e.chapter_id === chapter.id)
      if (loadedEvents.length === 0) {
        alert('No events found in this chapter!')
        return
      }
    }

    console.log(`🎬 Testing chapter "${chapter.title}"`)

    // Build screens starting from first event (using state which has all data loaded)
    const sortedEvents = chapterEvents.sort((a, b) => a.order_index - b.order_index)
    const screens = buildChapterScreens(sortedEvents, 0, choices, consequences)

    showStoryDialog({
      screens,
      storyId: chapter.title,
      onComplete: () => {
        console.log(`Chapter ${chapter.chapter_number} completed`)

        // Auto-load next chapter if it exists
        const nextChapter = chapters.find(c =>
          c.story_id === chapter.story_id &&
          c.chapter_number === chapter.chapter_number + 1
        )

        if (nextChapter) {
          console.log(`Loading next chapter: ${nextChapter.title}`)
          setTimeout(() => testChapter(nextChapter), 100)
        }
      }
    })
  }

  // Build chapter screens starting from an index
  const buildChapterScreens = (
    chapterEvents: Event[],
    startIndex: number,
    allChoices: Choice[],
    allConsequences: Consequence[]
  ): StoryScreen[] => {
    const screens: StoryScreen[] = []

    for (let i = startIndex; i < chapterEvents.length; i++) {
      const event = chapterEvents[i]
      const eventChoices = allChoices.filter(c => c.event_id === event.id)
      const eventConsequences = allConsequences.filter(c =>
        eventChoices.some(choice => choice.id === c.choice_id)
      )

      if (eventChoices.length > 0) {
        // Choice event - add it and stop (choices will handle next_event_id chaining)
        screens.push(createEventScreen(event, eventChoices, eventConsequences))
        break
      } else {
        // Text-only event - add it and continue to next
        screens.push(createStoryScreens.text(event.description, event.title))
      }
    }

    return screens
  }

  // Helper to create a screen from event data (used by single event testing)
  const createEventScreen = (event: Event, eventChoices: Choice[], eventConsequences: Consequence[]) => {
    if (eventChoices.length > 0) {
      return createStoryScreens.choice(
        event.description,
        eventChoices.map(choice => {
          const choiceConsequences = eventConsequences.filter(c => c.choice_id === choice.id)

          return {
            text: choice.text,
            action: () => {
              console.log(`Choice made: ${choice.text}`)

              choiceConsequences.forEach(consequence => {
                const data = parseConsequenceData(consequence)
                console.log('Consequence applied:', data)

                // Extract effects from consequence
                const effects = extractEffects(data)

                const newScreens: StoryScreen[] = []

                if (data.response_text) {
                  newScreens.push({
                    ...createStoryScreens.text(data.response_text, 'CONSEQUENCE'),
                    effects // Add effects to the response screen
                  })
                }

                if (data.next_event_id) {
                  const nextEvent = events.find(e => e.id === data.next_event_id)
                  if (nextEvent) {
                    const nextEventChoices = choices.filter(c => c.event_id === nextEvent.id)
                    const nextEventConsequences = consequences.filter(c =>
                      nextEventChoices.some(choice => choice.id === c.choice_id)
                    )

                    const nextEventScreen = createEventScreen(nextEvent, nextEventChoices, nextEventConsequences)
                    addStoryScreens([nextEventScreen])
                  }
                }

                if (newScreens.length > 0) {
                  addStoryScreens(newScreens)
                }
              })
            },
            variant: choice.text.toLowerCase().includes('risk') || choice.text.toLowerCase().includes('danger')
              ? 'destructive' as const
              : choice.text.toLowerCase().includes('careful') || choice.text.toLowerCase().includes('study')
                ? 'secondary' as const
                : 'default' as const
          }
        }),
        event.title
      )
    } else {
      return createStoryScreens.text(event.description, event.title)
    }
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">Story Editor</h1>
          <p className="text-sm text-muted-foreground">
            Create and edit stories, chapters, and events
          </p>
          {/* Character Testing Status */}
          {character ? (
            <div className="flex items-center gap-2 mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-mono text-green-600">
                CHARACTER TESTING: {character.name.toUpperCase()} (LVL {character.level})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm font-mono text-yellow-600">
                NO CHARACTER - TESTING WITHOUT FLAG RECORDING
              </span>
            </div>
          )}

          {/* Nuclear Mode Toggle */}
          <div
            className={`flex items-center gap-3 mt-2 p-2 border rounded cursor-pointer transition-colors ${
              nuclearMode
                ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                : 'bg-muted/10 border-border hover:bg-muted/20'
            }`}
            onClick={() => setNuclearMode(!nuclearMode)}
          >
            <div className={`w-2 h-2 rounded-full ${nuclearMode ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground'}`}></div>
            <span className={`text-sm font-mono font-semibold ${nuclearMode ? 'text-red-500' : 'text-muted-foreground'}`}>
              {nuclearMode ? '🔴 NUCLEAR MODE: ACTIVE' : 'NUCLEAR MODE: OFF'}
            </span>
            <span className="text-xs text-muted-foreground">
              {nuclearMode ? '(Fast deletes - no type-to-confirm)' : '(Click to enable fast deletes)'}
            </span>
          </div>
        </div>
        <Button onClick={createStory} disabled={loading}>
          <Plus className="w-4 h-4 mr-2" />
          New Story
        </Button>
      </div>

      {/* Top Navigation Bar */}
      <div className="flex gap-4 mb-6">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Stories</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2 flex-wrap">
              {stories.map(story => (
                <Button
                  key={story.id}
                  size="sm"
                  variant={selectedStory?.id === story.id ? 'default' : 'outline'}
                  onClick={() => setSelectedStory(story)}
                  className="text-xs"
                >
                  {story.title} ({story.character_path})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedStory && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Chapters Panel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Chapters</CardTitle>
              <Button size="sm" onClick={createChapter} disabled={loading}>
                <Plus className="w-3 h-3 mr-1" />
                Add Chapter
              </Button>
            </CardHeader>
            <CardContent className="pt-0 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {chapters.map(chapter => (
                  <ChapterListItem
                    key={chapter.id}
                    chapter={chapter}
                    isSelected={selectedChapter?.id === chapter.id}
                    onSelect={() => setSelectedChapter(chapter)}
                    onTest={() => testChapter(chapter)}
                    onDelete={() => deleteChapter(chapter)}
                    canTest={events.filter(e => e.chapter_id === chapter.id).length > 0}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Events Panel */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Events</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    className="text-xs h-7"
                    onClick={() => setViewMode('list')}
                  >
                    List
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'flow' ? 'default' : 'outline'}
                    className="text-xs h-7"
                    onClick={() => setViewMode('flow')}
                  >
                    Flow
                  </Button>
                  {selectedChapter && (
                    <Button size="sm" onClick={createEvent} disabled={loading}>
                      <Plus className="w-3 h-3 mr-1" />
                      Add Event
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 max-h-64 overflow-y-auto">
              {viewMode === 'list' ? (
                <div className="space-y-2">
                  {events.map(event => (
                    <EventListItem
                      key={event.id}
                      event={event}
                      isSelected={selectedEvent?.id === event.id}
                      onSelect={() => setSelectedEvent(event)}
                      onTest={() => testEvent(event)}
                      onReorder={reorderEvents}
                    />
                  ))}
                </div>
              ) : (
                <EventFlowDiagram
                  events={events}
                  choices={choices}
                  consequences={consequences}
                  selectedChapter={selectedChapter}
                  onEventSelect={setSelectedEvent}
                  selectedEventId={selectedEvent?.id}
                />
              )}
            </CardContent>
          </Card>

          {/* Choices Panel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Choices & Consequences</CardTitle>
              {selectedEvent && (
                <Button size="sm" onClick={createChoice} disabled={loading}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Choice
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {selectedEvent && (
                  <div className="text-xs text-muted-foreground mb-2">
                    Event: {selectedEvent.title} (ID: {selectedEvent.id})
                  </div>
                )}
                {choices.filter(c => c.event_id === selectedEvent?.id).map(choice => {
                  const choiceConsequences = consequences.filter(c => c.choice_id === choice.id)
                  return (
                    <div
                      key={choice.id}
                      className="p-3 rounded border transition-colors hover:bg-muted space-y-3"
                    >
                      {/* Choice Management Section */}
                      <div className="border-b border-border pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-primary">{choice.text}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Choice #{choice.order_index || 1} • {choiceConsequences.length} consequence(s)
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-6 px-2"
                              onClick={() => editChoice(choice)}
                              disabled={loading}
                              title="Edit choice text and properties"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs h-6 px-2"
                              onClick={() => deleteChoice(choice.id)}
                              disabled={loading}
                              title="Delete entire choice"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Consequences Management Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium text-muted-foreground">CONSEQUENCES</div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2"
                            onClick={() => createConsequenceWithBuilder(choice.id)}
                            disabled={loading}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                          </Button>
                        </div>

                        {choiceConsequences.length === 0 ? (
                          <div className="text-xs text-muted-foreground text-center py-2 bg-muted/30 rounded border-dashed border">
                            No consequences yet. Click "Add Consequence" above.
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {choiceConsequences.map(consequence => (
                              <div key={consequence.id} className="text-xs p-2 bg-muted/50 rounded border">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 font-mono text-xs">
                                    {JSON.stringify(consequence.consequence_data, null, 2)}
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-5 w-5 p-0"
                                      onClick={() => editConsequence(consequence)}
                                      disabled={loading}
                                      title="Edit consequence"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="text-xs h-5 w-5 p-0"
                                      onClick={() => deleteConsequence(consequence.id)}
                                      disabled={loading}
                                      title="Delete consequence"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {selectedEvent && choices.filter(c => c.event_id === selectedEvent.id).length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No choices yet for this event. Click "Add Choice" above.
                  </div>
                )}
                {!selectedEvent && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    Select an event to manage its choices.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chapter Editor Panel */}
      {selectedChapter && !selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Edit Chapter: {selectedChapter.title}</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <ChapterDetailsEditor
              chapter={selectedChapter}
              onUpdate={(updates) => updateChapter(selectedChapter.id, updates)}
            />
          </CardContent>
        </Card>
      )}

      {/* Event Editor Panel */}
      {selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Edit Event: {selectedEvent.title}</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <EventDetailsEditor
              event={selectedEvent}
              chapterEvents={events.filter(e => e.chapter_id === selectedEvent.chapter_id)}
              onUpdate={(updates) => updateEvent(selectedEvent.id, updates)}
              onDelete={() => deleteEvent(selectedEvent)}
            />
          </CardContent>
        </Card>
      )}

      {/* Story Editor Panel - Only for Story Details */}
      {selectedStory && !selectedChapter && !selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Edit Story: {selectedStory.title}</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <StoryDetailsEditor story={selectedStory} events={events} />
          </CardContent>
        </Card>
      )}

      {!selectedStory && (
        <div className="text-center text-muted-foreground py-8">
          <div className="text-4xl mb-4">📖</div>
          <h3 className="text-lg font-medium mb-2">No Story Selected</h3>
          <p className="text-sm">Create a new story or select an existing one to start editing</p>
        </div>
      )}

      {/* Consequence Builder Modal */}
      {showConsequenceBuilder && selectedChoice && selectedChapter && (
        <ConsequenceBuilder
          choice={selectedChoice}
          currentChapter={selectedChapter}
          existingConsequence={selectedConsequence}
          onSave={selectedConsequence ?
            (data) => updateConsequence(selectedConsequence.id, data) :
            saveConsequence
          }
          onCancel={() => {
            setShowConsequenceBuilder(false)
            setSelectedChoice(null)
            setSelectedConsequence(null)
          }}
        />
      )}

      {/* Story Dialog Component */}
      <StoryDialog
        isOpen={dialogState.isOpen}
        screens={dialogState.screens}
        onComplete={dialogState.onComplete}
        onDismiss={dialogState.onDismiss}
        storyId={dialogState.storyId}
      />
    </div>
  )
}

// Chapter List Item Component
function ChapterListItem({
  chapter,
  isSelected,
  onSelect,
  onTest,
  onDelete,
  canTest
}: {
  chapter: Chapter
  isSelected: boolean
  onSelect: () => void
  onTest: () => void
  onDelete: () => void
  canTest: boolean
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-2 rounded transition-colors border cursor-pointer ${isSelected
        ? 'border-primary bg-primary/10'
        : 'hover:bg-muted'
        }`}
    >
      <div className="font-medium text-xs">
        Ch. {chapter.chapter_number}: {chapter.title}
      </div>
      {chapter.description && (
        <div className="text-xs opacity-70 mt-1 truncate">{chapter.description}</div>
      )}
      {isSelected && (
        <div className="flex gap-1 mt-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-6 px-2"
            onClick={(e) => {
              e.stopPropagation()
              onTest()
            }}
            disabled={!canTest}
          >
            <Play className="w-3 h-3 mr-1" />
            Test
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="text-xs h-6 px-2"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      )}
    </div>
  )
}

// Event Flow Diagram Component
function EventFlowDiagram({
  events,
  choices,
  consequences,
  selectedChapter,
  onEventSelect,
  selectedEventId
}: {
  events: Event[]
  choices: Choice[]
  consequences: Consequence[]
  selectedChapter: Chapter | null
  onEventSelect: (event: Event) => void
  selectedEventId?: string
}) {
  if (!selectedChapter) {
    return <div className="text-xs text-muted-foreground p-4">No chapter selected</div>
  }

  const chapterEvents = events.filter(e => e.chapter_id === selectedChapter.id)

  if (chapterEvents.length === 0) {
    return <div className="text-xs text-muted-foreground p-4">No events in this chapter</div>
  }

  // Build a map of event connections
  const connections: Record<string, Array<{ choiceText: string; targetEventId: string }>> = {}

  chapterEvents.forEach(event => {
    const eventChoices = choices.filter(c => c.event_id === event.id)
    eventChoices.forEach(choice => {
      const choiceConsequences = consequences.filter(c => c.choice_id === choice.id)
      choiceConsequences.forEach(consequence => {
        const data = typeof consequence.consequence_data === 'object'
          ? consequence.consequence_data as any
          : {}

        if (data.next_event_id) {
          if (!connections[event.id]) {
            connections[event.id] = []
          }
          connections[event.id].push({
            choiceText: choice.text,
            targetEventId: data.next_event_id
          })
        }
      })
    })
  })

  return (
    <div className="p-4 space-y-6 font-mono text-xs">
      {chapterEvents.map(event => {
        const eventChoices = choices.filter(c => c.event_id === event.id)
        const hasChoices = eventChoices.length > 0
        const eventConnections = connections[event.id] || []

        return (
          <div key={event.id} className="space-y-2">
            {/* Event Box */}
            <div
              onClick={() => onEventSelect(event)}
              className={`p-3 rounded border-2 cursor-pointer transition-colors ${
                selectedEventId === event.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-semibold text-primary mb-1">{event.title}</div>
              <div className="text-muted-foreground line-clamp-2">{event.description}</div>
              <div className="mt-2 flex gap-2 text-xs">
                {hasChoices && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                    {eventChoices.length} choice{eventChoices.length !== 1 ? 's' : ''}
                  </span>
                )}
                {!hasChoices && (
                  <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded">
                    text-only
                  </span>
                )}
              </div>
            </div>

            {/* Connections */}
            {eventConnections.length > 0 && (
              <div className="ml-6 space-y-2 border-l-2 border-primary/30 pl-4">
                {eventConnections.map((conn, idx) => {
                  const targetEvent = chapterEvents.find(e => e.id === conn.targetEventId)
                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="text-primary mt-1">→</div>
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">"{conn.choiceText}"</div>
                        {targetEvent ? (
                          <div className="text-xs font-medium text-foreground">
                            leads to: <span className="text-primary">{targetEvent.title}</span>
                          </div>
                        ) : (
                          <div className="text-xs text-destructive">
                            ⚠️ Invalid event ID: {conn.targetEventId.substring(0, 8)}...
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Legend */}
      <div className="pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground font-semibold mb-2">Legend:</div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>• Click event box to edit</div>
          <div>• Arrows show story flow via consequence next_event_id</div>
          <div>• Missing connections indicate story endpoints or errors</div>
        </div>
      </div>
    </div>
  )
}

// Event List Item Component
function EventListItem({
  event,
  isSelected,
  onSelect,
  onTest,
  onReorder
}: {
  event: Event
  isSelected: boolean
  onSelect: () => void
  onTest: () => void
  onReorder: (draggedId: string, targetId: string) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', event.id)
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId && draggedId !== event.id) {
      onReorder(draggedId, event.id)
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onSelect}
      className={`p-2 rounded transition-colors border cursor-move flex gap-2 ${
        isSelected
          ? 'border-primary bg-primary/10'
          : 'hover:bg-muted'
      } ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-primary border-2' : ''}`}
    >
      <div className="flex-shrink-0 text-muted-foreground mt-0.5">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-xs">
          {event.title}
        </div>
        <div className="text-xs opacity-70 truncate">{event.description}</div>
        {isSelected && (
          <div className="flex gap-1 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-6 px-2"
              onClick={(e) => {
                e.stopPropagation()
                onTest()
              }}
            >
              <TestTube className="w-3 h-3 mr-1" />
              Test
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}


// Consequence Builder Component
function ConsequenceBuilder({
  choice,
  currentChapter,
  existingConsequence,
  onSave,
  onCancel
}: {
  choice: Choice
  currentChapter: Chapter
  existingConsequence?: Consequence | null
  onSave: (data: ConsequenceData) => void
  onCancel: () => void
}) {
  // State for loading all available events
  const [allEvents, setAllEvents] = useState<Array<Event & { chapter_title?: string, story_title?: string }>>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventSearchTerm, setEventSearchTerm] = useState('')

  // Load events from current chapter only
  useEffect(() => {
    loadChapterEvents()
  }, [currentChapter.id])

  const loadChapterEvents = async () => {
    setEventsLoading(true)
    try {
      // Get only events from the current chapter via story API
      const eventsWithContext = await storyList<Event & { chapter_title?: string; story_title?: string }>(
        'event',
        {
          chapter_id: currentChapter.id,
          orderBy: 'order_index',
          ascending: 'true',
        }
      )
      setAllEvents(eventsWithContext)
      console.log(`Loaded ${eventsWithContext.length} events from chapter "${currentChapter.title}"`)
    } catch (err) {
      console.error('Error in loadChapterEvents:', err)
    } finally {
      setEventsLoading(false)
    }
  }

  // Filter events based on search term
  const filteredEvents = allEvents.filter(event => {
    if (!eventSearchTerm) return true
    const searchLower = eventSearchTerm.toLowerCase()
    return (
      event.title.toLowerCase().includes(searchLower) ||
      event.description?.toLowerCase().includes(searchLower) ||
      event.id?.toLowerCase().includes(searchLower)
    )
  })

  // Helper function to safely parse consequence data
  const parseConsequenceData = (consequence: Consequence): ConsequenceData => {
    try {
      if (typeof consequence.consequence_data === 'object' && consequence.consequence_data !== null) {
        const data = consequence.consequence_data as Record<string, any>
        return {
          health: typeof data.health === 'number' ? data.health : undefined,
          energy: typeof data.energy === 'number' ? data.energy : undefined,
          experience: typeof data.experience === 'number' ? data.experience : undefined,
          credits: typeof data.credits === 'number' ? data.credits : undefined,
          item: typeof data.item === 'string' ? data.item : undefined,
          story_flag: typeof data.story_flag === 'string' ? data.story_flag : undefined,
          response_text: typeof data.response_text === 'string' ? data.response_text : undefined,
          next_event_id: typeof data.next_event_id === 'string' ? data.next_event_id : undefined,
          ...data
        }
      }
      return {}
    } catch {
      return {}
    }
  }

  // Initialize with existing consequence data if editing
  const existingData: ConsequenceData = existingConsequence ? parseConsequenceData(existingConsequence) : {}
  const [health, setHealth] = useState(existingData.health || 0)
  const [energy, setEnergy] = useState(existingData.energy || 0)
  const [experience, setExperience] = useState(existingData.experience || 0)
  const [credits, setCredits] = useState(existingData.credits || 0)
  const [item, setItem] = useState(existingData.item || '')
  const [storyFlag, setStoryFlag] = useState(existingData.story_flag || '')
  const [responseText, setResponseText] = useState(existingData.response_text || '')
  const [nextEventId, setNextEventId] = useState(existingData.next_event_id || '')
  const [customJson, setCustomJson] = useState(() => {
    // Extract custom fields (not the standard ones)
    const standardFields = ['health', 'energy', 'experience', 'credits', 'item', 'story_flag', 'response_text', 'next_event_id']
    const custom = Object.fromEntries(
      Object.entries(existingData).filter(([key]) => !standardFields.includes(key))
    )
    return Object.keys(custom).length > 0 ? JSON.stringify(custom, null, 2) : ''
  })

  const handleSave = () => {
    const consequenceData: ConsequenceData = {}

    // Story Flow
    if (responseText) consequenceData.response_text = responseText
    if (nextEventId) consequenceData.next_event_id = nextEventId

    // Game Stats
    if (health !== 0) consequenceData.health = health
    if (energy !== 0) consequenceData.energy = energy
    if (experience !== 0) consequenceData.experience = experience
    if (credits !== 0) consequenceData.credits = credits

    // Items & Flags
    if (item) consequenceData.item = item
    if (storyFlag) consequenceData.story_flag = storyFlag

    // Parse custom JSON if provided
    if (customJson) {
      try {
        const custom = JSON.parse(customJson)
        Object.assign(consequenceData, custom)
      } catch {
        alert('Invalid custom JSON format')
        return
      }
    }

    onSave(consequenceData)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-sm">
            {existingConsequence ? 'Edit Consequence' : 'Add Consequence'}
          </CardTitle>
          <CardDescription className="text-xs">
            Choice: "{choice.text}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Story Flow Section */}
          <div className="space-y-3 p-3 bg-muted/20 rounded border">
            <h4 className="text-xs font-semibold text-primary">Story Flow</h4>

            <div>
              <label className="block text-xs font-medium mb-1">Response Text</label>
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                className="text-xs"
                rows={2}
                placeholder="What the player sees after making this choice..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Next Event (Optional)</label>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder={`Search events in "${currentChapter.title}"...`}
                  value={eventSearchTerm}
                  onChange={(e) => setEventSearchTerm(e.target.value)}
                  className="text-xs"
                />
                <Select value={nextEventId || "none"} onValueChange={(value) => setNextEventId(value === "none" ? "" : value)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder={eventsLoading ? "Loading chapter events..." : "Select an event from this chapter"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="none">
                      <span className="text-muted-foreground">None (End story sequence)</span>
                    </SelectItem>
                    {eventsLoading ? (
                      <SelectItem value="loading" disabled>Loading events...</SelectItem>
                    ) : filteredEvents.length === 0 && eventSearchTerm ? (
                      <SelectItem value="no-results" disabled>
                        <span className="text-muted-foreground">No events found matching "{eventSearchTerm}"</span>
                      </SelectItem>
                    ) : (
                      filteredEvents.map(event => (
                        <SelectItem key={event.id} value={event.id}>
                          <div className="flex flex-col items-start min-w-0">
                            <span className="font-medium truncate">{event.title}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {event.description?.substring(0, 60)}...
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Choose an event from this chapter to continue the story sequence, or leave blank to end
              </p>
            </div>
          </div>

          {/* Game Effects Section */}
          <div className="space-y-3 p-3 bg-muted/20 rounded border">
            <h4 className="text-xs font-semibold text-primary">Game Effects</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Health</label>
                <Input
                  type="number"
                  value={health}
                  onChange={(e) => setHealth(Number(e.target.value))}
                  className="text-xs"
                  placeholder="±0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Energy</label>
                <Input
                  type="number"
                  value={energy}
                  onChange={(e) => setEnergy(Number(e.target.value))}
                  className="text-xs"
                  placeholder="±0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Experience</label>
                <Input
                  type="number"
                  value={experience}
                  onChange={(e) => setExperience(Number(e.target.value))}
                  className="text-xs"
                  placeholder="±0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Credits</label>
                <Input
                  type="number"
                  value={credits}
                  onChange={(e) => setCredits(Number(e.target.value))}
                  className="text-xs"
                  placeholder="±0"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Item Reward</label>
              <Input
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="text-xs"
                placeholder="item_id or item_name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Story Flag</label>
              <Input
                value={storyFlag}
                onChange={(e) => setStoryFlag(e.target.value)}
                className="text-xs"
                placeholder="story_flag_name"
              />
            </div>
          </div>

          {/* Advanced Section */}
          <div className="space-y-3 p-3 bg-muted/20 rounded border">
            <h4 className="text-xs font-semibold text-primary">Advanced</h4>

            <div>
              <label className="block text-xs font-medium mb-1">Custom JSON</label>
              <Textarea
                value={customJson}
                onChange={(e) => setCustomJson(e.target.value)}
                className="text-xs"
                rows={3}
                placeholder='{"custom_field": "value"}'
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" className="flex-1">
              {existingConsequence ? 'Update Consequence' : 'Save Consequence'}
            </Button>
            <Button onClick={onCancel} variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Chapter Details Editor Component
function ChapterDetailsEditor({
  chapter,
  onUpdate
}: {
  chapter: Chapter
  onUpdate: (updates: Partial<Chapter>) => void
}) {
  const [title, setTitle] = useState(chapter.title)
  const [description, setDescription] = useState(chapter.description || '')
  const [chapterNumber, setChapterNumber] = useState(chapter.chapter_number)
  const [minLevel, setMinLevel] = useState((chapter as any).min_level || 1)
  const [saving, setSaving] = useState(false)

  // Update state when chapter changes
  useEffect(() => {
    setTitle(chapter.title)
    setDescription(chapter.description || '')
    setChapterNumber(chapter.chapter_number)
    setMinLevel((chapter as any).min_level || 1)
  }, [chapter.id])

  const handleSave = async () => {
    setSaving(true)
    await onUpdate({
      title,
      description,
      chapter_number: chapterNumber,
      min_level: minLevel
    } as any)
    setSaving(false)
    alert('Chapter updated!')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 p-3 bg-muted/20 rounded border">
        <h4 className="text-xs font-semibold text-primary">Chapter Information</h4>

        <div>
          <label className="block text-xs font-medium mb-1">Chapter Number</label>
          <Input
            type="number"
            value={chapterNumber}
            onChange={(e) => setChapterNumber(Number(e.target.value))}
            min={1}
            className="text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chapter title"
            className="text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Chapter description"
            rows={3}
            className="text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Minimum Level</label>
          <Input
            type="number"
            value={minLevel}
            onChange={(e) => setMinLevel(Number(e.target.value))}
            min={1}
            className="text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">Player must be this level to access this chapter</p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
        <Save className="w-3 h-3 mr-1" />
        {saving ? 'Saving...' : 'Save Chapter'}
      </Button>
    </div>
  )
}

// Event Details Editor Component
function EventDetailsEditor({
  event,
  chapterEvents,
  onUpdate,
  onDelete
}: {
  event: Event
  chapterEvents: Event[]
  onUpdate: (updates: Partial<Event>) => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description)
  const [requiredLocationId, setRequiredLocationId] = useState((event as any).required_location_id || '')
  const [requiredItems, setRequiredItems] = useState(((event as any).required_items || []).join(', '))
  const [requiredFlags, setRequiredFlags] = useState(((event as any).required_flags || []).join(', '))
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([])
  const [saving, setSaving] = useState(false)

  // Load locations for dropdown
  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    const { data } = await supabase.from('locations').select('id, name').order('name')
    if (data) setLocations(data)
  }

  // Update state when event changes
  useEffect(() => {
    setTitle(event.title)
    setDescription(event.description)
    setRequiredLocationId((event as any).required_location_id || '')
    setRequiredItems(((event as any).required_items || []).join(', '))
    setRequiredFlags(((event as any).required_flags || []).join(', '))
  }, [event.id])

  const handleSave = async () => {
    setSaving(true)
    await onUpdate({
      title,
      description,
      required_location_id: requiredLocationId || null,
      required_items: requiredItems ? requiredItems.split(',').map(s => s.trim()).filter(Boolean) : [],
      required_flags: requiredFlags ? requiredFlags.split(',').map(s => s.trim()).filter(Boolean) : []
    } as any)
    setSaving(false)
    alert('Event updated!')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 p-3 bg-muted/20 rounded border">
        <h4 className="text-xs font-semibold text-primary">Event Information</h4>

        <div>
          <label className="block text-xs font-medium mb-1">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Description / Dialog</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What the player sees..."
            rows={4}
            className="text-xs"
          />
        </div>

        <div className="pt-3 border-t border-border">
          <h5 className="text-xs font-semibold mb-2">Requirements (Optional)</h5>

          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium mb-1">Required Location</label>
              <Select value={requiredLocationId || 'none'} onValueChange={(val) => setRequiredLocationId(val === 'none' ? '' : val)}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="No location requirement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No location requirement</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Required Items</label>
              <Input
                value={requiredItems}
                onChange={(e) => setRequiredItems(e.target.value)}
                placeholder="item1, item2, item3"
                className="text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list of items player must have</p>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Required Flags</label>
              <Input
                value={requiredFlags}
                onChange={(e) => setRequiredFlags(e.target.value)}
                placeholder="flag1, flag2, flag3"
                className="text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list of story flags required</p>
            </div>
          </div>
        </div>

      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} size="sm" className="flex-1">
          <Save className="w-3 h-3 mr-1" />
          {saving ? 'Saving...' : 'Save Event'}
        </Button>
        <Button
          onClick={onDelete}
          disabled={saving}
          size="sm"
          variant="destructive"
          className="flex-shrink-0"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  )
}

// Story Details Editor Component
function StoryDetailsEditor({ story, events }: { story: Story; events: Event[] }) {
  const [title, setTitle] = useState(story.title)
  const [description, setDescription] = useState(story.description || '')
  const [characterPath, setCharacterPath] = useState(story.character_path)
  const [locationIds, setLocationIds] = useState<string[]>((story as any).location_ids || [])
  const [minLevel, setMinLevel] = useState((story as any).min_level || 1)
  const [maxLevel, setMaxLevel] = useState((story as any).max_level || '')
  const [firstEventId, setFirstEventId] = useState((story as any).first_event_id || '')
  const [isActive, setIsActive] = useState((story as any).is_active ?? true)
  const [displayOrder, setDisplayOrder] = useState((story as any).display_order || 0)
  const [requiredFlags, setRequiredFlags] = useState(
    ((story as any).required_flags || []).join(', ')
  )
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([])
  const [saving, setSaving] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')

  // Load locations on mount
  useEffect(() => {
    loadLocations()
  }, [])

  // Update state when story changes
  useEffect(() => {
    setTitle(story.title)
    setDescription(story.description || '')
    setCharacterPath(story.character_path)
    setLocationIds((story as any).location_ids || [])
    setMinLevel((story as any).min_level || 1)
    setMaxLevel((story as any).max_level || '')
    setFirstEventId((story as any).first_event_id || '')
    setIsActive((story as any).is_active ?? true)
    setDisplayOrder((story as any).display_order || 0)
    setRequiredFlags(((story as any).required_flags || []).join(', '))
    setLocationSearch('') // Reset search when switching stories
  }, [story.id]) // Re-run when story changes

  const loadLocations = async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name')
      .order('name')

    if (error) {
      console.error('Error loading locations:', error)
    } else {
      setLocations(data || [])
    }
  }

  const saveStory = async () => {
    setSaving(true)

    // Parse required flags
    const flagsArray = requiredFlags
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0)

    try {
      await storyUpdate('story', story.id, {
        title,
        description,
        character_path: characterPath,
        location_ids: locationIds,
        min_level: minLevel,
        max_level: maxLevel || null,
        first_event_id: firstEventId || null,
        is_active: isActive,
        display_order: displayOrder,
        required_flags: flagsArray
      })
      alert('Story saved successfully!')
    } catch (error: any) {
      console.error('Error saving story:', error)
      alert(`Failed to save story: ${error.message || 'Unknown error'}`)
    }
    setSaving(false)
  }

  const archiveStory = async () => {
    if (!confirm(`Archive "${title}"?\n\nThis will hide it from players but preserve all data. You can restore it later.`)) {
      return
    }

    setSaving(true)
    try {
      await storyUpdate('story', story.id, {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      alert('Story archived successfully!')
      // Reload stories list to update the UI
      loadStories()
      setSaving(false)
    } catch (error: any) {
      console.error('Error archiving story:', error)
      alert(`Failed to archive story: ${error.message || 'Unknown error'}`)
      setSaving(false)
    }
  }

  const restoreStory = async () => {
    setSaving(true)
    try {
      await storyUpdate('story', story.id, {
        is_deleted: false,
        is_active: true,
        deleted_at: null
      })
      alert('Story restored successfully!')
      // Reload stories list to update the UI
      loadStories()
      setSaving(false)
    } catch (error: any) {
      console.error('Error restoring story:', error)
      alert(`Failed to restore story: ${error.message || 'Unknown error'}`)
      setSaving(false)
    }
  }

  const permanentlyDeleteStory = async () => {
    // Count what will be deleted
    const chapterData = await storyList<{ id: string }>('chapter', {
      story_id: story.id,
    })
    const chapterIds = (chapterData || []).map(c => c.id)
    let eventCount = 0, choiceCount = 0, consequenceCount = 0, progressCount = 0

    if (chapterIds.length > 0) {
      const eventData = await Promise.all(
        chapterIds.map((chapterId) =>
          storyList<{ id: string }>('event', { chapter_id: chapterId })
        )
      )
      const eventIds = eventData.flat().map(e => e.id)
      eventCount = eventIds.length

      if (eventIds.length > 0) {
        const choiceData = await Promise.all(
          eventIds.map((eventId) =>
            storyList<{ id: string }>('choice', { event_id: eventId })
          )
        )
        const choiceIds = choiceData.flat().map(c => c.id)
        choiceCount = choiceIds.length

        if (choiceIds.length > 0) {
          const consData = await Promise.all(
            choiceIds.map((choiceId) =>
              storyList<{ id: string }>('consequence', { choice_id: choiceId })
            )
          )
          consequenceCount = consData.flat().length
        }
      }
    }

    const { data: progressData } = await supabase
      .from('story_progress')
      .select('id')
      .eq('story_id', story.id)

    progressCount = (progressData || []).length

    // Show confirmation
    const confirmText = prompt(
      `⚠️ PERMANENT DELETION WARNING\n\n` +
      `This will DELETE FOREVER:\n` +
      `• ${chapterIds.length} chapter(s)\n` +
      `• ${eventCount} event(s)\n` +
      `• ${choiceCount} choice(s)\n` +
      `• ${consequenceCount} consequence(s)\n` +
      `• ${progressCount} player progress record(s)\n\n` +
      `This CANNOT be undone!\n\n` +
      `Type the story name to confirm: "${title}"`
    )

    if (confirmText !== title) {
      alert('Deletion cancelled - name did not match')
      return
    }

    setSaving(true)

    // Export backup first
    const backup = {
      story,
      chapters: chapterData,
      export_date: new Date().toISOString(),
      warning: 'This is a backup before permanent deletion'
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `story-backup-${story.id}-${Date.now()}.json`
    a.click()

    // Wait a moment for download
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Delete the story (CASCADE will handle related data)
    try {
      await storyDelete('story', story.id)
      alert('Story permanently deleted. Backup downloaded.')
      // Clear selection and reload stories list
      setSelectedStory(null)
      setSelectedChapter(null)
      setSelectedEvent(null)
      loadStories()
      setSaving(false)
    } catch (error: any) {
      console.error('Error deleting story:', error)
      alert(`Failed to delete story: ${error.message || 'Unknown error'}`)
      setSaving(false)
    }
  }

  // Toggle location selection
  const toggleLocation = (locationId: string) => {
    setLocationIds(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    )
  }

  // Filtered locations for search
  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
    loc.id.toLowerCase().includes(locationSearch.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Basic Info Section */}
      <div className="space-y-3 p-3 bg-muted/20 rounded border">
        <h4 className="text-xs font-semibold text-primary">Basic Information</h4>

        <div>
          <label className="block text-xs font-medium mb-1">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Story title"
            className="text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Story description"
            rows={3}
            className="text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Character Path</label>
          <Select value={characterPath} onValueChange={setCharacterPath}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Location & Requirements Section */}
      <div className="space-y-3 p-3 bg-muted/20 rounded border">
        <h4 className="text-xs font-semibold text-primary">Location & Requirements</h4>

        <div>
          <label className="block text-xs font-medium mb-1">
            Locations ({locationIds.length === 0 ? 'All' : locationIds.length} selected)
          </label>

          {/* Search box */}
          <Input
            type="text"
            placeholder="Search locations..."
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            className="text-xs mb-2"
          />

          {/* Quick actions */}
          <div className="flex gap-2 mb-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-xs h-6 px-2"
              onClick={() => setLocationIds([])}
            >
              Clear All (Available Everywhere)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-xs h-6 px-2"
              onClick={() => setLocationIds(filteredLocations.map(l => l.id))}
            >
              Select All {locationSearch ? 'Filtered' : ''}
            </Button>
          </div>

          {/* Scrollable location list */}
          <div className="border rounded max-h-48 overflow-y-auto p-2 space-y-1 bg-background">
            {filteredLocations.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                No locations found matching "{locationSearch}"
              </div>
            ) : (
              filteredLocations.map(loc => (
                <label
                  key={loc.id}
                  className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={locationIds.includes(loc.id)}
                    onChange={() => toggleLocation(loc.id)}
                    className="w-3 h-3"
                  />
                  <span className="flex-1">{loc.name}</span>
                  <span className="text-muted-foreground text-xs">({loc.id})</span>
                </label>
              ))
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            {locationIds.length === 0
              ? '✅ Story available at ALL locations'
              : `Story available at ${locationIds.length} specific location(s)`
            }
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Min Level</label>
            <Input
              type="number"
              value={minLevel}
              onChange={(e) => setMinLevel(Number(e.target.value))}
              min={1}
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Max Level (optional)</label>
            <Input
              type="number"
              value={maxLevel}
              onChange={(e) => setMaxLevel(e.target.value ? Number(e.target.value) : '')}
              placeholder="No max"
              className="text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Required Flags (comma-separated)</label>
          <Input
            value={requiredFlags}
            onChange={(e) => setRequiredFlags(e.target.value)}
            placeholder="flag1, flag2, flag3"
            className="text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Story flags that must be set before this story becomes available
          </p>
        </div>
      </div>

      {/* Story Flow Section */}
      <div className="space-y-3 p-3 bg-muted/20 rounded border">
        <h4 className="text-xs font-semibold text-primary">Story Flow</h4>

        <div>
          <label className="block text-xs font-medium mb-1">First Event</label>
          <Select value={firstEventId || "none"} onValueChange={(val) => setFirstEventId(val === "none" ? '' : val)}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Select starting event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Not set</span>
              </SelectItem>
              {events.map(event => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            The event that starts this story when player begins
          </p>
        </div>
      </div>

      {/* Settings Section */}
      <div className="space-y-3 p-3 bg-muted/20 rounded border">
        <h4 className="text-xs font-semibold text-primary">Settings</h4>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-medium">Active</label>
            <p className="text-xs text-muted-foreground">Story is available to players</p>
          </div>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Display Order</label>
          <Input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
            className="text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Lower numbers appear first in story lists
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={saveStory} disabled={saving} size="sm" className="flex-1">
          <Save className="w-3 h-3 mr-1" />
          {saving ? 'Saving...' : 'Save Story'}
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="p-3 bg-destructive/10 rounded border border-destructive/30 space-y-2">
        <h4 className="text-xs font-semibold text-destructive">Danger Zone</h4>

        <Button
          onClick={archiveStory}
          disabled={saving}
          variant="outline"
          size="sm"
          className="w-full text-xs border-destructive/30"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Archive Story
        </Button>

        {(story as any).is_deleted && (
          <>
            <p className="text-xs text-destructive">
              ⚠️ This story is archived. Restore it or permanently delete it.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={restoreStory}
                disabled={saving}
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
              >
                Restore
              </Button>
              <Button
                onClick={permanentlyDeleteStory}
                disabled={saving}
                variant="destructive"
                size="sm"
                className="flex-1 text-xs"
              >
                Delete Forever
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
