// src/components/admin/tabs/LocationsTab.tsx
import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { SearchBar } from '../SearchBar'
import { LoadingSpinner } from '../LoadingSpinner'
import { ErrorAlert } from '../ErrorAlert'
import type { AdminLocation } from '@/types'  // Use your existing types

interface LocationsTabProps {
  locations: AdminLocation[]
  searchTerm: string
  onSearchChange: (term: string) => void
  loading: boolean
  error: string | null
  isProcessing: boolean
  onCreateLocation: () => void
  onEditLocation: (location: AdminLocation) => void
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
  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.biome?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-primary font-bold font-mono">
          LOCATIONS ({locations.length})
        </span>
        <Button size="sm" onClick={onCreateLocation} className="text-xs font-mono h-6">
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
                <div key={location.id} className="bg-muted/20 border border-primary/10 rounded p-2 font-mono">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-primary font-bold text-xs">
                          {location.name.toUpperCase()}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {location.biome?.toUpperCase()}
                        </Badge>
                        <Badge
                          variant={location.status === 'explored' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
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
                        onClick={() => onEditLocation(location)}
                        disabled={isProcessing}
                        className="h-5 w-5 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteLocation(location.id, location.name)}
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
