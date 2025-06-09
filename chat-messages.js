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


  // New exchange-related messages
  after_exchange: [
    "Just made a trade on the market", "Good exchange rates today", "Converted some assets",
    "Market timing worked out", "Balanced my portfolio", "Smart financial move",
    "Diversified my holdings", "Caught a good rate", "Made some profit today",
    "Exchange fees were reasonable", "Market is active today", "Good liquidity available"
  ],

  merchant_exchange: [
    "Buy low, sell high", "Markets are moving", "Spotted an arbitrage opportunity",
    "Portfolio rebalancing time", "SOL prices looking good", "Coins flowing nicely",
    "Exchange volume is up", "Smart money is moving", "Market efficiency in action",
    "Profitable trades today", "Liquidity is strong", "Rate spreads are tight"
  ],

  financial_advice: [
    "Diversification is key", "Never put all eggs in one basket", "Watch the market trends",
    "Timing is everything", "Know when to hold", "Know when to fold",
    "Markets are cyclical", "Patience pays off", "Risk management matters",
    "Do your own research", "Market volatility is normal", "Long term thinking wins"
  ],

  sol_market: [
    "SOL is moving today", "Blockchain fees are low", "Network is fast",
    "DeFi opportunities abound", "Smart contracts working", "Validators are solid",
    "Solana ecosystem growing", "TPS is impressive", "Low latency trades",
    "Proof of stake efficiency", "Developer activity high", "Innovation continues"
  ],

  economic_status: [
    "Economy is flowing", "Trade routes are open", "Markets are liquid",
    "Supply and demand balanced", "Price discovery working", "Value is exchanging",
    "Commerce is thriving", "Financial systems stable", "Credit is flowing",
    "Investment opportunities", "Growth is sustainable", "Prosperity increases"
  ],

  // Personality-specific exchange messages
  casual_trader: [
    "Made a small trade", "Nothing too risky", "Just some pocket change",
    "Keeping it simple", "Basic exchange stuff", "No big moves today",
    "Small steps forward", "Steady as she goes", "Playing it safe"
  ],

  hardcore_trader: [
    "Maximum profit mode", "Optimizing everything", "Every basis point counts",
    "Precision trading", "Algorithm-like focus", "No emotion, just logic",
    "Data-driven decisions", "Calculated risks only", "Efficiency maximized"
  ],

  explorer_trader: [
    "Need SOL for travels", "Funding my journeys", "Exchange for adventure",
    "Converting for exploration", "SOL for the road", "Travel expenses covered",
    "Ready for next destination", "Mobility requires liquidity", "Journey funded"
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
    punctuation: [".", "...", " :)"],
    exchangeContext: "casual_trader",
    exchangeContext: "hardcore_trader"
  },
  hardcore: {
    prefix: ["", "Listen, ", "Fact: "],
    suffix: ["!", " for sure", " definitely"],
    punctuation: ["!", ".", " 💪"],
    exchangeContext: "financial_advice"

  },
  merchant: {
    prefix: ["Listen, ", "Trust me, ", "From experience, "],
    suffix: [" for profit", " in business", " market-wise"],
    punctuation: ["!", ".", " 💰"],
    exchangeContext: "merchant_exchange"
  },
  social: {
    prefix: ["Hey! ", "Oh, ", "By the way, "],
    suffix: [" you know?", " right?", " don't you think?"],
    punctuation: ["!", " :D", " 😊"],
    exchangeContext: "merchant_exchange"
  },
  explorer: {
    prefix: ["On my travels, ", "I've seen that ", "Journey taught me "],
    suffix: [" on the road", " while exploring", " during adventures"],
    punctuation: ["!", ".", " 🗺️"],
    exchangeContext: "explorer_trader"
  }
}

// Enhanced chat message function with exchange context
export function getChatMessages(context, fallback = 'default', exchangeData = null) {
  // If this is after an exchange, use exchange-specific messages
  if (exchangeData) {
    return getExchangeMessages(context, exchangeData.personality, exchangeData.exchangeType)
  }

  // Otherwise use existing logic
  return LOCATION_CHAT_MESSAGES[context] || LOCATION_CHAT_MESSAGES[fallback]
}

// Helper function to get exchange-specific messages
export function getExchangeMessages(context, personality, exchangeType) {
  let messagePool = LOCATION_CHAT_MESSAGES.after_exchange

  // Determine message pool based on context
  if (personality === 'merchant') {
    messagePool = LOCATION_CHAT_MESSAGES.merchant_exchange
  } else if (exchangeType === 'necessity') {
    messagePool = LOCATION_CHAT_MESSAGES.economic_status
  } else if (exchangeType === 'opportunity') {
    const personalityModifier = PERSONALITY_MODIFIERS[personality]
    if (personalityModifier?.exchangeContext) {
      messagePool = LOCATION_CHAT_MESSAGES[personalityModifier.exchangeContext] || messagePool
    }
  }

  return messagePool
}



