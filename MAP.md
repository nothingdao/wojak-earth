# Map Color System Documentation

## Overview

The map color system provides a comprehensive, parametric approach to managing all map-related colors in the game. Built on OKLCH color space and CSS custom properties, it offers scientific color harmony, automatic dark mode support, and accessibility compliance.

## Architecture

### 🎨 Color Space: OKLCH

- **O** (Lightness): 0.0 (black) to 1.0 (white)
- **K** (Chroma): 0.0 (gray) to 0.4+ (vivid)
- **L** (Hue): 0-360 degrees around the color wheel
- **C** (Alpha): Optional transparency

**Why OKLCH?** Unlike HSL or RGB, OKLCH provides perceptual uniformity - equal changes in values produce equal perceptual changes in color.

### 🏗️ System Structure

```
Base Parameters → Generated Colors → State Variants → Utility Classes
     ↓                  ↓               ↓              ↓
   Hues            Biome Colors    hover/selected   CSS Classes
  Lightness        Travel States      active         Animations
  Chroma          Player Indicators   disabled       Fallbacks
```

## Configuration

### Base Parameters

#### Hue Values (0-360°)

```css
--map-forest-hue: 140; /* Green family */
--map-desert-hue: 45; /* Orange/amber family */
--map-urban-hue: 220; /* Blue family */
--map-plains-hue: 100; /* Light green family */
--map-mountain-hue: 280; /* Purple family */
--map-water-hue: 200; /* Cyan family */
--map-swamp-hue: 80; /* Yellow-green family */
--map-tundra-hue: 240; /* Cool neutral */
--map-default-hue: 0; /* Neutral gray */
```

#### Lightness Levels (0.0-1.0)

```css
--map-lightness-base: 0.55; /* Default state */
--map-lightness-hover: 0.65; /* Mouse hover */
--map-lightness-selected: 0.75; /* User selection */
--map-lightness-active: 0.8; /* Player location */
--map-lightness-disabled: 0.4; /* Inaccessible */
--map-lightness-muted: 0.45; /* De-emphasized */
```

#### Chroma (Saturation) Levels (0.0-0.4+)

```css
--map-chroma-base: 0.12; /* Default saturation */
--map-chroma-hover: 0.15; /* Slight increase on hover */
--map-chroma-selected: 0.18; /* More vibrant when selected */
--map-chroma-active: 0.2; /* Most vibrant for active */
--map-chroma-disabled: 0.05; /* Nearly grayscale */
--map-chroma-muted: 0.08; /* Subdued appearance */
```

### Special Chroma Overrides

```css
--map-chroma-water: 0.15; /* Water needs more saturation */
--map-chroma-desert: 0.16; /* Desert needs warmth */
--map-chroma-tundra: 0.06; /* Tundra should be desaturated */
```

## Generated Colors

### Biome Color Pattern

Each biome automatically generates 5 state variants:

```css
/* Example: Forest colors */
--map-forest: oklch(
  var(--map-lightness-base) var(--map-chroma-base) var(--map-forest-hue)
);
--map-forest-hover: oklch(
  var(--map-lightness-hover) var(--map-chroma-hover) var(--map-forest-hue)
);
--map-forest-selected: oklch(
  var(--map-lightness-selected) var(--map-chroma-selected) var(--map-forest-hue)
);
--map-forest-active: oklch(
  var(--map-lightness-active) var(--map-chroma-active) var(--map-forest-hue)
);
--map-forest-disabled: oklch(
  var(--map-lightness-disabled) var(--map-chroma-disabled) var(--map-forest-hue)
);
```

### Available Biomes

- `forest` - Green woodland areas
- `desert` - Orange/amber arid regions
- `urban` - Blue city districts
- `plains` - Light green grasslands
- `mountain` - Purple rocky terrain
- `water` - Cyan aquatic areas
- `swamp` - Yellow-green wetlands
- `tundra` - Cool neutral frozen areas
- `default` - Gray unmapped regions

## Usage in Code

### Basic Biome Colors

```javascript
// Get base biome color
const forestColor = getBiomeColor('forest')

// Get state-specific color
const hoverColor = getBiomeColor('forest', 'hover')
const selectedColor = getBiomeColor('desert', 'selected')
const activeColor = getBiomeColor('water', 'active')
```

### Special State Colors

```javascript
// Player location
const playerColor = style.getPropertyValue('--map-player-location').trim()

// Travel states
const originColor = style.getPropertyValue('--map-travel-origin').trim()
const destinationColor = style
  .getPropertyValue('--map-travel-destination')
  .trim()

// Selection
const selectionColor = style.getPropertyValue('--map-selection-primary').trim()
```

### CSS Utility Classes

```html
<!-- Text colors -->
<span class="map-forest">Forest text</span>
<span class="map-desert">Desert text</span>

<!-- Background colors -->
<div class="bg-map-water">Water background</div>
<div class="bg-map-mountain">Mountain background</div>

<!-- Border colors -->
<div class="border-map-plains border-2">Plains border</div>

<!-- State classes -->
<div class="map-hover">Hover effect</div>
<div class="map-selected">Selected state</div>
<div class="map-disabled">Disabled state</div>
```

## Customization Guide

### 🎯 Adjusting Global Appearance

**Make all colors brighter:**

```css
:root {
  --map-lightness-base: 0.65; /* Increase from 0.55 */
}
```

**Make all colors more vibrant:**

```css
:root {
  --map-chroma-base: 0.18; /* Increase from 0.12 */
}
```

**Shift entire palette warmer:**

```css
:root {
  --map-forest-hue: 150; /* +10° warmer */
  --map-water-hue: 210; /* +10° warmer */
  /* etc... */
}
```

### 🌈 Adding New Biomes

1. **Define the hue:**

```css
:root {
  --map-volcanic-hue: 15; /* Red-orange for volcanic */
}
```

2. **Generate the color variants:**

```css
/* Volcanic Colors */
--map-volcanic: oklch(
  var(--map-lightness-base) var(--map-chroma-base) var(--map-volcanic-hue)
);
--map-volcanic-hover: oklch(
  var(--map-lightness-hover) var(--map-chroma-hover) var(--map-volcanic-hue)
);
--map-volcanic-selected: oklch(
  var(--map-lightness-selected) var(--map-chroma-selected) var(--map-volcanic-hue)
);
--map-volcanic-active: oklch(
  var(--map-lightness-active) var(--map-chroma-active) var(--map-volcanic-hue)
);
--map-volcanic-disabled: oklch(
  var(--map-lightness-disabled) var(--map-chroma-disabled) var(--map-volcanic-hue)
);
```

3. **Add utility classes:**

```css
.map-volcanic {
  color: var(--map-volcanic);
}
.bg-map-volcanic {
  background-color: var(--map-volcanic);
}
.border-map-volcanic {
  border-color: var(--map-volcanic);
}
```

4. **Update the getBiomeColor function:**

```javascript
case 'volcanic': return style.getPropertyValue(`--map-volcanic${suffix}`).trim()
```

### 🌙 Dark Mode Adjustments

Dark mode automatically adjusts lightness and chroma values. To customize:

```css
.dark {
  /* Make dark mode less saturated */
  --map-chroma-base: 0.1;

  /* Make dark mode darker */
  --map-lightness-base: 0.4;

  /* Override specific biome in dark mode */
  --map-forest: oklch(0.5 0.15 140); /* Custom forest for dark */
}
```

### 🎨 Color Harmony Tips

**Complementary colors** (opposite on color wheel):

- Forest (140°) ↔ Mountain (280°) = 140° apart ✓
- Desert (45°) ↔ Water (200°) = 155° apart ✓

**Analogous colors** (adjacent on color wheel):

- Plains (100°) → Forest (140°) → 40° apart ✓
- Swamp (80°) → Plains (100°) → 20° apart ✓

**Triadic colors** (120° apart):

- Red (0°) → Green (120°) → Blue (240°)

## Accessibility

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  :root {
    --map-chroma-base: 0.2; /* More saturated */
    --map-lightness-base: 0.7; /* Higher contrast */
  }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .animate-map-travel-pulse,
  .animate-map-selection-glow {
    animation: none;
  }
}
```

### Color Blindness Considerations

- **Protanopia/Deuteranopia**: Avoid red-green combinations
- **Tritanopia**: Avoid blue-yellow combinations
- **Solution**: Use lightness/chroma differences, not just hue

## Browser Support

### Modern Browsers (OKLCH Support)

- Chrome 111+
- Firefox 113+
- Safari 15.4+

### Legacy Fallbacks

Automatic hex fallbacks provided:

```css
@supports not (color: oklch(0.5 0.1 180)) {
  :root {
    --map-forest: #16a34a;
    --map-desert: #ea580c;
    /* etc... */
  }
}
```

## Troubleshooting

### Colors Not Appearing

1. **Check import order** in `index.css`:

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import './map.css'; /* Must be after tailwind */
```

2. **Verify CSS custom property syntax**:

```css
/* ✅ Correct */
color: var(--map-forest);

/* ❌ Incorrect */
color: var(map-forest);
```

3. **Check browser DevTools** for computed values:

```javascript
getComputedStyle(document.documentElement).getPropertyValue('--map-forest')
```

### Performance Optimization

```css
/* Use transform instead of changing colors for animations */
.map-region:hover {
  transform: scale(1.02); /* Better than changing fill */
}

/* Prefer opacity changes over color changes */
.map-region:disabled {
  opacity: 0.5; /* Better than --map-forest-disabled */
}
```

## Examples

### Complete Biome Implementation

```javascript
// In your component
const getRegionStyle = (biome, state) => {
  const baseColor = getBiomeColor(biome)
  const stateColor = getBiomeColor(biome, state)

  return {
    fill: stateColor || baseColor,
    stroke: style.getPropertyValue('--map-border-base').trim(),
    opacity: state === 'disabled' ? 0.5 : 1,
  }
}

// Usage
const forestHover = getRegionStyle('forest', 'hover')
const desertSelected = getRegionStyle('desert', 'selected')
```

### Dynamic Theme Switching

```javascript
// Change global saturation
document.documentElement.style.setProperty('--map-chroma-base', '0.2')

// Change specific biome hue
document.documentElement.style.setProperty('--map-water-hue', '180')

// Reset to defaults
document.documentElement.style.removeProperty('--map-chroma-base')
```

---

## Quick Reference

| Variable                  | Purpose      | Range    | Example                |
| ------------------------- | ------------ | -------- | ---------------------- |
| `--map-{biome}-hue`       | Color family | 0-360°   | `140` (green)          |
| `--map-lightness-{state}` | Brightness   | 0.0-1.0  | `0.65` (light)         |
| `--map-chroma-{state}`    | Saturation   | 0.0-0.4+ | `0.15` (moderate)      |
| `--map-{biome}`           | Base color   | oklch()  | `oklch(0.55 0.12 140)` |
| `--map-{biome}-{state}`   | State color  | oklch()  | `oklch(0.65 0.15 140)` |

**States:** `base`, `hover`, `selected`, `active`, `disabled`  
**Biomes:** `forest`, `desert`, `urban`, `plains`, `mountain`, `water`, `swamp`, `tundra`, `default`
