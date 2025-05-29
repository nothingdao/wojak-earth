import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MapPin, Pickaxe, Store, Backpack, ArrowLeft, Zap, Heart, Users, Map, MessageCircle, Send, Coins, Loader2 } from 'lucide-react'
import './App.css'
import { ModeToggle } from './components/mode-toggle'
// import { resolveVisibleLayers, generateCharacterLayers, generateNFTMetadata } from '@/lib/layerResolver'
import { toast, Toaster } from 'sonner'

// API base URL - will be your Netlify functions URL
const API_BASE = '/.netlify/functions'

import type {
  GameView,
  Character,
  Location,
  MarketItem,
  ChatMessage,
  Player
} from '@/types'

function App() {
  const [currentView, setCurrentView] = useState<GameView>('main')
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [gameLog, setGameLog] = useState<string[]>([])
  const [chatInput, setChatInput] = useState('')
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())

  // market tabs
  const [activeMarketTab, setActiveMarketTab] = useState<'local' | 'global'>('local')

  // State for API data
  const [character, setCharacter] = useState<Character | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [marketItems, setMarketItems] = useState<MarketItem[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [playersAtLocation, setPlayersAtLocation] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [travelingTo, setTravelingTo] = useState<Location | null>(null)

  // Load initial data
  useEffect(() => {
    loadGameData()
  }, [])

  // Load chat when location changes
  useEffect(() => {
    if (character && currentView === 'chat') {
      loadChatMessages(selectedLocation?.id || character.currentLocation.id)
    }
  }, [currentView, selectedLocation?.id, character?.currentLocation.id, character])

  // Load players when viewing location
  useEffect(() => {
    if (selectedLocation && currentView === 'location') {
      loadPlayersAtLocation(selectedLocation.id)
    }
  }, [selectedLocation?.id, currentView, selectedLocation])

  // Load market when opening market view
  useEffect(() => {
    if (character && currentView === 'market') {
      loadMarketItems(selectedLocation?.id || character.currentLocation.id)
    }
  }, [currentView, selectedLocation?.id, character?.currentLocation.id, character])

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
        ...characterData.recentActivity.slice(0, 3).map((activity: Character['recentActivity'][0]) =>
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

  const loadMarketItems = async (locationId: string) => {
    try {
      const response = await fetch(`${API_BASE}/get-market?locationId=${locationId}`)
      if (response.ok) {
        const data = await response.json()
        setMarketItems(data.items || [])
      }
    } catch (error) {
      console.error('Failed to load market items:', error)
      // Fallback to mock data if API not implemented
      setMarketItems([
        {
          id: '1',
          price: 50,
          quantity: 1,
          isSystemItem: true,
          item: {
            id: '1',
            name: 'Miners Hat',
            description: 'Worn leather hat with a dim headlamp',
            category: 'HAT',
            rarity: 'COMMON',
            imageUrl: '/items/miners-hat.png'
          }
        },
        {
          id: '2',
          price: 25,
          quantity: 1,
          isSystemItem: true,
          item: {
            id: '2',
            name: 'Work Gloves',
            description: 'Tough gloves for manual labor',
            category: 'CLOTHING',
            rarity: 'COMMON'
          }
        },
        {
          id: '3',
          price: 10,
          quantity: 5,
          isSystemItem: true,
          item: {
            id: '3',
            name: 'Energy Drink',
            description: 'Restores energy and keeps you alert',
            category: 'CONSUMABLE',
            rarity: 'COMMON'
          }
        }
      ])
    }
  }

  const loadChatMessages = async (locationId: string) => {
    try {
      const response = await fetch(`${API_BASE}/get-chat?locationId=${locationId}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setChatMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error)
      // Fallback to mock data
      setChatMessages([
        {
          id: '1',
          message: 'Anyone know where the best iron deposits are?',
          messageType: 'CHAT',
          isSystem: false,
          timeAgo: '3m ago',
          createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
          character: {
            id: '1',
            name: 'Wojak #420',
            characterType: 'HUMAN',
            imageUrl: '/wojak-420.png'
          },
          location: {
            id: locationId,
            name: 'Mining Plains',
            locationType: 'REGION'
          }
        },
        {
          id: '2',
          message: 'Try the eastern slopes, found some good scraps there yesterday',
          messageType: 'CHAT',
          isSystem: false,
          timeAgo: '2m ago',
          createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          character: {
            id: '2',
            name: 'Wojak #1337',
            characterType: 'HUMAN'
          },
          location: {
            id: locationId,
            name: 'Mining Plains',
            locationType: 'REGION'
          }
        }
      ])
    }
  }

  const loadPlayersAtLocation = async (locationId: string) => {
    try {
      const response = await fetch(`${API_BASE}/get-players-at-location?locationId=${locationId}`)
      if (response.ok) {
        const data = await response.json()
        setPlayersAtLocation(data.players || [])
      }
    } catch (error) {
      console.error('Failed to load players:', error)
      // Mock data fallback
      setPlayersAtLocation([
        {
          id: '1',
          name: 'Wojak #420',
          gender: 'MALE',
          characterType: 'HUMAN',
          level: 5,
          energy: 95,
          health: 100,
          status: 'Mining',
          currentImageUrl: '/wojak-420.png',
          equippedItems: [
            { name: 'Miners Hat', category: 'HAT', rarity: 'COMMON' }
          ]
        },
        {
          id: '2',
          name: 'Wojak #69',
          gender: 'FEMALE',
          characterType: 'HUMAN',
          level: 3,
          energy: 70,
          health: 100,
          status: 'Chatting',
          equippedItems: []
        }
      ])
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

  const handleTravel = async (locationId: string) => {
    if (!character) return

    // Find the destination location for the travel animation
    const destination = locations.find(loc => loc.id === locationId) ||
      locations.find(loc => loc.subLocations?.some(sub => sub.id === locationId))?.subLocations?.find(sub => sub.id === locationId)

    if (destination) {
      setTravelingTo(destination)
    }

    try {
      const response = await fetch(`${API_BASE}/travel-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          characterId: 'hardcoded-demo',
          destinationId: locationId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        addToLog(result.message || result.error)
        setTravelingTo(null)
        return
      }

      // Show travel completion after a brief delay for the animation
      setTimeout(async () => {
        // Update character location
        setCharacter(prev => prev ? ({
          ...prev,
          currentLocation: {
            id: result.newLocation.id,
            name: result.newLocation.name,
            description: result.newLocation.description,
            locationType: result.newLocation.locationType,
            biome: result.newLocation.biome,
            welcomeMessage: result.newLocation.welcomeMessage
          }
        }) : null)

        // Show result in log
        addToLog(result.message)
        if (result.newLocation.welcomeMessage) {
          addToLog(`"${result.newLocation.welcomeMessage}"`)
        }

        // Refresh locations data in background without loading state
        try {
          const locationsResponse = await fetch(`${API_BASE}/get-locations`)
          if (locationsResponse.ok) {
            const locationsData = await locationsResponse.json()
            setLocations(locationsData.locations)
          }
        } catch (err) {
          console.error('Failed to refresh locations:', err)
        }

        // Clear traveling state and go to main view
        setTravelingTo(null)
        setCurrentView('main')
      }, 1500) // 1.5 second travel animation

    } catch (error) {
      console.error('Travel failed:', error)
      addToLog('Travel failed. Please try again.')
      setTravelingTo(null)
    }
  }

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location)
    setCurrentView('location')
  }

  const handlePurchase = async (marketListingId: string, price: number, itemName: string) => {
    if (!character) return

    // Set loading state
    setLoadingItems(prev => new Set(prev).add(marketListingId))

    try {
      const response = await fetch(`${API_BASE}/buy-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          characterId: 'hardcoded-demo',
          marketListingId: marketListingId,
          locationId: selectedLocation?.id || character.currentLocation.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.message || result.error)
        return
      }

      toast.success(`Bought ${itemName} for ${price} coins!`)

      // Optimistic update for market items
      setMarketItems(prev => prev.map(item => {
        if (item.id === marketListingId) {
          const newQuantity = item.quantity - 1
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : null
        }
        return item
      }).filter(Boolean) as MarketItem[])

      // Only refresh character data (not everything)
      const characterResponse = await fetch(`${API_BASE}/get-character?characterId=hardcoded-demo`)
      if (characterResponse.ok) {
        const characterData = await characterResponse.json()
        setCharacter(characterData)
      }

    } catch (error) {
      console.error('Purchase failed:', error)
      toast.error('Purchase failed')
    } finally {
      // Remove loading state
      setLoadingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(marketListingId)
        return newSet
      })
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !character) return

    try {
      const response = await fetch(`${API_BASE}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          characterId: 'hardcoded-demo',
          locationId: selectedLocation?.id || character.currentLocation.id,
          message: chatInput,
          messageType: 'CHAT'
        })
      })

      if (response.ok) {
        setChatInput('')
        // Reload chat messages
        loadChatMessages(selectedLocation?.id || character.currentLocation.id)
      } else {
        // Fallback for demo - add message locally
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          message: chatInput,
          messageType: 'CHAT',
          isSystem: false,
          timeAgo: 'now',
          createdAt: new Date().toISOString(),
          character: {
            id: character.id,
            name: character.name,
            characterType: 'HUMAN'
          },
          location: {
            id: selectedLocation?.id || character.currentLocation.id,
            name: selectedLocation?.name || character.currentLocation.name,
            locationType: selectedLocation?.locationType || character.currentLocation.locationType
          }
        }
        setChatMessages(prev => [...prev, newMessage])
        setChatInput('')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleEquipItem = async (inventoryId: string, isEquipped: boolean) => {
    if (!character) return

    // Set loading state
    setLoadingItems(prev => new Set(prev).add(inventoryId))

    try {
      const response = await fetch(`${API_BASE}/equip-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          characterId: 'hardcoded-demo',
          inventoryId: inventoryId,
          equip: !isEquipped
        })
      })

      if (response.ok) {
        // Optimistic update
        setCharacter(prev => prev ? ({
          ...prev,
          inventory: prev.inventory.map(inv =>
            inv.id === inventoryId ? { ...inv, isEquipped: !isEquipped } : inv
          )
        }) : null)

        toast.success(isEquipped ? 'Item unequipped' : 'Item equipped')
      } else {
        toast.error('Failed to update equipment')
      }
    } catch (error) {
      console.error('Failed to equip item:', error)
      toast.error('Failed to update equipment')
    } finally {
      // Remove loading state
      setLoadingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(inventoryId)
        return newSet
      })
    }
  }

  const handleUseItem = async (inventoryId: string, itemName: string, energyEffect?: number, healthEffect?: number) => {
    if (!character) return

    // Calculate actual effects (capped at 100)
    const actualEnergyGain = energyEffect ? Math.min(energyEffect, 100 - character.energy) : 0
    const actualHealthGain = healthEffect ? Math.min(healthEffect, 100 - character.health) : 0

    // Warn if effects would be wasted
    if ((energyEffect && actualEnergyGain === 0) || (healthEffect && actualHealthGain === 0)) {
      toast.warning(`You're already at full ${energyEffect && actualEnergyGain === 0 ? 'energy' : 'health'}!`)
      return
    }

    // Set loading state for this specific item
    setLoadingItems(prev => new Set(prev).add(inventoryId))

    try {
      const response = await fetch(`${API_BASE}/use-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          characterId: 'hardcoded-demo',
          inventoryId: inventoryId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.message || result.error)
        return
      }

      // Update character stats immediately (optimistic update)
      setCharacter(prev => prev ? ({
        ...prev,
        energy: Math.min(100, prev.energy + (result.effects?.energy || 0)),
        health: Math.min(100, prev.health + (result.effects?.health || 0)),
        // Update inventory optimistically
        inventory: prev.inventory.map(inv => {
          if (inv.id === inventoryId) {
            const newQuantity = inv.quantity - 1
            return newQuantity > 0 ? { ...inv, quantity: newQuantity } : null
          }
          return inv
        }).filter(Boolean) as typeof prev.inventory
      }) : null)

      // Show success toast with effects
      const effects = []
      if (result.effects?.energy > 0) effects.push(`+${result.effects.energy} energy`)
      if (result.effects?.health > 0) effects.push(`+${result.effects.health} health`)

      toast.success(`Used ${itemName}${effects.length > 0 ? ` (${effects.join(', ')})` : ''}`)

      // Don't reload everything - just let the optimistic update handle it

    } catch (error) {
      console.error('Use item failed:', error)
      toast.error(`Failed to use ${itemName}`)
    } finally {
      // Remove loading state
      setLoadingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(inventoryId)
        return newSet
      })
    }
  }

  // Initial loading state (only for app startup)
  if (loading && !travelingTo) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🌍</div>
          <div>Loading Wojak Earth...</div>
        </div>
      </div>
    )
  }

  // Travel animation state
  if (travelingTo) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <div className="text-4xl mb-4 animate-bounce">
              {travelingTo.biome === 'desert' ? '🏜️' :
                travelingTo.biome === 'urban' ? '🏙️' :
                  travelingTo.biome === 'plains' ? '🌾' :
                    travelingTo.locationType === 'BUILDING' ? '🏠' : '🗺️'}
            </div>
            <div className="text-xl font-bold mb-2">Traveling to...</div>
            <div className="text-2xl font-bold text-primary mb-2">{travelingTo.name}</div>
            <div className="text-muted-foreground mb-4">{travelingTo.description}</div>

            {/* Animated progress bar */}
            <div className="w-full bg-muted rounded-full h-2 mb-4 overflow-hidden">
              <div className="bg-primary h-2 rounded-full animate-pulse"
                style={{
                  animation: 'travel-progress 1.5s ease-in-out forwards',
                  width: '0%'
                }}></div>
            </div>

            <div className="text-sm text-muted-foreground animate-pulse">
              Preparing for arrival...
            </div>
          </div>

          {/* Add custom CSS for the travel progress animation */}
          <style>{`
            @keyframes travel-progress {
              0% { width: 0%; }
              100% { width: 100%; }
            }
          `}</style>
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


  // Add this new component for the character display
  const CharacterRenderer: React.FC<{ character: Character }> = ({ character }) => {
    const [imageError, setImageError] = useState(false)
    const [imageLoading, setImageLoading] = useState(true)

    // Generate the rendered character URL
    const characterImageUrl = `/.netlify/functions/render-character/${character.id}.png`

    const handleImageLoad = () => {
      setImageLoading(false)
      setImageError(false)
    }

    const handleImageError = () => {
      setImageLoading(false)
      setImageError(true)
    }

    return (
      <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center mb-4 overflow-hidden relative">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {!imageError ? (
          <img
            src={characterImageUrl}
            alt={character.name}
            className="w-full h-full object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ display: imageLoading ? 'none' : 'block' }}
          />
        ) : (
          // Fallback to default wojak image
          <img
            src={character.currentImageUrl || "/wojak.png"}
            alt={character.name}
            className="w-full h-full object-cover"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false)
              // Ultimate fallback
              const target = event?.target as HTMLImageElement
              if (target) {
                target.style.display = 'none'
                if (target.parentElement) {
                  target.parentElement.innerHTML = '<div class="text-4xl">🥺</div>'
                }
              }
            }}
          />
        )}
      </div>
    )
  }

  // Add this function to show layer information (useful for debugging)
  // const LayerDebugPanel: React.FC<{ character: Character }> = ({ character }) => {
  //   const characterLayers = generateCharacterLayers(character)
  //   const visibleLayers = resolveVisibleLayers(
  //     characterLayers,
  //     character.currentLocation.biome
  //   )

  //   return (
  //     <div className="mt-4 p-3 bg-muted/30 rounded-lg">
  //       <h4 className="font-medium mb-2 text-sm">Character Layers (Debug)</h4>
  //       <div className="space-y-1 text-xs">
  //         {visibleLayers.map((layer, i) => (
  //           <div key={i} className="flex justify-between items-center">
  //             <span className={layer.visible ? 'text-green-600' : 'text-red-500'}>
  //               {layer.type}/{layer.name}
  //             </span>
  //             <span className="text-muted-foreground">
  //               z:{layer.zIndex} {layer.visible ? '✓' : '✗'}
  //             </span>
  //           </div>
  //         ))}
  //       </div>

  //       <div className="mt-2 pt-2 border-t">
  //         <a
  //           href={`/.netlify/functions/metadata/${character.tokenId || character.id}`}
  //           target="_blank"
  //           rel="noopener noreferrer"
  //           className="text-xs text-blue-500 hover:underline"
  //         >
  //           View NFT Metadata →
  //         </a>
  //       </div>
  //     </div>
  //   )
  // }



  const renderMainView = () => (
    <div className="space-y-6">
      <ModeToggle />
      <div className="text-center">
        <CharacterRenderer character={character} />
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
          Local Chat ({playersAtLocation.length} online)
        </Button>
      </div>

      {/* Add debug panel in development */}
      {/* {process.env.NODE_ENV === 'development' && character && (
        <LayerDebugPanel character={character} />
      )} */}
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
            Players Here ({playersAtLocation.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {playersAtLocation.map(player => (
              <div key={player.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                    {player.characterType === 'HUMAN' ? '🙂' : '👹'}
                  </div>
                  <div>
                    <div className="font-medium">{player.name}</div>
                    <div className="text-xs text-muted-foreground">Level {player.level} • {player.status}</div>
                  </div>
                </div>
                <div className="text-xs text-right">
                  <div className="flex items-center gap-1">
                    <Zap className="w-2 h-2" /> {player.energy}
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-2 h-2" /> {player.health}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {selectedLocation.name !== character.currentLocation.name && (
            <Button onClick={() => handleTravel(selectedLocation.id)} variant="outline">
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

  const renderMarketView = () => {
    // Determine if we're at a child location (has parent location)
    const currentLoc = selectedLocation || character?.currentLocation
    const isChildLocation = currentLoc && locations.find(loc =>
      loc.subLocations?.some(sub => sub.id === currentLoc.id)
    )

    // Filter market items by tab
    const localItems = marketItems.filter(item => item.isLocalSpecialty || false)
    const globalItems = marketItems.filter(item => !item.isLocalSpecialty)

    const activeItems = activeMarketTab === 'local' ? localItems : globalItems

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Market - {currentLoc?.name}</h3>
          {isChildLocation && (
            <p className="text-xs text-muted-foreground">
              Unique local items + supplies from the main settlement
            </p>
          )}
        </div>

        {/* Tab Navigation - only show if child location */}
        {isChildLocation && (
          <div className="flex border-b">
            <button
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeMarketTab === 'local'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              onClick={() => setActiveMarketTab('local')}
            >
              Local Specialties
              {localItems.length > 0 && (
                <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                  {localItems.length}
                </span>
              )}
            </button>
            <button
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeMarketTab === 'global'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              onClick={() => setActiveMarketTab('global')}
            >
              Global Market
              {globalItems.length > 0 && (
                <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                  {globalItems.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Market Items */}
        <div className="space-y-2">
          {activeItems.length > 0 ? (
            activeItems.map((marketItem) => (
              <div key={marketItem.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">
                    {marketItem.item.category === 'HAT' ? '🎩' :
                      marketItem.item.category === 'CONSUMABLE' ? '🥤' :
                        marketItem.isLocalSpecialty ? '✨' : '📦'}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {marketItem.item.name}
                      {marketItem.isLocalSpecialty && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                          Local
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{marketItem.item.description}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {marketItem.item.rarity} • Sold by {marketItem.isSystemItem ? 'System' : marketItem.seller?.name}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    {marketItem.price}
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Qty: {marketItem.quantity > 0 ? marketItem.quantity : 'Out of Stock'}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handlePurchase(marketItem.id, marketItem.price, marketItem.item.name)}
                    disabled={marketItem.quantity === 0}
                  >
                    {marketItem.quantity > 0 ? 'Buy' : 'Sold Out'}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-muted/30 p-8 rounded-lg text-center text-muted-foreground">
              <Store className="w-12 h-12 mx-auto mb-2" />
              {activeMarketTab === 'local' ? (
                <>
                  No local specialties available.<br />
                  Check back later or try the global market.
                </>
              ) : (
                <>
                  No items available in the global market.<br />
                  The merchants might be restocking.
                </>
              )}
            </div>
          )}
        </div>

        <Button onClick={() => setCurrentView('main')} variant="ghost">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    )
  }

  const renderInventoryView = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Inventory</h3>

      {character.inventory && character.inventory.length > 0 ? (
        <div className="space-y-2">
          {character.inventory.map((inv) => {
            // Check if consumable effects would be wasted
            const isConsumable = inv.item.category === 'CONSUMABLE'
            const energyEffect = inv.item.energyEffect || 0
            const healthEffect = inv.item.healthEffect || 0

            const wouldWasteEnergy = energyEffect > 0 && character.energy >= 100
            const wouldWasteHealth = healthEffect > 0 && character.health >= 100
            const wouldBeWasted = isConsumable && (
              (energyEffect > 0 && wouldWasteEnergy) ||
              (healthEffect > 0 && wouldWasteHealth)
            )

            const isLoading = loadingItems.has(inv.id)

            return (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">
                    {inv.item.category === 'HAT' ? '🎩' :
                      inv.item.category === 'MATERIAL' ? '⚡' :
                        inv.item.category === 'CONSUMABLE' ? '🥤' : '📦'}
                  </div>
                  <div>
                    <div className="font-medium">{inv.item.name}</div>
                    <div className="text-sm text-muted-foreground">{inv.item.description}</div>

                    {/* Show consumable effects */}
                    {isConsumable && (energyEffect > 0 || healthEffect > 0) && (
                      <div className="text-xs text-green-600 mt-1">
                        Effects: {[
                          energyEffect > 0 ? `+${energyEffect} energy` : null,
                          healthEffect > 0 ? `+${healthEffect} health` : null
                        ].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">x{inv.quantity}</div>
                  <div className="text-xs text-muted-foreground capitalize">{inv.item.rarity}</div>

                  {/* Equipment Button */}
                  {inv.item.category !== 'MATERIAL' && inv.item.category !== 'CONSUMABLE' && (
                    <Button
                      size="sm"
                      variant={inv.isEquipped ? "default" : "outline"}
                      onClick={() => handleEquipItem(inv.id, inv.isEquipped)}
                      className="mt-1"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        inv.isEquipped ? 'Unequip' : 'Equip'
                      )}
                    </Button>
                  )}

                  {/* Use Button for Consumables */}
                  {isConsumable && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUseItem(
                        inv.id,
                        inv.item.name,
                        inv.item.energyEffect,
                        inv.item.healthEffect
                      )}
                      className="mt-1"
                      disabled={wouldBeWasted || isLoading}
                      title={wouldBeWasted ?
                        `Already at full ${wouldWasteEnergy ? 'energy' : 'health'}` :
                        `Use ${inv.item.name}`
                      }
                    >
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : wouldBeWasted ? 'Full' : 'Use'}
                    </Button>
                  )}

                  {inv.isEquipped && (
                    <div className="text-xs text-green-600">Equipped</div>
                  )}
                </div>
              </div>
            )
          })}
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
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {selectedLocation ? selectedLocation.name : character.currentLocation.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            Local chat • {chatMessages.length} messages
          </p>
        </div>

        <div className="bg-muted/30 rounded-lg p-3 h-64 overflow-y-auto space-y-2">
          {chatMessages.length > 0 ? (
            chatMessages.map(message => (
              <div key={message.id} className="space-y-1">
                {message.isSystem ? (
                  <div className="text-xs text-center text-muted-foreground italic">
                    {message.message}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                        {message.character?.characterType === 'HUMAN' ? '🙂' : '👹'}
                      </div>
                      <span className="font-medium">{message.character?.name}</span>
                      <span className="text-muted-foreground">{message.timeAgo}</span>
                    </div>
                    <div className="text-sm pl-6">
                      {message.messageType === 'EMOTE' ? (
                        <span className="italic">*{message.message}*</span>
                      ) : (
                        message.message
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center">
              No messages yet. Be the first to say something!
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 px-3 py-2 border rounded-md text-sm"
          />
          <Button size="sm" onClick={handleSendMessage} disabled={!chatInput.trim()}>
            <Send className="w-4 h-4" />
          </Button>
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
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
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
