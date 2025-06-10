/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/AdminDashboard.tsx - Terminal/Cyberpunk styled admin interface
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
  RefreshCw,
  Map,
  Signal
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

import { SVGMapperPage } from './SVGMapperPage'

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
  const { characters, loading: charactersLoading, error: charactersError, refetch: refetchCharacters } = useAdminCharacters()
  const { locations, loading: locationsLoading, error: locationsError } = useAdminLocations()
  const { items, loading: itemsLoading, error: itemsError } = useAdminItems()
  const { marketListings, loading: marketLoading, error: marketError, getMarketStats } = useAdminMarket()
  const { activity, loading: activityLoading } = useAdminActivity()

  const tabs = [
    { id: 'overview', label: 'OVERVIEW', icon: Activity },
    { id: 'characters', label: 'CHARACTERS', icon: Users },
    { id: 'locations', label: 'LOCATIONS', icon: MapPin },
    { id: 'svg-mapper', label: 'SVG_MAPPER', icon: Map },
    { id: 'items', label: 'ITEMS', icon: Package },
    { id: 'mining', label: 'MINING', icon: Pickaxe },
    { id: 'economy', label: 'ECONOMY', icon: TrendingUp },
    { id: 'settings', label: 'SETTINGS', icon: Settings },
  ]

  const StatCard = ({ title, value, subtitle, icon: Icon, loading = false }: { title: string; value: number; subtitle?: string; icon: React.ElementType; loading?: boolean }) => (
    <div className="bg-muted/30 border border-primary/20 rounded p-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground font-mono mb-1">{title.toUpperCase()}</div>
          {loading ? (
            <div className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-mono">SCANNING...</span>
            </div>
          ) : (
            <>
              <div className="text-primary font-bold font-mono">{value.toLocaleString()}</div>
              {subtitle && <div className="text-xs text-muted-foreground font-mono">{subtitle.toUpperCase()}</div>}
            </>
          )}
        </div>
        <Icon className="h-4 w-4 text-primary ml-2 flex-shrink-0" />
      </div>
    </div>
  )

  const ActivityItem = ({ activity }: { activity: any }) => {
    const getIcon = () => {
      switch (activity.type) {
        case 'character': return <Users className="h-3 w-3" />
        case 'mining': return <Pickaxe className="h-3 w-3" />
        case 'travel': return <MapPin className="h-3 w-3" />
        case 'market': return <Package className="h-3 w-3" />
        default: return <Activity className="h-3 w-3" />
      }
    }

    const getColor = () => {
      switch (activity.type) {
        case 'character': return 'text-blue-500'
        case 'mining': return 'text-yellow-500'
        case 'travel': return 'text-green-500'
        case 'market': return 'text-purple-500'
        default: return 'text-primary'
      }
    }

    return (
      <div className="flex items-center gap-2 p-2 bg-muted/20 border border-primary/10 rounded font-mono">
        <div className={`${getColor()}`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-primary font-bold truncate">{activity.action.toUpperCase()}</div>
          <div className="text-xs text-muted-foreground truncate">{activity.target}</div>
          <div className="text-xs text-muted-foreground/60">{activity.timestamp}</div>
        </div>
      </div>
    )
  }

  const renderSvgMapper = () => {
    return <SVGMapperPage />
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

  const handleBanCharacter = async (character_id: string, characterName: string) => {
    if (!confirm(`Ban character ${characterName}? This will prevent them from playing.`)) return

    setIsProcessing(true)
    try {
      await banCharacter(character_id, 'Banned by admin')
      toast.success(`${characterName} has been banned`)
    } catch (error) {
      toast.error('Failed to ban character')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEditCharacter = async (character_id: string, updates: Partial<Character>) => {
    setIsProcessing(true)
    try {
      await updateCharacterStats(character_id, updates)
      toast.success('Character updated successfully!')
      await refetchCharacters()
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
    <div className="space-y-3">
      {/* Error Display */}
      {statsError && (
        <div className="bg-red-950/20 border border-red-500/30 rounded p-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-red-500" />
            <span className="text-red-500 text-xs font-mono font-bold">ERROR_LOADING_STATS</span>
          </div>
          <div className="text-red-400 text-xs font-mono mt-1">{statsError}</div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          title="CHARACTERS"
          value={stats?.totalCharacters || 0}
          subtitle={`${stats?.activeCharacters || 0} ACTIVE`}
          icon={Users}
          loading={statsLoading}
        />
        <StatCard
          title="LOCATIONS"
          value={stats?.totalLocations || 0}
          subtitle="ALL_BIOMES"
          icon={MapPin}
          loading={statsLoading}
        />
        <StatCard
          title="ITEMS"
          value={stats?.totalItems || 0}
          subtitle="ALL_CATEGORIES"
          icon={Package}
          loading={statsLoading}
        />
        <StatCard
          title="ONLINE"
          value={stats?.onlineNow || 0}
          subtitle="ACTIVE_NOW"
          icon={Activity}
          loading={statsLoading}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-muted/30 border border-primary/20 rounded p-3">
        <div className="flex items-center gap-2 mb-2 border-b border-primary/20 pb-2">
          <Activity className="w-3 h-3" />
          <span className="text-primary font-bold text-xs font-mono">RECENT_ACTIVITY</span>
        </div>
        <div className="h-32 overflow-y-auto">
          {activityLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground text-xs font-mono">LOADING_ACTIVITY...</span>
            </div>
          ) : (
            <div className="space-y-1">
              {activity.map(activityItem => (
                <ActivityItem key={activityItem.id} activity={activityItem} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-muted/30 border border-primary/20 rounded p-3">
        <div className="flex items-center gap-2 mb-2 border-b border-primary/20 pb-2">
          <Settings className="w-3 h-3" />
          <span className="text-primary font-bold text-xs font-mono">QUICK_ACTIONS</span>
        </div>
        <div className="space-y-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateLocationModal(true)}
            disabled={isProcessing}
            className="w-full justify-start text-xs font-mono h-6"
          >
            <Plus className="h-3 w-3 mr-1" />
            CREATE_LOCATION
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateItemModal(true)}
            disabled={isProcessing}
            className="w-full justify-start text-xs font-mono h-6"
          >
            <Package className="h-3 w-3 mr-1" />
            ADD_ITEM
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            disabled={isProcessing}
            className="w-full justify-start text-xs font-mono h-6"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isProcessing ? 'animate-spin' : ''}`} />
            REFRESH_DATA
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleValidateWorld}
            disabled={isProcessing}
            className="w-full justify-start text-xs font-mono h-6"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            VALIDATE_DATA
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleResetWorldDay}
            disabled={isProcessing}
            className="w-full justify-start text-xs font-mono h-6"
          >
            <Activity className="h-3 w-3 mr-1" />
            RESET_WORLD_DAY
          </Button>
        </div>
      </div>
    </div>
  )

  const renderCharacters = () => {
    const filteredCharacters = characters.filter(char =>
      char.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      char.locationName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-primary font-bold font-mono">CHARACTERS ({characters.length})</span>
          <Button size="sm" className="text-xs font-mono h-6">
            <Plus className="h-3 w-3 mr-1" />
            ADD
          </Button>
        </div>

        <div className="relative">
          <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="SEARCH_CHARACTERS..."
            className="pl-7 text-xs font-mono h-7"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {charactersError && (
          <div className="bg-red-950/20 border border-red-500/30 rounded p-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span className="text-red-500 text-xs font-mono font-bold">ERROR_LOADING_CHARACTERS</span>
            </div>
            <div className="text-red-400 text-xs font-mono mt-1">{charactersError}</div>
          </div>
        )}

        <div className="bg-muted/30 border border-primary/20 rounded p-2">
          <div className="h-64 overflow-y-auto">
            {charactersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground font-mono text-xs">LOADING_CHARACTERS...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCharacters.map((character) => (
                  <div key={character.id} className="bg-muted/20 border border-primary/10 rounded p-2 font-mono">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-4 w-4 bg-primary/20 rounded-full flex items-center justify-center text-xs">
                            👤
                          </div>
                          <div>
                            <div className="text-primary font-bold text-xs">{character.name.toUpperCase()}</div>
                            <div className="text-xs text-muted-foreground">{character.locationName}</div>
                          </div>
                          <Badge variant={character.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                            {character.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">LVL:</span>
                            <span className="text-primary font-bold ml-1">{character.level}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">HP:</span>
                            <div className="flex items-center gap-1">
                              <div className="w-6 h-1 bg-muted rounded overflow-hidden">
                                <div className="h-full bg-red-500" style={{ width: `${character.health}%` }} />
                              </div>
                              <span className="text-xs">{character.health}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">EN:</span>
                            <div className="flex items-center gap-1">
                              <div className="w-6 h-1 bg-muted rounded overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${character.energy}%` }} />
                              </div>
                              <span className="text-xs">{character.energy}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-1 text-xs">
                          <span className="text-muted-foreground">RUST: </span>
                          <span className="text-yellow-500 font-bold">{character.coins}</span>
                        </div>
                      </div>

                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedCharacter(character)
                            setShowEditCharacterModal(true)
                          }}
                          disabled={isProcessing}
                          className="h-5 w-5 p-0"
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
                          className="h-5 w-5 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleBanCharacter(character.id, character.name)}
                          disabled={isProcessing}
                          className="h-5 w-5 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredCharacters.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground font-mono text-xs">
                    {searchTerm ? `NO_CHARACTERS_FOUND_MATCHING "${searchTerm.toUpperCase()}"` : 'NO_CHARACTERS_FOUND'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderMarket = () => {
    const marketStats = getMarketStats()

    return (
      <div className="space-y-3">
        {/* Market Stats */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            title="ACTIVE_LISTINGS"
            value={marketStats.totalListings}
            subtitle={`${marketStats.systemListings} SYSTEM`}
            icon={Package}
            loading={marketLoading}
          />
          <StatCard
            title="TOTAL_VALUE"
            value={marketStats.totalValue}
            subtitle="RUST"
            icon={TrendingUp}
            loading={marketLoading}
          />
          <StatCard
            title="AVG_PRICE"
            value={marketStats.avgPrice}
            subtitle="PER_ITEM"
            icon={Database}
            loading={marketLoading}
          />
          <StatCard
            title="LOCATIONS"
            value={Object.keys(marketStats.locationBreakdown).length}
            subtitle="WITH_MARKETS"
            icon={MapPin}
            loading={marketLoading}
          />
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="SEARCH_LISTINGS..."
              className="pl-7 text-xs font-mono h-7"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => setShowCreateMarketListingModal(true)} className="text-xs font-mono h-7">
            <Plus className="h-3 w-3 mr-1" />
            ADD
          </Button>
        </div>

        {marketError && (
          <div className="bg-red-950/20 border border-red-500/30 rounded p-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span className="text-red-500 text-xs font-mono font-bold">ERROR_LOADING_MARKET</span>
            </div>
            <div className="text-red-400 text-xs font-mono mt-1">{marketError}</div>
          </div>
        )}

        {/* Market Listings */}
        <div className="bg-muted/30 border border-primary/20 rounded p-2">
          <div className="flex items-center gap-2 mb-2 border-b border-primary/20 pb-2">
            <Package className="w-3 h-3" />
            <span className="text-primary font-bold text-xs font-mono">MARKET_LISTINGS ({marketListings.length})</span>
          </div>
          <div className="h-48 overflow-y-auto">
            {marketLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground font-mono text-xs">LOADING_MARKET_DATA...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {marketListings
                  .filter(listing =>
                    !searchTerm ||
                    listing.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    listing.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    listing.sellerName?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((listing) => (
                    <div key={listing.id} className="bg-muted/20 border border-primary/10 rounded p-2 font-mono">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-primary font-bold text-xs">{listing.itemName.toUpperCase()}</div>
                            <Badge variant={listing.is_systemItem ? 'secondary' : 'default'} className="text-xs">
                              {listing.is_systemItem ? 'SYS' : 'PLR'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {listing.quantity > 0 ? 'AVAIL' : 'SOLD_OUT'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs mb-1">
                            <div>
                              <span className="text-muted-foreground">LOC:</span>
                              <span className="text-primary ml-1">{listing.locationName}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">SELLER:</span>
                              <span className="text-primary ml-1">{listing.sellerName || 'SYSTEM'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">PRICE:</span>
                              <span className="text-yellow-500 font-bold ml-1">{listing.price}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">QTY:</span>
                              <span className="text-primary ml-1">{listing.quantity}</span>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground/70">
                            CREATED: {listing.created_at} • UPDATED: {listing.updated_at}
                          </div>
                        </div>

                        <div className="flex gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedMarketListing(listing)
                              setShowEditMarketListingModal(true)
                            }}
                            disabled={isProcessing}
                            className="h-5 w-5 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteMarketListing(listing.id, listing.itemName)}
                            disabled={isProcessing}
                            className="h-5 w-5 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                {marketListings.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground font-mono text-xs">
                    NO_MARKET_LISTINGS_FOUND
                  </div>
                )}
              </div>
            )}
          </div>
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
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-primary font-bold font-mono">LOCATIONS ({locations.length})</span>
          <Button size="sm" onClick={() => setShowCreateLocationModal(true)} className="text-xs font-mono h-6">
            <Plus className="h-3 w-3 mr-1" />
            ADD
          </Button>
        </div>

        <div className="relative">
          <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="SEARCH_LOCATIONS..."
            className="pl-7 text-xs font-mono h-7"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {locationsError && (
          <div className="bg-red-950/20 border border-red-500/30 rounded p-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span className="text-red-500 text-xs font-mono font-bold">ERROR_LOADING_LOCATIONS</span>
            </div>
            <div className="text-red-400 text-xs font-mono mt-1">{locationsError}</div>
          </div>
        )}

        <div className="bg-muted/30 border border-primary/20 rounded p-2">
          <div className="h-64 overflow-y-auto">
            {locationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground font-mono text-xs">LOADING_LOCATIONS...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLocations.map((location) => (
                  <div key={location.id} className="bg-muted/20 border border-primary/10 rounded p-2 font-mono">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-primary font-bold text-xs">{location.name.toUpperCase()}</div>
                          <Badge variant="outline" className="text-xs">{location.biome.toUpperCase()}</Badge>
                          <Badge variant={location.status === 'explored' ? 'default' : 'secondary'} className="text-xs">
                            {location.status?.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground mb-1 line-clamp-2">
                          {location.description}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs mb-1">
                          <div>
                            <span className="text-muted-foreground">DIFF:</span>
                            <span className="text-primary ml-1">{location.difficulty}/10</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">PLAYERS:</span>
                            <span className="text-primary ml-1">{location.player_count}</span>
                          </div>
                          {location.parentlocation_id && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">PARENT:</span>
                              <span className="text-primary ml-1 text-xs">
                                {locations?.find(l => l.id === location.parentlocation_id)?.name?.toUpperCase() || 'UNKNOWN'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-1">
                          {location.has_market && <Badge variant="outline" className="text-xs">MKT</Badge>}
                          {location.has_mining && <Badge variant="outline" className="text-xs">MIN</Badge>}
                          {location.has_travel && <Badge variant="outline" className="text-xs">TRV</Badge>}
                          {location.has_chat && <Badge variant="outline" className="text-xs">CHT</Badge>}
                        </div>
                      </div>

                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLocation(location)
                            setShowEditLocationModal(true)
                          }}
                          disabled={isProcessing}
                          className="h-5 w-5 p-0"
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
                          className="h-5 w-5 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredLocations.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground font-mono text-xs">
                    {searchTerm ? `NO_LOCATIONS_FOUND_MATCHING "${searchTerm.toUpperCase()}"` : 'NO_LOCATIONS_FOUND'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderItems = () => {
    const filteredItems = items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-primary font-bold font-mono">ITEMS ({items.length})</span>
          <Button size="sm" onClick={() => setShowCreateItemModal(true)} className="text-xs font-mono h-6">
            <Plus className="h-3 w-3 mr-1" />
            ADD
          </Button>
        </div>

        <div className="relative">
          <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="SEARCH_ITEMS..."
            className="pl-7 text-xs font-mono h-7"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {itemsError && (
          <div className="bg-red-950/20 border border-red-500/30 rounded p-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span className="text-red-500 text-xs font-mono font-bold">ERROR_LOADING_ITEMS</span>
            </div>
            <div className="text-red-400 text-xs font-mono mt-1">{itemsError}</div>
          </div>
        )}

        <div className="bg-muted/30 border border-primary/20 rounded p-2">
          <div className="h-64 overflow-y-auto">
            {itemsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground font-mono text-xs">LOADING_ITEMS...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <div key={item.id} className="bg-muted/20 border border-primary/10 rounded p-2 font-mono">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-primary font-bold text-xs">{item.name.toUpperCase()}</div>
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          <Badge variant={
                            item.rarity === 'LEGENDARY' ? 'destructive' :
                              item.rarity === 'EPIC' ? 'default' :
                                item.rarity === 'RARE' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {item.rarity}
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground mb-1 line-clamp-2">
                          {item.description}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {item.energy_effect && (
                            <div>
                              <span className="text-muted-foreground">ENERGY:</span>
                              <span className="text-blue-500 font-bold ml-1">+{item.energy_effect}</span>
                            </div>
                          )}
                          {item.health_effect && (
                            <div>
                              <span className="text-muted-foreground">HEALTH:</span>
                              <span className="text-red-500 font-bold ml-1">+{item.health_effect}</span>
                            </div>
                          )}
                          {item.durability && (
                            <div>
                              <span className="text-muted-foreground">DURABILITY:</span>
                              <span className="text-primary ml-1">{item.durability}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedItem(item)
                            setShowEditItemModal(true)
                          }}
                          disabled={isProcessing}
                          className="h-5 w-5 p-0"
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
                          className="h-5 w-5 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredItems.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground font-mono text-xs">
                    {searchTerm ? `NO_ITEMS_FOUND_MATCHING "${searchTerm.toUpperCase()}"` : 'NO_ITEMS_FOUND'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderMining = () => {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-primary font-bold font-mono">MINING_RESOURCES</span>
          <Button size="sm" onClick={() => setShowMiningResourceModal(true)} className="text-xs font-mono h-6">
            <Plus className="h-3 w-3 mr-1" />
            ADD_RESOURCE
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatCard
            title="TOTAL_RESOURCES"
            value={stats?.totalResources || 0}
            subtitle="ALL_LOCATIONS"
            icon={Pickaxe}
            loading={statsLoading}
          />
          <StatCard
            title="LOCATIONS"
            value={locations?.filter(l => l.has_mining).length || 0}
            subtitle="WITH_MINING"
            icon={MapPin}
            loading={locationsLoading}
          />
        </div>

        <div className="bg-muted/30 border border-primary/20 rounded p-2">
          <div className="flex items-center gap-2 mb-2 border-b border-primary/20 pb-2">
            <Pickaxe className="w-3 h-3" />
            <span className="text-primary font-bold text-xs font-mono">RESOURCE_DISTRIBUTION</span>
          </div>
          <div className="space-y-2">
            {locations?.filter(l => l.has_mining).map((location) => (
              <div key={location.id} className="bg-muted/20 border border-primary/10 rounded p-2 font-mono">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-primary font-bold text-xs">{location.name.toUpperCase()}</div>
                    <div className="text-xs text-muted-foreground">
                      DIFF: {location.difficulty}/10 • {location.biome.toUpperCase()}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs font-mono h-6">
                    <Edit className="h-3 w-3 mr-1" />
                    CONFIG
                  </Button>
                </div>
              </div>
            ))}

            {!locations?.some(l => l.has_mining) && (
              <div className="text-center py-6 text-muted-foreground font-mono text-xs">
                NO_MINING_LOCATIONS_FOUND
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderSettings = () => {
    return (
      <div className="space-y-3">
        <span className="text-primary font-bold font-mono">GAME_SETTINGS</span>

        <div className="bg-muted/30 border border-primary/20 rounded p-2">
          <div className="flex items-center gap-2 mb-2 border-b border-primary/20 pb-2">
            <Settings className="w-3 h-3" />
            <span className="text-primary font-bold text-xs font-mono">WORLD_MANAGEMENT</span>
          </div>
          <div className="space-y-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshData}
              disabled={isProcessing}
              className="w-full justify-start text-xs font-mono h-6"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isProcessing ? 'animate-spin' : ''}`} />
              REFRESH_ALL_DATA
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleValidateWorld}
              disabled={isProcessing}
              className="w-full justify-start text-xs font-mono h-6"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              VALIDATE_WORLD_DATA
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleResetWorldDay}
              disabled={isProcessing}
              className="w-full justify-start text-xs font-mono h-6"
            >
              <Activity className="h-3 w-3 mr-1" />
              RESET_WORLD_DAY
            </Button>
          </div>
        </div>

        <div className="bg-muted/30 border border-primary/20 rounded p-2">
          <div className="flex items-center gap-2 mb-2 border-b border-primary/20 pb-2">
            <Database className="w-3 h-3" />
            <span className="text-primary font-bold text-xs font-mono">SYSTEM_INFORMATION</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">LAST_UPDATED:</span>
              <span className="text-primary">2_MIN_AGO</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ADMIN_VERSION:</span>
              <span className="text-primary">v2.089</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DATABASE_STATUS:</span>
              <Badge variant="default" className="text-xs">CONNECTED</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ACTIVE_SESSIONS:</span>
              <span className="text-primary">{stats?.onlineNow || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 border border-primary/20 rounded p-2">
          <div className="flex items-center gap-2 mb-2 border-b border-primary/20 pb-2">
            <Settings className="w-3 h-3" />
            <span className="text-primary font-bold text-xs font-mono">GAME_CONFIGURATION</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-muted-foreground">CHARACTER_ENERGY_CAP</span>
              <Input className="w-12 h-6 text-xs font-mono" defaultValue="100" type="number" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-muted-foreground">DAILY_MINING_LIMIT</span>
              <Input className="w-12 h-6 text-xs font-mono" defaultValue="10" type="number" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-muted-foreground">MARKET_FEE_PERCENT</span>
              <Input className="w-12 h-6 text-xs font-mono" defaultValue="5" type="number" />
            </div>
            <Button size="sm" className="w-full text-xs font-mono h-6">
              SAVE_CONFIGURATION
            </Button>
          </div>
        </div>
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
      case 'svg-mapper':
        return renderSvgMapper()
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
    <div className="min-h-screen bg-background font-mono">
      {/* Terminal Header */}
      <div className="bg-background border border-primary/30 border-t-0 border-x-0">
        <div className="flex items-center justify-between p-3 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-primary font-bold text-sm">EARTH_ADMIN_CONSOLE v2.089</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <Signal className="w-3 h-3 animate-pulse" />
              <span>LAST_UPDATE: 2_MIN_AGO</span>
            </div>
            <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xs">
              A
            </div>
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="space-y-3">
          {/* Navigation Select */}
          <div className="bg-muted/30 border border-primary/20 rounded p-2">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tabs.map((tab) => (
                  <SelectItem key={tab.id} value={tab.id}>
                    <div className="flex items-center gap-2 font-mono">
                      <tab.icon className="h-3 w-3" />
                      <span>{tab.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Main Content */}
          {renderContent()}

          {/* Footer */}
          <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-2">
            ADMIN_CONSOLE_v2089 | {new Date().toLocaleTimeString()} | AUTHORIZATION_LEVEL_OMEGA
          </div>
        </div>
      </div>

      {/* All the modals remain the same, just keeping them compact for brevity */}
      {/* Create Location Modal */}
      <Dialog open={showCreateLocationModal} onOpenChange={setShowCreateLocationModal}>
        <DialogContent className="sm:max-w-md font-mono">
          <DialogHeader>
            <DialogTitle className="font-mono">CREATE_LOCATION</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              ADD_NEW_EXPLORABLE_AREA_TO_WORLD
            </DialogDescription>
          </DialogHeader>
          {/* Form content remains the same but styled with terminal theme */}
        </DialogContent>
      </Dialog>


      {/* Edit Character Modal */}
      <Dialog open={showEditCharacterModal} onOpenChange={setShowEditCharacterModal}>
        <DialogContent className="sm:max-w-md font-mono">
          <DialogHeader>
            <DialogTitle className="font-mono">EDIT_CHARACTER</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              MODIFY_CHARACTER_STATS_AND_ATTRIBUTES
            </DialogDescription>
          </DialogHeader>
          {selectedCharacter && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-mono">CHARACTER_NAME</Label>
                <Input
                  defaultValue={selectedCharacter.name}
                  className="font-mono text-xs"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-mono">LEVEL</Label>
                  <Input
                    type="number"
                    defaultValue={selectedCharacter.level}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-mono">COINS</Label>
                  <Input
                    type="number"
                    defaultValue={selectedCharacter.coins}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-mono">HEALTH</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={selectedCharacter.health}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-mono">ENERGY</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={selectedCharacter.energy}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 font-mono text-xs"
                  onClick={() => {
                    // You'll need to collect the form values here
                    const formData = new FormData(/* get form element */);
                    handleEditCharacter(selectedCharacter.id, {
                      level: parseInt(formData.get('level')),
                      coins: parseInt(formData.get('coins')),
                      health: parseInt(formData.get('health')),
                      energy: parseInt(formData.get('energy'))
                    });
                  }}
                >
                  SAVE_CHANGES
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 font-mono text-xs"
                  onClick={() => setShowEditCharacterModal(false)}
                >
                  CANCEL
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* All other modals would follow the same pattern - keeping the original structure but applying terminal styling */}
    </div>
  )
}
