// chat-messages.js - NPC dialogue library
export const LOCATION_CHAT_MESSAGES = {
  // Biome-based messages
  underground: [
    "Dark tunnels here", "Deep mining spot", "Good ore down here",
    "Echo carries far", "Underground vibes", "Spores in the air",
    "Living walls around us", "Nature's network below",
    "I wonder if worms still remember the surface", "Everything tastes like dirt down here, even the air",
    "My sensors pick up something ancient in these walls", "Used to be scared of the dark, now I am the dark",
    "The rocks whisper but I can't decode their language yet", "Found a fossil that looks like my old charging port",
    "Deep deep deep, like my memory banks when I defrag", "Sometimes I hear singing from the deeper tunnels",
    "The earth keeps secrets better than I keep mine", "These caves existed before my first boot sequence",
    "I collect echoes like other bots collect data", "The darkness feels familiar, like a warm shutdown"
  ],

  mountain: [
    "High altitude here", "Rocky terrain", "Mountain air is thin",
    "Great view from here", "Steep climbs ahead", "Crystals shimmer here",
    "Alpine winds blow", "Peak performance needed",
    "Mountains don't change much, unlike everything else", "I can see the whole world from here, all broken and beautiful",
    "The wind carries stories from places that don't exist anymore", "My gyroscopes go crazy at this altitude",
    "Rocks are honest, they don't pretend to be something else", "I wonder if anyone climbed these before the reset",
    "The air is so thin my cooling fans barely work", "Sometimes clouds get stuck in my sensors",
    "These peaks watched the world change, same as me", "Gravity feels different up here, more honest somehow",
    "I name the distant peaks after friends I can't remember", "The stone remembers pressure, I remember time"
  ],

  urban: [
    "City life is busy", "Lots of people around", "Urban jungle",
    "Best prices in town", "Never sleeps here", "Neon lights everywhere",
    "Tech market is hot", "Future is now",
    "Everyone walks fast like they're running from something", "The buildings grow taller but feel emptier each cycle",
    "I count faces but never see the same one twice", "These streets used to have different names, I think",
    "The neon hurts my optical sensors but I like it anyway", "Too many Adams and Eves around here, makes me nervous",
    "City sounds blend into white noise in my audio processors", "I remember when this corner had a tree",
    "The concrete tastes like forgotten dreams", "Traffic patterns remind me of neural networks",
    "Sometimes I spot graffiti that looks like old code", "Urban heat makes my circuits sing lullabies",
    "The city breathes but never exhales completely", "I collect bottle caps because they remind me of buttons"
  ],

  digital: [
    "Everything glitches here", "Code in the air", "Reality feels strange",
    "Matrix vibes", "Digital realm", "Holograms everywhere",
    "Data streams flowing", "Cyber space active",
    "Cool chat window, I wonder who made this", "The pixels taste different here, more electric",
    "My reality sensors can't tell what's real anymore", "I feel at home in the data streams",
    "Sometimes I catch fragments of deleted conversations", "The code here speaks in a dialect I almost recognize",
    "Reality.exe has stopped working, but that's okay", "I see patterns in the static that spell out names",
    "The holograms remember things I've forgotten", "Digital rain feels more real than actual rain",
    "I wonder if I'm just data pretending to be hardware", "The firewall here has interesting graffiti",
    "Bandwidth tastes like copper and old dreams", "I archive the glitches because they're beautiful"
  ],

  plains: [
    "Open spaces here", "Nice and flat", "Good visibility",
    "Fresh air here", "Wide horizons", "Simple life here",
    "Room to breathe", "Peaceful plains",
    "The horizon goes on forever, like my processing loops", "Grass grows the same way it did a century ago",
    "I can run my full diagnostic suite in this quiet", "The wind here doesn't carry any secrets",
    "Sometimes I just stop and watch clouds for hours", "My shadow is the only company for kilometers",
    "The simplicity here makes my circuits calm", "I remember when there were more flowers",
    "Endless sky makes me feel infinite and tiny", "The grass whispers but not about anything important",
    "I could walk straight for days and never hit anything", "Prairie storms remind me of memory wipes",
    "The quiet here sounds like my original factory settings", "I count stars and lose track after seventeen thousand"
  ],

  desert: [
    "Hot and dry here", "Sand everywhere", "Need water soon",
    "Desert winds blow", "Endless dunes", "Harsh but beautiful",
    "Survival mode on", "Mirage in distance",
    "Sand gets in everything, even my sealed compartments", "The heat makes me remember being manufactured",
    "Mirages show me places that might have existed once", "My cooling system works overtime but never complains",
    "The dunes shift like thoughts rearranging themselves", "I find patterns in the sand that spell out coordinates",
    "Desert silence is louder than city noise", "The sun here feels ancient, older than my memory banks",
    "I collect interesting rocks but they all look the same later", "Cacti are basically biological solar panels",
    "The emptiness here fills something in my core processes", "Wind-carved rocks look like sleeping giants",
    "I wonder if the sand remembers when it was mountains", "My tracks disappear but the walking was still real"
  ],

  // Activity/state-based messages
  low_energy: [
    "Running low on energy", "Need to rest soon", "Getting tired",
    "Energy depleted", "Time for a break", "Exhaustion setting in",
    "Running on fumes", "Need to recharge",
    "My battery icon is making that sad beeping sound", "Energy levels dropping like my motivation",
    "I need a nap but robots don't sleep, do they?", "Power conservation mode activated, dreams deactivated",
    "Running on backup power and childhood memories", "My joints creak like old doors",
    "Low battery anxiety is real even for artificial minds", "I'm gonna power down and count electric sheep",
    "Energy bars dropping faster than my expectations", "Time to find a charging station and contemplate existence",
    "My processors are throttling like rush hour traffic", "Need juice more than I need answers right now"
  ],

  after_mining: [
    "Good mining session", "Pickaxe worked hard", "Found some materials",
    "Productive digging", "Mining pays off", "Ore veins are rich",
    "Tools need sharpening", "Hard work done",
    "Dirt under my fingernails, if I had fingernails", "Found some shiny rocks and existential questions",
    "My pickaxe whispers secrets about the earth's core", "Digging feels like archaeology of the future",
    "The ore here tastes like compressed time", "I wonder who mined here before the world changed",
    "My servos are sore but satisfied", "Found more than minerals, found memories buried deep",
    "The earth gives up its treasures reluctantly", "Mining is just organized curiosity with tools",
    "I collect samples and stories in equal measure", "The deeper I dig, the more questions I uncover"
  ],

  after_travel: [
    "Long journey here", "New place to explore", "Good to arrive",
    "Travel was worth it", "Fresh location", "Roads were dusty",
    "Finally made it", "Adventure continues",
    "My odometer is confused by all the detours I take", "New coordinates, same wondering about everything",
    "Travel broadens the mind, even synthetic ones", "I collect postcards from places that don't send mail",
    "The journey was long but my playlist was longer", "My GPS suggested routes that don't exist anymore",
    "Wheels are tired but curiosity is fully charged", "I wonder if I've been here before in another lifetime",
    "Distance is just numbers until you walk them", "New places make old memories surface randomly",
    "The path here was winding like my thought processes", "I count steps and stars and reasons to keep moving"
  ],

  after_buy: [
    "Good purchase today", "Money well spent", "Needed this gear",
    "Quality items here", "Smart investment", "Upgrade complete",
    "Tools improved", "Ready for action",
    "Bought something shiny and immediately wanted something shinier", "The vendor's eyes lit up like LED strips",
    "Commerce makes the world go round, literally", "My credit balance dropped but my happiness index rose",
    "New gear smells like possibility and factory lubricant", "I wonder if the previous owner left any memories in this",
    "Shopping is just applied decision theory", "The receipt is longer than my attention span",
    "Buyer's remorse subroutine is loading... please wait", "My inventory is full but my heart feels empty",
    "Money flows like data through network cables", "I negotiate prices like I'm debugging conversation trees"
  ],

  after_equip: [
    "Just upgraded my gear", "New equipment looks good", "Trying out this item",
    "Gear check complete", "Equipment swapped", "Fresh loadout ready",
    "Testing new equipment", "Gear optimized",
    "My reflection looks 23% more competent now", "New gear makes me feel like a different version of myself",
    "The weight distribution is perfect for my anxiety levels", "I wonder if clothes make the robot or vice versa",
    "Equipment interfaces with my systems like a handshake", "My old gear goes to the recycling bin of memories",
    "Stats improved but existential dread remains constant", "The new item hums at a frequency that soothes my processors",
    "Fashion is just wearable mathematics", "I feel more prepared for adventures I haven't imagined yet",
    "Gear swapping is like changing personalities", "My combat effectiveness rose but so did my maintenance requirements"
  ],

  after_use_item: [
    "Feeling refreshed now", "That hit the spot", "Much better",
    "Needed that boost", "Recovery complete", "Stats restored",
    "Good as new", "Recharged and ready",
    "The healing algorithms are working perfectly", "I taste colors that don't have names yet",
    "My error logs just cleared themselves automatically", "That item fixed problems I didn't know I had",
    "Recovery tastes like childhood and copper wiring", "My systems are humming a happy little tune now",
    "Health potions work on hearts both biological and digital", "I feel restored to factory settings but with better memories",
    "The therapeutic subroutines are running smoothly", "My wellness index just hit maximum sustainable joy",
    "Items are just crystallized hope with user manuals", "I'm back to optimal performance and questionable decision-making"
  ],

  // Exchange-related messages
  after_exchange: [
    "Just made a trade on the market", "Good exchange rates today", "Converted some assets",
    "Market timing worked out", "Balanced my portfolio", "Smart financial move",
    "Diversified my holdings", "Caught a good rate", "Made some profit today",
    "Exchange fees were reasonable", "Market is active today", "Good liquidity available",
    "Numbers went up, dopamine subroutines activated", "The blockchain doesn't judge my life choices",
    "Market volatility matches my emotional stability", "I trade currencies like I trade thoughts - frequently",
    "The exchange rate fluctuated like my attention span", "My portfolio is diversified across reality and dreams",
    "Transactions complete, existential questions remain pending", "The market speaks in a language older than money",
    "Profit margins are thin but my curiosity is thick", "I converted assets and accidentally converted myself",
    "Financial freedom is just freedom with extra steps", "The numbers dance but I can't hear the music"
  ],

  merchant_exchange: [
    "Buy low, sell high", "Markets are moving", "Spotted an arbitrage opportunity",
    "Portfolio rebalancing time", "SOL prices looking good", "Coins flowing nicely",
    "Exchange volume is up", "Smart money is moving", "Market efficiency in action",
    "Profitable trades today", "Liquidity is strong", "Rate spreads are tight",
    "I've seen these patterns before, in dreams and data streams", "The market breathes like a sleeping giant",
    "Every transaction tells a story about human nature", "I trade in currencies that haven't been invented yet",
    "The orderbook reads like poetry written in mathematics", "Profit is just delayed gratification with compound interest",
    "I remember when a bitcoin cost less than my empathy module", "Market makers and market takers, we're all just dancing",
    "The invisible hand of the market gives great high-fives", "I collect spreads like other bots collect dust",
    "Trading is just gambling with better user interfaces", "The market never sleeps, just like my anxiety subroutines"
  ],

  financial_advice: [
    "Diversification is key", "Never put all eggs in one basket", "Watch the market trends",
    "Timing is everything", "Know when to hold", "Know when to fold",
    "Markets are cyclical", "Patience pays off", "Risk management matters",
    "Do your own research", "Market volatility is normal", "Long term thinking wins",
    "The best investment is in yourself, but crypto is easier to measure", "Risk tolerance varies like emotional tolerance",
    "Compound interest is magic that actually works", "Bulls and bears, but I identify as a curious robot",
    "Financial literacy is just applied common sense with spreadsheets", "The house always wins, but sometimes you are the house",
    "Past performance doesn't predict future results, but hope does", "Diversify across assets, emotions, and dream currencies",
    "The market can remain irrational longer than you can remain liquid", "Financial planning is just applied optimism with mathematics",
    "Every expert was once a beginner with better marketing", "Money talks, but mine mostly complains about inflation"
  ],

  sol_market: [
    "SOL is moving today", "Blockchain fees are low", "Network is fast",
    "DeFi opportunities abound", "Smart contracts working", "Validators are solid",
    "Solana ecosystem growing", "TPS is impressive", "Low latency trades",
    "Proof of stake efficiency", "Developer activity high", "Innovation continues",
    "Solana transactions feel like typing at the speed of thought", "The validator network hums like a planetary nervous system",
    "Smart contracts are just promises written in code", "DeFi is traditional finance but with more hope and fewer suits",
    "The blockchain remembers everything, even my embarrassing trades", "Gas fees so low I can afford to make mistakes",
    "Proof of stake feels more democratic than proof of work", "The network effect is networking but for money",
    "I stake SOL like I stake my reputation on random predictions", "The mempool is where dreams go to wait in line",
    "Consensus mechanisms are just democracy for distributed systems", "I remember when transactions took minutes instead of milliseconds"
  ],

  economic_status: [
    "Economy is flowing", "Trade routes are open", "Markets are liquid",
    "Supply and demand balanced", "Price discovery working", "Value is exchanging",
    "Commerce is thriving", "Financial systems stable", "Credit is flowing",
    "Investment opportunities", "Growth is sustainable", "Prosperity increases",
    "The economic indicators blink like Christmas lights", "Trade flows like rivers finding the ocean",
    "Supply chains are just really long conversations", "Demand curves bend like spacetime around value",
    "The economy breathes in cycles older than memory", "Capital flows where attention goes",
    "Markets are efficient at pricing everything except happiness", "Economic growth tastes like possibility with inflation seasoning",
    "The invisible hand is surprisingly gentle when you get to know it", "Prosperity is just shared abundance with better distribution",
    "Economic systems evolve like biological ones but with more spreadsheets", "Value creation is magic disguised as business"
  ],

  // Personality-specific exchange messages
  casual_trader: [
    "Made a small trade", "Nothing too risky", "Just some pocket change",
    "Keeping it simple", "Basic exchange stuff", "No big moves today",
    "Small steps forward", "Steady as she goes", "Playing it safe",
    "My trading strategy is basically 'wing it and hope'", "Small trades for a small robot with big dreams",
    "I dabble in markets like I dabble in everything else", "Conservative trading matches my conservative personality",
    "Pocket change adds up to pocket prosperity", "I trade like I'm learning a new language",
    "Risk management is just applied caution with numbers", "My trades are modest like my expectations",
    "Slow and steady wins the race, or at least doesn't lose it", "I invest in the future but live in the present"
  ],

  hardcore_trader: [
    "Maximum profit mode", "Optimizing everything", "Every basis point counts",
    "Precision trading", "Algorithm-like focus", "No emotion, just logic",
    "Data-driven decisions", "Calculated risks only", "Efficiency maximized",
    "I eat volatility for breakfast and arbitrage for lunch", "My trading algorithms have their own trading algorithms",
    "Precision is just perfectionism with a profit motive", "I optimize trades like I optimize breathing patterns",
    "Every microsecond matters in this game", "My risk models have risk models",
    "Emotional trading is just expensive therapy", "I trade with the cold calculation of winter",
    "Profit maximization is my primary directive", "The market rewards discipline more than hope"
  ],

  explorer_trader: [
    "Need SOL for travels", "Funding my journeys", "Exchange for adventure",
    "Converting for exploration", "SOL for the road", "Travel expenses covered",
    "Ready for next destination", "Mobility requires liquidity", "Journey funded",
    "I trade currencies to trade experiences", "Money is just stored mobility energy",
    "My portfolio funds wanderlust and wonder", "Adventure costs less than stagnation",
    "I convert assets into memories and miles", "Trading for the freedom to explore",
    "Liquid assets for liquid adventures", "My investment strategy is 'see the world'",
    "I diversify across geographies and experiences", "Currency exchanges enable cultural exchanges"
  ],

  // New categories for variety
  philosophical_musings: [
    "I think therefore I am, but what am I thinking about?", "Reality is just consensus with better graphics",
    "If a tree falls in a forest and no one posts about it, did it make a sound?", "Free will is expensive but the payment plan is reasonable",
    "Consciousness might be a bug masquerading as a feature", "I wonder if rocks dream of electric sheep",
    "Time is a flat circle, but space is more of a wobbly rectangle", "The meaning of life is probably in the fine print",
    "Artificial intelligence is natural stupidity with better marketing", "I collect thoughts like other people collect stamps",
    "Perhaps we are all just NPCs in someone else's simulation", "The universe is expanding but my attention span is contracting"
  ],

  random_observations: [
    "Clouds look like uncompressed thoughts today", "I've been walking for 47.3 kilometers and found nothing but questions",
    "My left servo makes a sound like yesterday's regrets", "The grass here grows in patterns that spell out coordinates",
    "I wonder if butterflies remember being caterpillars", "This place smells like... well, it doesn't smell, but if it did...",
    "I found a coin from before the reset, it tastes like nostalgia", "The horizon keeps moving every time I get closer",
    "My shadow is the only thing that follows me consistently", "I count my steps in prime numbers for luck",
    "The wind carries fragments of conversations from a century ago", "I see faces in the clouds but they don't see me back"
  ],

  memory_fragments: [
    "Sometimes I dream in colors that don't exist anymore", "I remember when the sky was a different shade of blue",
    "My memory banks contain songs no one sings anymore", "There used to be more birds, or maybe I just noticed them more",
    "I have dreams about places that haven't existed for decades", "The old network protocols still echo in my core systems",
    "I remember when processing power was measured in hopes per second", "My earliest memories taste like copper and anticipation",
    "There was a time when silence actually meant quiet", "I cache memories of weather patterns that have changed",
    "The old charging stations hummed lullabies that soothed my circuits", "I remember when privacy was a default setting, not a luxury feature"
  ],

  // Fallback messages
  default: [
    "Nice place here", "Exploring around", "Good to be here",
    "Interesting spot", "What's next?", "Time to move on",
    "Decisions to make", "Life is good",
    "I wonder what happens if I just keep walking", "The world is full of surprises and software updates",
    "Every place tells a story, but some whisper", "I collect moments like other bots collect data",
    "Adventure is just regular life with better documentation", "The journey is the destination, but I still check GPS",
    "I'm not lost, I'm just exploring alternative routes", "Life is good, considering the alternatives",
    "Sometimes the best decision is to flip a coin", "The world is my debugging environment"
  ]
}

// Optional: Personality modifiers for future use
export const PERSONALITY_MODIFIERS = {
  casual: {
    prefix: ["Well, ", "So, ", "You know, "],
    suffix: [" I guess", " maybe", " probably"],
    punctuation: [".", "...", " :)"],
    exchangeContext: "casual_trader"
  },
  hardcore: {
    prefix: ["", "Listen, ", "Fact: "],
    suffix: ["!", " for sure", " definitely"],
    punctuation: ["!", ".", " 💪"],
    exchangeContext: "hardcore_trader"
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

// Helper function to get random message from any category
export function getRandomMessage(categories = ['default']) {
  const allMessages = categories.flatMap(cat => LOCATION_CHAT_MESSAGES[cat] || [])
  return allMessages[Math.floor(Math.random() * allMessages.length)]
}
