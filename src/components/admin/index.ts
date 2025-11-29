// src/components/admin/index.ts - Barrel export for admin components

// Main Admin Components
export { default as AdminDashboard } from './AdminDashboard'
export { StoryEditor } from './StoryEditor'

// Core UI Components
export { AdminFooter } from './AdminFooter'
export { ActivityMonitor } from './ActivityMonitor'
export { ErrorAlert } from './ErrorAlert'
export { LoadingSpinner } from './LoadingSpinner'
export { SearchBar } from './SearchBar'
export { StatCard } from './StatCard'

// Tab Components
export { OverviewTab } from './tabs/OverviewTab'
export { CharactersTab } from './tabs/CharactersTab'
export { LocationsTab } from './tabs/LocationsTab'
export { ItemsTab } from './tabs/ItemsTab'
export { EconomyTab } from './tabs/EconomyTab'
export { SettingsTab } from './tabs/SettingsTab'

// Modal Components
export { EditCharacterModal } from './modals/EditCharacterModal'
export { CreateLocationModal } from './modals/CreateLocationModal'
export { CreateItemModal } from './modals/CreateItemModal'
export { EditLocationModal } from './modals/EditLocationModal'
export { EditItemModal } from './modals/EditItemModal'
export { EditMarketListingModal } from './modals/EditMarketListingModal'
export { CreateMarketListingModal } from './modals/CreateMarketListingModal'
export { ItemDetailsModal } from './modals/ItemDetailsModal'

// Types
export * from './types'
