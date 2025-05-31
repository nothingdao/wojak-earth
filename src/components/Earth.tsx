// components/Earth.tsx
import { useState, useCallback, useMemo } from "react";
import { Store, Pickaxe, MessageCircle, MapPin } from "lucide-react";
import { EarthSVG } from "./EarthSVG";
import { MAP_REGIONS } from "../utils/world-to-map-data.ts";
import type { MapRegion, ExplorationState, RegionInteraction, Location, Character } from "../types";
import { Button } from "./ui/button";

interface EarthProps {
  onRegionInteraction?: (interaction: RegionInteraction) => void
  playerLocation?: string
  exploredRegions?: string[]
  className?: string
  // New props for travel functionality
  locations?: Location[]
  character?: Character | null
  onTravel?: (locationId: string) => void
}

export default function Earth({
  onRegionInteraction,
  playerLocation,
  exploredRegions = [],
  className = "",
  locations = [],
  character,
  onTravel
}: EarthProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // SVG Path ID to World Location mapping
  const PATH_TO_REGION_MAP: Record<string, string> = useMemo(() => ({
    'Path': 'mining-plains',
    'path1': 'desert-outpost',
    'path2': 'the-glitch-wastes',
    'underland': 'fungi-networks',
    'underland-island': 'crystal-caves',
    'frostpine-reaches': 'frostpine-reaches',
    // Add more mappings as you connect SVG paths to world locations
  }), []);

  // Enhanced regions with dynamic exploration states
  const enhancedRegions = useMemo(() => {
    const regions: Record<string, MapRegion> = { ...MAP_REGIONS };

    // Update exploration states based on player progress
    exploredRegions.forEach(regionKey => {
      if (regions[regionKey]) {
        regions[regionKey] = {
          ...regions[regionKey],
          explorationState: 'explored' as ExplorationState
        };
      }
    });

    return regions;
  }, [exploredRegions]);

  // Helper function to find a location by region name
  const findLocationByRegionName = useCallback((regionName: string): Location | null => {
    if (!locations.length) return null;

    // Try to find by exact name match
    const location = locations.find(loc =>
      loc.name.toLowerCase() === regionName.toLowerCase()
    );

    if (location) return location;

    // Try to find in sub-locations
    for (const loc of locations) {
      if (loc.subLocations) {
        const subLocation = loc.subLocations.find(sub =>
          sub.name.toLowerCase() === regionName.toLowerCase()
        );
        if (subLocation) return subLocation;
      }
    }

    return null;
  }, [locations]);

  // Check if player is already at this location
  const isPlayerAtLocation = useCallback((location: Location): boolean => {
    if (!character) return false;
    return character.currentLocation.id === location.id;
  }, [character]);

  // Land type styling configurations
  const landTypeStyles = useMemo(() => ({
    inhabited: { baseOpacity: 0.8, filter: '' },
    uninhabited: { baseOpacity: 0.3, filter: 'grayscale(0.5)' },
    ruins: { baseOpacity: 0.5, filter: 'sepia(0.3)' },
    wilderness: { baseOpacity: 0.6, filter: 'brightness(0.9)' },
    sacred: { baseOpacity: 0.9, filter: 'hue-rotate(30deg)' },
  }), []);

  // Exploration state configurations
  const explorationStates = useMemo(() => ({
    unexplored: { opacity: 0.1, blur: 'blur-sm', name: 'Unknown Territory' },
    rumors: { opacity: 0.4, blur: 'blur-[1px]', name: 'Distant Rumors' },
    explored: { opacity: 0.7, blur: '', name: 'Explored' },
    known: { opacity: 1.0, blur: '', name: 'Well Known' },
  }), []);

  // Get region configuration by path ID
  const getRegionConfig = useCallback((pathId: string): MapRegion | null => {
    const regionKey = PATH_TO_REGION_MAP[pathId];
    return regionKey ? enhancedRegions[regionKey] || null : null;
  }, [PATH_TO_REGION_MAP, enhancedRegions]);

  // Generate CSS classes for a path
  const getPathStyling = useCallback((pathId: string): string => {
    const region = getRegionConfig(pathId);
    const isPlayerHere = playerLocation === pathId;
    const playerLocationClass = isPlayerHere ? 'ring-2 ring-primary ring-offset-1' : '';

    if (region) {
      const explorationStyle = explorationStates[region.explorationState];
      return `${region.baseColor} ${region.hoverColor} ${explorationStyle.blur} ${playerLocationClass} cursor-pointer transition-all duration-300 hover:brightness-110`;
    }

    return `fill-muted/50 hover:fill-muted/70 opacity-30 blur-sm cursor-pointer transition-all duration-300`;
  }, [explorationStates, getRegionConfig, playerLocation]);

  // Get SVG attributes for a path
  const getPathAttributes = useCallback((pathId: string) => {
    const region = getRegionConfig(pathId);

    if (region) {
      const landStyle = landTypeStyles[region.landType];
      const explorationStyle = explorationStates[region.explorationState];
      const finalOpacity = landStyle.baseOpacity * explorationStyle.opacity;

      return {
        fillOpacity: finalOpacity,
        style: { filter: landStyle.filter },
      };
    }

    return {
      fillOpacity: 0.1,
      style: { filter: 'grayscale(0.8) blur(1px)' },
    };
  }, [explorationStates, getRegionConfig, landTypeStyles]);

  // Get display name for a region
  const getDisplayName = useCallback((pathId: string): string => {
    const region = getRegionConfig(pathId);
    if (!region) return pathId;

    if (region.explorationState === 'unexplored') {
      return explorationStates.unexplored.name;
    }
    if (region.explorationState === 'rumors') {
      return `${region.name} (${explorationStates.rumors.name})`;
    }

    return region.name;
  }, [explorationStates.rumors.name, explorationStates.unexplored.name, getRegionConfig]);

  // Get description for a region
  const getDescription = useCallback((pathId: string): string => {
    const region = getRegionConfig(pathId);

    if (!region) {
      return "An unmapped region. Perhaps worth exploring...";
    }

    const baseDescription = region.lore || region.description;

    switch (region.explorationState) {
      case 'unexplored':
        return "The mists of the unknown shroud this land. What secrets might it hold?";
      case 'rumors':
        return `Travelers speak of ${region.name} in hushed tones. ${baseDescription}`;
      case 'explored':
        return `Recently discovered: ${baseDescription}`;
      case 'known':
        return baseDescription;
      default:
        return baseDescription;
    }
  }, [getRegionConfig]);

  // Enhanced game mechanics
  const exploreRegion = useCallback((pathId: string) => {
    const region = getRegionConfig(pathId);
    if (region?.worldData && onRegionInteraction) {
      console.log(`🔍 Exploring ${region.name}...`);
      console.log(`📊 Difficulty: ${region.worldData.difficulty}`);
      console.log(`🏪 Has Market: ${region.worldData.hasMarket}`);
      console.log(`⛏️ Has Mining: ${region.worldData.hasMining}`);
      console.log(`💬 ${region.worldData.welcomeMessage}`);

      onRegionInteraction({
        regionId: pathId,
        action: 'explore',
        timestamp: new Date()
      });
    }
  }, [getRegionConfig, onRegionInteraction]);

  // Handle travel action
  const handleTravelClick = useCallback((pathId: string) => {
    const region = getRegionConfig(pathId);
    if (!region || !onTravel) return;

    const location = findLocationByRegionName(region.name);
    if (location) {
      onTravel(location.id);
    }
  }, [getRegionConfig, findLocationByRegionName, onTravel]);

  // Render action indicators
  const renderActionButtons = useCallback((pathId: string) => {
    const region = getRegionConfig(pathId);
    if (!region) return null;

    const actions = [];

    if (region.worldData.hasMarket) {
      actions.push(
        <div key="market" className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
          <Store className="w-3 h-3" />
          <span>Market</span>
        </div>
      );
    }

    if (region.worldData.hasMining) {
      actions.push(
        <div key="mining" className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
          <Pickaxe className="w-3 h-3" />
          <span>Mining</span>
        </div>
      );
    }

    if (region.worldData.hasChat) {
      actions.push(
        <div key="chat" className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
          <MessageCircle className="w-3 h-3" />
          <span>Chat</span>
        </div>
      );
    }

    return actions.length > 0 ? (
      <div className="flex flex-wrap gap-2 mt-3">
        {actions}
      </div>
    ) : null;
  }, [getRegionConfig]);

  // Render travel button if location exists
  const renderTravelButton = useCallback((pathId: string) => {
    const region = getRegionConfig(pathId);
    if (!region || !onTravel) return null;

    const location = findLocationByRegionName(region.name);
    if (!location) return null;

    const isAtLocation = isPlayerAtLocation(location);

    return (
      <div className="mt-3 pt-3 border-t">
        <Button
          onClick={() => handleTravelClick(pathId)}
          disabled={isAtLocation}
          className="w-full"
          variant={isAtLocation ? "secondary" : "default"}
          size="sm"
        >
          <MapPin className="w-4 h-4 mr-2" />
          {isAtLocation ? "You are here" : `Travel to ${region.name}`}
        </Button>
      </div>
    );
  }, [getRegionConfig, findLocationByRegionName, isPlayerAtLocation, handleTravelClick, onTravel]);

  // Event handlers
  const handleMouseOver = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGPathElement;
    if (target.tagName === "path" && target.id) {
      setHoveredRegion(target.id);
    }
  }, []);

  const handleMouseOut = useCallback(() => {
    setHoveredRegion(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGPathElement;
    if (target.tagName === "path" && target.id) {
      const newSelection = selectedRegion === target.id ? null : target.id;
      setSelectedRegion(newSelection);

      if (newSelection) {
        exploreRegion(newSelection);
      }
    }
  }, [selectedRegion, exploreRegion]);

  return (
    <div className={`w-full h-auto flex items-center justify-center relative ${className}`}>
      {/* Tooltip */}
      {hoveredRegion && (
        <div className="absolute top-4 right-4 bg-card/95 backdrop-blur-sm text-card-foreground px-3 py-2 rounded-lg shadow-lg border z-50 max-w-xs animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <div className="font-medium text-sm">{getDisplayName(hoveredRegion)}</div>

          {getRegionConfig(hoveredRegion) && (
            <div className="text-xs text-primary mt-1 space-y-0.5">
              <div className="flex items-center gap-1">
                <span className="capitalize">{explorationStates[getRegionConfig(hoveredRegion)!.explorationState].name}</span>
                {getRegionConfig(hoveredRegion)!.landType && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="capitalize text-muted-foreground">{getRegionConfig(hoveredRegion)!.landType}</span>
                  </>
                )}
              </div>
              {playerLocation === hoveredRegion && (
                <div className="text-emerald-600 font-medium text-xs flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  You are here
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-2 border-t pt-1">
            {selectedRegion === hoveredRegion ? 'Click to deselect' : 'Click to explore'}
          </div>
        </div>
      )}

      {/* Info Panel */}
      {selectedRegion && (
        <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm text-card-foreground p-4 rounded-lg shadow-lg border max-w-sm z-50 animate-in fade-in-0 slide-in-from-left-1 duration-300">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg">{getDisplayName(selectedRegion)}</h3>
            <button
              onClick={() => setSelectedRegion(null)}
              className="text-muted-foreground hover:text-card-foreground transition-colors p-1 hover:bg-muted rounded"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
            {getDescription(selectedRegion)}
          </p>

          {getRegionConfig(selectedRegion)?.worldData && (
            <div className="space-y-2 mb-3 p-2 bg-muted/30 rounded-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Difficulty:</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getRegionConfig(selectedRegion)!.worldData.difficulty <= 3
                    ? 'bg-emerald-500'
                    : getRegionConfig(selectedRegion)!.worldData.difficulty <= 6
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                    }`} />
                  <span className="font-mono">{getRegionConfig(selectedRegion)!.worldData.difficulty}/10</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Biome:</span>
                <span className="capitalize font-medium">{getRegionConfig(selectedRegion)!.worldData.biome}</span>
              </div>
            </div>
          )}

          {renderActionButtons(selectedRegion)}
          {renderTravelButton(selectedRegion)}
        </div>
      )}

      {/* SVG Map */}
      <EarthSVG
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        onClick={handleClick}
        getPathStyling={getPathStyling}
        getPathAttributes={getPathAttributes}
      />
    </div>
  );
}
