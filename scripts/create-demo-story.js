#!/usr/bin/env node

/**
 * Create a comprehensive demo story: "Ruins of the Old City"
 * Demonstrates: health, energy, XP, credits, items, branching, story flags
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('🏗️  Creating Demo Story: "Ruins of the Old City"\n')

  // 1. Create the story
  console.log('📖 Creating story...')
  const { data: story, error: storyError } = await supabase
    .from('stories')
    .insert({
      title: 'Ruins of the Old City',
      description: 'A dangerous expedition into the ruins where fortune and death walk hand in hand. Demonstrates all game mechanics.',
      character_path: 'male',
      location_ids: ['zone_ruins_01'], // Old city ruins location
      min_level: 1,
      max_level: 10,
      is_active: true,
      display_order: 1
    })
    .select()
    .single()

  if (storyError) {
    console.error('❌ Error creating story:', storyError)
    return
  }
  console.log(`✅ Story created: ${story.title}`)

  // 2. Create Chapter 1: The Scavenger's Find
  console.log('\n📚 Creating Chapter 1: The Scavenger\'s Find...')
  const { data: chapter1 } = await supabase
    .from('chapters')
    .insert({
      story_id: story.id,
      chapter_number: 1,
      title: 'The Scavenger\'s Find',
      description: 'You discover promising ruins on the outskirts of the dead city'
    })
    .select()
    .single()

  const chapter1Events = await createChapter1Events(chapter1.id)
  console.log(`✅ Chapter 1 created with ${Object.keys(chapter1Events).length} events`)

  // 3. Create Chapter 2: The Merchant's Deal
  console.log('\n📚 Creating Chapter 2: The Merchant\'s Deal...')
  const { data: chapter2 } = await supabase
    .from('chapters')
    .insert({
      story_id: story.id,
      chapter_number: 2,
      title: 'The Merchant\'s Deal',
      description: 'A traveling merchant offers to trade for your findings'
    })
    .select()
    .single()

  const chapter2Events = await createChapter2Events(chapter2.id)
  console.log(`✅ Chapter 2 created with ${Object.keys(chapter2Events).length} events`)

  // 4. Create Chapter 3: The Raider Ambush
  console.log('\n📚 Creating Chapter 3: The Raider Ambush...')
  const { data: chapter3 } = await supabase
    .from('chapters')
    .insert({
      story_id: story.id,
      chapter_number: 3,
      title: 'The Raider Ambush',
      description: 'Raiders attack - fight or flee?'
    })
    .select()
    .single()

  const chapter3Events = await createChapter3Events(chapter3.id)
  console.log(`✅ Chapter 3 created with ${Object.keys(chapter3Events).length} events`)

  // 5. Create Chapter 4: The Hidden Cache
  console.log('\n📚 Creating Chapter 4: The Hidden Cache...')
  const { data: chapter4 } = await supabase
    .from('chapters')
    .insert({
      story_id: story.id,
      chapter_number: 4,
      title: 'The Hidden Cache',
      description: 'A locked vault holds ancient treasures'
    })
    .select()
    .single()

  const chapter4Events = await createChapter4Events(chapter4.id)
  console.log(`✅ Chapter 4 created with ${Object.keys(chapter4Events).length} events`)

  // 6. Set first event
  console.log('\n🎬 Setting story first event...')
  await supabase
    .from('stories')
    .update({ first_event_id: chapter1Events.intro.id })
    .eq('id', story.id)

  console.log('\n' + '='.repeat(60))
  console.log('✅ DEMO STORY COMPLETE!')
  console.log('='.repeat(60))
  console.log('\nStory Details:')
  console.log(`  Story: ${story.title}`)
  console.log(`  Chapters: 4`)
  console.log(`  Total Events: ${
    Object.keys(chapter1Events).length +
    Object.keys(chapter2Events).length +
    Object.keys(chapter3Events).length +
    Object.keys(chapter4Events).length
  }`)
  console.log('\nDemonstrates:')
  console.log('  • Health damage and healing')
  console.log('  • Energy costs and restoration')
  console.log('  • Experience/XP gains')
  console.log('  • Credits (money) rewards')
  console.log('  • Item acquisition')
  console.log('  • Story flags and branching')
  console.log('  • Risk/reward choices')
  console.log('  • Multiple paths through story')
  console.log('\nTest it in the Story Editor!')
  console.log('='.repeat(60) + '\n')
}

// Chapter 1: Introduction and basic choices
async function createChapter1Events(chapterId) {
  const events = {
    intro: {
      title: 'Crumbling Entrance',
      description: 'You stand before a partially collapsed building. Through the rubble, you spot the glint of metal - possible salvage. The structure looks unstable.',
      event_type: 'choice_event',
      order_index: 1
    },
    careful: {
      title: 'Careful Approach',
      description: 'You carefully move debris aside, testing each step. It takes time and energy, but you find a safe path inside. The interior is dark and musty.',
      event_type: 'text_event',
      order_index: 2
    },
    rushed: {
      title: 'Quick Entry',
      description: 'You scramble through the opening. Loose concrete shifts under your weight - you slip and scrape your arm badly. You\'re in, but bleeding.',
      event_type: 'text_event',
      order_index: 3
    },
    interior: {
      title: 'The Interior',
      description: 'Old office equipment lies scattered everywhere. You spot a locked metal cabinet, a pile of old electronics, and stairs leading down to a basement.',
      event_type: 'choice_event',
      order_index: 4
    },
    cabinet: {
      title: 'Forced Lock',
      description: 'You pry open the cabinet. Inside: medical supplies! Bandages, antiseptic, and some stims. This is a valuable find.',
      event_type: 'text_event',
      order_index: 5
    },
    electronics: {
      title: 'Salvaged Parts',
      description: 'You gather circuit boards and wiring. Not glamorous, but the merchants pay for this stuff. Easy money.',
      event_type: 'text_event',
      order_index: 6
    },
    basement: {
      title: 'Dark Basement',
      description: 'The stairs creak ominously. Halfway down, you hear movement below - something is down there. Do you continue or retreat?',
      event_type: 'choice_event',
      order_index: 7
    },
    retreat: {
      title: 'Strategic Withdrawal',
      description: 'Better safe than sorry. You back away quietly and leave the building with what you\'ve found so far.',
      event_type: 'text_event',
      order_index: 8
    },
    confront: {
      title: 'Basement Encounter',
      description: 'You descend cautiously. A massive rad-rat lunges at you! You fight it off, taking bites and scratches, but discover its nest contains shiny pre-war coins.',
      event_type: 'text_event',
      order_index: 9
    }
  }

  const createdEvents = {}
  for (const [key, eventData] of Object.entries(events)) {
    const { data } = await supabase
      .from('events')
      .insert({ chapter_id: chapterId, ...eventData })
      .select()
      .single()
    createdEvents[key] = data
  }

  // Create choices and consequences
  // Choice 1: Careful vs Rushed
  await createChoice(createdEvents.intro, 'Enter Carefully', {
    response_text: 'You take your time, being methodical and safe.',
    next_event_id: createdEvents.careful.id,
    energy: -10,
    experience: 25,
    story_flag: 'cautious_explorer'
  })

  await createChoice(createdEvents.intro, 'Rush Inside', {
    response_text: 'Speed over safety - you charge in!',
    next_event_id: createdEvents.rushed.id,
    health: -15,
    experience: 10,
    story_flag: 'reckless_explorer'
  })

  // Both paths lead to interior
  await createAutoNext(createdEvents.careful, createdEvents.interior)
  await createAutoNext(createdEvents.rushed, createdEvents.interior)

  // Choice 2: What to investigate
  await createChoice(createdEvents.interior, 'Force Open the Cabinet', {
    response_text: 'You jimmy the lock open with your knife.',
    next_event_id: createdEvents.cabinet.id,
    energy: -5,
    experience: 30
  })

  await createChoice(createdEvents.interior, 'Grab the Electronics', {
    response_text: 'Quick and easy salvage.',
    next_event_id: createdEvents.electronics.id,
    credits: 50,
    experience: 20
  })

  await createChoice(createdEvents.interior, 'Explore the Basement', {
    response_text: 'Risk and reward...',
    next_event_id: createdEvents.basement.id,
    energy: -5,
    experience: 15
  })

  // Cabinet path
  await createAutoNext(createdEvents.cabinet, createdEvents.basement)

  // Electronics path ends chapter
  // (no next_event_id means story ends here)

  // Basement choice
  await createChoice(createdEvents.basement, 'Continue Downstairs', {
    response_text: 'Fortune favors the bold!',
    next_event_id: createdEvents.confront.id,
    health: -25,
    credits: 100,
    experience: 75,
    story_flag: 'faced_rad_rat'
  })

  await createChoice(createdEvents.basement, 'Retreat Quietly', {
    response_text: 'Discretion is the better part of valor.',
    next_event_id: createdEvents.retreat.id,
    experience: 20,
    story_flag: 'avoided_danger'
  })

  return createdEvents
}

// Chapter 2: Trading and resource management
async function createChapter2Events(chapterId) {
  const events = {
    merchant: {
      title: 'The Traveling Merchant',
      description: 'A grizzled merchant with a brahmin-pulled cart hails you. "I buy and sell - whatcha got, friend?" He eyes your salvage with interest.',
      event_type: 'choice_event',
      order_index: 1
    },
    sellAll: {
      title: 'Quick Sale',
      description: 'You sell everything for a fair price. The merchant counts out caps and you part ways. Simple transaction.',
      event_type: 'text_event',
      order_index: 2
    },
    negotiate: {
      title: 'Shrewd Negotiation',
      description: 'You haggle hard, playing up the value of your goods. The merchant grumbles but agrees to a better price. Good deal!',
      event_type: 'text_event',
      order_index: 3
    },
    buyWeapon: {
      title: 'Armed Up',
      description: 'You trade your salvage plus extra caps for a sturdy pipe rifle. "She\'ll serve you well," the merchant says. You feel safer already.',
      event_type: 'text_event',
      order_index: 4
    },
    buyMedicine: {
      title: 'Stocked Up',
      description: 'You purchase stimpacks and rad-away. The merchant throws in some purified water for free. "Stay safe out there."',
      event_type: 'text_event',
      order_index: 5
    }
  }

  const createdEvents = {}
  for (const [key, eventData] of Object.entries(events)) {
    const { data } = await supabase
      .from('events')
      .insert({ chapter_id: chapterId, ...eventData })
      .select()
      .single()
    createdEvents[key] = data
  }

  // Merchant choices
  await createChoice(createdEvents.merchant, 'Sell Everything Quickly', {
    response_text: 'Fast and easy - caps in hand.',
    next_event_id: createdEvents.sellAll.id,
    credits: 150,
    experience: 30,
    story_flag: 'quick_trader'
  })

  await createChoice(createdEvents.merchant, 'Negotiate Hard', {
    response_text: 'You drive a hard bargain.',
    next_event_id: createdEvents.negotiate.id,
    credits: 250,
    energy: -10,
    experience: 50,
    story_flag: 'shrewd_trader'
  })

  await createChoice(createdEvents.merchant, 'Trade for Weapon', {
    response_text: 'Sometimes protection is worth more than caps.',
    next_event_id: createdEvents.buyWeapon.id,
    credits: -100,
    experience: 40,
    story_flag: 'bought_weapon'
  })

  await createChoice(createdEvents.merchant, 'Buy Medical Supplies', {
    response_text: 'Better to have and not need...',
    next_event_id: createdEvents.buyMedicine.id,
    credits: -80,
    health: 30,
    experience: 35,
    story_flag: 'bought_medicine'
  })

  return createdEvents
}

// Chapter 3: Combat and high-risk choices
async function createChapter3Events(chapterId) {
  const events = {
    ambush: {
      title: 'Raider Ambush!',
      description: 'Three raiders emerge from cover, weapons drawn. "Drop your gear and walk away!" their leader shouts. You\'re outnumbered but they look poorly armed.',
      event_type: 'choice_event',
      order_index: 1
    },
    fight: {
      title: 'Desperate Combat',
      description: 'You open fire! The fight is brutal and chaotic. You take several hits but manage to drive them off. Their dropped weapons and ammo are yours.',
      event_type: 'text_event',
      order_index: 2
    },
    flee: {
      title: 'Tactical Retreat',
      description: 'You run, bullets whizzing past. You escape but drop some gear in the process. You\'re alive, but poorer.',
      event_type: 'text_event',
      order_index: 3
    },
    surrender: {
      title: 'Empty Pockets',
      description: 'You drop your pack. The raiders take everything valuable and leave you alive. Humiliating, but you survived.',
      event_type: 'text_event',
      order_index: 4
    },
    bluff: {
      title: 'Called Their Bluff',
      description: 'You stare them down, hand on your weapon. "Try it." They exchange glances and back off. Reputation earned.',
      event_type: 'text_event',
      order_index: 5
    }
  }

  const createdEvents = {}
  for (const [key, eventData] of Object.entries(events)) {
    const { data } = await supabase
      .from('events')
      .insert({ chapter_id: chapterId, ...eventData })
      .select()
      .single()
    createdEvents[key] = data
  }

  // Ambush choices
  await createChoice(createdEvents.ambush, 'Fight Back!', {
    response_text: 'You refuse to be a victim!',
    next_event_id: createdEvents.fight.id,
    health: -40,
    credits: 200,
    experience: 100,
    story_flag: 'fought_raiders'
  })

  await createChoice(createdEvents.ambush, 'Run Away', {
    response_text: 'Live to fight another day.',
    next_event_id: createdEvents.flee.id,
    energy: -20,
    credits: -50,
    experience: 40,
    story_flag: 'fled_raiders'
  })

  await createChoice(createdEvents.ambush, 'Surrender Gear', {
    response_text: 'It\'s just stuff. Your life matters more.',
    next_event_id: createdEvents.surrender.id,
    credits: -150,
    experience: 20,
    story_flag: 'surrendered_to_raiders'
  })

  await createChoice(createdEvents.ambush, 'Call Their Bluff', {
    response_text: 'They\'re more scared of you...',
    next_event_id: createdEvents.bluff.id,
    experience: 80,
    story_flag: 'intimidated_raiders'
  })

  return createdEvents
}

// Chapter 4: Puzzle and high-reward finale
async function createChapter4Events(chapterId) {
  const events = {
    vault: {
      title: 'The Old Vault',
      description: 'You discover a pre-war security vault, door still sealed. A keypad shows 4 digits required. Nearby graffiti reads: "The year it all ended."',
      event_type: 'choice_event',
      order_index: 1
    },
    correctCode: {
      title: 'Access Granted',
      description: 'The vault hisses open! Inside: weapons, medicine, pre-war currency, and tech. This is the score of a lifetime!',
      event_type: 'text_event',
      order_index: 2
    },
    wrongCode: {
      title: 'Lockout',
      description: 'ERROR - SECURITY LOCKOUT. An alarm blares! You flee before it attracts attention, finding only scraps left behind by previous scavengers.',
      event_type: 'text_event',
      order_index: 3
    },
    bypass: {
      title: 'Technical Override',
      description: 'Using salvaged electronics and some wire, you jury-rig a bypass. Sparks fly and you get shocked, but the door opens. Vault contents are yours!',
      event_type: 'text_event',
      order_index: 4
    },
    explosives: {
      title: 'Explosive Entry',
      description: 'BOOM! The door blasts open but the explosion damages much of the vault\'s contents. You salvage what survived - less than hoped, but still valuable.',
      event_type: 'text_event',
      order_index: 5
    }
  }

  const createdEvents = {}
  for (const [key, eventData] of Object.entries(events)) {
    const { data } = await supabase
      .from('events')
      .insert({ chapter_id: chapterId, ...eventData })
      .select()
      .single()
    createdEvents[key] = data
  }

  // Vault choices
  await createChoice(createdEvents.vault, 'Enter Code: 2089', {
    response_text: 'The year the bombs fell...',
    next_event_id: createdEvents.correctCode.id,
    credits: 500,
    experience: 200,
    health: 20,
    energy: 20,
    story_flag: 'solved_vault_puzzle'
  })

  await createChoice(createdEvents.vault, 'Enter Code: 2077', {
    response_text: 'Maybe when the war started?',
    next_event_id: createdEvents.wrongCode.id,
    credits: 30,
    experience: 20,
    story_flag: 'failed_vault_puzzle'
  })

  await createChoice(createdEvents.vault, 'Bypass Electronics', {
    response_text: 'Tech over brains.',
    next_event_id: createdEvents.bypass.id,
    health: -20,
    credits: 450,
    experience: 150,
    story_flag: 'bypassed_vault'
  })

  await createChoice(createdEvents.vault, 'Use Explosives', {
    response_text: 'When in doubt, blow it up!',
    next_event_id: createdEvents.explosives.id,
    credits: 250,
    experience: 100,
    story_flag: 'exploded_vault'
  })

  return createdEvents
}

// Helper functions
async function createChoice(event, text, consequenceData) {
  const { data: choice } = await supabase
    .from('choices')
    .insert({
      event_id: event.id,
      text: text,
      choice_key: text.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50),
      order_index: 1
    })
    .select()
    .single()

  await supabase
    .from('consequences')
    .insert({
      choice_id: choice.id,
      consequence_data: consequenceData
    })
}

async function createAutoNext(fromEvent, toEvent) {
  // Create a dummy choice for linear progression
  const { data: choice } = await supabase
    .from('choices')
    .insert({
      event_id: fromEvent.id,
      text: 'Continue',
      choice_key: 'continue',
      order_index: 1
    })
    .select()
    .single()

  await supabase
    .from('consequences')
    .insert({
      choice_id: choice.id,
      consequence_data: {
        response_text: '',
        next_event_id: toEvent.id
      }
    })
}

main()
