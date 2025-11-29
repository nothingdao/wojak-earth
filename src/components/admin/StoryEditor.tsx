// src/components/admin/StoryEditor.tsx - Basic story editor interface
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Save, Play, TestTube, RefreshCw } from 'lucide-react'
import { Tables } from '@/types/supabase'
import { createClient } from '@supabase/supabase-js'
import { showStoryDialog, useStoryDialog, StoryDialog, addStoryScreens, type StoryScreen } from '@/components/ui/story-dialog'
import { createStoryScreens } from '@/utils/story-system'
import { recordStoryChoice, setStoryFlag } from '@/utils/story-flags'
import type { Character } from '@/types'

// Type aliases for cleaner code
type Story = Tables<'stories'>
type Chapter = Tables<'chapters'>
type Event = Tables<'events'>
type Choice = Tables<'choices'>
type Consequence = Tables<'consequences'>

// Type for consequence data structure
interface ConsequenceData {
  health?: number
  energy?: number
  experience?: number
  credits?: number
  item?: string
  story_flag?: string
  response_text?: string
  next_event_id?: string
  [key: string]: any // Allow custom fields
}

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

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

  // Story dialog testing state
  const dialogState = useStoryDialog()

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

  // Load choices when event is selected
  useEffect(() => {
    if (selectedEvent) {
      // Clear child data immediately when event changes
      setSelectedChoice(null)
      setSelectedConsequence(null)
      setChoices([])
      setConsequences([])
      // Then load fresh choices for the new event
      loadChoices(selectedEvent.id)
    }
  }, [selectedEvent])

  const loadStories = async () => {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading stories:', error)
    } else {
      setStories(data || [])
    }
  }

  const loadChapters = async (storyId: string) => {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('story_id', storyId)
      .order('chapter_number', { ascending: true })

    if (error) {
      console.error('Error loading chapters:', error)
    } else {
      setChapters(data || [])
    }
  }

  const loadEvents = async (chapterId: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error loading events:', error)
    } else {
      setEvents(data || [])
    }
  }

  const loadChoices = async (eventId: string) => {
    const { data, error } = await supabase
      .from('choices')
      .select('*')
      .eq('event_id', eventId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error loading choices:', error)
    } else {
      setChoices(data || [])
      // Load consequences for all choices
      if (data && data.length > 0) {
        loadConsequences(data.map(c => c.id))
      }
    }
  }

  const loadConsequences = async (choiceIds: string[]) => {
    if (choiceIds.length === 0) return

    const { data, error } = await supabase
      .from('consequences')
      .select('*')
      .in('choice_id', choiceIds)

    if (error) {
      console.error('Error loading consequences:', error)
    } else {
      setConsequences(data || [])
    }
  }

  // Comprehensive refresh functions
  const refreshAllData = async () => {
    console.log('Refreshing all story data...')
    setLoading(true)
    try {
      // Refresh stories first
      await loadStories()

      // If a story is selected, refresh its data
      if (selectedStory) {
        await loadChapters(selectedStory.id)

        // If a chapter is selected, refresh its events
        if (selectedChapter) {
          await loadEvents(selectedChapter.id)

          // If an event is selected, refresh its choices
          if (selectedEvent) {
            await loadChoices(selectedEvent.id)
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshCurrentStory = async () => {
    if (!selectedStory) return

    console.log('Refreshing current story data...')
    setLoading(true)
    try {
      await loadChapters(selectedStory.id)

      if (selectedChapter) {
        await loadEvents(selectedChapter.id)

        if (selectedEvent) {
          await loadChoices(selectedEvent.id)
        }
      }
    } catch (error) {
      console.error('Error refreshing story data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshCurrentChapter = async () => {
    if (!selectedChapter) return

    console.log('Refreshing current chapter data...')
    setLoading(true)
    try {
      await loadEvents(selectedChapter.id)

      if (selectedEvent) {
        await loadChoices(selectedEvent.id)
      }
    } catch (error) {
      console.error('Error refreshing chapter data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createStory = async () => {
    const title = prompt('Story title:')
    const characterPath = prompt('Character path (male/female):')

    if (!title || !characterPath) return

    setLoading(true)
    const { data, error } = await supabase
      .from('stories')
      .insert({
        title,
        character_path: characterPath,
        description: 'New story description'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating story:', error)
    } else {
      setStories([data, ...stories])
      setSelectedStory(data)
    }
    setLoading(false)
  }

  const createChapter = async () => {
    if (!selectedStory) return

    const title = prompt('Chapter title:')
    const chapterNumber = chapters.length + 1

    if (!title) return

    setLoading(true)
    const { data, error } = await supabase
      .from('chapters')
      .insert({
        story_id: selectedStory.id,
        chapter_number: chapterNumber,
        title,
        description: 'New chapter description'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating chapter:', error)
    } else {
      setChapters([...chapters, data])
      setSelectedChapter(data)
    }
    setLoading(false)
  }

  const updateChapter = async (chapterId: string, updates: Partial<Chapter>) => {
    setLoading(true)
    const { error } = await supabase
      .from('chapters')
      .update(updates)
      .eq('id', chapterId)

    if (error) {
      console.error('Error updating chapter:', error)
    } else {
      // Update local state
      setChapters(chapters.map(ch =>
        ch.id === chapterId ? { ...ch, ...updates } : ch
      ))
      if (selectedChapter?.id === chapterId) {
        setSelectedChapter({ ...selectedChapter, ...updates })
      }
    }
    setLoading(false)
  }

  const updateEvent = async (eventId: string, updates: Partial<Event>) => {
    setLoading(true)
    const { error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)

    if (error) {
      console.error('Error updating event:', error)
    } else {
      // Update local state
      setEvents(events.map(ev =>
        ev.id === eventId ? { ...ev, ...updates } : ev
      ))
      if (selectedEvent?.id === eventId) {
        setSelectedEvent({ ...selectedEvent, ...updates })
      }
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
      const { data, error } = await supabase
        .from('events')
        .insert({
          chapter_id: selectedChapter.id,
          title,
          description: 'New event description',
          order_index: events.length + 1
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating event:', error)
        alert(`Failed to create event: ${error.message}`)
      } else {
        console.log('Event created successfully:', data)
        // Reload events to ensure we have the latest data
        await loadEvents(selectedChapter.id)
        // Set the newly created event as selected
        setSelectedEvent(data)
      }
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
      const { data, error } = await supabase
        .from('choices')
        .insert({
          event_id: selectedEvent.id,
          choice_key: choiceKey,
          text,
          order_index: choices.filter(c => c.event_id === selectedEvent.id).length + 1
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating choice:', error)
        alert(`Failed to create choice: ${error.message}`)
      } else {
        console.log('Choice created successfully:', data)
        setChoices([...choices, data])
      }
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

      const { data, error } = await supabase
        .from('consequences')
        .insert({
          choice_id: choiceId,
          consequence_data: parsedData
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating consequence:', error)
        alert(`Failed to create consequence: ${error.message}`)
      } else {
        console.log('Consequence created successfully:', data)
        setConsequences([...consequences, data])
      }
    } catch (err) {
      console.error('JSON parse error or unexpected error:', err)
      alert('Invalid JSON format or unexpected error')
    }

    setLoading(false)
  }

  const updateChoice = async (choiceId: string, updates: Partial<Choice>) => {
    setLoading(true)
    const { error } = await supabase
      .from('choices')
      .update(updates)
      .eq('id', choiceId)

    if (error) {
      console.error('Error updating choice:', error)
      alert(`Failed to update choice: ${error.message}`)
    } else {
      setChoices(choices.map(ch =>
        ch.id === choiceId ? { ...ch, ...updates } : ch
      ))
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
      const { data, error } = await supabase
        .from('consequences')
        .insert({
          choice_id: selectedChoice.id,
          consequence_data: consequenceData
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating consequence:', error)
        alert(`Failed to create consequence: ${error.message}`)
      } else {
        console.log('Consequence created successfully:', data)
        setConsequences([...consequences, data])
        setShowConsequenceBuilder(false)
        setSelectedChoice(null)
      }
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
      const { data, error } = await supabase
        .from('consequences')
        .update({ consequence_data: consequenceData })
        .eq('id', consequenceId)
        .select()
        .single()

      if (error) {
        console.error('Error updating consequence:', error)
        alert(`Failed to update consequence: ${error.message}`)
      } else {
        console.log('Consequence updated successfully:', data)
        setConsequences(consequences.map(c =>
          c.id === consequenceId ? { ...c, consequence_data: consequenceData } : c
        ))
        setShowConsequenceBuilder(false)
        setSelectedChoice(null)
        setSelectedConsequence(null)
      }
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
      const { error } = await supabase
        .from('consequences')
        .delete()
        .eq('id', consequenceId)

      if (error) {
        console.error('Error deleting consequence:', error)
        alert(`Failed to delete consequence: ${error.message}`)
      } else {
        console.log('Consequence deleted successfully')
        setConsequences(consequences.filter(c => c.id !== consequenceId))
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Unexpected error deleting consequence')
    }

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

                // Build screens for this choice's aftermath
                const newScreens: StoryScreen[] = []

                // Add response text if provided
                if (data.response_text) {
                  newScreens.push(createStoryScreens.text(
                    data.response_text,
                    'CONSEQUENCE'
                  ))
                }

                // Add next event if provided (recursive chaining)
                if (data.next_event_id) {
                  console.log(`Looking for next event with ID: ${data.next_event_id}`)
                  console.log(`Available events:`, events.map(e => ({ id: e.id, title: e.title })))

                  const nextEvent = events.find(e => e.id === data.next_event_id)
                  if (nextEvent) {
                    console.log(`✅ Found next event: ${nextEvent.title} (ID: ${data.next_event_id})`)

                    // Load choices and consequences for the next event on-demand
                    setTimeout(async () => {
                      const { data: nextEventChoices } = await supabase
                        .from('choices')
                        .select('*')
                        .eq('event_id', nextEvent.id)
                        .order('order_index', { ascending: true })

                      const nextChoices = nextEventChoices || []
                      let nextConsequences = []

                      if (nextChoices.length > 0) {
                        const { data: nextEventConsequences } = await supabase
                          .from('consequences')
                          .select('*')
                          .in('choice_id', nextChoices.map(c => c.id))

                        nextConsequences = nextEventConsequences || []
                      }

                      console.log(`Loaded for "${nextEvent.title}": ${nextChoices.length} choices, ${nextConsequences.length} consequences`)

                      // Create the next event screen with its loaded data
                      const nextEventScreen = createNextEventScreen(nextEvent, nextChoices, nextConsequences)
                      addStoryScreens([nextEventScreen])
                    }, 0)
                  } else {
                    console.error(`❌ Next event not found with ID: ${data.next_event_id}`)
                    console.error(`Available event IDs:`, events.map(e => e.id))
                    newScreens.push(createStoryScreens.text(
                      `[Story continues to event ID: ${data.next_event_id}]\n\n(Event not found in current story data)`,
                      'MISSING EVENT'
                    ))
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

                // Build screens for this choice's aftermath
                const newScreens: StoryScreen[] = []

                // Add response text if provided
                if (data.response_text) {
                  newScreens.push(createStoryScreens.text(
                    data.response_text,
                    'CONSEQUENCE'
                  ))
                }

                // Add next event if provided (chaining logic)
                if (data.next_event_id) {
                  console.log(`Looking for next event with ID: ${data.next_event_id}`)
                  console.log(`Available events:`, events.map(e => ({ id: e.id, title: e.title })))

                  const nextEvent = events.find(e => e.id === data.next_event_id)
                  if (nextEvent) {
                    console.log(`✅ Found next event: ${nextEvent.title} (ID: ${data.next_event_id})`)

                    // Load choices and consequences for the next event on-demand
                    setTimeout(async () => {
                      const { data: nextEventChoices } = await supabase
                        .from('choices')
                        .select('*')
                        .eq('event_id', nextEvent.id)
                        .order('order_index', { ascending: true })

                      const nextChoices = nextEventChoices || []
                      let nextConsequences = []

                      if (nextChoices.length > 0) {
                        const { data: nextEventConsequences } = await supabase
                          .from('consequences')
                          .select('*')
                          .in('choice_id', nextChoices.map(c => c.id))

                        nextConsequences = nextEventConsequences || []
                      }

                      console.log(`Loaded for "${nextEvent.title}": ${nextChoices.length} choices, ${nextConsequences.length} consequences`)

                      // Create the next event screen with its loaded data
                      const nextEventScreen = createNextEventScreen(nextEvent, nextChoices, nextConsequences)
                      addStoryScreens([nextEventScreen])
                    }, 0)
                  } else {
                    console.error(`❌ Next event not found with ID: ${data.next_event_id}`)
                    console.error(`Available event IDs:`, events.map(e => e.id))
                    newScreens.push(createStoryScreens.text(
                      `[Story continues to event ID: ${data.next_event_id}]\n\n(Event not found in current story data)`,
                      'MISSING EVENT'
                    ))
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
                      event_key: event.event_key || event.id,
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

  // Test entire chapter
  const testChapter = (chapter: Chapter) => {
    const chapterEvents = events.filter(e => e.chapter_id === chapter.id)

    if (chapterEvents.length === 0) {
      alert('No events found in this chapter!')
      return
    }

    const screens = chapterEvents.map(event => convertEventToDialog(event))

    showStoryDialog({
      screens,
      storyId: `${chapter.title.toLowerCase().replace(/\s+/g, '_')}`,
      onComplete: () => console.log(`Chapter ${chapter.title} completed!`)
    })
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
            <div className="flex gap-2">
              <Button size="sm" onClick={refreshAllData} disabled={loading}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh All
              </Button>
              <Button size="sm" onClick={loadStories} disabled={loading} variant="outline">
                <RefreshCw className="w-3 h-3 mr-1" />
                Stories Only
              </Button>
            </div>
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
              <div className="flex gap-2">
                <Button size="sm" onClick={createChapter} disabled={loading}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Chapter
                </Button>
                <Button size="sm" onClick={refreshCurrentStory} disabled={loading} variant="outline">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {chapters.map(chapter => (
                  <ChapterListItem
                    key={chapter.id}
                    chapter={chapter}
                    isSelected={selectedChapter?.id === chapter.id}
                    onSelect={() => setSelectedChapter(chapter)}
                    onUpdate={(updates) => updateChapter(chapter.id, updates)}
                    onTest={() => testChapter(chapter)}
                    canTest={events.filter(e => e.chapter_id === chapter.id).length > 0}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Events Panel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Events</CardTitle>
              {selectedChapter && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={createEvent} disabled={loading}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Event
                  </Button>
                  <Button size="sm" onClick={refreshCurrentChapter} disabled={loading} variant="outline">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {events.map(event => (
                  <EventListItem
                    key={event.id}
                    event={event}
                    isSelected={selectedEvent?.id === event.id}
                    onSelect={() => setSelectedEvent(event)}
                    onUpdate={(updates) => updateEvent(event.id, updates)}
                    onTest={() => testEvent(event)}
                  />
                ))}
              </div>
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

      {/* Story Editor Panel - Only for Story Details */}
      {selectedStory && !selectedChapter && !selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Edit Story: {selectedStory.title}</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <StoryDetailsEditor story={selectedStory} />
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
  onUpdate,
  onTest,
  canTest
}: {
  chapter: Chapter
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<Chapter>) => void
  onTest: () => void
  canTest: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(chapter.title)
  const [description, setDescription] = useState(chapter.description || '')

  const handleSave = () => {
    onUpdate({ title, description })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTitle(chapter.title)
    setDescription(chapter.description || '')
    setIsEditing(false)
  }

  return (
    <div
      className={`p-2 rounded transition-colors border ${isSelected
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-muted cursor-pointer'
        }`}
    >
      {isEditing ? (
        <div className="space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xs h-6"
            placeholder="Chapter title"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-xs h-16 resize-none"
            placeholder="Chapter description"
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave} className="text-xs h-6 px-2">
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} className="text-xs h-6 px-2">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            className="font-medium text-xs"
            onClick={onSelect}
          >
            Ch. {chapter.chapter_number}: {title}
          </div>
          {description && (
            <div className="text-xs opacity-70 mt-1 truncate">{description}</div>
          )}
          {isSelected && (
            <div className="flex gap-1 mt-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6 px-2"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
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
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Event List Item Component
function EventListItem({
  event,
  isSelected,
  onSelect,
  onUpdate,
  onTest
}: {
  event: Event
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<Event>) => void
  onTest: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description)

  const handleSave = () => {
    onUpdate({ title, description })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTitle(event.title)
    setDescription(event.description)
    setIsEditing(false)
  }

  return (
    <div
      className={`p-2 rounded transition-colors border ${isSelected
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-muted cursor-pointer'
        }`}
    >
      {isEditing ? (
        <div className="space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xs h-6"
            placeholder="Event title"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-xs h-16 resize-none"
            placeholder="Event description/dialog"
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave} className="text-xs h-6 px-2">
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} className="text-xs h-6 px-2">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            className="font-medium text-xs"
            onClick={onSelect}
          >
            {title}
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
                  setIsEditing(true)
                }}
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
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
        </>
      )}
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
      // Get only events from the current chapter
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          chapters (
            title,
            chapter_number,
            stories (
              title
            )
          )
        `)
        .eq('chapter_id', currentChapter.id)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('Error loading chapter events for consequence builder:', error)
      } else {
        // Transform the data to include chapter and story titles
        const eventsWithContext = (data || []).map(event => ({
          ...event,
          chapter_title: event.chapters?.title,
          story_title: event.chapters?.stories?.title
        }))
        setAllEvents(eventsWithContext)
        console.log(`Loaded ${eventsWithContext.length} events from chapter "${currentChapter.title}"`)
      }
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

// Story Details Editor Component
function StoryDetailsEditor({ story }: { story: Story }) {
  const [title, setTitle] = useState(story.title)
  const [description, setDescription] = useState(story.description || '')
  const [characterPath, setCharacterPath] = useState(story.character_path)
  const [saving, setSaving] = useState(false)

  const saveStory = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('stories')
      .update({
        title,
        description,
        character_path: characterPath
      })
      .eq('id', story.id)

    if (error) {
      console.error('Error saving story:', error)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
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
        <label className="block text-xs font-medium mb-1">Character Path</label>
        <Input
          value={characterPath}
          onChange={(e) => setCharacterPath(e.target.value)}
          placeholder="male or female"
          className="text-xs"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Story description"
          rows={4}
          className="text-xs"
        />
      </div>
      <Button onClick={saveStory} disabled={saving} size="sm" className="w-full">
        <Save className="w-3 h-3 mr-1" />
        {saving ? 'Saving...' : 'Save Story'}
      </Button>
    </div>
  )
}
