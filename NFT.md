# 🎨 Wojak Earth - Dynamic Character NFT System

_Living NFTs That Evolve With Your Journey_

**📖 Documentation Navigation**

- [📋 Master Index](./INDEX.md) | [🌍 Overview](./LITEPAPER.md) | [🎯 Pitch](./PITCHDECK.md) | [💰 Economics](./WHITEPAPER.md) | [🎨 NFTs](./NFT.md) | [🛠 Status](./TODO.md)

**🎮 Experience**: [Play Now →](https://earth.ndao.computer) | [Community →](https://x.com/nothingdao)

---

## The Innovation

**Your character NFT isn't just a static image - it's a living visual representation of your entire gaming journey.**

Every action you take, every item you equip, every location you visit, and every achievement you unlock dynamically updates your NFT's appearance in real-time. Your character becomes a visual autobiography of your adventures in Wojak Earth.

> **🔗 Context**: This NFT system supports the [staged activation model](./WHITEPAPER.md#staged-activation-model) outlined in our economics - fully built infrastructure that activates when communities demonstrate engagement.

---

## How It Works

### **Dynamic Layer Composition**

Your character NFT is built from multiple visual layers that change based on your game state:

**Base Layers:**

- Character type (Human, Creature, etc.)
- Gender and core appearance
- Current location background

**Equipment Layers:**

- Head slot (hats, helmets, headwear)
- Body slot (clothing, armor, jackets)
- Accessory slot (jewelry, charms, tools)
- Tool slot (weapons, mining equipment)

**Status Layers:**

- Health/energy visual effects (glows, auras)
- Achievement badges and rank indicators
- Environmental effects (weather, biome-specific)
- Temporary status effects (potions, buffs)

### **Real-Time Rendering Pipeline**

```
Game Action → Layer Update → NFT Recomposition → Metadata Refresh → Visual Update
```

1. **Player Action** - Equip item, visit location, achieve milestone
2. **Layer Resolution** - System determines which visual layers to show/hide
3. **Dynamic Rendering** - Layers composited into final character image
4. **Metadata Update** - NFT traits and attributes automatically updated
5. **Live Refresh** - Character image updates across all platforms instantly

---

## Visual Evolution Examples

### **Equipment Changes**

```
Base Wojak → Equips Miner's Hat → NFT shows character wearing hat
             Adds Cyber Jacket → NFT updates with jacket layer
             Finds Lucky Charm → Charm appears as accessory
```

### **Location-Based Backgrounds**

```
Mining Plains → Desert sand and heat shimmer background
Cyber City → Neon lights and urban skyline
Crystal Caves → Glowing crystal formations
Glitch Wastes → Corrupted digital artifacts
```

> **🎮 Try It**: [Experience the dynamic world](https://earth.ndao.computer) and see how locations change your character's appearance in real-time.

### **Achievement Overlays**

```
First Epic Item Found → Golden aura effect
Mining Milestone → Specialized tool glow
Community Leader → Leadership badge
Legendary Discovery → Unique particle effects
```

### **Status Effects**

```
Low Health → Red warning glow
High Energy → Vibrant energy aura
Potion Active → Swirling magical effects
Weather Events → Environmental overlays
```

---

## Technical Architecture

### **Layer Management System**

- **Layer Types:** Background, Base, Clothing, Accessories, Overlays, Effects
- **Z-Index Ordering:** Automatic depth management for proper visual stacking
- **Conflict Resolution:** Smart handling of incompatible items (can't wear two hats)
- **Performance Optimization:** Efficient layer caching and delta updates

### **Rendering Engine**

- **Canvas Compositing:** HTML5 Canvas for real-time layer combination
- **Asset Pipeline:** Optimized PNG layers with transparency support
- **Quality Scaling:** Multiple resolution outputs (thumbnail, standard, high-res)
- **Format Support:** PNG for viewing, SVG for scalability, WebP for optimization

### **Metadata Integration**

```json
{
  "name": "Wojak #1337",
  "description": "A legendary miner currently exploring Crystal Caves...",
  "image": "https://wojak-earth.com/nft/1337.png",
  "attributes": [
    { "trait_type": "Location", "value": "Crystal Caves" },
    { "trait_type": "Hat", "value": "Miner's Helmet" },
    { "trait_type": "Tool", "value": "Crystal Pickaxe" },
    { "trait_type": "Status", "value": "Legendary Finder" },
    { "trait_type": "Energy", "value": 85, "max_value": 100 }
  ],
  "properties": {
    "layers": [
      "background-crystal-caves",
      "base-male",
      "hat-miners-helmet",
      "tool-crystal-pickaxe"
    ],
    "last_updated": "2025-05-29T12:00:00Z",
    "game_version": "1.2.3"
  }
}
```

---

## NFT Features

### **Dynamic Traits**

Your NFT traits update automatically based on game state:

- **Current Location** - Always shows where you are
- **Equipped Items** - Displays all visible gear
- **Stats** - Real-time health, energy, level display
- **Achievements** - Permanent record of accomplishments
- **Activity Status** - Online/offline, current action

### **Historical Preservation**

While your NFT shows current state, we preserve your journey:

- **Version History** - Every significant change saved
- **Achievement Gallery** - Permanent record of all accomplishments
- **Equipment Archive** - Gallery of all items you've owned
- **Location Log** - Travel history across all regions

### **Rarity Evolution**

Your character's rarity can increase through gameplay:

- **Base Rarity** - Determined at mint (Common, Uncommon, Rare)
- **Achievement Bonuses** - Legendary actions increase effective rarity
- **Equipment Influence** - Rare gear affects overall character rarity
- **Community Recognition** - Player voting can elevate status

---

## Use Cases & Benefits

### **For Players**

- **Visual Progression** - See your journey reflected in your character's appearance
- **Social Status** - Rare equipment and achievements visible to others
- **Personal Investment** - Your NFT becomes more unique through your actions
- **Bragging Rights** - Legendary items and locations permanently displayed

### **For Communities**

- **Guild Recognition** - Team achievements shown on individual characters
- **Event Participation** - Special events leave permanent visual marks
- **Social Proof** - Active players stand out visually from inactive accounts
- **Community Building** - Shared visual elements create group identity

### **For Collectors**

- **Living Investment** - NFT value increases with player achievement
- **Unique Combinations** - Impossible to fake rare equipment/location combinations
- **Provable Scarcity** - Achievement-based rarity is verifiable and meaningful
- **Market Dynamics** - Active characters command premium over static ones

---

## Implementation Stages

### **Stage 1: Infrastructure** ✅

- Layer composition system built and tested
- Metadata generation pipeline complete
- Real-time rendering engine operational
- Basic equipment visualization working

### **Stage 2: Enhancement** 🎯

- Advanced status effects and overlays
- Location-specific environmental effects
- Achievement badge and milestone markers
- Social recognition visual elements

### **Stage 3: Advanced Features** 🚀

- Community-driven layer creation
- Custom cosmetic options
- Cross-game interoperability
- AR/VR character display

> **📈 Activation Timeline**: These features deploy as part of our [community-driven activation model](./WHITEPAPER.md#staged-activation-model), not arbitrary roadmap dates.

---

## Economic Impact

### **NFT Value Drivers**

- **Activity Premium** - Active characters worth more than inactive
- **Achievement Rarity** - Legendary accomplishments increase value
- **Equipment Display** - Rare gear visible in NFT increases desirability
- **Historical Significance** - First-to-achieve status creates collectible value

### **Market Dynamics**

- **Engagement Rewards** - Playing the game literally increases NFT value
- **Social Proof** - Visual achievements create status and demand
- **Collector Appeal** - Dynamic evolution creates ongoing interest
- **Utility Value** - NFT serves functional purpose beyond speculation

> **💰 Economics Integration**: See how NFTs fit into our broader [$EARTH token infrastructure](./WHITEPAPER.md#token-distribution-when-on-chain).

---

## Technical Specifications

### **Layer Assets**

- **Resolution:** 512x512 base, scalable to 2048x2048
- **Format:** PNG with alpha transparency
- **Optimization:** WebP for web, PNG for permanent storage
- **Naming Convention:** `{type}-{category}-{item-name}.png`

### **Rendering Performance**

- **Composition Time:** <200ms for standard character
- **Cache Strategy:** Layer combinations cached for 24 hours
- **Update Frequency:** Real-time for equipment, hourly for status
- **Fallback System:** Static images if rendering fails

### **API Endpoints**

```
GET /nft/{characterId}.png        - Current character image
GET /nft/{characterId}/metadata   - Full NFT metadata
GET /nft/{characterId}/layers     - Layer composition details
GET /nft/{characterId}/history    - Visual evolution timeline
```

---

## Privacy & Control

### **Player Control**

- **Visibility Settings** - Choose what aspects are publicly visible
- **Historical Opt-out** - Remove specific achievements from display
- **Equipment Privacy** - Hide valuable items if desired
- **Status Broadcasting** - Control real-time activity sharing

### **Data Security**

- **On-chain Metadata** - Core traits stored on blockchain
- **Decentralized Images** - Visual assets on IPFS/Arweave
- **Player Ownership** - Complete control over NFT and associated data
- **Privacy by Design** - Only publicly opt-in information displayed

---

## Future Vision

**Your Wojak Earth character NFT becomes the ultimate gaming passport:**

- **Cross-Game Identity** - Visual representation carries across different games
- **Achievement Portfolio** - Permanent record of all gaming accomplishments
- **Social Credential** - Proof of skill, dedication, and community contribution
- **Investment Asset** - Value that grows with your gaming journey
- **Digital Legacy** - Permanent artifact of your virtual adventures

---

## Getting Started

### **Minting Your Character** _(Stage 2 Feature)_

1. **Play First** - Build your character through gameplay
2. **Mint When Ready** - Convert your character to NFT when desired
3. **Visual History** - All your progress becomes part of the NFT
4. **Ongoing Evolution** - Continue playing, keep evolving your NFT

> **🎮 Start Now**: [Jump into Wojak Earth](https://earth.ndao.computer) and begin building the character that will become your NFT.

### **Viewing Your NFT**

- **In-Game Display** - See your character in all its dynamic glory
- **Wallet Integration** - Standard NFT display in any compatible wallet
- **Social Sharing** - Export high-res images for social media
- **Marketplace Display** - Full visual presentation on NFT platforms

---

## Technical Deep Dive

For developers and technical stakeholders interested in implementation details, see our [Layer Resolution System Documentation](./src/lib/layerResolver.ts) and [NFT Metadata Generation](./netlify/functions/metadata.js) source code.

---

_Your journey creates your NFT. Your NFT tells your story._

---

**🎯 What's Next?**

- **🌍 Experience the World**: [Play Wojak Earth](https://earth.ndao.computer) and see dynamic characters in action
- **💰 Understand the Economics**: [Read our token infrastructure](./WHITEPAPER.md)
- **🎯 See the Vision**: [Full investor overview](./PITCHDECK.md)
- **🛠 Track Development**: [Current status and roadmap](./TODO.md)

---

**📖 Navigation**

- [📋 Master Index](./INDEX.md) | [🌍 Overview](./LITEPAPER.md) | [🎯 Pitch](./PITCHDECK.md) | [💰 Economics](./WHITEPAPER.md) | [🎨 NFTs](./NFT.md) | [🛠 Status](./TODO.md)

**🔗 Connect**: [@nothingdao](https://x.com/nothingdao) | [earth.ndao.computer](https://earth.ndao.computer)

_This represents the future of gaming NFTs - not static pictures, but living, breathing visual representations of player achievement and community participation._
