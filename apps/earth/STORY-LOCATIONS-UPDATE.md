# Story Location System - Multi-Location Support

## What Changed

Stories can now be assigned to **multiple locations** instead of just one. This allows for more flexible story design.

## Migration Applied ✅

- **Database:** `stories.location_id` (single text) → `stories.location_ids` (array)
- **Function:** Updated `get_available_stories()` to handle multiple locations
- **Indexes:** Added GIN index for efficient array searching
- **UI:** Story Editor now has multi-select location picker

## How It Works

### Empty Array = Available Everywhere
```sql
location_ids: []
```
Story is available at **all 85 locations**

### Single Location
```sql
location_ids: ["solana-beach"]
```
Story only available at Solana Beach

### Multiple Locations
```sql
location_ids: ["solana-beach", "crystal-caves", "neon-kelp-farms"]
```
Story available at these 3 specific locations

## Story Editor UI

The enhanced Story Editor now includes:

**Multi-Select Location Picker:**
- ✅ Search box to filter 85 locations
- ✅ Checkboxes for each location
- ✅ "Clear All" button (makes story available everywhere)
- ✅ "Select All" button (with search filter support)
- ✅ Shows count of selected locations
- ✅ Scrollable list (max 48px height)

**Other Fields:**
- Min/Max level requirements
- Required story flags (comma-separated)
- First event selection
- Active/inactive toggle
- Display order (for multiple stories at same location)

## Use Cases

### 1. World Exploration Quest
```
Title: "Journey Across EARTH"
Locations: [] (empty = everywhere)
Min Level: 5
```
Available at all locations once character reaches level 5

### 2. Regional Story Arc
```
Title: "The Frozen Territories"
Locations: ["frost-shelf-territory", "frostpine-reaches", "icicle-point"]
Min Level: 10
```
3-location story arc in the frozen region

### 3. Location-Specific Event
```
Title: "Solana Beach Welcome"
Locations: ["97c44683-3fc8-4fbe-8c69-220785200680"]
Min Level: 1
```
Starter story only at Solana Beach

### 4. Trading Route Quest
```
Title: "Merchant's Path"
Locations: ["central-exchange", "meridian-exchange", "spore-exchange", "calcium-exchange"]
Min Level: 8
```
Story available at all 4 trading exchanges

## Files Modified

- ✅ `scripts/update-story-locations-array.sql` - Migration SQL
- ✅ `scripts/run-location-array-migration.js` - Migration runner (executed)
- ✅ `scripts/verify-story-system.js` - Verification script (updated)
- ✅ `src/components/admin/StoryEditor.tsx` - Multi-select UI (lines 1832-2030)

## Ready to Use

The Story Editor is production-ready. You can now:

1. Run the app: `npm run dev`
2. Navigate to Admin panel
3. Click "Story Editor"
4. Select a story (e.g., "The Path")
5. Use the location picker to assign it to one or more locations
6. Save and test!

## Example Story Configuration

**"The Path" - Multi-location tutorial:**
```
Locations: ["solana-beach", "crystal-caves", "terminal-gardens"]
Min Level: 1
Max Level: 5
First Event: [Select from events in story]
Active: ✅
Display Order: 1
```

This makes "The Path" available at 3 beginner-friendly locations for levels 1-5.
