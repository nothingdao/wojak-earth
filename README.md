# Earth 2089

**Web3 post-apocalyptic survival game** with Solana NFT characters, real-time multiplayer, autonomous NPC system, and complex EARTH token economy.

![Earth 2089 Banner](public/earth-og-image.jpg)

## Overview

Earth 2089 is a blockchain-based survival RPG set in a post-apocalyptic world where players mint NFT characters, explore a dangerous wasteland, mine resources, trade items, and build their survival empire. The game features a sophisticated economy backed by the EARTH token and powered by Solana blockchain technology.

## 🎮 Game Features

### Core Gameplay
- **Character Creation & NFT Minting** - Create unique survivors with visual customization (2 SOL mint cost)
- **Post-Apocalyptic Exploration** - Navigate dangerous zones on an interactive world map
- **Mining & Resource Gathering** - Extract valuable materials while managing energy and health
- **Real-Time Trading** - Buy and sell items in dynamic player-driven markets
- **Character Progression** - Level up through exploration, mining, and trading
- **Equipment System** - Customize appearance with clothing, accessories, and gear

### Web3 Integration
- **Solana NFT Characters** - Each character is a unique NFT with metadata and visual traits
- **EARTH Token Economy** - In-game currency backed by SOL with transparent tokenomics
- **Multi-Wallet Support** - Phantom, Solflare, and other Solana wallet adapters
- **Blockchain Trading** - Secure, transparent item and character trading
- **Token Bridge** - Exchange between in-game EARTH and external currencies

### Multiplayer Features
- **Real-Time Chat** - Communicate with other players in your current location
- **Live Player Tracking** - See who's active in each zone
- **Leaderboards** - Compete for top rankings in wealth, level, and achievements
- **Social Economy** - Player-driven markets and collaborative gameplay

### Autonomous NPCs
- **AI-Powered Characters** - Autonomous NPCs that mine, trade, and interact
- **Dynamic Economy** - NPCs contribute to market activity and price discovery
- **Behavioral Variety** - Different NPC personalities and activity patterns
- **Real-Time Integration** - NPCs operate continuously in the game world

## 🏗️ Technical Architecture

### Frontend
- **React 19** with TypeScript and Vite build system
- **Tailwind CSS 4** with shadcn/ui component library
- **D3.js** for interactive SVG world map
- **WebSocket** connections for real-time features
- **React Context** providers for state management

### Backend Infrastructure
- **Netlify Functions** - 40+ serverless API endpoints
- **Supabase** - Real-time database with live subscriptions
- **Solana Web3.js** - Blockchain operations and wallet integration
- **Node.js NPC Engine** - Autonomous character system

### Database & Real-Time
- **PostgreSQL** via Supabase with auto-generated TypeScript types
- **Real-time subscriptions** for live gameplay features
- **Location-based data** for world map interactions
- **Character persistence** with equipment and stats

## 🎯 Getting Started

### Prerequisites
- Node.js 22+
- Solana wallet (Phantom recommended)
- 2+ SOL for character minting
- Android Studio (for mobile development)

### Development Setup

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd earth
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```
   - Configure Supabase credentials
   - Set up Solana RPC endpoints
   - Add wallet keypairs for development

3. **Development servers:**
   ```bash
   # Frontend development
   npm run dev

   # Backend functions (optional local)
   npm run functions:dev

   # NPC engine
   npm run npc:dev

   # Generate database types
   npm run types
   ```

4. **Access the game:**
   - Frontend: `http://localhost:5173`
   - Backend (deployed for dev testing): `https://earth.ndao.computer/.netlify/functions`

### Dev Workflow
- Run frontend locally with `npm run dev`.
- Use deployed Netlify functions for backend testing.
- Netlify deploys functions automatically on push.

5. **Android development:**
   ```bash
   # Build and run Android app
   npm run build
   npx cap sync android
   npx cap run android
   ```

## 💰 Economy & Tokenomics

### Character NFT Minting
- **Cost:** 2 SOL per character NFT
- **Distribution:**
  - 1.0 SOL → EARTH token purchase
  - 0.75 SOL → Development reserve
  - 0.25 SOL → System inventory backing

### EARTH Token
- **Backed Currency** - Every EARTH token has SOL backing
- **Starting Amount** - New characters begin with 1,200 EARTH
- **Use Cases** - Mining equipment, trading, travel, items
- **Exchange Rate** - 1 EARTH ≈ $1 USD equivalent

### In-Game Economy
- **Player-Driven Markets** - Dynamic pricing based on supply/demand
- **Resource Scarcity** - Limited resources create competitive mining
- **Economic Zones** - Different areas have varying resource availability
- **NPC Market Activity** - Autonomous characters contribute to liquidity

## 🗺️ World & Locations

### Interactive Map
- **SVG-Based Rendering** - Scalable vector graphics with D3.js
- **Zone-Based Travel** - Energy costs and health risks vary by region
- **Real-Time Population** - See active players in each location
- **Resource Distribution** - Different zones offer unique mining opportunities

### Location Types
- **Safe Zones** - Low risk, basic resources, player hubs
- **Mining Regions** - High-value resources, moderate danger
- **Wasteland** - Extreme risk, rare materials, PvP zones
- **Trading Posts** - Commercial hubs with NPC merchants

## 🤖 NPC Engine

### Autonomous Behavior
- **Independent Decision Making** - NPCs choose actions based on AI logic
- **Economic Participation** - Buy, sell, mine, and accumulate resources
- **Social Interaction** - Chat and respond to player communications
- **Realistic Simulation** - Energy, health, and economic constraints

### Configuration
- **Behavior Profiles** - Different NPC personality types
- **Activity Schedules** - Mining, trading, and rest cycles
- **Economic Settings** - Spending patterns and market participation
- **Location Preferences** - Zone-specific NPC distributions

## 📱 Game Screens

### Core Views
- **Character Creation** - Visual customization and NFT minting
- **World Map** - Interactive travel and location selection
- **Mining Interface** - Resource extraction with risk/reward mechanics
- **Inventory Management** - Equipment and item organization
- **Market Trading** - Buy/sell interface with real-time pricing
- **Chat System** - Location-based communication
- **Profile & Stats** - Character progression and achievements

### Admin Dashboard
- **Economy Overview** - Market data and token metrics
- **Player Analytics** - Activity, retention, and engagement stats
- **NPC Management** - Configure autonomous character behavior
- **Content Management** - Items, locations, and game balance

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run functions:dev    # Start Netlify dev with functions
npm run npc:dev         # Run NPC engine in development

# Production
npm run build           # Build for production
npm run functions:build # Build Netlify functions
npm run npc:start      # Start NPC engine in production

# Android Development
npx cap sync android    # Sync web assets to Android
npx cap run android     # Build and run Android app
npx cap open android    # Open Android Studio

# Utilities
npm run lint           # ESLint checking
npm run types          # Generate Supabase types
```

## 🎨 Asset System

### Character Customization
- **Layered Assets** - Modular clothing and accessory system
- **Gender Options** - Male and female base models
- **Equipment Variety** - Clothing, outerwear, accessories, tools
- **Visual Persistence** - Character appearance saved to blockchain

### Asset Categories
- **Base Models** - Core character foundations
- **Clothing** - T-shirts, jackets, specialized gear
- **Accessories** - Sunglasses, jewelry, tools
- **Equipment** - Mining gear, weapons, survival tools

## 🛠️ Technical Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4
- **Mobile:** Capacitor for Android app, Solana Mobile Stack compatible
- **UI Components:** Radix UI, shadcn/ui
- **Blockchain:** Solana Web3.js, SPL Token, Metaplex
- **Database:** Supabase (PostgreSQL) with real-time subscriptions
- **Backend:** Netlify Functions, Node.js NPC engine
- **Graphics:** D3.js for maps, Canvas for character rendering
- **Real-Time:** WebSocket connections, Supabase subscriptions

## 📄 Documentation

- **[API Documentation](API.md)** - Complete API reference
- **[Android Development](ANDROID.md)** - Mobile development and Solana Mobile integration
- **[Tokenomics](TOKENOMICS.md)** - Economic mechanics and token design
- **[Map System](MAP.md)** - World geography and location details
- **[Development Guide](CLAUDE.md)** - Architecture and coding standards
- **[Roadmap](EARTH%202089-Seasons-Roadmap.md)** - Feature development timeline

## 🚀 Deployment

### Production Environment
- **Frontend:** Netlify static hosting
- **Functions:** Netlify serverless functions
- **Database:** Supabase managed PostgreSQL
- **Blockchain:** Solana mainnet integration

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_SOLANA_RPC_URL` - Solana RPC endpoint
- `VITE_ENVIRONMENT` - Environment flag (dev/prod)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow TypeScript and React best practices
4. Test with local NPC engine
5. Submit pull request with detailed description

## 📜 License

This project uses **dual licensing**:

### Code License
The source code is licensed under **MIT License** - see [LICENSE](LICENSE) file for details.
- ✅ Free to use, modify, and distribute
- ✅ Commercial use allowed
- ✅ Build your own projects with this code

### Assets License
All visual assets, artwork, and creative content are **proprietary** - see [ASSETS_LICENSE](ASSETS_LICENSE) file for details.
- ❌ Assets cannot be used commercially
- ❌ Cannot create competing games with our assets
- ❌ Character designs, logos, and branding are protected
- ✅ Code study and local development allowed

**Summary:** Use our code to build amazing games, but create your own visual identity and assets!

## 🔗 Links

- **Live Game:** [Coming Soon]
- **Documentation:** See `/docs` folder
- **Community:** [Discord Community](https://discord.gg/nothingdao)
- **Support:** GitHub Issues

---

*Earth 2089 - Survive the wasteland, build your empire, own your destiny.*
