import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MapPin, Pickaxe, Store, Backpack, ArrowLeft, Zap, Heart, Users, Map, MessageCircle } from 'lucide-react'
import './App.css'

// Mock data for MVP
const mockCharacter = {
  id: "1",
  name: "Wojak #1337",
  gender: "MALE",
  currentLocation: "Mining Plains",
  energy: 85,
  health: 100,
  currentImageUrl: "/wojak.png"
}

// Enhanced mock data with nested locations
const mockLocations = [
  {
    id: "1",
    name: "Mining Plains",
    description: "Rich in basic materials",
    locationType: "REGION",
    biome: "plains",
    difficulty: 1,
    playerCount: 12,
    lastActive: "2 minutes ago",
    hasMarket: true,
    hasMining: true,
    welcomeMessage: "The wind carries the sound of pickaxes striking stone.",
    lore: "Once a vast battlefield, these plains now serve as the primary mining grounds for new arrivals to Earth.",
    subLocations: [
      {
        id: "1a",
        name: "Rusty Pickaxe Inn",
        description: "A cozy tavern for weary miners",
        locationType: "BUILDING",
        playerCount: 4,
        hasMarket: true,
        hasMining: false,
        welcomeMessage: "The smell of ale and roasted meat fills the air.",
        parentLocationId: "1"
      },
      {
        id: "1b",
        name: "Crystal Caves",
        description: "Deep mining shafts with rare crystals",
        locationType: "BUILDING",
        playerCount: 8,
        hasMarket: false,
        hasMining: true,
        welcomeMessage: "Crystalline formations sparkle in your torchlight.",
        parentLocationId: "1"
      }
    ]
  },
  {
    id: "2",
    name: "Desert Outpost",
    description: "Harsh but rewarding terrain",
    locationType: "REGION",
    biome: "desert",
    difficulty: 3,
    playerCount: 5,
    lastActive: "12 minutes ago",
    hasMarket: true,
    hasMining: true,
    welcomeMessage: "The scorching sun beats down mercilessly.",
    lore: "A remote trading post built around an ancient oasis. Only the hardiest wojaks venture here.",
    subLocations: [
      {
        id: "2a",
        name: "Oasis Trading Post",
        description: "The heart of desert commerce",
        locationType: "BUILDING",
        playerCount: 3,
        hasMarket: true,
        hasMining: false,
        welcomeMessage: "Cool shade and fresh water provide relief from the heat.",
        parentLocationId: "2"
      }
    ]
  },
  {
    id: "3",
    name: "Cyber City",
    description: "High-tech trading hub",
    locationType: "CITY",
    biome: "urban",
    difficulty: 2,
    playerCount: 28,
    lastActive: "just now",
    hasMarket: true,
    hasMining: false,
    welcomeMessage: "Neon lights flicker in the perpetual twilight.",
    lore: "The beating heart of wojak civilization. Technology and commerce thrive in the endless cityscape.",
    subLocations: [
      {
        id: "3a",
        name: "Central Exchange",
        description: "The main trading floor",
        locationType: "BUILDING",
        playerCount: 15,
        hasMarket: true,
        hasMining: false,
        welcomeMessage: "Holographic displays show market prices from across the world.",
        parentLocationId: "3"
      },
      {
        id: "3b",
        name: "The Glitch Club",
        description: "Underground social hub for hackers",
        locationType: "BUILDING",
        playerCount: 8,
        hasMarket: false,
        hasMining: false,
        welcomeMessage: "Bass-heavy music thumps through the smoky atmosphere.",
        parentLocationId: "3"
      },
      {
        id: "3c",
        name: "Tech Lab",
        description: "Research and development center",
        locationType: "BUILDING",
        playerCount: 5,
        hasMarket: false,
        hasMining: true, // mining data/components
        welcomeMessage: "Banks of servers hum quietly in the sterile environment.",
        parentLocationId: "3"
      }
    ]
  }
]

const mockResources = [
  { name: "Dirty Coal", rarity: "COMMON", chance: 0.6 },
  { name: "Iron Scraps", rarity: "COMMON", chance: 0.4 },
  { name: "Rusty Gear", rarity: "UNCOMMON", chance: 0.15 },
  { name: "Ancient Coin", rarity: "RARE", chance: 0.05 }
]

const mockMarketItems = [
  { name: "Miners Hat", price: 50, seller: "System" },
  { name: "Work Gloves", price: 25, seller: "System" },
  { name: "Lucky Charm", price: 200, seller: "Wojak #420" },
  { name: "Energy Drink", price: 10, seller: "System" }
]

// Mock players at current location
const mockPlayersAtLocation = [
  { name: "Wojak #420", level: 15, status: "Mining" },
  { name: "Wojak #69", level: 8, status: "Browsing Market" },
  { name: "Wojak #1337", level: 12, status: "Idle" },
  { name: "Wojak #888", level: 22, status: "Just Arrived" },
  { name: "Wojak #2077", level: 3, status: "Mining" }
]

type GameView = 'main' | 'map' | 'location' | 'mine' | 'market' | 'inventory' | 'chat'

function App() {
  const [currentView, setCurrentView] = useState<GameView>('main')
  const [selectedLocation, setSelectedLocation] = useState<typeof mockLocations[0] | null>(null)
  const [gameLog, setGameLog] = useState<string[]>([
    `Welcome to Earth, ${mockCharacter.name}!`,
    `You find yourself in ${mockCharacter.currentLocation}.`
  ])

  const addToLog = (message: string) => {
    setGameLog(prev => [...prev.slice(-4), message]) // Keep last 5 messages
  }

  const handleMining = () => {
    const roll = Math.random()
    let found = null

    for (const resource of mockResources) {
      if (roll < resource.chance) {
        found = resource
        break
      }
    }

    if (found) {
      addToLog(`You found: ${found.name} (${found.rarity})!`)
    } else {
      addToLog(`You dig around but find nothing useful...`)
    }
  }

  const handleTravel = (locationName: string) => {
    addToLog(`You travel to ${locationName}`)
    setCurrentView('main')
  }

  const handleLocationSelect = (location: typeof mockLocations[0]) => {
    setSelectedLocation(location)
    setCurrentView('location')
  }

  const handlePurchase = (itemName: string, price: number) => {
    addToLog(`You bought ${itemName} for ${price} coins`)
  }

  const renderMainView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
          <img
            src="/wojak.png"
            alt={mockCharacter.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<div class="text-4xl">🥺</div>';
            }}
          />
        </div>
        <h2 className="text-xl font-bold">{mockCharacter.name}</h2>
        <p className="text-muted-foreground">Currently in {mockCharacter.currentLocation}</p>
        <div className="flex justify-center gap-4 mt-2">
          <span className="text-sm flex items-center gap-1">
            <Zap className="w-3 h-3" /> {mockCharacter.energy}/100
          </span>
          <span className="text-sm flex items-center gap-1">
            <Heart className="w-3 h-3" /> {mockCharacter.health}/100
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => setCurrentView('map')} variant="outline">
          <Map className="w-4 h-4 mr-2" />
          Map
        </Button>
        <Button onClick={() => setCurrentView('mine')} variant="outline">
          <Pickaxe className="w-4 h-4 mr-2" />
          Mine
        </Button>
        <Button onClick={() => setCurrentView('market')} variant="outline">
          <Store className="w-4 h-4 mr-2" />
          Market
        </Button>
        <Button onClick={() => setCurrentView('inventory')} variant="outline">
          <Backpack className="w-4 h-4 mr-2" />
          Inventory
        </Button>
      </div>

      <div className="mt-4">
        <Button onClick={() => setCurrentView('chat')} variant="ghost" className="w-full">
          <MessageCircle className="w-4 h-4 mr-2" />
          Local Chat ({mockPlayersAtLocation.length} online)
        </Button>
      </div>
    </div>
  )

  const renderMapView = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">World Map</h3>
      <p className="text-sm text-muted-foreground">
        Explore different locations across Wojak Earth
      </p>

      <div className="space-y-3">
        {mockLocations.map(location => (
          <div
            key={location.id}
            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => handleLocationSelect(location)}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium">{location.name}</h4>
                <p className="text-sm text-muted-foreground">{location.description}</p>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="w-3 h-3" />
                {location.playerCount}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-3">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${location.difficulty <= 2 ? 'bg-green-500' :
                    location.difficulty <= 4 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                  Level {location.difficulty}
                </span>
                <span className="capitalize">{location.biome}</span>
              </div>
              <span className="text-muted-foreground">
                Active {location.lastActive}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={() => setCurrentView('main')} variant="ghost">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
    </div>
  )

  const renderLocationView = () => {
    if (!selectedLocation) return null

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">{selectedLocation.name}</h3>
          <p className="text-sm text-muted-foreground">{selectedLocation.description}</p>
          {selectedLocation.locationType && (
            <span className="inline-block mt-1 px-2 py-1 text-xs bg-muted rounded-full capitalize">
              {selectedLocation.locationType.toLowerCase()}
            </span>
          )}
        </div>

        {selectedLocation.welcomeMessage && (
          <div className="bg-muted/50 p-3 rounded-lg text-sm italic text-center">
            "{selectedLocation.welcomeMessage}"
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div className="font-medium">{selectedLocation.playerCount}</div>
            <div className="text-muted-foreground">Players</div>
          </div>
          <div>
            <div className="font-medium">
              {selectedLocation.difficulty ? `Level ${selectedLocation.difficulty}` : 'N/A'}
            </div>
            <div className="text-muted-foreground">Difficulty</div>
          </div>
          <div>
            <div className="font-medium capitalize">
              {selectedLocation.biome || selectedLocation.locationType?.toLowerCase()}
            </div>
            <div className="text-muted-foreground">Type</div>
          </div>
        </div>

        {/* Sub-locations */}
        {selectedLocation.subLocations && selectedLocation.subLocations.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Places to Visit</h4>
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {selectedLocation.subLocations.map((subLocation: any) => (
                <div
                  key={subLocation.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleLocationSelect(subLocation)}
                >
                  <div>
                    <div className="font-medium text-sm">{subLocation.name}</div>
                    <div className="text-xs text-muted-foreground">{subLocation.description}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {subLocation.playerCount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Players Here ({mockPlayersAtLocation.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {mockPlayersAtLocation.map((player, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                <div>
                  <span className="font-medium">{player.name}</span>
                  <span className="text-muted-foreground ml-2">Lv.{player.level}</span>
                </div>
                <span className="text-xs text-muted-foreground">{player.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {selectedLocation.name !== mockCharacter.currentLocation && (
            <Button onClick={() => handleTravel(selectedLocation.name)} variant="outline">
              <MapPin className="w-4 h-4 mr-2" />
              Travel Here
            </Button>
          )}
          <Button onClick={() => setCurrentView('chat')} variant="outline">
            <MessageCircle className="w-4 h-4 mr-2" />
            Local Chat
          </Button>
        </div>

        {selectedLocation.lore && (
          <div className="border-t pt-3">
            <h4 className="font-medium mb-2">Lore</h4>
            <p className="text-sm text-muted-foreground">{selectedLocation.lore}</p>
          </div>
        )}

        <Button onClick={() => setCurrentView('map')} variant="ghost">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Map
        </Button>
      </div>
    )
  }

  const renderMineView = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Mining in {mockCharacter.currentLocation}</h3>
      <p className="text-sm text-muted-foreground">
        Search for resources. Each attempt costs 10 energy.
      </p>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Available Resources:</h4>
        <div className="space-y-1 text-sm">
          {mockResources.map((resource, i) => (
            <div key={i} className="flex justify-between">
              <span>{resource.name}</span>
              <span className="text-muted-foreground">
                {resource.rarity} ({Math.round(resource.chance * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleMining} className="w-full" disabled={mockCharacter.energy < 10}>
        <Pickaxe className="w-4 h-4 mr-2" />
        Mine for Resources
      </Button>

      <Button onClick={() => setCurrentView('main')} variant="ghost">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
    </div>
  )

  const renderMarketView = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Market - {mockCharacter.currentLocation}</h3>

      <div className="space-y-2">
        {mockMarketItems.map((item, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-muted-foreground">Sold by {item.seller}</div>
            </div>
            <div className="text-right">
              <div className="font-bold">{item.price} coins</div>
              <Button
                size="sm"
                onClick={() => handlePurchase(item.name, item.price)}
              >
                Buy
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={() => setCurrentView('main')} variant="ghost">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
    </div>
  )

  const renderInventoryView = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Inventory</h3>

      <div className="bg-muted/50 p-8 rounded-lg text-center text-muted-foreground">
        <Backpack className="w-12 h-12 mx-auto mb-2" />
        Your bag is empty.<br />
        Start mining or visit the market!
      </div>

      <Button onClick={() => setCurrentView('main')} variant="ghost">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
    </div>
  )

  const renderChatView = () => {
    const mockChatMessages = [
      { id: 1, character: "Wojak #420", message: "Anyone know where to find rare crystals?", time: "2m ago", isSystem: false },
      { id: 2, character: "System", message: "Wojak #1337 has entered the area", time: "3m ago", isSystem: true },
      { id: 3, character: "Wojak #69", message: "Just found some ancient coins in the caves!", time: "5m ago", isSystem: false },
      { id: 4, character: "Wojak #888", message: "Trading iron scraps for work gloves", time: "8m ago", isSystem: false },
      { id: 5, character: "System", message: "Wojak #2077 found: Rusty Gear (UNCOMMON)", time: "12m ago", isSystem: true }
    ]

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {selectedLocation ? selectedLocation.name : mockCharacter.currentLocation}
          </h3>
          <p className="text-sm text-muted-foreground">
            Local chat • {mockPlayersAtLocation.length} players online
          </p>
        </div>

        <div className="bg-muted/30 rounded-lg p-3 h-64 overflow-y-auto space-y-2">
          {mockChatMessages.map(msg => (
            <div key={msg.id} className={`text-sm ${msg.isSystem ? 'text-muted-foreground italic' : ''}`}>
              <span className="text-xs text-muted-foreground">{msg.time}</span>
              {!msg.isSystem && (
                <span className="font-medium text-primary ml-2">{msg.character}:</span>
              )}
              <span className="ml-1">{msg.message}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border rounded-md text-sm"
            disabled
          />
          <Button size="sm" disabled>Send</Button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Chat will be enabled when backend is connected
        </div>

        <Button onClick={() => setCurrentView(selectedLocation ? 'location' : 'main')} variant="ghost">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-center mb-6 flex items-center justify-center gap-2">
            <MapPin className="w-6 h-6" />
            Wojak Earth
          </h1>

          {currentView === 'main' && renderMainView()}
          {currentView === 'map' && renderMapView()}
          {currentView === 'location' && renderLocationView()}
          {currentView === 'mine' && renderMineView()}
          {currentView === 'market' && renderMarketView()}
          {currentView === 'inventory' && renderInventoryView()}
          {currentView === 'chat' && renderChatView()}
        </div>

        {/* Game Log */}
        <div className="mt-4 bg-card border rounded-lg p-4">
          <h4 className="font-medium mb-2">Recent Activity</h4>
          <div className="space-y-1 text-sm">
            {gameLog.map((log, i) => (
              <div key={i} className="text-muted-foreground">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
