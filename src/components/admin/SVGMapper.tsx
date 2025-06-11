// components/admin/SVGMapper.tsx - Using clean baseSVG
import React, { useState, useCallback, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { baseSVGData, generateStyledSVG, getAllPathIds } from '../../data/baseMapSVG'
import type { DatabaseLocation } from '@/types'

interface SVGMapperProps {
  locations: DatabaseLocation[]
  onCreateLocation: (pathId: string, locationData: CreateLocationData) => Promise<DatabaseLocation>
  onLinkPath: (location_id: string, pathId: string) => Promise<DatabaseLocation>
  onUnlinkPath: (location_id: string) => Promise<DatabaseLocation>
  onRefreshLocations: () => Promise<void>
  loading: boolean
}

interface CreateLocationData {
  name: string
  description: string
  biome: string
  difficulty: number
  has_market: boolean
  has_mining: boolean
  has_travel: boolean
  has_chat: boolean
  theme: string
}

interface CreateLocationForm {
  name: string
  description: string
  biome: string
  difficulty: number
  has_market: boolean
  has_mining: boolean
  has_travel: boolean
  has_chat: boolean
  theme: string
}

export function SVGMapper({
  locations,
  onCreateLocation,
  onLinkPath,
  onUnlinkPath,
  onRefreshLocations,
  loading
}: SVGMapperProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<string>('')

  // Pan and zoom state
  const [svgTransform, setSvgTransform] = useState({ scale: 1, translateX: 0, translateY: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, translateX: 0, translateY: 0 })
  const svgContainerRef = useRef<HTMLDivElement>(null)

  // Form state
  const [createForm, setCreateForm] = useState<CreateLocationForm>({
    name: '',
    description: '',
    biome: 'plains',
    difficulty: 1,
    has_market: false,
    has_mining: false,
    has_travel: true,
    has_chat: true,
    theme: 'default'
  })

  // Get all path IDs from clean SVG data
  const allPathIds = getAllPathIds()

  // Get database location linked to a path
  const getLinkedLocation = useCallback((pathId: string) => {
    return locations.find(loc => loc.svg_path_id === pathId)
  }, [locations])

  // SVG interaction handlers
  const handleSvgMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      translateX: svgTransform.translateX,
      translateY: svgTransform.translateY
    })
  }, [svgTransform])

  const handleSvgMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    setSvgTransform(prev => ({
      ...prev,
      translateX: dragStart.translateX + deltaX,
      translateY: dragStart.translateY + deltaY
    }))
  }, [isDragging, dragStart])

  const handleSvgMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleSvgWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(5, svgTransform.scale * delta))

    setSvgTransform(prev => ({
      ...prev,
      scale: newScale
    }))
  }, [svgTransform.scale])

  const resetSvgView = useCallback(() => {
    setSvgTransform({ scale: 1, translateX: 0, translateY: 0 })
  }, [])

  // Handle path clicks
  const handlePathClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const target = e.target as SVGPathElement
    if (target.tagName === 'path' && target.id) {
      setSelectedPath(selectedPath === target.id ? null : target.id)
    }
  }, [selectedPath])

  // Generate styled SVG with admin styling
  const styledSVGContent = useMemo(() => {
    const getPathStyle = (pathId: string) => {
      const linkedLocation = getLinkedLocation(pathId)
      const isSelected = pathId === selectedPath
      const isLinked = !!linkedLocation

      if (isSelected) {
        return `fill="#3b82f6" stroke="#1d4ed8" stroke-width="4" filter="drop-shadow(0 0 12px rgba(59, 130, 246, 1))" opacity="1" cursor="pointer"`
      } else if (isLinked) {
        return `fill="#10b981" stroke="#059669" stroke-width="2" opacity="0.8" cursor="pointer"`
      } else {
        return `fill="#6b7280" stroke="#4b5563" stroke-width="1" opacity="0.6" cursor="pointer"`
      }
    }

    return generateStyledSVG(getPathStyle)
  }, [selectedPath, getLinkedLocation, locations])

  // Create new location
  const handleCreateLocation = useCallback(async () => {
    if (!selectedPath) return

    try {
      const locationData: CreateLocationData = {
        name: createForm.name || selectedPath.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: createForm.description || `A region mapped from ${selectedPath}`,
        biome: createForm.biome,
        difficulty: createForm.difficulty,
        has_market: createForm.has_market,
        has_mining: createForm.has_mining,
        has_travel: createForm.has_travel,
        has_chat: createForm.has_chat,
        theme: createForm.theme
      }

      await onCreateLocation(selectedPath, locationData)
      await onRefreshLocations()
      setShowCreateForm(false)
      setSelectedPath(null)

      setCreateForm({
        name: '',
        description: '',
        biome: 'plains',
        difficulty: 1,
        has_market: false,
        has_mining: false,
        has_travel: true,
        has_chat: true,
        theme: 'default'
      })
    } catch (error) {
      console.error('Error creating location:', error)
      alert('Error creating location: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }, [selectedPath, createForm, onCreateLocation, onRefreshLocations])

  // Link existing location
  const handleLinkLocation = useCallback(async () => {
    if (!selectedPath || !selectedLocation) return

    try {
      await onLinkPath(selectedLocation, selectedPath)
      await onRefreshLocations()
      setShowLinkForm(false)
      setSelectedPath(null)
      setSelectedLocation('')
    } catch (error) {
      console.error('Error linking location:', error)
      alert('Error linking location: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }, [selectedPath, selectedLocation, onLinkPath, onRefreshLocations])

  // Unlink location
  const handleUnlinkLocation = useCallback(async (location: DatabaseLocation) => {
    try {
      await onUnlinkPath(location.id)
      await onRefreshLocations()
    } catch (error) {
      console.error('Error unlinking location:', error)
      alert('Error unlinking location: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }, [onUnlinkPath, onRefreshLocations])

  // Calculate stats
  const linkedPaths = allPathIds.filter(pathId => getLinkedLocation(pathId))
  const unlinkedPaths = allPathIds.filter(pathId => !getLinkedLocation(pathId))
  const unlinkedLocations = locations.filter(loc => !loc.svg_path_id || !allPathIds.includes(loc.svg_path_id))

  return (
    <div className="flex h-screen">
      {/* Left Panel */}
      <div className="w-96 border-r bg-card overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Clean SVG Manager</h3>
          </div>

          {/* Statistics */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <h4 className="font-medium">Statistics</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>SVG Paths:</strong> {allPathIds.length}</div>
              <div><strong>Linked:</strong> {linkedPaths.length}</div>
              <div><strong>Unlinked:</strong> {unlinkedPaths.length}</div>
              <div><strong>DB Locations:</strong> {locations.length}</div>
            </div>
          </div>

          {/* SVG Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800">Base SVG Data</h4>
            <div className="text-sm text-blue-700">
              <div>ViewBox: {baseSVGData.viewBox}</div>
              <div>Total Paths: {baseSVGData.paths.length}</div>
            </div>
          </div>

          {/* Unlinked Paths */}
          {unlinkedPaths.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Unlinked SVG Paths ({unlinkedPaths.length})</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {unlinkedPaths.map(pathId => (
                  <div
                    key={pathId}
                    className={`p-2 border rounded cursor-pointer text-sm transition-colors ${selectedPath === pathId ? 'bg-blue-100 border-blue-300' : 'hover:bg-muted/50'
                      }`}
                    onClick={() => setSelectedPath(pathId)}
                  >
                    <div className="font-mono break-all">{pathId}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Paths */}
          {linkedPaths.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Linked Paths ({linkedPaths.length})</h4>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {linkedPaths.map(pathId => {
                  const location = getLinkedLocation(pathId)
                  return (
                    <div
                      key={pathId}
                      className={`p-2 border rounded text-sm transition-colors ${selectedPath === pathId ? 'bg-blue-100 border-blue-300' : ''
                        }`}
                      onClick={() => setSelectedPath(pathId)}
                    >
                      <div className="font-mono text-xs text-muted-foreground break-all">{pathId}</div>
                      <div className="font-medium">{location?.name || 'Unknown'}</div>
                      <div className="text-xs text-green-600">✓ Linked</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Unlinked Locations */}
          {unlinkedLocations.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Database Locations Not on Map ({unlinkedLocations.length})</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {unlinkedLocations.map(location => (
                  <div
                    key={location.id}
                    className="p-2 border rounded text-sm"
                  >
                    <div className="font-medium">{location.name}</div>
                    <div className="text-xs text-muted-foreground">{location.biome} • Level {location.difficulty}</div>
                    {location.svg_path_id && (
                      <div className="text-xs text-orange-600">svg_path_id: {location.svg_path_id}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Interactive SVG */}
      <div className="flex-1 p-4">
        <div className="h-full border rounded-lg overflow-hidden bg-muted/20 relative">
          <div
            ref={svgContainerRef}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            style={{
              transform: `scale(${svgTransform.scale}) translate(${svgTransform.translateX}px, ${svgTransform.translateY}px)`,
              transformOrigin: '50% 50%'
            }}
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseUp}
            onWheel={handleSvgWheel}
            onClick={handlePathClick}
            dangerouslySetInnerHTML={{
              __html: styledSVGContent
            }}
          />

          {/* Selected Path Info Panel */}
          {selectedPath && (
            <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm border rounded-lg p-4 max-w-sm">
              <h4 className="font-semibold text-sm mb-2">Selected: {selectedPath}</h4>
              {(() => {
                const linkedLocation = getLinkedLocation(selectedPath)
                if (linkedLocation) {
                  return (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <div className="font-medium text-green-600">✓ Linked to Database</div>
                        <div><strong>Name:</strong> {linkedLocation.name}</div>
                        <div><strong>Biome:</strong> {linkedLocation.biome}</div>
                        <div><strong>Level:</strong> {linkedLocation.difficulty}</div>
                        <div><strong>ID:</strong> <code className="text-xs">{linkedLocation.id}</code></div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnlinkLocation(linkedLocation)}
                        >
                          Unlink
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedPath(null)}
                        >
                          Deselect
                        </Button>
                      </div>
                    </div>
                  )
                } else {
                  return (
                    <div className="space-y-2">
                      <div className="text-sm text-orange-600">⚠ Not linked to database</div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => setShowCreateForm(true)}
                        >
                          Create Location
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowLinkForm(true)}
                        >
                          Link Existing
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedPath(null)}
                        >
                          Deselect
                        </Button>
                      </div>
                    </div>
                  )
                }
              })()}
            </div>
          )}

          {/* SVG Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSvgTransform(prev => ({ ...prev, scale: Math.min(5, prev.scale * 1.2) }))}
              className="w-8 h-8 p-0"
            >
              +
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSvgTransform(prev => ({ ...prev, scale: Math.max(0.1, prev.scale * 0.8) }))}
              className="w-8 h-8 p-0"
            >
              −
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetSvgView}
              className="w-8 h-8 p-0 text-xs"
            >
              ⌂
            </Button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm border rounded-lg p-3">
            <h5 className="font-medium text-xs mb-2">Legend</h5>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-blue-500 border border-blue-600 rounded"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-green-500 border border-green-600 rounded"></div>
                <span>Linked to DB</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-gray-500 border border-gray-600 rounded"></div>
                <span>Unlinked</span>
              </div>
            </div>
          </div>

          {/* Scale indicator */}
          {svgTransform.scale !== 1 && (
            <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm text-card-foreground px-2 py-1 rounded text-xs border">
              {Math.round(svgTransform.scale * 100)}%
            </div>
          )}
        </div>
      </div>

      {/* Create Location Form Modal */}
      {showCreateForm && selectedPath && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4">Create Location for: {selectedPath}</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={selectedPath.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={`A region mapped from ${selectedPath}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Biome</label>
                  <Select value={createForm.biome} onValueChange={(value) => setCreateForm(prev => ({ ...prev, biome: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plains">Plains</SelectItem>
                      <SelectItem value="forest">Forest</SelectItem>
                      <SelectItem value="mountains">Mountains</SelectItem>
                      <SelectItem value="desert">Desert</SelectItem>
                      <SelectItem value="urban">Urban</SelectItem>
                      <SelectItem value="wasteland">Wasteland</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Difficulty</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={createForm.difficulty}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, difficulty: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={createForm.has_market}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, has_market: e.target.checked }))}
                  />
                  <span className="text-sm">Has Market</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={createForm.has_mining}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, has_mining: e.target.checked }))}
                  />
                  <span className="text-sm">Has Mining</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={createForm.has_travel}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, has_travel: e.target.checked }))}
                  />
                  <span className="text-sm">Has Travel</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={createForm.has_chat}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, has_chat: e.target.checked }))}
                  />
                  <span className="text-sm">Has Chat</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateLocation}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Creating...' : 'Create Location'}
                </Button>

                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Location Form Modal */}
      {showLinkForm && selectedPath && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg max-w-lg w-full mx-4">
            <h3 className="font-semibold mb-4">Link Path to Existing Location</h3>
            <p className="text-sm text-muted-foreground mb-4">Path: {selectedPath}</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Location</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unlinkedLocations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} ({location.biome})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleLinkLocation}
                  disabled={!selectedLocation || loading}
                  className="flex-1"
                >
                  {loading ? 'Linking...' : 'Link Location'}
                </Button>

                <Button
                  onClick={() => setShowLinkForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
