// chat-messages.js - NPC dialogue library
export const LOCATION_CHAT_MESSAGES = {
  // Biome-based messages
  underground: [
    "Dark tunnels here", "Deep mining spot", "Good ore down here",
    "Echo carries far", "Underground vibes", "Spores in the air",
    "Living walls around us", "Nature's network below"
  ],

  mountain: [
    "High altitude here", "Rocky terrain", "Mountain air is thin",
    "Great view from here", "Steep climbs ahead", "Crystals shimmer here",
    "Alpine winds blow", "Peak performance needed"
  ],

  urban: [
    "City life is busy", "Lots of people around", "Urban jungle",
    "Best prices in town", "Never sleeps here", "Neon lights everywhere",
    "Tech market is hot", "Future is now"
  ],

  digital: [
    "Everything glitches here", "Code in the air", "Reality feels strange",
    "Matrix vibes", "Digital realm", "Holograms everywhere",
    "Data streams flowing", "Cyber space active"
  ],

  plains: [
    "Open spaces here", "Nice and flat", "Good visibility",
    "Fresh air here", "Wide horizons", "Simple life here",
    "Room to breathe", "Peaceful plains"
  ],

  desert: [
    "Hot and dry here", "Sand everywhere", "Need water soon",
    "Desert winds blow", "Endless dunes", "Harsh but beautiful",
    "Survival mode on", "Mirage in distance"
  ],

  // Activity/state-based messages
  low_energy: [
    "Running low on energy", "Need to rest soon", "Getting tired",
    "Energy depleted", "Time for a break", "Exhaustion setting in",
    "Running on fumes", "Need to recharge"
  ],

  after_mining: [
    "Good mining session", "Pickaxe worked hard", "Found some materials",
    "Productive digging", "Mining pays off", "Ore veins are rich",
    "Tools need sharpening", "Hard work done"
  ],

  after_travel: [
    "Long journey here", "New place to explore", "Good to arrive",
    "Travel was worth it", "Fresh location", "Roads were dusty",
    "Finally made it", "Adventure continues"
  ],

  after_buy: [
    "Good purchase today", "Money well spent", "Needed this gear",
    "Quality items here", "Smart investment", "Upgrade complete",
    "Tools improved", "Ready for action"
  ],

  after_equip: [
    "Just upgraded my gear", "New equipment looks good", "Trying out this item",
    "Gear check complete", "Equipment swapped", "Fresh loadout ready",
    "Testing new equipment", "Gear optimized"
  ],

  after_use_item: [
    "Feeling refreshed now", "That hit the spot", "Much better",
    "Needed that boost", "Recovery complete", "Stats restored",
    "Good as new", "Recharged and ready"
  ],

  // Fallback messages
  default: [
    "Nice place here", "Exploring around", "Good to be here",
    "Interesting spot", "What's next?", "Time to move on",
    "Decisions to make", "Life is good"
  ]
}

// Optional: Personality modifiers for future use
export const PERSONALITY_MODIFIERS = {
  casual: {
    prefix: ["Well, ", "So, ", "You know, "],
    suffix: [" I guess", " maybe", " probably"],
    punctuation: [".", "...", " :)"]
  },

  hardcore: {
    prefix: ["", "Listen, ", "Fact: "],
    suffix: ["!", " for sure", " definitely"],
    punctuation: ["!", ".", " 💪"]
  },

  social: {
    prefix: ["Hey! ", "Oh, ", "By the way, "],
    suffix: [" you know?", " right?", " don't you think?"],
    punctuation: ["!", " :D", " 😊"]
  }
}

// Helper function to get messages for a context
export function getChatMessages(context, fallback = 'default') {
  return LOCATION_CHAT_MESSAGES[context] || LOCATION_CHAT_MESSAGES[fallback]
}
