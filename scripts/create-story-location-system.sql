-- Migration: Add location-based story system with progress tracking
-- Description: Enables stories to be tied to locations with prerequisites and tracks character progress

-- ============================================================================
-- STEP 1: Extend stories table with location and prerequisites
-- ============================================================================

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS location_id text REFERENCES locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS min_level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_level integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS required_flags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS first_event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

COMMENT ON COLUMN stories.location_id IS 'Location where this story is available (NULL = available everywhere)';
COMMENT ON COLUMN stories.min_level IS 'Minimum character level required to start this story';
COMMENT ON COLUMN stories.max_level IS 'Maximum character level (NULL = no max)';
COMMENT ON COLUMN stories.required_flags IS 'Array of story flag names that must be set to start this story';
COMMENT ON COLUMN stories.first_event_id IS 'The first event to show when starting this story';
COMMENT ON COLUMN stories.is_active IS 'Whether this story is currently available to players';
COMMENT ON COLUMN stories.display_order IS 'Order in which to display stories at a location (lower = first)';

-- ============================================================================
-- STEP 2: Create story_progress table
-- ============================================================================

CREATE TABLE IF NOT EXISTS story_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id text NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,

  -- Progress tracking
  current_event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  last_choice_id uuid REFERENCES choices(id) ON DELETE SET NULL,

  -- State
  is_completed boolean DEFAULT false,
  is_abandoned boolean DEFAULT false,

  -- Timestamps
  started_at timestamp with time zone DEFAULT now(),
  last_interaction_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  -- Constraints
  UNIQUE(character_id, story_id),

  -- Ensure completed stories have completion timestamp
  CONSTRAINT completed_has_timestamp CHECK (
    (is_completed = false) OR (is_completed = true AND completed_at IS NOT NULL)
  )
);

COMMENT ON TABLE story_progress IS 'Tracks individual character progress through stories';
COMMENT ON COLUMN story_progress.current_event_id IS 'The event the character is currently on (NULL if completed)';
COMMENT ON COLUMN story_progress.last_choice_id IS 'The last choice the character made';
COMMENT ON COLUMN story_progress.is_abandoned IS 'Whether the player abandoned this story (can restart)';
COMMENT ON COLUMN story_progress.metadata IS 'Flexible storage for story-specific data';

-- ============================================================================
-- STEP 3: Create indexes for performance
-- ============================================================================

-- Stories indexes
CREATE INDEX IF NOT EXISTS idx_stories_location ON stories(location_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stories_active ON stories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stories_level_range ON stories(min_level, max_level);
CREATE INDEX IF NOT EXISTS idx_stories_display_order ON stories(location_id, display_order);

-- Story progress indexes
CREATE INDEX IF NOT EXISTS idx_story_progress_character ON story_progress(character_id);
CREATE INDEX IF NOT EXISTS idx_story_progress_story ON story_progress(story_id);
CREATE INDEX IF NOT EXISTS idx_story_progress_active ON story_progress(character_id, is_completed)
  WHERE is_completed = false AND is_abandoned = false;
CREATE INDEX IF NOT EXISTS idx_story_progress_completed ON story_progress(character_id, completed_at)
  WHERE is_completed = true;

-- ============================================================================
-- STEP 4: Create helper functions
-- ============================================================================

-- Function to get available stories for a character at a location
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
    -- At the specified location (or available everywhere)
    AND (s.location_id = p_location_id OR s.location_id IS NULL)
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

COMMENT ON FUNCTION get_available_stories IS 'Get all available stories for a character at a location';

-- Function to start a story
CREATE OR REPLACE FUNCTION start_story(
  p_character_id text,
  p_story_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_progress_id uuid;
BEGIN
  INSERT INTO story_progress (character_id, story_id, started_at, last_interaction_at)
  VALUES (p_character_id, p_story_id, now(), now())
  ON CONFLICT (character_id, story_id)
  DO UPDATE SET
    is_abandoned = false,
    last_interaction_at = now()
  RETURNING id INTO v_progress_id;

  RETURN v_progress_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION start_story IS 'Mark a story as started for a character';

-- Function to update story progress
CREATE OR REPLACE FUNCTION update_story_progress(
  p_character_id text,
  p_story_id uuid,
  p_current_event_id uuid DEFAULT NULL,
  p_last_choice_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE story_progress
  SET
    current_event_id = COALESCE(p_current_event_id, current_event_id),
    last_choice_id = COALESCE(p_last_choice_id, last_choice_id),
    last_interaction_at = now()
  WHERE character_id = p_character_id
    AND story_id = p_story_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_story_progress IS 'Update character progress in a story';

-- Function to complete a story
CREATE OR REPLACE FUNCTION complete_story(
  p_character_id text,
  p_story_id uuid
)
RETURNS void AS $$
BEGIN
  UPDATE story_progress
  SET
    is_completed = true,
    completed_at = now(),
    last_interaction_at = now(),
    current_event_id = NULL
  WHERE character_id = p_character_id
    AND story_id = p_story_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION complete_story IS 'Mark a story as completed for a character';

-- ============================================================================
-- STEP 5: Create trigger to update last_interaction_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_story_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_interaction_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_story_progress_timestamp ON story_progress;
CREATE TRIGGER trigger_update_story_progress_timestamp
  BEFORE UPDATE ON story_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_story_progress_timestamp();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'story_progress') THEN
    RAISE NOTICE '✅ Migration successful: story_progress table created';
  ELSE
    RAISE EXCEPTION '❌ Migration failed: story_progress table not created';
  END IF;
END $$;
