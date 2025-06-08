// components/admin/SVGMapperPage.tsx
import { useEffect } from 'react'
import { SVGMapper } from './SVGMapper'
import { useSvgMapper } from '../../hooks/useSvgMapper'

export function SVGMapperPage() {
  const {
    locations,
    loading,
    error,
    fetchLocations,
    createLocation,
    updateLocation,
    linkPath,
    unlinkPath,
    deleteLocation
  } = useSvgMapper()

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  if (loading && locations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading locations...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen absolute w-full left-0">
      <SVGMapper
        locations={locations}
        onCreateLocation={createLocation}
        onUpdateLocation={updateLocation}
        onLinkPath={linkPath}
        onUnlinkPath={unlinkPath}
        onDeleteLocation={deleteLocation}
        onRefreshLocations={fetchLocations}
        loading={loading}
      />
    </div>
  )
}
