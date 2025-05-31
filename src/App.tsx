// src/App.tsx
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MapPin, Zap, Heart, Users, MessageCircle, Send, Earth, MapIcon } from 'lucide-react'
import { GlobalNavbar } from './components/global-navbar'
import { toast, Toaster } from 'sonner'
import { InventoryView, MarketView, MiningView, WorldMapView, ProfileView, MainView } from '@/components/views'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { NPCActivity } from './components/NPCActivity'
// import { ConnectedPlayerWalletInfo } from './components/ConnectedPlayerWalletInfo'

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
import GlobalActivityFeed from './components/GlobalActivityFeed'

// Define a type for the rarity
type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

function App() {
  const [currentView, setCurrentView] = useState<GameView>('main')
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())

  // State for API data
  const [character, setCharacter] = useState<Character | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [marketItems, setMarketItems] = useState<MarketItem[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [playersAtLocation, setPlayersAtLocation] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [travelingTo, setTravelingTo] = useState<Location | null>(null)

  // Add this useEffect in your App.tsx
  useEffect(() => {
    if (character && currentView === 'main') {
      loadPlayersAtLocation(character.currentLocation.id)
    }
  }, [currentView, character?.currentLocation.id, character])
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

  const renderNPCActivityView = () => (
    <NPCActivity />
  )

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

  const handleMining = async () => {
    if (!character) return

    // Set loading state for mining button
    setLoadingItems(prev => new Set(prev).add('mining-action'))

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
        // Show error toast
        toast.error(result.message || result.error)
        return
      }

      // Update character energy immediately (optimistic update)
      setCharacter(prev => prev ? ({
        ...prev,
        energy: result.newEnergyLevel
      }) : null)

      // Show appropriate toast based on what was found
      if (result.foundItem) {
        // Ensure result.foundItem.rarity is of type Rarity
        const rarity: Rarity = result.foundItem.rarity as Rarity; // Type assertion
        const rarityEmoji = {
          'COMMON': '⚪',
          'UNCOMMON': '🟢',
          'RARE': '🔵',
          'EPIC': '🟣',
          'LEGENDARY': '🟡'
        }[rarity] || '⚪'

        toast.success(
          `Found ${result.foundItem.name}! ${rarityEmoji}`,
          {
            description: `${result.foundItem.description} • Energy: ${result.newEnergyLevel}/100`,
            duration: 4000
          }
        )

      } else {
        // Nothing found toast
        toast.info(
          "Nothing found this time...",
          {
            description: `Keep trying! Energy: ${result.newEnergyLevel}/100`,
            duration: 2000
          }
        )
      }

      // Only refresh character data (not full page reload)
      // This updates inventory with new items
      const characterResponse = await fetch(`${API_BASE}/get-character?characterId=hardcoded-demo`)
      if (characterResponse.ok) {
        const characterData = await characterResponse.json()
        setCharacter(characterData)
      }

    } catch (error) {
      console.error('Mining failed:', error)
      toast.error('Mining attempt failed. Please try again.')
    } finally {
      // Remove loading state
      setLoadingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete('mining-action')
        return newSet
      })
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

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.message || result.error)
        return
      }

      // Optimistic update for ALL inventory items in the same category
      setCharacter(prev => prev ? ({
        ...prev,
        inventory: prev.inventory.map(inv => {
          // Unequip items in the same category (auto-replace logic)
          if (inv.item.category === prev.inventory.find(i => i.id === inventoryId)?.item.category &&
            inv.id !== inventoryId &&
            !isEquipped) {
            return { ...inv, isEquipped: false }
          }
          // Update the target item
          if (inv.id === inventoryId) {
            return { ...inv, isEquipped: !isEquipped }
          }
          return inv
        })
      }) : null)

      // Enhanced toast with replacement info
      if (result.replacedItems && result.replacedItems.length > 0) {
        toast.success(
          `${result.item.name} equipped!`,
          {
            description: `Replaced ${result.replacedItems.join(', ')}`,
            duration: 4000
          }
        )
      } else {
        toast.success(
          isEquipped ? `${result.item.name} unequipped` : `${result.item.name} equipped!`,
          {
            description: `${result.item.category.toLowerCase()} • ${result.item.rarity.toLowerCase()}`,
            duration: 3000
          }
        )
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

  const handleSettingsClick = () => {
    // TODO: Implement settings modal
    toast.info('Settings panel coming soon!')
  }

  const handleHomeClick = () => {
    setCurrentView('main')
    setSelectedLocation(null)
  }

  const handleProfileClick = () => {
    setCurrentView('profile')
    setSelectedLocation(null)
  }

  const handleNavMapClick = () => {
    setCurrentView('map')
    setSelectedLocation(null)
  }

  const handleNavInventoryClick = () => {
    setCurrentView('inventory')
    setSelectedLocation(null)
  }

  // Initial loading state (only for app startup)
  if (loading && !travelingTo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Earth className="w-8 h-8 mb-4 text-thin animate-spin mx-auto text-primary" />
          <div className="text-lg font-medium">Loading Wojak Earth...</div>
          <div className="text-sm text-muted-foreground mt-2">Preparing your adventure...</div>
        </div>
      </div>
    )
  }

  // Travel animation state
  if (travelingTo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-2xl mb-4">🤔</div>
          <div>No character data found</div>
        </div>
      </div>
    )
  }

  // Add this new component for the character display
  // const CharacterRenderer: React.FC<{ character: Character }> = ({ character }) => {
  //   const [imageError, setImageError] = useState(false)
  //   const [imageLoading, setImageLoading] = useState(true)

  //   const handleImageLoad = () => {
  //     setImageLoading(false)
  //     setImageError(false)
  //   }

  //   const handleImageError = () => {
  //     setImageLoading(false)
  //     setImageError(true)
  //   }

  //   return (
  //     <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center mb-4 overflow-hidden relative">
  //       {imageLoading && (
  //         <div className="absolute inset-0 flex items-center justify-center">
  //           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  //         </div>
  //       )}

  //       {!imageError ? (
  //         <img
  //           src="/wojak.png"
  //           alt={character.name}
  //           className="w-full h-full object-cover"
  //           onLoad={handleImageLoad}
  //           onError={handleImageError}
  //           style={{ display: imageLoading ? 'none' : 'block' }}
  //         />
  //       ) : (
  //         // Fallback to default wojak image
  //         <img
  //           src="/wojak.png"
  //           alt={character.name}
  //           className="w-full h-full object-cover"
  //           onLoad={() => setImageLoading(false)}
  //           onError={() => {
  //             setImageLoading(false)
  //             // Ultimate fallback
  //             const target = event?.target as HTMLImageElement
  //             if (target) {
  //               target.style.display = 'none'
  //               if (target.parentElement) {
  //                 target.parentElement.innerHTML = '<div class="text-4xl">🥺</div>'
  //               }
  //             }
  //           }}
  //         />
  //       )}
  //     </div>
  //   )
  // }

  const renderMainView = () => (
    <MainView
      character={character}
      playersAtLocation={playersAtLocation}
      onMineClick={() => setCurrentView('mine')}
      onMarketClick={() => setCurrentView('market')}
      onChatClick={() => setCurrentView('chat')}
      onNPCActivityClick={() => setCurrentView('npc-activity')}
    />
  )

  const renderMapView = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <MapIcon className="w-5 h-5" />
        World Map
      </h3>

      <Tabs defaultValue="map" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-muted">
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
                      <span className={`w-2 h-2 rounded-full ${location.difficulty <= 2
                        ? 'bg-green-500'
                        : location.difficulty <= 4
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                        }`} />
                      Level {location.difficulty}
                    </span>
                    <span className="capitalize">{location.biome}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {location.lastActive
                      ? new Date(location.lastActive).toLocaleString()
                      : 'Active recently'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="map">
          <WorldMapView
            locations={locations}
            character={character}
            onTravel={handleTravel}
          />
        </TabsContent>
      </Tabs>
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
            <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-muted">
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
          <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-muted">
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
      </div>
    )
  }

  const renderMineView = () => (
    <MiningView
      character={character}
      loadingItems={loadingItems}
      onMine={handleMining}
    />
  )

  const renderMarketView = () => (
    <MarketView
      character={character}
      selectedLocation={selectedLocation}
      locations={locations}
      marketItems={marketItems}
      loadingItems={loadingItems}
      onPurchase={handlePurchase}
    />
  )

  const renderProfileView = () => (
    <ProfileView character={character} />
  )

  const renderInventoryView = () => (
    <InventoryView
      character={character}
      loadingItems={loadingItems}
      onUseItem={handleUseItem}
      onEquipItem={handleEquipItem}
    />
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

        <div className="bg-muted/30 rounded-lg p-3 h-64 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-muted">
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
      </div>
    )
  }

  return (
    <>
      <Toaster
        position="bottom-left"
        expand={false}
        richColors={true}
        closeButton={false}
        offset={16}
        toastOptions={{
          duration: 7000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '14px',
            padding: '12px 16px',
            zIndex: 99999,
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            opacity: 1,
          },
          className: 'solid-toast',
        }}
      />

      <div className="min-h-screen bg-background">
        {/* Global Navigation */}
        <GlobalNavbar
          character={character}
          onSettingsClick={handleSettingsClick}
          onProfileClick={handleProfileClick}
          onHomeClick={handleHomeClick}  // Add this new handler
          onMapClick={handleNavMapClick}
          onInventoryClick={handleNavInventoryClick}
        />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-md mx-auto">
            {/* <ConnectedPlayerWalletInfo /> */}

            <div className="">
              {currentView === 'main' && renderMainView()}
              {currentView === 'profile' && renderProfileView()}
              {currentView === 'map' && renderMapView()}
              {currentView === 'location' && renderLocationView()}
              {currentView === 'mine' && renderMineView()}
              {currentView === 'market' && renderMarketView()}
              {currentView === 'inventory' && renderInventoryView()}
              {currentView === 'chat' && renderChatView()}
              {currentView === 'npc-activity' && renderNPCActivityView()} {/* Add this line */}
            </div>

            { /* Global Activity Feed */}
            <div className="mt-4 bg-card border rounded-lg p-4">
              <GlobalActivityFeed />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
