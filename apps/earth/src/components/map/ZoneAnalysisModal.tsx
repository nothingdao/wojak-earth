import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { isAdmin } from '@/config/admins'
import type { Location } from '@/types'
import { earthMapManifest } from '@/data/earthMapManifest'

import {
  X,
  Shield,
  Users,
  Database,
  Zap,
  DollarSign,
  Store,
  Pickaxe,
  MessageSquare,
  Navigation,
  AlertTriangle,
  MapPin,
  Edit3,
  Check,
  TreePine,
  Info,
  BarChart3,
  Activity
} from 'lucide-react'

interface Character {
  id: string
  level: number
  earth?: number
  current_location_id: string
}

interface ZoneAnalysisModalProps {
  location: Location
  character?: Character
  walletAddress?: string
  locations: Location[]
  onClose: () => void
  onTravel?: (locationId: string) => void
  onSetTravelDestination?: (locationId: string) => void
  onSave?: (locationId: string, updates: Partial<Location>) => Promise<void>
  getBiomeColor: (biome?: string) => string
  getTerritoryColor: (territory?: string) => string
}

export default function ZoneAnalysisModal({
  location,
  character,
  walletAddress,
  locations,
  onClose,
  onTravel,
  onSetTravelDestination,
  onSave,
  getBiomeColor,
  getTerritoryColor
}: ZoneAnalysisModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedLocation, setEditedLocation] = useState<Partial<Location>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isTraveling, setIsTraveling] = useState(false)
  const [isCustomBiome, setIsCustomBiome] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'children'>('info')

const isUserAdmin = walletAddress ? isAdmin(walletAddress) : false

  // Extract unique values from database
  const uniqueBiomes = [...new Set(locations.map(loc => loc.biome).filter(Boolean))].sort()
  const uniqueTerritories = [...new Set(locations.map(loc => loc.territory).filter(Boolean))].sort()
  const uniqueLocationTypes = [...new Set(locations.map(loc => loc.location_type).filter(Boolean))].sort()

  const locationReferences = [
    location.id,
    location._id,
    location.mapRegionId,
    location.map_region_id,
    location.slug,
    location.svgPathId,
    location.svg_path_id,
    location.legacyId,
    location.legacy_id,
  ].filter(Boolean)

  // Find child locations. Parent links may still reference legacy/svg ids after migration.
  const childLocations = locations
    .filter(loc => {
      const parentReference = loc.parentLocationId || loc.parent_location_id
      return !!parentReference && locationReferences.includes(parentReference)
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  // Check for dependencies that would break if ID changes
  const hasDependencies = childLocations.length > 0

  const mapRegionIds = earthMapManifest.regions.map(region => region.id).sort()

  // Helper function to enforce SCREAMING_SNAKE_CASE
  const enforceScreamingSnakeCase = (input: string): string => {
    return input
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  const handleSave = async () => {
    if (!onSave || Object.keys(editedLocation).length === 0) return

    setIsSaving(true)
    try {
      // If ID is changing, we need to handle migration
      if (editedLocation.id && editedLocation.id !== location.id) {
        // This is a complex operation that needs to:
        // 1. Update this location's ID
        // 2. Update all child locations' parent_location_id references
        // 3. Update any character current_location_id references

        console.log(`Migrating location ID from ${location.id} to ${editedLocation.id}`)
        console.log(`Will update ${childLocations.length} child locations`)

        // ID migration not supported in Convex — use Convex dashboard
        alert('Location ID migration must be done via Convex dashboard. Field changes saved without ID update.')
        await onSave(location.id, { ...editedLocation, id: location.id })

        return
      }

      // Normal save for non-ID changes
      await onSave(location.id, editedLocation)
      setIsEditing(false)
      setEditedLocation({})
      setIsCustomBiome(false)
    } catch (error) {
      console.error('Failed to save location:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleMapTravel = async (locationId: string) => {
    if (onTravel) {
      setIsTraveling(true)

      // Set travel destination immediately for line visualization
      if (onSetTravelDestination) {
        onSetTravelDestination(locationId)
      }

      // Brief delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 1600))

      onTravel(locationId)
      onClose() // Close the modal after initiating travel
    }
  }

  return (
    <div className="absolute top-40 left-4 bg-background/80 backdrop-blur-sm border border-border rounded shadow-lg max-w-sm z-40 font-mono">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">

        <div className="flex items-center gap-2">
          <span className="text-primary font-bold text-sm">ZONE_ANALYSIS</span>
          {isUserAdmin && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsEditing(!isEditing)
                if (isEditing) {
                  setEditedLocation({})
                  setIsCustomBiome(false)
                }
              }}
              className="h-6 w-6 p-0 ml-2"
              title={isEditing ? "Cancel editing" : "Edit zone data"}
            >
              <Edit3 className="w-3 h-3" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              disabled={isSaving || Object.keys(editedLocation).length === 0}
              className="h-6 w-6 p-0"
              title="Save changes"
            >
              <Check className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border">
        <Button
          variant={activeTab === 'info' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('info')}
          className="flex-1 rounded-none border-r border-border text-xs"
        >
          <Info className="w-3 h-3 mr-1" />
          INFO
        </Button>
        <Button
          variant={activeTab === 'children' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('children')}
          className="flex-1 rounded-none text-xs"
        >
          <TreePine className="w-3 h-3 mr-1" />
          CHILDREN ({childLocations.length})
        </Button>
      </div>

      {/* Tab Content */}
      <div className="p-3 space-y-3 overflow-y-auto max-h-[60vh]">

        {activeTab === 'info' && (
          <>
            <div>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    value={editedLocation.name ?? location.name}
                    onChange={(e) => setEditedLocation(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-muted border border-border rounded px-2 py-1 text-sm font-bold text-primary"
                    placeholder="Location name"
                  />
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">SLUG (stable world id):</label>
                    <input
                      value={editedLocation.slug ?? location.slug ?? location.legacy_id ?? ''}
                      onChange={(e) => {
                        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
                        setEditedLocation(prev => ({ ...prev, slug }))
                      }}
                      className="w-full bg-muted border border-border rounded px-2 py-1 text-xs font-mono"
                      placeholder="location-slug"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">ID (permanent identifier):</label>
                    <input
                      value={editedLocation.id ?? location.id}
                      onChange={(e) => {
                        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
                        setEditedLocation(prev => ({ ...prev, id: slug }))
                      }}
                      className="w-full bg-muted border border-border rounded px-2 py-1 text-xs font-mono"
                      placeholder="location-id-slug"
                    />
                    {hasDependencies ? (
                      <div className="text-xs text-blue-600">
                        ℹ️ Will migrate {childLocations.length} child location(s) to new ID
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        ✅ No dependencies to migrate
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 col-span-2">
                    <MapPin className="w-3 h-3" />
                    <select
                      value={editedLocation.parent_location_id ?? location.parent_location_id ?? ''}
                      onChange={(e) => setEditedLocation(prev => ({
                        ...prev,
                        parent_location_id: e.target.value || null
                      }))}
                      className="bg-muted border border-border rounded px-2 py-1 text-xs w-full"
                    >
                      <option value="">NO_PARENT_(TOP_LEVEL)</option>
                      {locations
                        .filter(loc => loc.id !== location.id) // Can't be parent of itself
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name.toUpperCase()} ({loc.location_type})
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  <textarea
                    value={editedLocation.description ?? location.description}
                    onChange={(e) => setEditedLocation(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-muted border border-border rounded px-2 py-1 text-xs text-muted-foreground resize-none"
                    rows={3}
                    placeholder="Location description"
                  />
                </div>
              ) : (
                <>
                  <div className="font-bold text-primary text-sm mb-1">{location.name.toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground">{location.description}</div>
                </>
              )}
            </div>

            {/* Technical Specs */}
            <div className="bg-muted/30 border border-border rounded p-2">
              <div className="text-xs text-muted-foreground mb-2">ZONE_SPECIFICATIONS</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {isEditing ? (
                  <>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded"
                        style={{ backgroundColor: getBiomeColor(editedLocation.biome ?? location.biome ?? undefined) }}
                      />
                      {isCustomBiome ? (
                        <div className="flex gap-1 w-full">
                          <input
                            type="text"
                            value={editedLocation.biome ?? ''}
                            onChange={(e) => {
                              const formatted = enforceScreamingSnakeCase(e.target.value)
                              setEditedLocation(prev => ({ ...prev, biome: formatted }))
                            }}
                            placeholder="NEW_BIOME_NAME"
                            className="bg-muted border border-border rounded px-2 py-1 text-xs flex-1"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setIsCustomBiome(false)
                              setEditedLocation(prev => ({ ...prev, biome: location.biome }))
                            }}
                            className="h-6 w-6 p-0"
                            title="Cancel custom biome"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <select
                          value={editedLocation.biome ?? location.biome ?? ''}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM_NEW_BIOME') {
                              setIsCustomBiome(true)
                              setEditedLocation(prev => ({ ...prev, biome: '' }))
                            } else {
                              setEditedLocation(prev => ({ ...prev, biome: e.target.value }))
                            }
                          }}
                          className="bg-muted border border-border rounded px-2 py-1 text-xs w-full"
                        >
                          <option value="">SELECT_BIOME</option>
                          {uniqueBiomes.map(biome => (
                            <option key={biome} value={biome || ''}>{biome?.toUpperCase() || ''}</option>
                          ))}
                          <option value="CUSTOM_NEW_BIOME">+ CREATE_NEW_BIOME</option>
                        </select>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded"
                        style={{ backgroundColor: getTerritoryColor(editedLocation.territory ?? location.territory ?? undefined) }}
                      />
                      <select
                        value={editedLocation.territory ?? location.territory ?? ''}
                        onChange={(e) => setEditedLocation(prev => ({ ...prev, territory: e.target.value }))}
                        className="bg-muted border border-border rounded px-2 py-1 text-xs w-full"
                      >
                        <option value="">SELECT_TERRITORY</option>
                        {uniqueTerritories.map(territory => (
                          <option key={territory} value={territory || ''}>{territory?.toUpperCase() || ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>ACTIVE: {location.player_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Database className="w-3 h-3" />
                      <select
                        value={editedLocation.location_type ?? location.location_type ?? ''}
                        onChange={(e) => setEditedLocation(prev => ({ ...prev, location_type: e.target.value as any }))}
                        className="bg-muted border border-border rounded px-2 py-1 text-xs w-full"
                      >
                        <option value="">SELECT_TYPE</option>
                        {uniqueLocationTypes.map(type => (
                          <option key={type} value={type}>{type.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <select
                        value={editedLocation.chat_scope ?? location.chat_scope ?? 'LOCAL'}
                        onChange={(e) => setEditedLocation(prev => ({ ...prev, chat_scope: e.target.value }))}
                        className="bg-muted border border-border rounded px-2 py-1 text-xs w-full"
                      >
                        <option value="LOCAL">LOCAL</option>
                        <option value="REGIONAL">REGIONAL</option>
                        <option value="GLOBAL">GLOBAL</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1 col-span-2">
                      <Activity className="w-3 h-3" />
                      <input
                        value={editedLocation.status ?? location.status ?? ''}
                        onChange={(e) => setEditedLocation(prev => ({ ...prev, status: e.target.value }))}
                        className="bg-muted border border-border rounded px-2 py-1 text-xs w-full"
                        placeholder="STATUS"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded"
                        style={{ backgroundColor: getBiomeColor(location.biome ?? undefined) }}
                      />
                      <span>BIOME: {location.biome?.toUpperCase() || 'UNKNOWN'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded"
                        style={{ backgroundColor: getTerritoryColor(location.territory ?? undefined) }}
                      />
                      <span>TERRITORY: {location.territory?.toUpperCase() || 'UNKNOWN'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-chart-1">
                      <Users className="w-3 h-3" />
                      <span>ACTIVE: {location.player_count}</span>
                    </div>
                    <div className="flex items-center gap-1 text-chart-5">
                      <Database className="w-3 h-3" />
                      <span>TYPE: {location.location_type}</span>
                    </div>
                    <div className="flex items-center gap-1 text-chart-4">
                      <MessageSquare className="w-3 h-3" />
                      <span>CHAT: {location.chat_scope || 'LOCAL'}</span>
                    </div>

                    {/* Parent Location Section */}
                    {location.parent_location_id && (() => {
                      const parentLocation = locations.find(loc => {
                        const parentReference = location.parentLocationId || location.parent_location_id
                        return loc.id === parentReference ||
                          loc._id === parentReference ||
                          loc.mapRegionId === parentReference ||
                          loc.map_region_id === parentReference ||
                          loc.slug === parentReference ||
                          loc.svgPathId === parentReference ||
                          loc.svg_path_id === parentReference ||
                          loc.legacyId === parentReference ||
                          loc.legacy_id === parentReference
                      })
                      return parentLocation ? (
                        <div className="flex items-center gap-1 text-chart-4 col-span-2">
                          <MapPin className="w-3 h-3" />
                          <span>PARENT: {parentLocation.name.toUpperCase()}</span>
                        </div>
                      ) : null
                    })()}

                    <div className="flex items-center gap-1 text-chart-3 col-span-2">
                      <Database className="w-3 h-3" />
                      <span>SLUG: {location.slug || location.legacy_id || 'UNSET'}</span>
                    </div>

                    {/* ID Section */}
                    <div className="flex items-center gap-1 text-chart-3 col-span-2">
                      <Database className="w-3 h-3" />
                      <span>ID: {location.id}</span>
                    </div>

                    {/* Map Region Section */}
                    <div className="flex items-center gap-1 text-chart-5 col-span-2">
                      <MapPin className="w-3 h-3" />
                      <span>MAP_REGION: {location.map_region_id || location.svg_path_id || 'NOT_ON_MAP'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-muted/30 border border-border rounded p-2">
              <div className="text-xs text-muted-foreground mb-2">ACCESS_REQUIREMENTS</div>
              <div className="space-y-1 text-xs">
                {isEditing ? (
                  <>
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <input
                        type="number"
                        value={editedLocation.difficulty ?? location.difficulty ?? ''}
                        onChange={(e) => setEditedLocation(prev => ({ ...prev, difficulty: parseInt(e.target.value) || 1 }))}
                        className="bg-muted border border-border rounded px-2 py-1 text-xs w-24"
                        placeholder="Difficulty"
                        min="1"
                        max="10"
                      />
                      <span className="text-muted-foreground">DIFFICULTY</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <input
                        type="number"
                        value={editedLocation.min_level ?? location.min_level ?? ''}
                        onChange={(e) => setEditedLocation(prev => ({ ...prev, min_level: parseInt(e.target.value) || undefined }))}
                        className="bg-muted border border-border rounded px-2 py-1 text-xs w-24"
                        placeholder="Min Level"
                      />
                      <span className="text-muted-foreground">MIN_LEVEL</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <input
                        type="number"
                        value={editedLocation.entry_cost ?? location.entry_cost ?? ''}
                        onChange={(e) => setEditedLocation(prev => ({ ...prev, entry_cost: parseInt(e.target.value) || undefined }))}
                        className="bg-muted border border-border rounded px-2 py-1 text-xs w-24"
                        placeholder="Entry Cost"
                      />
                      <span className="text-muted-foreground">ENTRY_COST</span>
                    </div>
                    <div className="flex items-center gap-1 col-span-2">
                      <MapPin className="w-3 h-3" />
                      <select
                        value={editedLocation.map_region_id !== undefined ? editedLocation.map_region_id || '' : location.map_region_id || location.svg_path_id || ''}
                        onChange={(e) => setEditedLocation(prev => ({ ...prev, map_region_id: e.target.value === '' ? null : e.target.value }))}
                        className="bg-muted border border-border rounded px-2 py-1 text-xs w-full"
                      >
                        <option value="">REMOVE_FROM_MAP</option>
                        {mapRegionIds.map(regionId => (
                          <option key={regionId} value={regionId}>{regionId}</option>
                        ))}
                      </select>
                      <span className="text-muted-foreground text-xs">MAP_REGION</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <input
                        type="number"
                        value={editedLocation.map_x ?? location.map_x ?? ''}
                        onChange={(e) => setEditedLocation(prev => ({ ...prev, map_x: e.target.value === '' ? null : Number(e.target.value) }))}
                        className="bg-muted border border-border rounded px-2 py-1 text-xs w-full"
                        placeholder="MAP_X"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <input
                        type="number"
                        value={editedLocation.map_y ?? location.map_y ?? ''}
                        onChange={(e) => setEditedLocation(prev => ({ ...prev, map_y: e.target.value === '' ? null : Number(e.target.value) }))}
                        className="bg-muted border border-border rounded px-2 py-1 text-xs w-full"
                        placeholder="MAP_Y"
                      />
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <input
                        type="checkbox"
                        checked={editedLocation.is_private ?? location.is_private}
                        onChange={(e) => setEditedLocation(prev => ({ ...prev, is_private: e.target.checked }))}
                        className="w-3 h-3"
                      />
                      <Shield className="w-3 h-3" />
                      <span className="text-xs">PRIVATE_LOCATION</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <input
                        type="checkbox"
                        checked={editedLocation.is_explored ?? location.is_explored ?? false}
                        onChange={(e) => setEditedLocation(prev => ({ ...prev, is_explored: e.target.checked }))}
                        className="w-3 h-3"
                      />
                      <Eye className="w-3 h-3" />
                      <span className="text-xs">EXPLORED</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 text-destructive">
                      <Shield className="w-3 h-3" />
                      <span>DIFFICULTY: {location.difficulty}</span>
                    </div>
                    {location.min_level && (
                      <div className={`flex items-center gap-1 ${character && character.level < location.min_level ? 'text-destructive' : 'text-chart-2'}`}>
                        <Zap className="w-3 h-3" />
                        <span>MIN_LEVEL: {location.min_level}</span>
                        {character && character.level < location.min_level && <AlertTriangle className="w-3 h-3" />}
                      </div>
                    )}
                    {location.entry_cost && location.entry_cost > 0 && (
                      <div className={`flex items-center gap-1 ${character && (character.earth || 0) < location.entry_cost ? 'text-destructive' : 'text-chart-2'}`}>
                        <DollarSign className="w-3 h-3" />
                        <span>ENTRY_FEE: {location.entry_cost}_EARTH</span>
                        {character && (character.earth || 0) < location.entry_cost && <AlertTriangle className="w-3 h-3" />}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Available Services */}
            <div className="bg-muted/30 border border-border rounded p-2">
              <div className="text-xs text-muted-foreground mb-2">AVAILABLE_SERVICES</div>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editedLocation.has_market ?? location.has_market}
                      onChange={(e) => setEditedLocation(prev => ({ ...prev, has_market: e.target.checked }))}
                      className="w-3 h-3"
                    />
                    <Store className="w-3 h-3" />
                    <span>MARKET</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editedLocation.has_mining ?? location.has_mining}
                      onChange={(e) => setEditedLocation(prev => ({ ...prev, has_mining: e.target.checked }))}
                      className="w-3 h-3"
                    />
                    <Pickaxe className="w-3 h-3" />
                    <span>MINING</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editedLocation.has_chat ?? location.has_chat}
                      onChange={(e) => setEditedLocation(prev => ({ ...prev, has_chat: e.target.checked }))}
                      className="w-3 h-3"
                    />
                    <MessageSquare className="w-3 h-3" />
                    <span>COMMS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editedLocation.has_travel ?? location.has_travel}
                      onChange={(e) => setEditedLocation(prev => ({ ...prev, has_travel: e.target.checked }))}
                      className="w-3 h-3"
                    />
                    <Navigation className="w-3 h-3" />
                    <span>TRAVEL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editedLocation.has_exchange ?? location.has_exchange}
                      onChange={(e) => setEditedLocation(prev => ({ ...prev, has_exchange: e.target.checked }))}
                      className="w-3 h-3"
                    />
                    <BarChart3 className="w-3 h-3" />
                    <span>EXCHANGE</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {location.has_market && (
                    <Badge variant="secondary" className="text-xs font-mono flex items-center gap-1">
                      <Store className="w-3 h-3" />
                      MARKET
                    </Badge>
                  )}
                  {location.has_mining && (
                    <Badge variant="secondary" className="text-xs font-mono flex items-center gap-1">
                      <Pickaxe className="w-3 h-3" />
                      MINING
                    </Badge>
                  )}
                  {location.has_chat && (
                    <Badge variant="secondary" className="text-xs font-mono flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      COMMS
                    </Badge>
                  )}
                  {location.has_exchange && (
                    <Badge variant="secondary" className="text-xs font-mono flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      EXCHANGE
                    </Badge>
                  )}
                  {location.has_travel && (
                    <Badge variant="secondary" className="text-xs font-mono flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      TRAVEL
                    </Badge>
                  )}
                  {!location.has_market && !location.has_mining && !location.has_chat && !location.has_exchange && !location.has_travel && (
                    <span className="text-xs text-muted-foreground">NO_SERVICES_AVAILABLE</span>
                  )}
                </div>
              )}
            </div>

            {/* Narrative + Media */}
            <div className="bg-muted/30 border border-border rounded p-2">
              <div className="text-xs text-muted-foreground mb-2">NARRATIVE_MEDIA</div>
              {isEditing ? (
                <div className="space-y-2 text-xs">
                  <input
                    value={editedLocation.theme ?? location.theme ?? ''}
                    onChange={(e) => setEditedLocation(prev => ({ ...prev, theme: e.target.value }))}
                    className="w-full bg-muted border border-border rounded px-2 py-1"
                    placeholder="THEME"
                  />
                  <input
                    value={editedLocation.image_url ?? location.image_url ?? ''}
                    onChange={(e) => setEditedLocation(prev => ({ ...prev, image_url: e.target.value }))}
                    className="w-full bg-muted border border-border rounded px-2 py-1"
                    placeholder="IMAGE_URL"
                  />
                  <textarea
                    value={editedLocation.welcome_message ?? location.welcome_message ?? ''}
                    onChange={(e) => setEditedLocation(prev => ({ ...prev, welcome_message: e.target.value }))}
                    className="w-full bg-muted border border-border rounded px-2 py-1 resize-none"
                    rows={2}
                    placeholder="WELCOME_MESSAGE"
                  />
                  <textarea
                    value={editedLocation.lore ?? location.lore ?? ''}
                    onChange={(e) => setEditedLocation(prev => ({ ...prev, lore: e.target.value }))}
                    className="w-full bg-muted border border-border rounded px-2 py-1 resize-none"
                    rows={3}
                    placeholder="LORE"
                  />
                </div>
              ) : (
                <div className="space-y-1 text-xs">
                  <div><span className="text-muted-foreground">THEME:</span> {location.theme || 'NONE'}</div>
                  <div><span className="text-muted-foreground">IMAGE:</span> {location.image_url || 'NONE'}</div>
                  {location.welcome_message && <div><span className="text-muted-foreground">WELCOME:</span> {location.welcome_message}</div>}
                  {location.lore && <div><span className="text-muted-foreground">LORE:</span> {location.lore}</div>}
                </div>
              )}
            </div>

            {/* Travel Action */}
            {onTravel && character && (
              <Button
                onClick={() => handleMapTravel(location.id)}
                disabled={
                  isTraveling ||
                  character.current_location_id === location.id ||
                  (!!location.min_level && character.level < location.min_level) ||
                  (!!location.entry_cost && location.entry_cost > (character.earth || 0)) ||
                  !!location.is_private ||
                  !location.has_travel
                }
                className={`w-full h-8 text-xs font-mono ${character.current_location_id === location.id
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : (!!location.min_level && character.level < location.min_level) ||
                    (!!location.entry_cost && location.entry_cost > (character.earth || 0))
                    ? 'bg-destructive/10 text-destructive cursor-not-allowed border-destructive/30'
                    : 'bg-action text-primary-foreground hover:bg-action/90'
                  }`}
              >
                <Navigation className={`w-3 h-3 mr-2 ${isTraveling ? 'animate-spin' : ''}`} />
                {isTraveling
                  ? 'INITIATING_TRAVEL...'
                  : character.current_location_id === location.id
                    ? 'CURRENT_LOCATION'
                    : (!!location.min_level && character.level < location.min_level)
                      ? `REQ_LVL_${location.min_level}`
                      : (!!location.entry_cost && location.entry_cost > (character.earth || 0))
                        ? `INSUFFICIENT_EARTH`
                        : !location.has_travel
                          ? 'TRAVEL_DISABLED'
                          : `TRAVEL_TO_${location.name.toUpperCase()}`}
              </Button>
            )}
          </>
        )}

        {activeTab === 'children' && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground mb-2">
              CHILD_LOCATIONS ({childLocations.length})
            </div>

            {childLocations.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">
                No child locations found
              </div>
            ) : (
              <div className="space-y-1">
                {childLocations.map(child => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded border border-border text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded"
                        style={{ backgroundColor: getBiomeColor(child.biome ?? undefined) }}
                      />
                      <div>
                        <div className="font-mono font-bold text-primary">
                          {child.name.toUpperCase()}
                        </div>
                        <div className="text-muted-foreground">
                          {child.location_type} • {child.territory?.toUpperCase() || 'NO_TERRITORY'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {child.has_market && <Store className="w-3 h-3 text-chart-2" />}
                      {child.has_mining && <Pickaxe className="w-3 h-3 text-chart-3" />}
                      {child.has_chat && <MessageSquare className="w-3 h-3 text-chart-4" />}
                      {child.has_exchange && <BarChart3 className="w-3 h-3 text-chart-5" />}

                      {onTravel && character && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMapTravel(child.id)}
                          disabled={
                            isTraveling ||
                            character.current_location_id === child.id ||
                            (!!child.min_level && character.level < child.min_level) ||
                            (!!child.entry_cost && child.entry_cost > (character.earth || 0)) ||
                            !!child.is_private ||
                            !child.has_travel
                          }
                          className="h-6 w-6 p-0"
                          title={`Travel to ${child.name}`}
                        >
                          <Navigation className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
