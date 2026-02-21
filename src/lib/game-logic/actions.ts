/**
 * Consequence payload supported by story and NPC action systems.
 */
export interface ActionConsequence {
  health?: number
  energy?: number
  experience?: number
  credits?: number
  item?: string
  story_flag?: string
  next_event_id?: string
}

/**
 * Minimal state shape used by shared action helpers.
 */
export interface ActionState {
  health: number
  energy: number
  experience: number
  earth: number
  inventory?: string[]
  storyFlags?: string[]
}

/**
 * Delta values produced by applying an action consequence.
 */
export interface ActionDeltas {
  health: number
  energy: number
  experience: number
  earth: number
  addedItems: string[]
  addedStoryFlags: string[]
  nextEventId: string | null
}

/**
 * Result returned by applyConsequence. This function is pure and does not mutate input state.
 */
export interface ApplyConsequenceResult {
  nextState: ActionState
  deltas: ActionDeltas
}

/**
 * Generates an NPC chat line based on personality and optional context.
 */
export function generateChatMessage(input: {
  personality: string
  location?: string
  recentEvents?: string[]
  random?: () => number
}): string {
  const messagesByPersonality: Record<string, string[]> = {
    aggressive: [
      "Anyone want to trade? I've got rare items!",
      'This place needs more action...',
      "Who's up for some mining? I know the best spots!",
      "I've been grinding all day, time to cash out!",
      'Looking for teammates for the next expedition!',
      'Market prices are terrible today... anyone selling cheap?',
      'This location is getting crowded...',
      "I heard there's good loot in the deeper zones!",
    ],
    friendly: [
      "Hello everyone! How's everyone doing today?",
      'Beautiful day to be exploring Earth-2089!',
      'Anyone new here? I can show you around!',
      'The community here is amazing, love meeting new people!',
      "Hope everyone's having good luck with their adventures!",
      'This is such a peaceful spot, great for chatting!',
      'Anyone need help with anything? Happy to assist!',
      'The sunset looks incredible from this location!',
    ],
    greedy: [
      "What's the current market rate for rare crystals?",
      "I'm buying quantum dust at premium prices!",
      'Anyone selling tools? I pay well for good equipment!',
      'Investment opportunities in the new zones look promising...',
      'Supply chain for energy potions is really tight lately...',
      'Made some good profits mining yesterday!',
      'Looking to corner the market on temporal fragments...',
      'The exchange rates today are absolutely terrible!',
    ],
    cautious: [
      "Is this area safe? Haven't seen any threats lately...",
      'Always check your equipment before heading into new zones.',
      'Health potions are essential, never travel without them.',
      'The radiation levels here seem acceptable...',
      'Anyone know the difficulty rating of the eastern territories?',
      'Better to travel in groups when exploring unknown areas.',
      'I always keep my energy above 50% just in case...',
      'Weather patterns look stable for the next few hours.',
    ],
    neutral: [
      'Just passing through, checking out the local scene.',
      'Mining yields have been pretty consistent lately.',
      'Standard trade routes seem to be running smoothly.',
      'Regular maintenance on equipment is paying off.',
      'Population density here is about what I expected.',
      'Resource distribution seems fairly balanced in this zone.',
      'Transport costs are reasonable for this distance.',
      'Everything seems to be operating within normal parameters.',
    ],
  }

  const generalMessages = [
    'Another day in the wasteland...',
    'Technology here is fascinating!',
    'The atmosphere has a unique quality to it.',
    'Interesting geological formations around here.',
    'Communication networks are working well today.',
    'The local economy seems to be thriving.',
    'Environmental conditions are quite stable.',
    'Infrastructure development is impressive!',
  ]

  const personalityMessages =
    messagesByPersonality[input.personality] || messagesByPersonality.neutral
  const allMessages = [...personalityMessages, ...generalMessages]
  const pick = input.random ?? Math.random

  return allMessages[Math.floor(pick() * allMessages.length)]
}

/**
 * Applies direct damage and returns the resulting health and death state.
 */
export function applyDamage(
  health: number,
  damageAmount: number
): { newHealth: number; dead: boolean } {
  const boundedDamage = Math.max(0, damageAmount)
  const newHealth = Math.max(0, health - boundedDamage)
  return { newHealth, dead: newHealth <= 0 }
}

/**
 * Evaluates whether an entity is dead and reports why.
 */
export function checkDeath(
  health: number,
  energy: number
): { dead: boolean; reason: string } {
  if (health <= 0) {
    return { dead: true, reason: 'HEALTH_DEPLETED' }
  }

  if (energy < 0) {
    return { dead: true, reason: 'ENERGY_INVALID' }
  }

  return { dead: false, reason: 'ALIVE' }
}

/**
 * Applies a consequence payload to state and returns next state + deltas.
 * This function is pure: it does not persist data or mutate input objects.
 */
export function applyConsequence(
  consequence: ActionConsequence,
  current: ActionState
): ApplyConsequenceResult {
  const nextState: ActionState = {
    ...current,
    health: Math.max(0, Math.min(100, current.health + (consequence.health || 0))),
    energy: Math.max(0, Math.min(100, current.energy + (consequence.energy || 0))),
    experience: Math.max(0, current.experience + (consequence.experience || 0)),
    earth: Math.max(0, current.earth + (consequence.credits || 0)),
    inventory: [...(current.inventory || [])],
    storyFlags: [...(current.storyFlags || [])],
  }

  const addedItems: string[] = []
  if (consequence.item && !nextState.inventory?.includes(consequence.item)) {
    nextState.inventory?.push(consequence.item)
    addedItems.push(consequence.item)
  }

  const addedStoryFlags: string[] = []
  if (
    consequence.story_flag &&
    !nextState.storyFlags?.includes(consequence.story_flag)
  ) {
    nextState.storyFlags?.push(consequence.story_flag)
    addedStoryFlags.push(consequence.story_flag)
  }

  return {
    nextState,
    deltas: {
      health: nextState.health - current.health,
      energy: nextState.energy - current.energy,
      experience: nextState.experience - current.experience,
      earth: nextState.earth - current.earth,
      addedItems,
      addedStoryFlags,
      nextEventId: consequence.next_event_id || null,
    },
  }
}

/**
 * Calculates travel health impact based on location difficulty.
 */
export function calculateTravelHealthCost(
  currentDifficulty: number,
  destinationDifficulty: number
): number {
  return Math.max(1, destinationDifficulty - currentDifficulty)
}

/**
 * Validates if a trade can be executed with the available EARTH balance.
 */
export function validateTrade(
  earthBalance: number,
  cost: number
): { valid: boolean; reason: string } {
  if (cost < 0) {
    return { valid: false, reason: 'INVALID_COST' }
  }
  if (earthBalance < cost) {
    return { valid: false, reason: 'INSUFFICIENT_EARTH' }
  }
  return { valid: true, reason: 'OK' }
}
