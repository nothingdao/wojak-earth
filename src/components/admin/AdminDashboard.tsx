/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/AdminDashboard.tsx
import { useState } from 'react'
import {
  Users,
  MapPin,
  Package,
  Pickaxe,
  TrendingUp,
  Settings,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Activity,
  Database,
  Shield,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

// Import hooks
import {
  useAdminStats,
  useAdminCharacters,
  useAdminMarket,
  useAdminActivity,
  useAdminLocations,
  useAdminItems
} from '@/hooks/useAdminData'

import {
  updateCharacterStats,
  banCharacter,
  createLocation,
  createItem,
  updateLocation,
  updateItem,
  deleteItem,
  deleteLocation,
  addMiningResource,
  deleteMarketListing,
  validateWorldData,
  resetWorldDay,
  createMarketListing
} from '@/lib/admin/adminTools'

import type { Location, Character, Item } from '@/types'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  // Modals
  const [showCreateLocationModal, setShowCreateLocationModal] = useState<boolean>(false)
  const [showCreateItemModal, setShowCreateItemModal] = useState<boolean>(false)
  const [showEditCharacterModal, setShowEditCharacterModal] = useState<boolean>(false)
  const [showEditLocationModal, setShowEditLocationModal] = useState<boolean>(false)
  const [showEditItemModal, setShowEditItemModal] = useState<boolean>(false)
  const [showMiningResourceModal, setShowMiningResourceModal] = useState<boolean>(false)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [showCreateMarketListingModal, setShowCreateMarketListingModal] = useState(false)
  const [showEditMarketListingModal, setShowEditMarketListingModal] = useState(false)
  const [selectedMarketListing, setSelectedMarketListing] = useState(null)

  // Data hooks
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useAdminStats()
  const { characters, loading: charactersLoading, error: charactersError } = useAdminCharacters()
  const { locations, loading: locationsLoading, error: locationsError } = useAdminLocations()
  const { items, loading: itemsLoading, error: itemsError } = useAdminItems()
  const { marketListings, loading: marketLoading, error: marketError, getMarketStats } = useAdminMarket()
  const { activity, loading: activityLoading } = useAdminActivity()


  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'characters', label: 'Characters', icon: Users },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'mining', label: 'Mining', icon: Pickaxe },
    { id: 'economy', label: 'Economy', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const StatCard = ({ title, value, subtitle, icon: Icon, loading = false }: { title: string; value: number; subtitle?: string; icon: React.ElementType; loading?: boolean }) => (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          {loading ? (
            <div className="flex items-center space-x-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <>
              <p className="text-lg font-bold truncate">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </>
          )}
        </div>
        <Icon className="h-5 w-5 text-muted-foreground ml-2 flex-shrink-0" />
      </div>
    </Card>
  )

  const ActivityItem = ({ activity }: { activity: any }) => {
    const getIcon = () => {
      switch (activity.type) {
        case 'character': return <Users className="h-4 w-4" />
        case 'mining': return <Pickaxe className="h-4 w-4" />
        case 'travel': return <MapPin className="h-4 w-4" />
        case 'market': return <Package className="h-4 w-4" />
        default: return <Activity className="h-4 w-4" />
      }
    }

    const getVariant = () => {
      switch (activity.type) {
        case 'character': return 'default'
        case 'mining': return 'secondary'
        case 'travel': return 'outline'
        case 'market': return 'destructive'
        default: return 'default'
      }
    }

    return (
      <div className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg transition-colors">
        <Badge variant={getVariant()} className="p-1">
          {getIcon()}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{activity.action}</p>
          <p className="text-sm text-muted-foreground truncate">{activity.target}</p>
          <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
        </div>
      </div>
    )
  }

  const handleRefreshData = async () => {
    setIsProcessing(true)
    try {
      await refetchStats()
      toast.success('Data refreshed successfully!')
    } catch (error) {
      toast.error('Failed to refresh data')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleValidateWorld = async () => {
    setIsProcessing(true)
    try {
      const issues = await validateWorldData()
      if (issues.length === 0) {
        toast.success('World data is valid! No issues found.')
      } else {
        toast.warning(`Found ${issues.length} data issues`, {
          description: issues.slice(0, 3).join('; ') + (issues.length > 3 ? '...' : '')
        })
      }
    } catch (error) {
      toast.error('Failed to validate world data')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResetWorldDay = async () => {
    if (!confirm('Reset all character energy to 100? This cannot be undone.')) return

    setIsProcessing(true)
    try {
      await resetWorldDay()
      toast.success('World day reset! All characters have full energy.')
    } catch (error) {
      toast.error('Failed to reset world day')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBanCharacter = async (characterId: string, characterName: string) => {
    if (!confirm(`Ban character ${characterName}? This will prevent them from playing.`)) return

    setIsProcessing(true)
    try {
      await banCharacter(characterId, 'Banned by admin')
      toast.success(`${characterName} has been banned`)
    } catch (error) {
      toast.error('Failed to ban character')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEditCharacter = async (characterId: string, updates: Partial<Character>) => {
    setIsProcessing(true)
    try {
      await updateCharacterStats(characterId, updates)
      toast.success('Character updated successfully!')
      setShowEditCharacterModal(false)
      setSelectedCharacter(null)
    } catch (error) {
      toast.error('Failed to update character')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteMarketListing = async (listingId: string, itemName: string) => {
    if (!confirm(`Delete market listing for ${itemName}?`)) return

    setIsProcessing(true)
    try {
      await deleteMarketListing(listingId)
      toast.success('Market listing deleted')
    } catch (error) {
      toast.error('Failed to delete listing')
    } finally {
      setIsProcessing(false)
    }
  }

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Error Display */}
      {statsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Error loading stats: {statsError}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Characters"
          value={stats?.totalCharacters || 0}
          subtitle={`${stats?.activeCharacters || 0} active`}
          icon={Users}
          loading={statsLoading}
        />
        <StatCard
          title="Locations"
          value={stats?.totalLocations || 0}
          subtitle="All biomes"
          icon={MapPin}
          loading={statsLoading}
        />
        <StatCard
          title="Items"
          value={stats?.totalItems || 0}
          subtitle="All categories"
          icon={Package}
          loading={statsLoading}
        />
        <StatCard
          title="Online"
          value={stats?.onlineNow || 0}
          subtitle="Active now"
          icon={Activity}
          loading={statsLoading}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-48">
            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground text-sm">Loading activity...</span>
              </div>
            ) : (
              <div className="space-y-1">
                {activity.map(activityItem => (
                  <ActivityItem key={activityItem.id} activity={activityItem} />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateLocationModal(true)}
            disabled={isProcessing}
            className="w-full justify-start"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Location
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateItemModal(true)}
            disabled={isProcessing}
            className="w-full justify-start"
          >
            <Package className="h-4 w-4 mr-2" />
            Add Item
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            disabled={isProcessing}
            className="w-full justify-start"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleValidateWorld}
            disabled={isProcessing}
            className="w-full justify-start"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Validate Data
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleResetWorldDay}
            disabled={isProcessing}
            className="w-full justify-start"
          >
            <Activity className="h-4 w-4 mr-2" />
            Reset World Day
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  const renderCharacters = () => {
    const filteredCharacters = characters.filter(char =>
      char.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      char.locationName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Characters ({characters.length})</h2>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search characters..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {charactersError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Error loading characters: {charactersError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <ScrollArea className="h-96">
            {charactersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading characters...</span>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredCharacters.map((character) => (
                  <div key={character.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="h-6 w-6 bg-muted rounded-full flex items-center justify-center text-xs">
                            👤
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{character.name}</h4>
                            <p className="text-xs text-muted-foreground">{character.locationName}</p>
                          </div>
                          <Badge variant={character.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {character.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Level:</span>
                            <p className="font-medium">{character.level}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Health:</span>
                            <div className="flex items-center space-x-1">
                              <Progress value={character.health} className="h-1 w-8" />
                              <span>{character.health}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Energy:</span>
                            <div className="flex items-center space-x-1">
                              <Progress value={character.energy} className="h-1 w-8" />
                              <span>{character.energy}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">Coins: </span>
                          <span className="font-medium">{character.coins}</span>
                        </div>
                      </div>

                      <div className="flex space-x-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedCharacter(character)
                            setShowEditCharacterModal(true)
                          }}
                          disabled={isProcessing}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedCharacter(character)
                            setShowEditCharacterModal(true)
                          }}
                          disabled={isProcessing}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleBanCharacter(character.id, character.name)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredCharacters.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? `No characters found matching "${searchTerm}"` : 'No characters found'}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    )
  }

  const renderMarket = () => {
    const marketStats = getMarketStats()

    return (
      <div className="space-y-4">
        {/* Market Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Active Listings"
            value={marketStats.totalListings}
            subtitle={`${marketStats.systemListings} system`}
            icon={Package}
            loading={marketLoading}
          />
          <StatCard
            title="Total Value"
            value={marketStats.totalValue.toLocaleString()}
            subtitle="coins"
            icon={TrendingUp}
            loading={marketLoading}
          />
          <StatCard
            title="Avg Price"
            value={marketStats.avgPrice}
            subtitle="per item"
            icon={Database}
            loading={marketLoading}
          />
          <StatCard
            title="Locations"
            value={Object.keys(marketStats.locationBreakdown).length}
            subtitle="with markets"
            icon={MapPin}
            loading={marketLoading}
          />
        </div>

        {/* Search and Filter */}
        <div className="flex justify-between items-center gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search listings..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => setShowCreateMarketListingModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Listing
          </Button>
        </div>

        {marketError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Error loading market: {marketError}</AlertDescription>
          </Alert>
        )}

        {/* Market Listings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Market Listings ({marketListings.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-80">
              {marketLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading market data...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {marketListings
                    .filter(listing =>
                      !searchTerm ||
                      listing.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      listing.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      listing.sellerName?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((listing) => (
                      <div key={listing.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-sm">{listing.itemName}</h4>
                              <Badge variant={listing.isSystemItem ? 'secondary' : 'default'}>
                                {listing.isSystemItem ? 'System' : 'Player'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {listing.quantity > 0 ? 'Available' : 'Sold Out'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                              <div>
                                <span className="text-muted-foreground">Location:</span>
                                <p className="font-medium">{listing.locationName}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Seller:</span>
                                <p className="font-medium">{listing.sellerName || 'System'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Price:</span>
                                <p className="font-medium text-green-600">{listing.price} coins</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Quantity:</span>
                                <p className="font-medium">{listing.quantity}</p>
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              Created: {listing.createdAt} • Updated: {listing.updatedAt}
                            </div>
                          </div>

                          <div className="flex space-x-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedMarketListing(listing)
                                setShowEditMarketListingModal(true)
                              }}
                              disabled={isProcessing}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteMarketListing(listing.id, listing.itemName)}
                              disabled={isProcessing}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                  {marketListings.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No market listings found
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Market Stats Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">By Location</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {Object.entries(marketStats.locationBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([location, count]) => (
                    <div key={location} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{location}</span>
                      <span className="font-medium">{count} listings</span>
                    </div>
                  ))}
                {Object.keys(marketStats.locationBreakdown).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateMarketListingModal(true)}
                disabled={isProcessing}
                className="w-full justify-start"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add System Listing
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setIsProcessing(true)
                  try {
                    // Remove sold out listings
                    const soldOutListings = marketListings.filter(l => l.quantity === 0)
                    for (const listing of soldOutListings) {
                      await deleteMarketListing(listing.id)
                    }
                    toast.success(`Removed ${soldOutListings.length} sold out listings`)
                  } catch (error) {
                    toast.error('Failed to clean up listings')
                  } finally {
                    setIsProcessing(false)
                  }
                }}
                disabled={isProcessing}
                className="w-full justify-start"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Sold Out
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setIsProcessing(true)
                  try {
                    // Refresh market data - you'd implement this in your hook
                    await refetchMarketListings()
                    toast.success('Market data refreshed')
                  } catch (error) {
                    toast.error('Failed to refresh market data')
                  } finally {
                    setIsProcessing(false)
                  }
                }}
                disabled={isProcessing}
                className="w-full justify-start"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const renderLocations = () => {
    const filteredLocations = locations.filter(location =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.biome.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Locations ({locations.length})</h2>
          <Button size="sm" onClick={() => setShowCreateLocationModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {locationsError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Error loading locations: {locationsError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <ScrollArea className="h-96">
            {locationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading locations...</span>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredLocations.map((location) => (
                  <div key={location.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-sm">{location.name}</h4>
                          <Badge variant="outline">{location.biome}</Badge>
                          <Badge variant={location.status === 'explored' ? 'default' : 'secondary'}>
                            {location.status}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {location.description}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Difficulty:</span>
                            <p className="font-medium">{location.difficulty}/10</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Players:</span>
                            <p className="font-medium">{location.playerCount}</p>
                          </div>
                          {location.parentLocationId && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Parent:</span>
                              <p className="font-medium text-xs">
                                {locations?.find(l => l.id === location.parentLocationId)?.name || 'Unknown'}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-1 mt-2">
                          {location.hasMarket && <Badge variant="outline" className="text-xs">Market</Badge>}
                          {location.hasMining && <Badge variant="outline" className="text-xs">Mining</Badge>}
                          {location.hasTravel && <Badge variant="outline" className="text-xs">Travel</Badge>}
                          {location.hasChat && <Badge variant="outline" className="text-xs">Chat</Badge>}
                        </div>
                      </div>

                      <div className="flex space-x-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLocation(location)
                            setShowEditLocationModal(true)
                          }}
                          disabled={isProcessing}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (!confirm(`Delete location ${location.name}? This cannot be undone.`)) return
                            setIsProcessing(true)
                            try {
                              await deleteLocation(location.id)
                              toast.success(`${location.name} deleted`)
                            } catch (error) {
                              toast.error(error.message || 'Failed to delete location')
                            } finally {
                              setIsProcessing(false)
                            }
                          }}
                          disabled={isProcessing}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredLocations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? `No locations found matching "${searchTerm}"` : 'No locations found'}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    )
  }

  const renderItems = () => {
    const filteredItems = items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Items ({items.length})</h2>
          <Button size="sm" onClick={() => setShowCreateItemModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {itemsError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Error loading items: {itemsError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <ScrollArea className="h-96">
            {itemsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading items...</span>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <Badge variant="outline">{item.category}</Badge>
                          <Badge variant={
                            item.rarity === 'LEGENDARY' ? 'destructive' :
                              item.rarity === 'EPIC' ? 'default' :
                                item.rarity === 'RARE' ? 'secondary' : 'outline'
                          }>
                            {item.rarity}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {item.description}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {item.energyEffect && (
                            <div>
                              <span className="text-muted-foreground">Energy:</span>
                              <p className="font-medium text-blue-600">+{item.energyEffect}</p>
                            </div>
                          )}
                          {item.healthEffect && (
                            <div>
                              <span className="text-muted-foreground">Health:</span>
                              <p className="font-medium text-red-600">+{item.healthEffect}</p>
                            </div>
                          )}
                          {item.durability && (
                            <div>
                              <span className="text-muted-foreground">Durability:</span>
                              <p className="font-medium">{item.durability}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex space-x-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedItem(item)
                            setShowEditItemModal(true)
                          }}
                          disabled={isProcessing}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (!confirm(`Delete item ${item.name}? This cannot be undone.`)) return
                            setIsProcessing(true)
                            try {
                              await deleteItem(item.id)
                              toast.success(`${item.name} deleted`)
                            } catch (error) {
                              toast.error(error.message || 'Failed to delete item')
                            } finally {
                              setIsProcessing(false)
                            }
                          }}
                          disabled={isProcessing}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? `No items found matching "${searchTerm}"` : 'No items found'}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    )
  }

  const renderMining = () => {
    // For mining, we'll show location resources
    // This would need a separate hook for mining resources, but for now we'll create a basic version
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Mining Resources</h2>
          <Button size="sm" onClick={() => setShowMiningResourceModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Resource
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Total Resources"
            value={stats?.totalResources || 0}
            subtitle="across all locations"
            icon={Pickaxe}
            loading={statsLoading}
          />
          <StatCard
            title="Locations"
            value={locations?.filter(l => l.hasMining).length || 0}
            subtitle="with mining"
            icon={MapPin}
            loading={locationsLoading}
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resource Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {locations?.filter(l => l.hasMining).map((location) => (
                <div key={location.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-sm">{location.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Difficulty: {location.difficulty}/10 • {location.biome}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3 mr-1" />
                      Configure
                    </Button>
                  </div>
                </div>
              ))}

              {!locations?.some(l => l.hasMining) && (
                <div className="text-center py-8 text-muted-foreground">
                  No mining locations found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderSettings = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Game Settings</h2>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">World Management</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshData}
              disabled={isProcessing}
              className="w-full justify-start"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
              Refresh All Data
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleValidateWorld}
              disabled={isProcessing}
              className="w-full justify-start"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Validate World Data
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleResetWorldDay}
              disabled={isProcessing}
              className="w-full justify-start"
            >
              <Activity className="h-4 w-4 mr-2" />
              Reset World Day
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">System Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span>2 minutes ago</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin Version:</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Database Status:</span>
                <Badge variant="default">Connected</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Sessions:</span>
                <span>{stats?.onlineNow || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Game Configuration</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Character Energy Cap</span>
              <Input className="w-20" defaultValue="100" type="number" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Daily Mining Limit</span>
              <Input className="w-20" defaultValue="10" type="number" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Market Fee (%)</span>
              <Input className="w-20" defaultValue="5" type="number" />
            </div>
            <Button size="sm" className="w-full">
              Save Configuration
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'characters':
        return renderCharacters()
      case 'locations':
        return renderLocations()
      case 'items':
        return renderItems()
      case 'mining':
        return renderMining()
      case 'economy':
        return renderMarket()
      case 'settings':
        return renderSettings()
      default:
        return renderOverview()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex justify-between items-center py-3 px-4">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Earth Admin</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-muted-foreground hidden sm:inline">Last updated: 2 min ago</span>
            <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-xs">
              A
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          {/* Navigation Select */}
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabs.map((tab) => (
                <SelectItem key={tab.id} value={tab.id}>
                  <div className="flex items-center space-x-2">
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Main Content */}
          {renderContent()}
        </div>
      </div>

      {/* Create Location Modal */}
      <Dialog open={showCreateLocationModal} onOpenChange={setShowCreateLocationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Location</DialogTitle>
            <DialogDescription>
              Add a new explorable area to the world.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault()
            setIsProcessing(true)
            try {
              const formData = new FormData(e.target)
              await createLocation({
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                biome: formData.get('biome') as string,
                difficulty: parseInt(formData.get('difficulty') as string) || 1,
                hasMarket: formData.get('hasMarket') === 'on',
                hasMining: formData.get('hasMining') === 'on',
                parentLocationId: formData.get('parentLocationId') === 'none' ? null : formData.get('parentLocationId'), hasTravel: formData.get('hasTravel') === 'on',
                hasChat: formData.get('hasChat') === 'on',
              })
              toast.success('Location created successfully!')
              setShowCreateLocationModal(false)
            } catch (error) {
              toast.error('Failed to create location')
            } finally {
              setIsProcessing(false)
            }
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" required rows={3} />
              </div>
              <div>
                <Label htmlFor="biome">Biome</Label>
                <Select name="biome" defaultValue="plains">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plains">Plains</SelectItem>
                    <SelectItem value="underground">Underground</SelectItem>
                    <SelectItem value="alpine">Alpine</SelectItem>
                    <SelectItem value="desert">Desert</SelectItem>
                    <SelectItem value="volcanic">Volcanic</SelectItem>
                    <SelectItem value="urban">Urban</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty (1-10)</Label>
                <Input id="difficulty" name="difficulty" type="number" min="1" max="10" defaultValue="1" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="hasMarket" name="hasMarket" defaultChecked />
                  <Label htmlFor="hasMarket">Has Market</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="hasMining" name="hasMining" defaultChecked />
                  <Label htmlFor="hasMining">Has Mining</Label>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowCreateLocationModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? 'Creating...' : 'Create Location'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Item Modal */}
      <Dialog open={showCreateItemModal} onOpenChange={setShowCreateItemModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Item</DialogTitle>
            <DialogDescription>
              Add a new item to the game world.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault()
            setIsProcessing(true)
            try {
              const formData = new FormData(e.target)
              await createItem({
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                category: formData.get('category') as string,
                rarity: formData.get('rarity') as string,
                energyEffect: parseInt(formData.get('energyEffect') as string) || undefined,
                healthEffect: parseInt(formData.get('healthEffect') as string) || undefined,
              })
              toast.success('Item created successfully!')
              setShowCreateItemModal(false)
            } catch (error) {
              toast.error('Failed to create item')
            } finally {
              setIsProcessing(false)
            }
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="itemName">Name</Label>
                <Input id="itemName" name="name" required />
              </div>
              <div>
                <Label htmlFor="itemDescription">Description</Label>
                <Textarea id="itemDescription" name="description" required rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MATERIAL">Material</SelectItem>
                      <SelectItem value="HAT">Hat</SelectItem>
                      <SelectItem value="CLOTHING">Clothing</SelectItem>
                      <SelectItem value="ACCESSORY">Accessory</SelectItem>
                      <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                      <SelectItem value="TOOL">Tool</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rarity">Rarity</Label>
                  <Select name="rarity" defaultValue="COMMON">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMMON">Common</SelectItem>
                      <SelectItem value="UNCOMMON">Uncommon</SelectItem>
                      <SelectItem value="RARE">Rare</SelectItem>
                      <SelectItem value="EPIC">Epic</SelectItem>
                      <SelectItem value="LEGENDARY">Legendary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="energyEffect">Energy Effect</Label>
                  <Input id="energyEffect" name="energyEffect" type="number" placeholder="Optional" />
                </div>
                <div>
                  <Label htmlFor="healthEffect">Health Effect</Label>
                  <Input id="healthEffect" name="healthEffect" type="number" placeholder="Optional" />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowCreateItemModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? 'Creating...' : 'Create Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Character Modal */}
      <Dialog open={showEditCharacterModal} onOpenChange={setShowEditCharacterModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Character</DialogTitle>
            <DialogDescription>
              Modify character stats and properties.
            </DialogDescription>
          </DialogHeader>
          {selectedCharacter && (
            <form onSubmit={async (e) => {
              e.preventDefault()
              setIsProcessing(true)
              try {
                const formData = new FormData(e.target)
                const updates: Partial<Character> = {
                  health: parseInt(formData.get('health') as string),
                  energy: parseInt(formData.get('energy') as string),
                  coins: parseInt(formData.get('coins') as string),
                  level: parseInt(formData.get('level') as string),
                  status: formData.get('status') as string,
                }
                await handleEditCharacter(selectedCharacter.id, updates)
              } catch (error) {
                toast.error('Failed to update character')
              } finally {
                setIsProcessing(false)
              }
            }}>
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Editing: {selectedCharacter.name}
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="health">Health (0-100)</Label>
                    <Input
                      id="health"
                      name="health"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={selectedCharacter.health}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="energy">Energy (0-100)</Label>
                    <Input
                      id="energy"
                      name="energy"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={selectedCharacter.energy}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="coins">Coins</Label>
                    <Input
                      id="coins"
                      name="coins"
                      type="number"
                      min="0"
                      defaultValue={selectedCharacter.coins}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="level">Level</Label>
                    <Input
                      id="level"
                      name="level"
                      type="number"
                      min="1"
                      defaultValue={selectedCharacter.level}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={selectedCharacter.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="BANNED">Banned</SelectItem>
                      <SelectItem value="PENDING_MINT">Pending Mint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditCharacterModal(false)
                    setSelectedCharacter(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? 'Updating...' : 'Update Character'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Location Modal */}
      <Dialog open={showEditLocationModal} onOpenChange={setShowEditLocationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Modify location properties and settings.
            </DialogDescription>
          </DialogHeader>
          {selectedLocation && (
            <form onSubmit={async (e) => {
              e.preventDefault()
              setIsProcessing(true)
              try {
                const formData = new FormData(e.target)
                const updates = {
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                  biome: formData.get('biome') as string,
                  difficulty: parseInt(formData.get('difficulty') as string),
                  hasMarket: formData.get('hasMarket') === 'on',
                  hasMining: formData.get('hasMining') === 'on',
                  hasTravel: formData.get('hasTravel') === 'on',
                  hasChat: formData.get('hasChat') === 'on',
                  parentLocationId: formData.get('parentLocationId') === 'none' ? null : formData.get('parentLocationId'),
                }
                await updateLocation(selectedLocation.id, updates)
                toast.success('Location updated successfully!')
                setShowEditLocationModal(false)
                setSelectedLocation(null)
              } catch (error) {
                toast.error('Failed to update location')
              } finally {
                setIsProcessing(false)
              }
            }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editParentLocation">Parent Location</Label>
                  <Select name="parentLocationId" defaultValue={selectedLocation.parentLocationId || "none"}>
                    <SelectTrigger>
                      <SelectValue placeholder="None (Top Level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Top Level)</SelectItem>
                      {locations?.filter(l => l.id !== selectedLocation.id).map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name} ({location.biome})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editLocationName">Name</Label>
                  <Input id="editLocationName" name="name" defaultValue={selectedLocation.name} required />
                </div>
                <div>
                  <Label htmlFor="editLocationDescription">Description</Label>
                  <Textarea id="editLocationDescription" name="description" defaultValue={selectedLocation.description} required rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="editLocationBiome">Biome</Label>
                    <Select name="biome" defaultValue={selectedLocation.biome}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plains">Plains</SelectItem>
                        <SelectItem value="underground">Underground</SelectItem>
                        <SelectItem value="alpine">Alpine</SelectItem>
                        <SelectItem value="desert">Desert</SelectItem>
                        <SelectItem value="volcanic">Volcanic</SelectItem>
                        <SelectItem value="urban">Urban</SelectItem>
                        <SelectItem value="digital">Digital</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="editLocationDifficulty">Difficulty</Label>
                    <Input id="editLocationDifficulty" name="difficulty" type="number" min="1" max="10" defaultValue={selectedLocation.difficulty} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="editHasMarket" name="hasMarket" defaultChecked={selectedLocation.hasMarket} />
                    <Label htmlFor="editHasMarket">Has Market</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="editHasMining" name="hasMining" defaultChecked={selectedLocation.hasMining} />
                    <Label htmlFor="editHasMining">Has Mining</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="editHasTravel" name="hasTravel" defaultChecked={selectedLocation.hasTravel} />
                    <Label htmlFor="editHasTravel">Has Travel</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="editHasChat" name="hasChat" defaultChecked={selectedLocation.hasChat} />
                    <Label htmlFor="editHasChat">Has Chat</Label>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => {
                  setShowEditLocationModal(false)
                  setSelectedLocation(null)
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? 'Updating...' : 'Update Location'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Item Modal */}
      <Dialog open={showEditItemModal} onOpenChange={setShowEditItemModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Modify item properties and effects.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={async (e) => {
              e.preventDefault()
              setIsProcessing(true)
              try {
                const formData = new FormData(e.target)
                const updates = {
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                  category: formData.get('category') as string,
                  rarity: formData.get('rarity') as string,
                  energyEffect: parseInt(formData.get('energyEffect') as string) || undefined,
                  healthEffect: parseInt(formData.get('healthEffect') as string) || undefined,
                  durability: parseInt(formData.get('durability') as string) || undefined,
                }
                await updateItem(selectedItem.id, updates)
                toast.success('Item updated successfully!')
                setShowEditItemModal(false)
                setSelectedItem(null)
              } catch (error) {
                toast.error('Failed to update item')
              } finally {
                setIsProcessing(false)
              }
            }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editItemName">Name</Label>
                  <Input id="editItemName" name="name" defaultValue={selectedItem.name} required />
                </div>
                <div>
                  <Label htmlFor="editItemDescription">Description</Label>
                  <Textarea id="editItemDescription" name="description" defaultValue={selectedItem.description} required rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="editItemCategory">Category</Label>
                    <Select name="category" defaultValue={selectedItem.category}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MATERIAL">Material</SelectItem>
                        <SelectItem value="HAT">Hat</SelectItem>
                        <SelectItem value="CLOTHING">Clothing</SelectItem>
                        <SelectItem value="ACCESSORY">Accessory</SelectItem>
                        <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                        <SelectItem value="TOOL">Tool</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="editItemRarity">Rarity</Label>
                    <Select name="rarity" defaultValue={selectedItem.rarity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMMON">Common</SelectItem>
                        <SelectItem value="UNCOMMON">Uncommon</SelectItem>
                        <SelectItem value="RARE">Rare</SelectItem>
                        <SelectItem value="EPIC">Epic</SelectItem>
                        <SelectItem value="LEGENDARY">Legendary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="editEnergyEffect">Energy Effect</Label>
                    <Input id="editEnergyEffect" name="energyEffect" type="number" defaultValue={selectedItem.energyEffect || ''} placeholder="Optional" />
                  </div>
                  <div>
                    <Label htmlFor="editHealthEffect">Health Effect</Label>
                    <Input id="editHealthEffect" name="healthEffect" type="number" defaultValue={selectedItem.healthEffect || ''} placeholder="Optional" />
                  </div>
                  <div>
                    <Label htmlFor="editDurability">Durability</Label>
                    <Input id="editDurability" name="durability" type="number" defaultValue={selectedItem.durability || ''} placeholder="Optional" />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => {
                  setShowEditItemModal(false)
                  setSelectedItem(null)
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? 'Updating...' : 'Update Item'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Mining Resource Modal */}
      <Dialog open={showMiningResourceModal} onOpenChange={setShowMiningResourceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mining Resource</DialogTitle>
            <DialogDescription>
              Configure a new mining resource for a location.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault()
            setIsProcessing(true)
            try {
              const formData = new FormData(e.target)
              await addMiningResource(
                formData.get('locationId') as string,
                formData.get('itemId') as string,
                {
                  spawnRate: parseFloat(formData.get('spawnRate') as string),
                  maxPerDay: parseInt(formData.get('maxPerDay') as string) || undefined,
                  difficulty: parseInt(formData.get('difficulty') as string)
                }
              )
              toast.success('Mining resource added successfully!')
              setShowMiningResourceModal(false)
            } catch (error) {
              toast.error('Failed to add mining resource')
            } finally {
              setIsProcessing(false)
            }
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="resourceLocation">Location</Label>
                <Select name="locationId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.filter(l => l.hasMining).map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="resourceItem">Item</Label>
                <Select name="itemId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items?.filter(i => i.category === 'MATERIAL').map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="spawnRate">Spawn Rate (0-1)</Label>
                  <Input id="spawnRate" name="spawnRate" type="number" step="0.01" min="0" max="1" defaultValue="0.1" required />
                </div>
                <div>
                  <Label htmlFor="resourceDifficulty">Difficulty (1-10)</Label>
                  <Input id="resourceDifficulty" name="difficulty" type="number" min="1" max="10" defaultValue="1" required />
                </div>
              </div>
              <div>
                <Label htmlFor="maxPerDay">Max Per Day</Label>
                <Input id="maxPerDay" name="maxPerDay" type="number" min="1" placeholder="Optional limit" />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowMiningResourceModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? 'Adding...' : 'Add Resource'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Market Listing Modal */}
      <Dialog open={showCreateMarketListingModal} onOpenChange={setShowCreateMarketListingModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Market Listing</DialogTitle>
            <DialogDescription>
              Add a new item listing to a location's market.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault()
            setIsProcessing(true)
            try {
              const formData = new FormData(e.target)
              await createMarketListing({
                locationId: formData.get('locationId') as string,
                itemId: formData.get('itemId') as string,
                price: parseInt(formData.get('price') as string),
                quantity: parseInt(formData.get('quantity') as string) || 1,
                isSystemItem: formData.get('isSystemItem') === 'on',
              })
              toast.success('Market listing created successfully!')
              setShowCreateMarketListingModal(false)
            } catch (error) {
              toast.error('Failed to create market listing')
            } finally {
              setIsProcessing(false)
            }
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="marketLocation">Location</Label>
                <Select name="locationId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.filter(l => l.hasMarket).map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} ({location.biome})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="marketItem">Item</Label>
                <Select name="itemId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="price">Price (coins)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="1"
                    required
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    defaultValue="1"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="isSystemItem" name="isSystemItem" defaultChecked />
                <Label htmlFor="isSystemItem">System Item (infinite stock)</Label>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                <strong>Note:</strong> System items have unlimited stock and automatically restock.
                Player items are limited to the quantity specified.
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateMarketListingModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? 'Creating...' : 'Create Listing'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Market Listing Modal */}
      <Dialog open={showEditMarketListingModal} onOpenChange={setShowEditMarketListingModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Market Listing</DialogTitle>
            <DialogDescription>
              Modify the price and quantity of this market listing.
            </DialogDescription>
          </DialogHeader>
          {selectedMarketListing && (
            <form onSubmit={async (e) => {
              e.preventDefault()
              setIsProcessing(true)
              try {
                const formData = new FormData(e.target)
                await updateMarketListing(selectedMarketListing.id, {
                  price: parseInt(formData.get('price') as string),
                  quantity: parseInt(formData.get('quantity') as string),
                })
                toast.success('Market listing updated successfully!')
                setShowEditMarketListingModal(false)
                setSelectedMarketListing(null)
              } catch (error) {
                toast.error('Failed to update market listing')
              } finally {
                setIsProcessing(false)
              }
            }}>
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground bg-muted/50 p-3 rounded">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Item:</span>
                      <p className="font-medium">{selectedMarketListing.itemName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium">{selectedMarketListing.locationName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Seller:</span>
                      <p className="font-medium">{selectedMarketListing.sellerName || 'System'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant={selectedMarketListing.isSystemItem ? 'secondary' : 'default'}>
                        {selectedMarketListing.isSystemItem ? 'System' : 'Player'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="editPrice">Price (coins)</Label>
                    <Input
                      id="editPrice"
                      name="price"
                      type="number"
                      min="1"
                      defaultValue={selectedMarketListing.price}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="editQuantity">Quantity</Label>
                    <Input
                      id="editQuantity"
                      name="quantity"
                      type="number"
                      min="0"
                      defaultValue={selectedMarketListing.quantity}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Set to 0 to mark as sold out
                    </p>
                  </div>
                </div>

                {selectedMarketListing.isSystemItem && (
                  <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                    <strong>System Item:</strong> This item will automatically restock when purchased.
                    Quantity mainly affects display and purchase limits.
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditMarketListingModal(false)
                    setSelectedMarketListing(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? 'Updating...' : 'Update Listing'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
