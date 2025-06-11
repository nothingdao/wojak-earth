// src/components/AdminDashboard.tsx - Refactored with proper separation
import { useState, useCallback } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Users,
  MapPin,
  Package,
  Pickaxe,
  TrendingUp,
  Settings,
  Activity,
  Map
} from 'lucide-react'

// Import refactored components
import { AdminFooter } from './admin/AdminFooter'
import { OverviewTab } from './admin/tabs/OverviewTab'
import { CharactersTab } from './admin/tabs/CharactersTab'
import { LocationsTab } from './admin/tabs/LocationsTab'
import { ItemsTab } from './admin/tabs/ItemsTab'
import { EconomyTab } from './admin/tabs/EconomyTab'
import { SettingsTab } from './admin/tabs/SettingsTab'

// Import modal components
import { EditCharacterModal } from './admin/modals/EditCharacterModal'
import { CreateLocationModal } from './admin/modals/CreateLocationModal'
import { CreateItemModal } from './admin/modals/CreateItemModal'

// Import hooks
import {
  useAdminStats,
  useAdminCharacters,
  useAdminMarket,
  useAdminActivity,
  useAdminLocations,
  useAdminItems
} from '@/hooks/useAdminData'

// Import admin tools
import {
  updateCharacterStats,
  banCharacter,
  createLocation,
  createItem,
  deleteItem,
  deleteLocation,
  deleteMarketListing,
  validateWorldData,
  resetWorldDay
} from '@/lib/admin/adminTools'

// Import SVG Mapper if needed
import { SVGMapperPage } from '@/components/admin/SVGMapperPage'

// Import types
import type { AdminCharacter, AdminLocation, AdminMarketListing } from '@/types'

interface AdminDashboardProps {
  className?: string
}

export default function AdminDashboard({ className }: AdminDashboardProps) {
  // State management
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  // Modal states
  const [showCreateLocationModal, setShowCreateLocationModal] = useState<boolean>(false)
  const [showCreateItemModal, setShowCreateItemModal] = useState<boolean>(false)
  const [showEditCharacterModal, setShowEditCharacterModal] = useState<boolean>(false)
  const [selectedCharacter, setSelectedCharacter] = useState<AdminCharacter | null>(null)

  // Data hooks
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useAdminStats()
  const { characters, loading: charactersLoading, error: charactersError, refetch: refetchCharacters } = useAdminCharacters()
  const { locations, loading: locationsLoading, error: locationsError } = useAdminLocations()
  const { items, loading: itemsLoading, error: itemsError } = useAdminItems()
  const { marketListings, loading: marketLoading, error: marketError, getMarketStats } = useAdminMarket()
  const { activity, loading: activityLoading } = useAdminActivity()

  // Tab configuration
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

  // Action handlers
  const handleRefreshData = useCallback(async () => {
    setIsProcessing(true)
    try {
      await refetchStats()
      toast.success('Data refreshed successfully!')
    } catch (error) {
      toast.error('Failed to refresh data')
    } finally {
      setIsProcessing(false)
    }
  }, [refetchStats])

  const handleValidateWorld = useCallback(async () => {
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
  }, [])

  const handleResetWorldDay = useCallback(async () => {
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
  }, [])

  const handleBanCharacter = useCallback(async (characterId: string, characterName: string) => {
    if (!confirm(`Ban character ${characterName}? This will prevent them from playing.`)) return

    setIsProcessing(true)
    try {
      await banCharacter(characterId, 'Banned by admin')
      toast.success(`${characterName} has been banned`)
      await refetchCharacters()
    } catch (error) {
      toast.error('Failed to ban character')
    } finally {
      setIsProcessing(false)
    }
  }, [refetchCharacters])

  const handleEditCharacter = useCallback((character: AdminCharacter) => {
    setSelectedCharacter(character)
    setShowEditCharacterModal(true)
  }, [])

  const handleEditLocation = useCallback((location: AdminLocation) => {
    setSelectedLocation(location)
    // Set edit location modal state when you add it
  }, [])

  const handleDeleteLocation = useCallback(async (locationId: string, locationName: string) => {
    if (!confirm(`Delete location ${locationName}? This cannot be undone.`)) return

    setIsProcessing(true)
    try {
      await deleteLocation(locationId)
      toast.success(`${locationName} deleted`)
    } catch (error) {
      toast.error(error.message || 'Failed to delete location')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleCreateLocation = useCallback(() => {
    setShowCreateLocationModal(true)
  }, [])

  const handleCreateItem = useCallback(() => {
    setShowCreateItemModal(true)
  }, [])

  const handleEditItem = useCallback((item: Item) => {
    setSelectedItem(item)
    // Set edit item modal state when you add it
  }, [])

  const handleDeleteItem = useCallback(async (itemId: string, itemName: string) => {
    if (!confirm(`Delete item ${itemName}? This cannot be undone.`)) return

    setIsProcessing(true)
    try {
      await deleteItem(itemId)
      toast.success(`${itemName} deleted`)
    } catch (error) {
      toast.error(error.message || 'Failed to delete item')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleCreateMarketListing = useCallback(() => {
    setShowCreateMarketListingModal(true)
  }, [])

  const handleEditMarketListing = useCallback((listing: AdminMarketListing) => {
    setSelectedMarketListing(listing)
    // Set edit market listing modal state when you add it
  }, [])

  const handleDeleteMarketListing = useCallback(async (listingId: string, itemName: string) => {
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
  }, [])

  const handleSaveCharacter = useCallback(async (characterId: string, updates: Partial<AdminCharacter>) => {
    setIsProcessing(true)
    try {
      await updateCharacterStats(characterId, updates)
      toast.success('Character updated successfully!')
      await refetchCharacters()
      setShowEditCharacterModal(false)
      setSelectedCharacter(null)
    } catch (error) {
      toast.error('Failed to update character')
    } finally {
      setIsProcessing(false)
    }
  }, [refetchCharacters])

  const handleCreateLocationSubmit = useCallback(async (locationData: any) => {
    setIsProcessing(true)
    try {
      await createLocation(locationData)
      toast.success('Location created successfully!')
      setShowCreateLocationModal(false)
    } catch (error) {
      toast.error('Failed to create location')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleCreateItemSubmit = useCallback(async (itemData: any) => {
    setIsProcessing(true)
    try {
      await createItem(itemData)
      toast.success('Item created successfully!')
      setShowCreateItemModal(false)
    } catch (error) {
      toast.error('Failed to create item')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            stats={stats}
            activities={activity}
            statsLoading={statsLoading}
            activityLoading={activityLoading}
            statsError={statsError}
            isProcessing={isProcessing}
            onCreateLocation={handleCreateLocation}
            onCreateItem={handleCreateItem}
            onRefreshData={handleRefreshData}
            onValidateWorld={handleValidateWorld}
            onResetWorldDay={handleResetWorldDay}
          />
        )

      case 'characters':
        return (
          <CharactersTab
            characters={characters}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            loading={charactersLoading}
            error={charactersError}
            isProcessing={isProcessing}
            onEditCharacter={handleEditCharacter}
            onBanCharacter={handleBanCharacter}
          />
        )

      case 'locations':
        return (
          <LocationsTab
            locations={locations}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            loading={locationsLoading}
            error={locationsError}
            isProcessing={isProcessing}
            onCreateLocation={handleCreateLocation}
            onEditLocation={handleEditLocation}
            onDeleteLocation={handleDeleteLocation}
          />
        )

      case 'svg-mapper':
        return <SVGMapperPage />

      case 'items':
        return (
          <ItemsTab
            items={items}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            loading={itemsLoading}
            error={itemsError}
            isProcessing={isProcessing}
            onCreateItem={handleCreateItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
          />
        )

      case 'mining':
        // TODO: Create MiningTab component
        return (
          <div className="text-center py-8 text-muted-foreground font-mono">
            MINING_TAB_COMPONENT_NEEDED
          </div>
        )

      case 'economy':
        return (
          <EconomyTab
            marketListings={marketListings}
            marketStats={getMarketStats()}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            loading={marketLoading}
            error={marketError}
            isProcessing={isProcessing}
            onCreateListing={handleCreateMarketListing}
            onEditListing={handleEditMarketListing}
            onDeleteListing={handleDeleteMarketListing}
          />
        )

      case 'settings':
        return (
          <SettingsTab
            stats={stats}
            isProcessing={isProcessing}
            onRefreshData={handleRefreshData}
            onValidateWorld={handleValidateWorld}
            onResetWorldDay={handleResetWorldDay}
          />
        )

      default:
        return (
          <div className="text-center py-8 text-muted-foreground font-mono">
            TAB_NOT_IMPLEMENTED
          </div>
        )
    }
  }

  return (
    <div className={`min-h-screen bg-background font-mono ${className || ''}`}>
      {/* Terminal Header */}

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
          {renderTabContent()}

          {/* Footer */}
          <AdminFooter />
        </div>
      </div>

      {/* TODO: Add modal components here */}

      {/* Edit Character Modal */}
      <EditCharacterModal
        open={showEditCharacterModal}
        onOpenChange={setShowEditCharacterModal}
        character={selectedCharacter}
        onSave={handleSaveCharacter}
        isProcessing={isProcessing}
      />

      {/* Create Location Modal */}
      <CreateLocationModal
        open={showCreateLocationModal}
        onOpenChange={setShowCreateLocationModal}
        onCreate={handleCreateLocationSubmit}
        isProcessing={isProcessing}
      />

      {/* Create Item Modal */}
      <CreateItemModal
        open={showCreateItemModal}
        onOpenChange={setShowCreateItemModal}
        onCreate={handleCreateItemSubmit}
        isProcessing={isProcessing}
      />
    </div>
  )
}
