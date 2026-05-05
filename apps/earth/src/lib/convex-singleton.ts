// src/lib/convex-singleton.ts
// ConvexHttpClient for use outside React hooks (async utility functions)
import { ConvexHttpClient } from 'convex/browser'

export const convexHttp = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!)
