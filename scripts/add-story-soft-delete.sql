-- Migration: Add soft delete support to stories table
-- Description: Adds is_deleted and deleted_at columns for archiving stories

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Index for filtering out deleted stories
CREATE INDEX IF NOT EXISTS idx_stories_not_deleted
  ON stories(is_deleted)
  WHERE is_deleted = false;

-- Update the get_available_stories function to exclude deleted stories
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
    -- Story is active and not deleted
    s.is_active = true
    AND s.is_deleted = false
    -- At the specified location (or available everywhere if array is empty)
    AND (
      array_length(s.location_ids, 1) IS NULL
      OR array_length(s.location_ids, 1) = 0
      OR p_location_id = ANY(s.location_ids)
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

COMMENT ON COLUMN stories.is_deleted IS 'Soft delete flag - archived stories not shown to players';
COMMENT ON COLUMN stories.deleted_at IS 'Timestamp when story was archived';

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE '✅ Soft delete columns added to stories table';
  RAISE NOTICE 'ℹ️  is_deleted = true hides story from players but keeps all data';
  RAISE NOTICE 'ℹ️  Use admin UI to permanently delete archived stories';
END $$;
