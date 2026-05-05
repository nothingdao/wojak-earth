// src/utils/story-playback.ts - Convex story playback
import { convexHttp } from '@/lib/convex-singleton'
import { api } from '@convex/_generated/api'
import { showStoryDialog, addStoryScreens, type StoryScreen, type StoryChoice } from '@/components/ui/story-dialog'
import { createStoryScreens } from '@/utils/story-system'
import { setStoryFlag } from '@/utils/story-flags'
import type { Character } from '@/types'

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

interface StoryEvent {
  _id: string
  title: string
  description: string
  orderIndex: number
  choices: StoryChoiceWithConsequences[]
}

interface StoryChoiceWithConsequences {
  _id: string
  text: string
  orderIndex: number
  consequences: StoryConsequence[]
}

interface StoryConsequence {
  _id: string
  consequenceData: any
}

interface ChapterChapter {
  _id: string
  title: string
  chapterNumber: number
  events: StoryEvent[]
}

interface PlayChapterOptions {
  chapter: { _id: string; id: string; title?: string; chapterNumber?: number }
  character: Character
  onComplete: () => void
  onCharacterUpdate: () => Promise<void>
}

interface StoryContext {
  events: StoryEvent[]
  character: Character
  onCharacterUpdate: () => Promise<void>
}

export async function playChapter({ chapter, character, onComplete, onCharacterUpdate }: PlayChapterOptions) {
  console.log(`Starting playback: ${chapter.title}`)

  const chapterId = chapter._id ?? chapter.id
  const chapterData = await convexHttp.query(api.earth.stories.getChapterWithContent, { chapterId }) as ChapterChapter | null

  if (!chapterData || !chapterData.events || chapterData.events.length === 0) {
    alert('This chapter has no events yet!')
    return
  }

  console.log(`Loaded: ${chapterData.events.length} events`)

  const context: StoryContext = {
    events: chapterData.events,
    character,
    onCharacterUpdate
  }

  const firstEvent = chapterData.events[0]
  const firstScreen = buildEventScreen(firstEvent, context)

  if (!firstScreen) {
    alert('Cannot start chapter - requirements not met')
    return
  }

  showStoryDialog({
    screens: [firstScreen],
    storyId: chapter.title ?? chapterId,
    onComplete: async () => {
      console.log('Chapter completed, chapterId:', chapterId, 'characterId:', character.id)
      await convexHttp.mutation(api.earth.stories.completeChapter, {
        characterId: character.id,
        chapterId,
      })
      await onCharacterUpdate()
      onComplete()
    }
  })
}

function buildEventScreen(event: StoryEvent, context: StoryContext): StoryScreen | null {
  if (event.choices.length > 0) {
    return buildChoiceScreen(event, context)
  }
  return buildTextScreen(event, context)
}

function buildChoiceScreen(event: StoryEvent, context: StoryContext): StoryScreen {
  return createStoryScreens.choice(
    event.description,
    event.choices.map((choice) => ({
      text: choice.text,
      action: async () => {
        await handleChoice(event, choice.consequences, context)
      }
    } as StoryChoice)),
    event.title
  )
}

function buildTextScreen(event: StoryEvent, context: StoryContext): StoryScreen {
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

async function handleChoice(
  currentEvent: StoryEvent,
  consequences: StoryConsequence[],
  context: StoryContext
) {
  const screensToAdd: StoryScreen[] = []
  let nextEventId: string | null = null

  for (const consequence of consequences) {
    const data = parseConsequenceData(consequence)

    await applyConsequenceEffects(data, context.character, context.onCharacterUpdate)

    if (data.next_event_id) {
      nextEventId = data.next_event_id
    }

    if (data.response_text) {
      screensToAdd.push({
        title: 'CONSEQUENCE',
        content: data.response_text,
        effects: extractEffects(data),
        continueText: 'CONTINUE',
      })
    }
  }

  let nextEvent: StoryEvent | null = null

  if (nextEventId) {
    nextEvent = context.events.find(e => e._id === nextEventId) || null
  } else {
    nextEvent = getNextEvent(currentEvent, context)
  }

  if (nextEvent) {
    const nextScreen = buildEventScreen(nextEvent, context)
    if (nextScreen) screensToAdd.push(nextScreen)
  } else {
    screensToAdd.push({
      title: 'CHAPTER COMPLETE',
      content: 'You have completed this chapter!',
      continueText: 'FINISH',
      canDismiss: true
    })
  }

  if (screensToAdd.length > 0) {
    addStoryScreens(screensToAdd)
  }
}

async function continueToNextEvent(currentEvent: StoryEvent, context: StoryContext) {
  const nextEvent = getNextEvent(currentEvent, context)
  if (nextEvent) {
    const nextScreen = buildEventScreen(nextEvent, context)
    if (nextScreen) addStoryScreens([nextScreen])
  }
}

function getNextEvent(currentEvent: StoryEvent, context: StoryContext): StoryEvent | null {
  return context.events.find(e => e.orderIndex === currentEvent.orderIndex + 1) || null
}

async function applyConsequenceEffects(
  data: ConsequenceData,
  character: Character,
  onCharacterUpdate: () => Promise<void>
) {
  const earthAmount = (data.earth ?? 0) + (data.credits ?? 0)
  const hasEffects =
    (data.health !== undefined && data.health !== 0) ||
    (data.energy !== undefined && data.energy !== 0) ||
    (data.experience !== undefined && data.experience !== 0) ||
    earthAmount !== 0 ||
    data.story_flag

  if (!hasEffects) return

  if (data.health || data.energy || data.experience || earthAmount) {
    await convexHttp.mutation(api.earth.characters.applyConsequenceEffects, {
      characterId: character.id,
      health: data.health,
      energy: data.energy,
      experience: data.experience,
      earth: earthAmount || undefined,
    })
  }

  if (data.story_flag) {
    await setStoryFlag(character.id, data.story_flag, true)
  }

  // TODO: item grants via story consequences require inventory mutation
  if (data.item) {
    console.warn('story-playback: item grants not yet implemented in Convex')
  }

  await onCharacterUpdate()
}

function parseConsequenceData(consequence: StoryConsequence): ConsequenceData {
  try {
    if (typeof consequence.consequenceData === 'object' && consequence.consequenceData !== null) {
      return consequence.consequenceData as ConsequenceData
    }
    return {}
  } catch {
    return {}
  }
}

function extractEffects(data: ConsequenceData) {
  const effects: any = {}

  if (data.health !== undefined && data.health !== 0) effects.health = data.health
  if (data.energy !== undefined && data.energy !== 0) effects.energy = data.energy
  if (data.experience !== undefined && data.experience !== 0) effects.experience = data.experience

  const earthAmount = (data.earth ?? 0) + (data.credits ?? 0)
  if (earthAmount !== 0) effects.credits = earthAmount

  if (data.item) effects.items = [data.item]
  if (data.story_flag) effects.flags = [data.story_flag]

  return Object.keys(effects).length > 0 ? effects : undefined
}
