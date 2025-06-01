# How to Add & Edit Map Locations

## Overview

The map system uses a status-based approach with automatic styling. There are two main files:

1. **`data/mapLocations.ts`** - Visual map data with themes and status
2. **`data/worldLocations.ts`** - Game logic data

The system automatically applies styling to SVG paths based on their ID - no manual configuration needed in the SVG.

## Location Status System

Each location has a `status` property that determines its visual appearance:

- **`'explored'`** - Clear, full-color theme (player can access)
- **`'unexplored'`** - Blurred fog of war effect
- **`'locked'`** - Grayscale, reduced opacity (level-restricted)
- **`'gm-only'`** - Dark red, very low opacity (GM-controlled content)

## Adding a New Location

### Step 1: Add to World Locations (Game Data)

In `data/worldLocations.ts`, add your location to the `WORLD_LOCATIONS` array:

```typescript
{
  name: 'Volcano Peak',
  description: 'A dangerous mountain with lava flows and rare minerals',
  biome: 'volcanic',
  difficulty: 7,
  hasMarket: false,
  hasMining: true,
  hasChat: true,
  welcomeMessage: 'The heat is overwhelming, but the rewards are great.',
  lore: 'Ancient dwarves once mined here before the volcano awakened.',
  mapX: 500,
  mapY: 150
}
```

### Step 2: Create a Theme (If Needed)

If you're using a new biome, add it to `themes/locationThemes.ts`:

```typescript
volcanic: {
  id: 'volcanic',
  name: 'Volcanic',
  colors: {
    base: 'fill-orange-200',
    hover: 'hover:fill-orange-300',
    border: 'stroke-orange-400'
  },
  opacity: 0.8,
  effects: {
    filter: 'hue-rotate(15deg) brightness(1.1)'
  }
}
```

### Step 3: Add to Map Locations (Visual Data)

In `data/mapLocations.ts`, add the visual map entry:

```typescript
{
  id: 'volcano-peak',           // ← Unique ID for this location
  name: 'Volcano Peak',         // ← Must match worldLocations.ts name
  description: 'A dangerous mountain with lava flows and rare minerals',
  svgPathId: 'volcano-peak',    // ← Must match your SVG path ID exactly
  difficulty: 7,
  theme: LOCATION_THEMES.volcanic,
  status: 'locked',             // ← Set the initial status
  isPlayerHere: false
}
```

### Step 4: Add to SVG

Make sure your SVG has a path with the correct ID:

```xml
<path id="volcano-peak" fill="#272F1B" d="M100,200 L150,180..." />
```

**Important:** The SVG only needs the `id` attribute. All styling is applied automatically by the React component.

## Editing Existing Locations

### Change Status

Edit the location in `data/mapLocations.ts`:

```typescript
{
  id: 'dangerous-area',
  // ... other properties
  status: 'gm-only',  // ← Lock it for GM control
}
```

### Change Appearance

Edit the theme assignment:

```typescript
{
  id: 'underland',
  // ... other properties
  theme: LOCATION_THEMES.desert,  // ← Change theme here
}
```

### Change Game Properties

Edit the location in `data/worldLocations.ts`:

```typescript
{
  name: 'Underland',
  difficulty: 5,      // ← Change difficulty
  hasMarket: false,   // ← Remove market
  // ... other properties
}
```

## Available Status Types

### Explored (`'explored'`)

- **Visual**: Full-color theme, clear and crisp
- **Player Access**: Can travel and interact
- **Use Case**: Areas the player has discovered and can access

### Unexplored (`'unexplored'`)

- **Visual**: Blurred with fog of war effect
- **Player Access**: Cannot travel (hidden from travel options)
- **Use Case**: Areas not yet discovered by the player

### Locked (`'locked'`)

- **Visual**: Grayscale, reduced opacity
- **Player Access**: Visible but cannot travel (level/progression restricted)
- **Use Case**: Areas requiring higher level or quest completion

### GM Only (`'gm-only'`)

- **Visual**: Dark red, very low opacity
- **Player Access**: Completely restricted
- **Use Case**: Content under direct GM control, special events

## Ocean and Background Elements

Ocean and background SVG elements should be marked as explored to prevent fog overlay:

```typescript
{
  id: 'ocean-base',
  name: 'Ocean',
  description: 'The vast ocean surrounding the lands',
  svgPathId: 'oceanBase',      // ← Match exact SVG path ID
  difficulty: 0,
  theme: LOCATION_THEMES.plains,
  status: 'explored',          // ← Always explored
  isPlayerHere: false,
},
```

## Available Themes

### Standard Biome Themes

- `plains` - Green grasslands
- `volcanic` - Orange/red volcanic areas
- `wilderness` - Red wild lands
- `underground` - Amber underground areas
- `alpine` - Cyan snow/ice areas
- `desert` - Yellow desert areas
- `urban` - Blue city areas
- `digital` - Purple digital realms
- `temporal` - Indigo time rifts
- `ossuary` - Gray bone yards
- `electromagnetic` - Slate static fields

### System Themes (Auto-Applied)

- `unexplored` - Gray with blur for fog of war
- `locked` - Grayscale for level-restricted areas
- `gmOnly` - Dark red for GM-controlled content

## Creating Custom Themes

Add to `themes/locationThemes.ts`:

```typescript
mysteriousForest: {
  id: 'mysteriousForest',
  name: 'Mysterious Forest',
  colors: {
    base: 'fill-purple-300',
    hover: 'hover:fill-purple-400',
    border: 'stroke-purple-500'
  },
  opacity: 0.7,
  effects: {
    filter: 'hue-rotate(45deg) saturate(1.2)'
  }
}
```

### Available Effects

```typescript
effects: {
  filter: 'brightness(1.2)',           // Brighter
  filter: 'contrast(1.3)',             // More contrast
  filter: 'saturate(1.5)',             // More saturated
  filter: 'hue-rotate(30deg)',         // Shift colors
  filter: 'sepia(0.5)',                // Brown/aged look
  filter: 'grayscale(0.3)',            // Desaturated
  // Combine multiple:
  filter: 'hue-rotate(15deg) brightness(1.1) saturate(1.2)'
}
```

## How the Auto-Styling Works

1. **SVG Scanning**: The `EarthSVG` component automatically finds all `<path>` elements with `id` attributes
2. **Location Lookup**: For each path ID, it looks up the corresponding location in `MAP_LOCATIONS`
3. **Status-Based Theming**: Based on the location's `status`, it applies the appropriate theme
4. **Dynamic Updates**: When location status changes, the visual appearance updates automatically

## Troubleshooting

### Location Not Showing Proper Status

1. **Check SVG Path ID**: Ensure `svgPathId` in `mapLocations.ts` exactly matches the `id` in your SVG
2. **Verify Status Value**: Make sure `status` is one of: `'explored'`, `'unexplored'`, `'locked'`, `'gm-only'`
3. **Theme Exists**: Verify the theme referenced in `LOCATION_THEMES` exists

### Everything Shows as Fog

1. **Check Console**: Look for console errors about missing themes or locations
2. **Verify Auto-Styling**: Ensure the `useEffect` in `EarthSVG.tsx` is running properly
3. **Status Values**: Check that some locations have `status: 'explored'`

### Travel Button Not Working

1. **Matching Names**: Ensure location name in `mapLocations.ts` matches `worldLocations.ts`
2. **Status Check**: Only `'explored'` locations should show travel options
3. **Locations Prop**: Verify parent component passes correct `locations` array

### Ocean Still Fogged

Add ocean/background elements to `MAP_LOCATIONS` with `status: 'explored'`:

- `oceanBase`
- `Path` (ocean layer)
- `continental-shelf`
- `world-shoreline`

## Status Progression Example

```typescript
// Start as unexplored
status: 'unexplored' // Fog of war

// Player discovers through exploration
status: 'explored' // Clear, accessible

// Later locked due to level requirement
status: 'locked' // Visible but restricted

// GM takes control for special event
status: 'gm-only' // Restricted access
```

The fog of war system will eventually integrate with player level and progression data to automatically manage status transitions.
