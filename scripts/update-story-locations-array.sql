-- Migration: Update story location system to support multiple locations
-- Description: Change location_id from single text to text[] array

-- ============================================================================
-- STEP 1: Migrate existing data and change column type
-- ============================================================================

-- First, convert existing single location_id values to arrays
-- We'll use a temporary column to avoid data loss
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS location_ids text[] DEFAULT '{}';

-- Copy existing location_id data into the array (if not null)
UPDATE stories
SET location_ids = ARRAY[location_id]::text[]
WHERE location_id IS NOT NULL;

-- Drop the old single location_id column
ALTER TABLE stories DROP COLUMN IF EXISTS location_id;

-- Rename the new column to match (or keep as location_ids for clarity)
-- Using location_ids (plural) makes it clear it's an array
ALTER TABLE stories
  RENAME COLUMN location_ids TO location_ids;

-- Add comment
COMMENT ON COLUMN stories.location_ids IS 'Array of location IDs where this story is available (empty array = available everywhere)';

-- ============================================================================
-- STEP 2: Update the get_available_stories function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_stories(
  p_character_id text,
  p_location_id text,
  p_character_level integer DEFAULT 1,
  p_character_gender text DEFAULT 'MALE'
)
RETURNS TABLE (
  story_id uuid,
  story_title text,
  story_description text,
  min_level integer,
  first_event_id uuid,
  is_started boolean,
  is_completed boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.description,
    s.min_level,
    s.first_event_id,
    sp.id IS NOT NULL AND sp.is_completed = false AS is_started,
    COALESCE(sp.is_completed, false) AS is_completed
  FROM stories s
  LEFT JOIN story_progress sp ON (sp.story_id = s.id AND sp.character_id = p_character_id)
  WHERE
    -- Story is active
    s.is_active = true
    -- At the specified location (or available everywhere if array is empty)
    AND (
      array_length(s.location_ids, 1) IS NULL  -- Empty array = available everywhere
      OR array_length(s.location_ids, 1) = 0   -- Empty array = available everywhere
      OR p_location_id = ANY(s.location_ids)   -- Location is in the array
    )
    -- Character meets level requirements
    AND s.min_level <= p_character_level
    AND (s.max_level IS NULL OR s.max_level >= p_character_level)
    -- Matches character gender path
    AND (s.character_path = LOWER(p_character_gender) OR s.character_path = 'both')
    -- Not completed (unless we want to allow replays)
    AND (sp.is_completed IS NULL OR sp.is_completed = false)
    -- Not abandoned
    AND (sp.is_abandoned IS NULL OR sp.is_abandoned = false)
    -- Has a starting event
    AND s.first_event_id IS NOT NULL
  ORDER BY s.display_order, s.created_at;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_stories IS 'Get all available stories for a character at a location (supports multiple locations per story)';

-- ============================================================================
-- STEP 3: Update indexes
-- ============================================================================

-- Drop old index
DROP INDEX IF EXISTS idx_stories_location;

-- Create new GIN index for array searching
CREATE INDEX IF NOT EXISTS idx_stories_location_ids ON stories USING GIN(location_ids)
  WHERE is_active = true;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration successful: stories.location_ids is now an array';
  RAISE NOTICE 'ℹ️  Empty array = available everywhere';
  RAISE NOTICE 'ℹ️  [location1, location2] = available at specific locations';
END $$;
