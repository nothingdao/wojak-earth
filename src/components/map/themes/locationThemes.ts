import type { LocationTheme } from '@/types'

// themes/locationThemes.ts - All visual themes including Alpine
export const LOCATION_THEMES: Record<string, LocationTheme> = {
  plains: {
    id: 'plains',
    name: 'Grassy Plains',
    colors: {
      base: 'fill-green-200',
      hover: 'hover:fill-green-300',
      border: 'stroke-green-400',
    },
    opacity: 0.8,
    effects: {},
  },

  invisible: {
    id: 'invisible',
    name: 'invisible',
    colors: {
      base: 'none',
      hover: 'none',
      border: 'none',
    },
    opacity: 0.8,
    effects: {},
  },

  volcanic: {
    id: 'volcanic',
    name: 'Volcanic',
    colors: {
      base: 'fill-orange-200',
      hover: 'hover:fill-orange-300',
      border: 'stroke-orange-100',
    },
    opacity: 0.8,
    effects: {
      filter: 'hue-rotate(15deg) brightness(1.1)',
    },
  },

  wilderness: {
    id: 'wilderness',
    name: 'Wild Lands',
    colors: {
      base: 'fill-red-100',
      hover: 'hover:fill-red-300',
      border: 'stroke-red-400',
    },
    opacity: 0.8,
    effects: {},
  },

  underground: {
    id: 'underground',
    name: 'Underground',
    colors: {
      base: 'fill-amber-100',
      hover: 'hover:fill-amber-200',
      border: 'stroke-amber',
    },
    opacity: 0.8,
    effects: {},
  },

  alpine: {
    id: 'alpine',
    name: 'Alpine',
    colors: {
      base: 'fill-cyan-100',
      hover: 'hover:fill-cyan-200',
      border: 'stroke-cyan-400',
    },
    opacity: 0.8,
    effects: {
      filter: 'brightness(1.1)',
    },
  },

  desert: {
    id: 'desert',
    name: 'Desert',
    colors: {
      base: 'fill-yellow-100',
      hover: 'hover:fill-yellow-200',
      border: 'stroke-yellow-400',
    },
    opacity: 0.7,
    effects: {
      filter: 'brightness(0.9)',
    },
  },

  urban: {
    id: 'urban',
    name: 'City',
    colors: {
      base: 'fill-blue-200',
      hover: 'hover:fill-blue-300',
      border: 'stroke-blue-400',
    },
    opacity: 0.8,
    effects: {},
  },

  digital: {
    id: 'digital',
    name: 'Digital Realm',
    colors: {
      base: 'fill-purple-200',
      hover: 'hover:fill-purple-300',
      border: 'stroke-purple-400',
    },
    opacity: 0.8,
    effects: {
      filter: 'hue-rotate(10deg)',
    },
  },

  temporal: {
    id: 'temporal',
    name: 'Time Rift',
    colors: {
      base: 'fill-indigo-200',
      hover: 'hover:fill-indigo-300',
      border: 'stroke-indigo-400',
    },
    opacity: 0.9,
    effects: {
      filter: 'hue-rotate(30deg)',
    },
  },

  ossuary: {
    id: 'ossuary',
    name: 'Bone Yards',
    colors: {
      base: 'fill-gray-200',
      hover: 'hover:fill-gray-300',
      border: 'stroke-gray-400',
    },
    opacity: 0.7,
    effects: {
      filter: 'sepia(0.3)',
    },
  },

  electromagnetic: {
    id: 'electromagnetic',
    name: 'Static Fields',
    colors: {
      base: 'fill-slate-200',
      hover: 'hover:fill-slate-300',
      border: 'stroke-slate-400',
    },
    opacity: 0.6,
    effects: {
      filter: 'contrast(1.1)',
    },
  },

  // Special states
  unexplored: {
    id: 'unexplored',
    name: 'Unexplored Territory',
    colors: {
      base: 'fill-gray-100',
      hover: 'hover:fill-gray-150',
    },
    opacity: 0.3,
    effects: {
      filter: 'grayscale(0.8) blur(4px)',
    },
  },

  // In Locked and GM Only states
  locked: {
    id: 'locked',
    name: 'Level Locked',
    colors: {
      base: 'fill-gray-300',
      hover: 'hover:fill-gray-400',
    },
    opacity: 0.4,
    effects: {
      filter: 'grayscale(1)',
    },
  },

  gmOnly: {
    id: 'gmOnly',
    name: 'GM Restricted',
    colors: {
      base: 'fill-red-900',
      hover: 'hover:fill-red-800',
    },
    opacity: 0.2,
    effects: {
      filter: 'grayscale(0.8) contrast(0.5)',
    },
  },
}
