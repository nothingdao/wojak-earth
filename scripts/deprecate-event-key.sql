-- Migration: Deprecate event_key column from events table
-- Description: Removes the redundant event_key field as event.id serves the same purpose

-- Drop the event_key column
ALTER TABLE events
  DROP COLUMN IF EXISTS event_key;

COMMENT ON TABLE events IS 'Story events - uses id field for unique identification';

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE '✅ event_key column removed from events table';
  RAISE NOTICE 'ℹ️  Event IDs (UUID) are now the sole unique identifier for events';
  RAISE NOTICE 'ℹ️  Update TypeScript types and remove event_key references from code';
END $$;
