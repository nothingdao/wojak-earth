// src/components/admin/tabs/LocationsTab.tsx
import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Eye, Edit, Trash2, MapPin, Shield } from 'lucide-react'
import { SearchBar } from '../SearchBar'
import { LoadingSpinner } from '../LoadingSpinner'
import { ErrorAlert } from '../ErrorAlert'
import type { Location } from '@/types'

interface LocationsTabProps {
  locations: Location[]
  searchTerm: string
  onSearchChange: (term: string) => void
  loading: boolean
  error: string | null
  isProcessing: boolean
  onCreateLocation: () => void
  onEditLocation: (location: Location) => void
  onDeleteLocation: (locationId: string, locationName: string) => void
}

export const LocationsTab: React.FC<LocationsTabProps> = ({
  locations,
  searchTerm,
  onSearchChange,
  loading,
  error,
  isProcessing,
  onCreateLocation,
  onEditLocation,
  onDeleteLocation
}) => {
  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.location_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.biome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.territory?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getLocationTypeColor = (type: string) => {
    switch (type) {
      case 'REGION': return 'bg-blue-500/20 text-blue-400'
      case 'SETTLEMENT': return 'bg-green-500/20 text-green-400'
      case 'WILDERNESS': return 'bg-yellow-500/20 text-yellow-400'
      case 'RUINS': return 'bg-gray-500/20 text-gray-400'
      case 'DUNGEON': return 'bg-red-500/20 text-red-400'
      case 'SPECIAL': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-muted/20 text-muted-foreground'
    }
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'text-green-400'
    if (difficulty <= 5) return 'text-yellow-400'
    if (difficulty <= 7) return 'text-orange-400'
    return 'text-red-400'
  }

  const marketCount = locations.filter(l => l.has_market).length
  const miningCount = locations.filter(l => l.has_mining).length
  const privateCount = locations.filter(l => l.is_private).length
  const avgDifficulty = locations.length ? Math.round(locations.reduce((sum, l) => sum + l.difficulty, 0) / locations.length) : 0

  return (
    <div className="space-y-3">
      {/* Compact Stats */}
      <div className="bg-muted/30 border border-primary/20 rounded p-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex gap-4 flex-wrap">
            <span><span className="text-muted-foreground">TOTAL:</span> <span className="text-primary">{locations.length}</span></span>
            <span><span className="text-muted-foreground">MARKETS:</span> <span className="text-green-500">{marketCount}</span></span>
            <span><span className="text-muted-foreground">MINING:</span> <span className="text-blue-500">{miningCount}</span></span>
            <span><span className="text-muted-foreground">PRIVATE:</span> <span className="text-red-500">{privateCount}</span></span>
            <span><span className="text-muted-foreground">AVG_DIFF:</span> <span className="text-primary">{avgDifficulty}/10</span></span>
            <span><span className="text-muted-foreground">SHOWING:</span> <span className="text-primary">{filteredLocations.length}</span></span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-primary font-bold font-mono">
          LOCATIONS ({locations.length})
        </span>
        <Button size="sm" className="text-xs font-mono h-6" onClick={onCreateLocation}>
          <Plus className="h-3 w-3 mr-1" />
          ADD
        </Button>
      </div>

      <SearchBar
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="SEARCH_LOCATIONS..."
      />

      {error && (
        <ErrorAlert title="ERROR_LOADING_LOCATIONS" error={error} />
      )}

      <div className="bg-muted/30 border border-primary/20 rounded p-2">
        <ScrollArea className="h-64">
          {loading ? (
            <LoadingSpinner message="LOADING_LOCATIONS..." />
          ) : (
            <div className="space-y-2">
              {filteredLocations.map((location) => (
                <div key={location.id} className="bg-muted/20 border border-primary/10 rounded p-3 font-mono">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      {/* Header Row */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-4 bg-primary/20 rounded-full flex items-center justify-center text-xs">
                          <MapPin className="h-2 w-2" />
                        </div>
                        <div className="flex-1">
                          <div className="text-primary font-bold text-xs">
                            {location.name.toUpperCase()}
                          </div>
                          {location.territory && (
                            <div className="text-xs text-muted-foreground">
                              {location.territory.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <Badge
                          className={`text-xs ${getLocationTypeColor(location.location_type)}`}
                          variant="secondary"
                        >
                          {location.location_type}
                        </Badge>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                        <div>
                          <span className="text-muted-foreground">DIFF:</span>
                          <span className={`font-bold ml-1 ${getDifficultyColor(location.difficulty)}`}>
                            {location.difficulty}/10
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">PLR:</span>
                          <span className="text-primary font-bold ml-1">{location.player_count || 0}</span>
                        </div>
                        {location.min_level && (
                          <div>
                            <span className="text-muted-foreground">MIN:</span>
                            <span className="text-yellow-400 font-bold ml-1">L{location.min_level}</span>
                          </div>
                        )}
                        {location.entry_cost && (
                          <div>
                            <span className="text-muted-foreground">COST:</span>
                            <span className="text-yellow-500 font-bold ml-1">{location.entry_cost}</span>
                          </div>
                        )}
                      </div>

                      {/* Features Row */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-muted-foreground text-xs">FEATURES:</span>
                        <div className="flex gap-1">
                          {location.has_market && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              MARKET
                            </Badge>
                          )}
                          {location.has_mining && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              MINING
                            </Badge>
                          )}
                          {location.has_travel && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              TRAVEL
                            </Badge>
                          )}
                          {location.has_chat && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              CHAT
                            </Badge>
                          )}
                          {location.is_private && (
                            <Badge variant="destructive" className="text-xs px-1 py-0">
                              <Shield className="h-2 w-2 mr-1" />
                              PRIVATE
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {location.biome && (
                          <div>
                            <span className="text-muted-foreground">BIOME:</span>
                            <span className="text-blue-400 ml-1">{location.biome.toUpperCase()}</span>
                          </div>
                        )}
                        {(location.map_x !== null || location.map_y !== null) && (
                          <div>
                            <span className="text-muted-foreground">MAP:</span>
                            <span className="text-cyan-400 ml-1">
                              ({location.map_x || 0}, {location.map_y || 0})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div className="mt-2">
                        <Badge
                          variant={location.status === 'explored' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {location.status?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                        {!location.is_explored && (
                          <Badge variant="outline" className="text-xs ml-1">
                            UNEXPLORED
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditLocation(location)}
                        disabled={isProcessing}
                        className="h-5 w-5 p-0"
                        title="View Details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditLocation(location)}
                        disabled={isProcessing}
                        className="h-5 w-5 p-0"
                        title="Edit Location"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteLocation(location.id, location.name)}
                        disabled={isProcessing}
                        className="h-5 w-5 p-0"
                        title="Delete Location"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredLocations.length === 0 && (
                <div className="text-center py-6 text-muted-foreground font-mono text-xs">
                  {searchTerm
                    ? `NO_LOCATIONS_FOUND_MATCHING "${searchTerm.toUpperCase()}"`
                    : 'NO_LOCATIONS_FOUND'
                  }
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
