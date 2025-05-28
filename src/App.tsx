import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MapPin, Pickaxe, Store, Backpack, ArrowLeft, Zap, Heart, Users, Map, MessageCircle } from 'lucide-react'
import './App.css'

// API base URL - will be your Netlify functions URL
const API_BASE = '/.netlify/functions'

type GameView = 'main' | 'map' | 'location' | 'mine' | 'market' | 'inventory' | 'chat'

interface Character {
  id: string
  name: string
  gender: string
  energy: number
  health: number
  currentImageUrl: string
  currentLocation: {
    id: string
    name: string
    description: string
    locationType: string
    biome?: string
    welcomeMessage?: string
  }
  inventory: Array<{
    id: string
    quantity: number
    isEquipped: boolean
    item: {
      id: string
      name: string
      description: string
      category: string
      rarity: string
      imageUrl?: string
    }
  }>
  recentActivity: Array<{
    id: string
    type: string
    description: string
    item?: {
      name: string
      rarity: string
    }
  }>
}

interface Location {
  id: string
  name: string
  description: string
  locationType: string
  biome?: string
  difficulty: number
  playerCount: number
  lastActive?: string
  hasMarket: boolean
  hasMining: boolean
  hasChat: boolean
  welcomeMessage?: string
  lore?: string
  subLocations?: Location[]
}

function App() {
  const [currentView, setCurrentView] = useState<GameView>('main')
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [gameLog, setGameLog] = useState<string[]>([])

  // State for API data
  const [character, setCharacter] = useState<Character | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    loadGameData()
  }, [])

  const loadGameData = async () => {
    try {
      setLoading(true)

      // Load character data
      const characterResponse = await fetch(`${API_BASE}/get-character?characterId=hardcoded-demo`)
      if (!characterResponse.ok) throw new Error('Failed to load character')
      const characterData = await characterResponse.json()
      setCharacter(characterData)

      // Load locations data
      const locationsResponse = await fetch(`${API_BASE}/get-locations`)
      if (!locationsResponse.ok) throw new Error('Failed to load locations')
      const locationsData = await locationsResponse.json()
      setLocations(locationsData.locations)

      // Set initial game log
      setGameLog([
        `Welcome to Earth, ${characterData.name}!`,
        `You find yourself in ${characterData.currentLocation.name}.`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...characterData.recentActivity.slice(0, 3).map((activity: any) =>
          `${activity.description}${activity.item ? ` - ${activity.item.name}` : ''}`
        )
      ])

      setError(null)
    } catch (err) {
      console.error('Failed to load game data:', err)
      setError('Failed to load game data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const addToLog = (message: string) => {
    setGameLog(prev => [...prev.slice(-4), message]) // Keep last 5 messages
  }

  const handleMining = async () => {
    if (!character) return

    try {
      const response = await fetch(`${API_BASE}/mine-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          characterId: 'hardcoded-demo',
          locationId: selectedLocation?.id || character.currentLocation.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        addToLog(result.message || result.error)
        return
      }

      // Update character energy
      setCharacter(prev => prev ? ({
        ...prev,
        energy: result.newEnergyLevel
      }) : null)

      // Show result in log
      addToLog(result.message)

      // Refresh character data to get updated inventory
      loadGameData()

    } catch (error) {
      console.error('Mining failed:', error)
      addToLog('Mining attempt failed. Please try again.')
    }
  }

  const handleTravel = (locationName: string) => {
    addToLog(`You travel to ${locationName}`)
    setCurrentView('main')
  }

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location)
    setCurrentView('location')
  }

  const handlePurchase = (itemName: string, price: number) => {
    addToLog(`You bought ${itemName} for ${price} coins`)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🌍</div>
          <div>Loading Wojak Earth...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">❌</div>
          <div className="text-red-500 mb-4">{error}</div>
          <Button onClick={loadGameData}>Retry</Button>
        </div>
      </div>
    )
  }

  // No character data
  if (!character) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🤔</div>
          <div>No character data found</div>
        </div>
      </div>
    )
  }

  const renderMainView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
          <img
            src={character.currentImageUrl || "/wojak.png"}
            alt={character.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<div class="text-4xl">🥺</div>';
            }}
          />
        </div>
        <h2 className="text-xl font-bold">{character.name}</h2>
        <p className="text-muted-foreground">Currently in {character.currentLocation.name}</p>
        <div className="flex justify-center gap-4 mt-2">
          <span className="text-sm flex items-center gap-1">
            <Zap className="w-3 h-3" /> {character.energy}/100
          </span>
          <span className="text-sm flex items-center gap-1">
            <Heart className="w-3 h-3" /> {character.health}/100
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
          Local Chat (5 online)
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
        {locations.map(location => (
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
                {location.lastActive ? new Date(location.lastActive).toLocaleString() : 'Active recently'}
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
              {selectedLocation.subLocations.map((subLocation) => (
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
            Players Here (5)
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {/* Mock players for now - will be replaced with API data */}
            {[
              { name: "Wojak #420", level: 15, status: "Mining" },
              { name: "Wojak #69", level: 8, status: "Browsing Market" },
              { name: "Wojak #888", level: 22, status: "Just Arrived" },
            ].map((player, i) => (
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
          {selectedLocation.name !== character.currentLocation.name && (
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
      <h3 className="text-lg font-semibold">Mining in {character.currentLocation.name}</h3>
      <p className="text-sm text-muted-foreground">
        Search for resources. Each attempt costs 10 energy.
      </p>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Available Resources:</h4>
        <div className="text-sm text-muted-foreground">
          Resources vary by location. Try your luck!
        </div>
      </div>

      <Button onClick={handleMining} className="w-full" disabled={character.energy < 10}>
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
      <h3 className="text-lg font-semibold">Market - {character.currentLocation.name}</h3>

      <div className="space-y-2">
        {/* Mock market items for now - will be replaced with API data */}
        {[
          { name: "Miners Hat", price: 50, seller: "System" },
          { name: "Work Gloves", price: 25, seller: "System" },
          { name: "Energy Drink", price: 10, seller: "System" }
        ].map((item, i) => (
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

      {character.inventory && character.inventory.length > 0 ? (
        <div className="space-y-2">
          {character.inventory.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">
                  {inv.item.category === 'HAT' ? '🎩' :
                    inv.item.category === 'MATERIAL' ? '⚡' : '📦'}
                </div>
                <div>
                  <div className="font-medium">{inv.item.name}</div>
                  <div className="text-sm text-muted-foreground">{inv.item.description}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">x{inv.quantity}</div>
                <div className="text-xs text-muted-foreground capitalize">{inv.item.rarity}</div>
                {inv.isEquipped && (
                  <div className="text-xs text-green-600">Equipped</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-muted/50 p-8 rounded-lg text-center text-muted-foreground">
          <Backpack className="w-12 h-12 mx-auto mb-2" />
          Your bag is empty.<br />
          Start mining or visit the market!
        </div>
      )}

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
            {selectedLocation ? selectedLocation.name : character.currentLocation.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            Local chat • 5 players online
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
