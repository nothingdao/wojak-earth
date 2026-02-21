-- Migration: Add Story System Fields
-- Description: Adds requirement validation and progress tracking for story system

-- ============================================================================
-- EVENTS TABLE - Add requirement fields
-- ============================================================================

-- Add location requirement
ALTER TABLE events
ADD COLUMN IF NOT EXISTS required_location_id text REFERENCES locations(id) ON DELETE SET NULL;

-- Add item requirements
ALTER TABLE events
ADD COLUMN IF NOT EXISTS required_items text[] DEFAULT '{}';

-- Add flag requirements
ALTER TABLE events
ADD COLUMN IF NOT EXISTS required_flags text[] DEFAULT '{}';

COMMENT ON COLUMN events.required_location_id IS 'Location player must be in to access this event';
COMMENT ON COLUMN events.required_items IS 'Items player must have in inventory to access this event';
COMMENT ON COLUMN events.required_flags IS 'Story flags player must have to access this event';

-- ============================================================================
-- CHAPTERS TABLE - Add level requirement
-- ============================================================================

-- Add minimum level requirement
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS min_level integer DEFAULT 1;

COMMENT ON COLUMN chapters.min_level IS 'Minimum character level required to access this chapter';

-- ============================================================================
-- STORIES TABLE - Add level requirement
-- ============================================================================

-- Add minimum level requirement (if not exists)
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS min_level integer DEFAULT 1;

COMMENT ON COLUMN stories.min_level IS 'Minimum character level required to see this story';

-- ============================================================================
-- CHARACTERS TABLE - Add progress tracking
-- ============================================================================

-- Add completed stories tracking
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS completed_stories text[] DEFAULT '{}';

-- Add completed chapters tracking
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS completed_chapters text[] DEFAULT '{}';

-- Add story flags for branching/prerequisites
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS story_flags text[] DEFAULT '{}';

-- Add inventory for items from stories
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS inventory text[] DEFAULT '{}';

COMMENT ON COLUMN characters.completed_stories IS 'Array of story IDs the player has completed';
COMMENT ON COLUMN characters.completed_chapters IS 'Array of chapter IDs the player has completed';
COMMENT ON COLUMN characters.story_flags IS 'Array of story flags earned through choices';
COMMENT ON COLUMN characters.inventory IS 'Array of item names the player owns';

-- ============================================================================
-- INDEXES for better performance
-- ============================================================================

-- Index on event requirements for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_required_location
ON events(required_location_id) WHERE required_location_id IS NOT NULL;

-- Index on chapter min_level for filtering
CREATE INDEX IF NOT EXISTS idx_chapters_min_level
ON chapters(min_level);

-- Index on story min_level for filtering
CREATE INDEX IF NOT EXISTS idx_stories_min_level
ON stories(min_level);

-- GIN indexes for array searches on characters
CREATE INDEX IF NOT EXISTS idx_characters_completed_stories
ON characters USING GIN(completed_stories);

CREATE INDEX IF NOT EXISTS idx_characters_completed_chapters
ON characters USING GIN(completed_chapters);

CREATE INDEX IF NOT EXISTS idx_characters_story_flags
ON characters USING GIN(story_flags);

CREATE INDEX IF NOT EXISTS idx_characters_inventory
ON characters USING GIN(inventory);

-- ============================================================================
-- DONE
-- ============================================================================

SELECT 'Story system fields added successfully!' as status;
