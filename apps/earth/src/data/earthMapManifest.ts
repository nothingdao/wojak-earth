import { baseSVGData } from './baseMapSVG'

export interface EarthMapRegion {
  id: string
  pathId: string
  d: string
}

export interface EarthMapManifest {
  id: 'earth-2089'
  version: 1
  viewBox: string
  regions: EarthMapRegion[]
}

// Static visual map manifest. Convex locations bind to these regions with
// location.mapRegionId; Convex should not store SVG geometry.
export const earthMapManifest: EarthMapManifest = {
  id: 'earth-2089',
  version: 1,
  viewBox: baseSVGData.viewBox,
  regions: baseSVGData.paths.map(path => ({
    id: path.id,
    pathId: path.id,
    d: path.d,
  })),
}

export const earthMapRegionIds = new Set(earthMapManifest.regions.map(region => region.id))
