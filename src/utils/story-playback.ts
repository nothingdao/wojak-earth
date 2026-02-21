// src/utils/story-playback.ts - In-game story playback with requirement validation
import { createClient } from '@supabase/supabase-js'
import { showStoryDialog, addStoryScreens, type StoryScreen, type StoryChoice } from '@/components/ui/story-dialog'
import { createStoryScreens } from '@/utils/story-system'
import type { Character } from '@/types'
import { Tables } from '@/types/supabase'

type Chapter = Tables<'chapters'>
type Event = Tables<'events'>
type Choice = Tables<'choices'>
type Consequence = Tables<'consequences'>

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

interface ConsequenceData {
  health?: number
  energy?: number
  experience?: number
  credits?: number
  earth?: number
  item?: string
  story_flag?: string
  response_text?: string
  next_event_id?: string
}

interface PlayChapterOptions {
  chapter: Chapter
  character: Character
  onComplete: () => void
  onCharacterUpdate: () => Promise<void>
}

interface StoryContext {
  events: Event[]
  choices: Choice[]
  consequences: Consequence[]
  character: Character
  onCharacterUpdate: () => Promise<void>
}

export async function playChapter({ chapter, character, onComplete, onCharacterUpdate }: PlayChapterOptions) {
  console.log(`🎬 Starting playback: ${chapter.title}`)

  // Load all chapter data
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('chapter_id', chapter.id)
    .order('order_index', { ascending: true })

  if (!events || events.length === 0) {
    alert('This chapter has no events yet!')
    return
  }

  const eventIds = events.map(e => e.id)

  // Load all choices
  const { data: choices } = await supabase
    .from('choices')
    .select('*')
    .in('event_id', eventIds)
    .order('order_index', { ascending: true })

  // Load all consequences
  const choiceIds = (choices || []).map(c => c.id)
  let consequences: Consequence[] = []

  if (choiceIds.length > 0) {
    const { data: consData } = await supabase
      .from('consequences')
      .select('*')
      .in('choice_id', choiceIds)

    consequences = consData || []
  }

  console.log(`Loaded: ${events.length} events, ${choices?.length || 0} choices, ${consequences.length} consequences`)

  const context: StoryContext = {
    events,
    choices: choices || [],
    consequences,
    character,
    onCharacterUpdate
  }

  // Build and show first event
  const firstEvent = events[0]
  const firstScreen = await buildEventScreen(firstEvent, context)

  if (!firstScreen) {
    alert('Cannot start chapter - requirements not met')
    return
  }

  // Start the story dialog
  showStoryDialog({
    screens: [firstScreen],
    storyId: chapter.title,
    onComplete: async () => {
      console.log('✅ Chapter completed callback fired!')
      console.log('Chapter ID:', chapter.id)
      console.log('Character ID:', character.id)

      // Mark chapter as completed
      const completedChapters = character.completed_chapters || []
      console.log('Current completed_chapters:', completedChapters)

      if (!completedChapters.includes(chapter.id)) {
        console.log('Updating database to mark chapter complete...')
        const { data, error } = await supabase
          .from('characters')
          .update({
            completed_chapters: [...completedChapters, chapter.id]
          })
          .eq('id', character.id)

        console.log('Database update result:', { data, error })

        console.log('Refreshing character data...')
        await onCharacterUpdate()
        console.log('Character data refreshed')
      } else {
        console.log('Chapter already in completed list')
      }

      console.log('Calling original onComplete callback')
      onComplete()
    }
  })
}

// Build a screen for an event with requirement validation
async function buildEventScreen(
  event: Event,
  context: StoryContext
): Promise<StoryScreen | null> {
  // Check requirements
  const requirementCheck = await validateEventRequirements(event, context.character)

  if (!requirementCheck.valid) {
    // Show blocking screen
    return {
      title: 'REQUIREMENTS NOT MET',
      content: requirementCheck.message!,
      continueText: 'UNDERSTOOD',
      canDismiss: true
    }
  }

  // Get choices for this event
  const eventChoices = context.choices.filter(c => c.event_id === event.id)

  if (eventChoices.length > 0) {
    // Choice event
    return buildChoiceScreen(event, eventChoices, context)
  } else {
    // Text-only event
    return buildTextScreen(event, context)
  }
}

// Build a choice screen
function buildChoiceScreen(
  event: Event,
  eventChoices: Choice[],
  context: StoryContext
): StoryScreen {
  const eventConsequences = context.consequences.filter(c =>
    eventChoices.some(choice => choice.id === c.choice_id)
  )

  return createStoryScreens.choice(
    event.description,
    eventChoices.map(choice => {
      const choiceConsequences = eventConsequences.filter(c => c.choice_id === choice.id)

      return {
        text: choice.text,
        action: async () => {
          await handleChoice(event, choiceConsequences, context)
        }
      } as StoryChoice
    }),
    event.title
  )
}

// Build a text-only screen
function buildTextScreen(
  event: Event,
  context: StoryContext
): StoryScreen {
  const nextEvent = getNextEvent(event, context)

  return {
    title: event.title,
    content: event.description,
    continueText: nextEvent ? 'CONTINUE' : 'COMPLETE CHAPTER',
    onContinue: nextEvent ? async () => {
      await continueToNextEvent(event, context)
    } : undefined
  }
}

// Handle a choice being made
async function handleChoice(
  currentEvent: Event,
  consequences: Consequence[],
  context: StoryContext
) {
  const screensToAdd: StoryScreen[] = []
  let nextEventId: string | null = null

  // Process all consequences
  for (const consequence of consequences) {
    const data = parseConsequenceData(consequence)

    // Apply effects to character
    await applyConsequenceEffects(data, context.character, context.onCharacterUpdate)

    // Track if this consequence specifies a next event
    if (data.next_event_id) {
      nextEventId = data.next_event_id
    }

    // Add response text screen if present
    if (data.response_text) {
      const effects = extractEffects(data)
      screensToAdd.push({
        title: 'CONSEQUENCE',
        content: data.response_text,
        effects,
        continueText: 'CONTINUE',
        // No onContinue - will use default handleNext in dialog
      })
    }
  }

  // Determine next event to show
  let nextEvent: Event | null = null

  if (nextEventId) {
    // Use explicit next_event_id from consequence
    nextEvent = context.events.find(e => e.id === nextEventId) || null
  } else {
    // Use next event by order_index
    nextEvent = getNextEvent(currentEvent, context)
  }

  // Add next event screen or completion screen
  if (nextEvent) {
    const nextScreen = await buildEventScreen(nextEvent, context)
    if (nextScreen) {
      screensToAdd.push(nextScreen)
    }
  } else {
    // No more events - add completion screen
    screensToAdd.push({
      title: 'CHAPTER COMPLETE',
      content: 'You have completed this chapter!',
      continueText: 'FINISH',
      canDismiss: true
    })
  }

  // Add all screens to dialog
  if (screensToAdd.length > 0) {
    addStoryScreens(screensToAdd)
  }
}

// Continue to next event from a text screen
async function continueToNextEvent(
  currentEvent: Event,
  context: StoryContext
) {
  const nextEvent = getNextEvent(currentEvent, context)

  if (nextEvent) {
    const nextScreen = await buildEventScreen(nextEvent, context)
    if (nextScreen) {
      addStoryScreens([nextScreen])
    }
  }
}

// Get the next event by order_index
function getNextEvent(currentEvent: Event, context: StoryContext): Event | null {
  return context.events.find(e => e.order_index === currentEvent.order_index + 1) || null
}

// Validate event requirements
async function validateEventRequirements(
  event: Event,
  character: Character
): Promise<{ valid: boolean; message?: string }> {
  const requiredLocationId = (event as any).required_location_id
  const requiredItems = (event as any).required_items || []
  const requiredFlags = (event as any).required_flags || []

  // Check location requirement
  if (requiredLocationId && character.current_location_id !== requiredLocationId) {
    const { data: location } = await supabase
      .from('locations')
      .select('name')
      .eq('id', requiredLocationId)
      .single()

    return {
      valid: false,
      message: `You must travel to ${location?.name || 'a specific location'} to continue this story.\n\nReturn here when you're ready.`
    }
  }

  // Check item requirements
  const inventory = character.inventory || []
  const missingItems = requiredItems.filter(item => !inventory.includes(item))

  if (missingItems.length > 0) {
    return {
      valid: false,
      message: `You need the following items to proceed:\n\n${missingItems.join('\n')}\n\nExplore the world to find them.`
    }
  }

  // Check flag requirements
  const storyFlags = character.story_flags || []
  const missingFlags = requiredFlags.filter(flag => !storyFlags.includes(flag))

  if (missingFlags.length > 0) {
    return {
      valid: false,
      message: `You must complete other story events first before proceeding.\n\nContinue exploring and return later.`
    }
  }

  return { valid: true }
}

// Apply consequence effects to character
async function applyConsequenceEffects(
  data: ConsequenceData,
  character: Character,
  onCharacterUpdate: () => Promise<void>
) {
  const updates: any = {}

  // Calculate new values
  if (data.health !== undefined && data.health !== 0) {
    updates.health = Math.max(0, Math.min(100, character.health + data.health))
  }

  if (data.energy !== undefined && data.energy !== 0) {
    updates.energy = Math.max(0, Math.min(100, character.energy + data.energy))
  }

  if (data.experience !== undefined && data.experience !== 0) {
    updates.experience = Math.max(0, character.experience + data.experience)
  }

  // Handle both credits (legacy) and earth (new)
  const earthAmount = (data.earth || 0) + (data.credits || 0)
  if (earthAmount !== 0) {
    updates.earth = Math.max(0, character.earth + earthAmount)
  }

  // Add item to inventory
  if (data.item) {
    const inventory = character.inventory || []
    if (!inventory.includes(data.item)) {
      updates.inventory = [...inventory, data.item]
    }
  }

  // Add story flag
  if (data.story_flag) {
    const storyFlags = character.story_flags || []
    if (!storyFlags.includes(data.story_flag)) {
      updates.story_flags = [...storyFlags, data.story_flag]
    }
  }

  // Apply updates if any
  if (Object.keys(updates).length > 0) {
    console.log('Applying consequence effects:', updates)

    await supabase
      .from('characters')
      .update(updates)
      .eq('id', character.id)

    // Refresh character data
    await onCharacterUpdate()
  }
}

// Parse consequence data safely
function parseConsequenceData(consequence: Consequence): ConsequenceData {
  try {
    if (typeof consequence.consequence_data === 'object' && consequence.consequence_data !== null) {
      return consequence.consequence_data as ConsequenceData
    }
    return {}
  } catch {
    return {}
  }
}

// Extract effects for display
function extractEffects(data: ConsequenceData) {
  const effects: any = {}

  if (data.health !== undefined && data.health !== 0) effects.health = data.health
  if (data.energy !== undefined && data.energy !== 0) effects.energy = data.energy
  if (data.experience !== undefined && data.experience !== 0) effects.experience = data.experience

  const earthAmount = (data.earth || 0) + (data.credits || 0)
  if (earthAmount !== 0) effects.credits = earthAmount

  if (data.item) effects.items = [data.item]
  if (data.story_flag) effects.flags = [data.story_flag]

  return Object.keys(effects).length > 0 ? effects : undefined
}
