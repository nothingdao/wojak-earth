-- Migration: Deprecate event_type column from events table
-- Description: Removes the unused event_type field as event behavior is determined by presence of choices

-- Drop the event_type column
ALTER TABLE events
  DROP COLUMN IF EXISTS event_type;

COMMENT ON TABLE events IS 'Story events - type determined by presence of associated choices';

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE '✅ event_type column removed from events table';
  RAISE NOTICE 'ℹ️  Event behavior is now determined by presence of choices:';
  RAISE NOTICE '    • Events with choices = choice events';
  RAISE NOTICE '    • Events without choices = text-only events';
END $$;
